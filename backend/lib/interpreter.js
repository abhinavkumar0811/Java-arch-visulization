const { parse } = require('./parser');

const MAX_STEPS = 4000; // guards against infinite loops in submitted code

class Scope {
  constructor(parent) { this.vars = new Map(); this.parent = parent; }
  declare(name, value) { this.vars.set(name, value); }
  has(name) { return this.vars.has(name) || (this.parent && this.parent.has(name)); }
  get(name) {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    throw new Error(`Undefined variable '${name}'`);
  }
  set(name, value) {
    if (this.vars.has(name)) { this.vars.set(name, value); return; }
    if (this.parent && this.parent.has(name)) { this.parent.set(name, value); return; }
    // implicit declare at current scope (covers loop counters etc.)
    this.vars.set(name, value);
  }
  snapshot() {
    // flatten from root to here, self overriding parent
    const chain = [];
    let s = this;
    while (s) { chain.push(s); s = s.parent; }
    const out = {};
    for (let i = chain.length - 1; i >= 0; i--) {
      for (const [k, v] of chain[i].vars) out[k] = describeValue(v);
    }
    return out;
  }
}

function describeValue(v) {
  if (v && v.__heapRef) return { __ref: v.id };
  if (v && v.__lambda) return '<lambda>';
  if (v === undefined) return null;
  return v;
}

class Interp {
  constructor(ast, { onEvent } = {}) {
    this.ast = ast;
    this.classes = {}; // className -> ClassDecl
    for (const c of ast.classes) this.classes[c.name] = c;
    ['Exception', 'Throwable', 'RuntimeException', 'Object'].forEach(name => {
      if (!this.classes[name]) {
        this.classes[name] = { type: 'ClassDecl', name, superClass: null, fields: [], methods: [] };
      }
    });
    this.methodArea = {}; // loaded classes: name -> {fields, methods}
    this.heap = {}; // id -> {class, fields}
    this.nextHeapId = 1;
    this.stdout = [];
    this.threads = {}; // id -> {id, name, status, callStack}
    this.nextThreadId = 1;
    this.step = 0;
    this.onEvent = onEvent || (() => {});
    this.trace = [];
  }

  loadClass(name) {
    if (this.methodArea[name] || !this.classes[name]) return;
    const decl = this.classes[name];
    if (decl.superClass) this.loadClass(decl.superClass);
    this.methodArea[name] = {
      fields: decl.fields.map(f => f.name),
      methods: decl.methods.map(m => m.name + '(' + m.params.join(',') + ')')
    };
    this.emit('CLASS_LOAD', null, `Class '${name}' loaded into Method Area`);
  }

  findMethod(className, methodName, argc) {
    let c = this.classes[className];
    while (c) {
      const m = c.methods.find(m => m.name === methodName && m.params.length === argc);
      if (m) return { method: m, ownerClass: c.name };
      const mAny = c.methods.find(m => m.name === methodName);
      if (mAny) return { method: mAny, ownerClass: c.name };
      c = c.superClass ? this.classes[c.superClass] : null;
    }
    return null;
  }

  emit(type, thread, description, extra = {}) {
    this.step++;
    if (this.step > MAX_STEPS) throw new Error('Execution aborted: step limit exceeded (possible infinite loop).');
    const entry = {
      step: this.step,
      type,
      description,
      line: extra.line || null,
      threadId: thread ? thread.id : null,
      stdout: this.stdout.slice(),
      methodArea: JSON.parse(JSON.stringify(this.methodArea)),
      heap: JSON.parse(JSON.stringify(this.heap)),
      threads: Object.fromEntries(Object.entries(this.threads).map(([id, t]) => [id, {
        id: t.id,
        name: t.name,
        status: t.status,
        callStack: t.callStack.map(f => ({
          className: f.className,
          method: f.method,
          line: f.line,
          vars: f.scope.snapshot()
        }))
      }]))
    };
    this.trace.push(entry);
    this.onEvent(entry);
  }

  allocObject(className, ctorArgs, thread) {
    this.loadClass(className);
    const id = this.nextHeapId++;
    const decl = this.classes[className];
    const obj = { __heapRef: true, id, class: className, __shadowedFields: {} };
    this.heap[id] = { class: className, fields: {} };
    const fieldScope = new Scope(null);
    fieldScope.declare('this', obj);

    const chain = [];
    let c = decl;
    while (c) { chain.unshift(c); c = c.superClass ? this.classes[c.superClass] : null; }
    for (const cls of chain) {
      for (const f of cls.fields) {
        const val = f.init ? this.evalExpr(f.init, fieldScope, thread) : defaultForField();
        obj.__shadowedFields[cls.name + '.' + f.name] = val;
        obj[f.name] = val;
        this.heap[id].fields[f.name] = describeValue(val);
      }
    }
    this.emit('HEAP_ALLOC', thread, `new ${className}() allocated on Heap as #${id}`);

    const ctor = decl.methods.find(m => m.isCtor && m.params.length === ctorArgs.length);
    if (ctor) this.invoke(className, ctor, obj, ctorArgs, thread);
    return obj;
  }

  invoke(className, method, thisObj, args, thread) {
    this.loadClass(className);
    const scope = new Scope(null);
    if (thisObj) scope.declare('this', thisObj);
    method.params.forEach((p, i) => scope.declare(p, args[i]));
    const frame = { className, method: method.name, scope, line: null };
    thread.callStack.push(frame);
    this.emit('FRAME_PUSH', thread, `${className}.${method.name}() pushed onto Call Stack`, { line: method.body.line });
    let result;
    try {
      result = this.execBlock(method.body, scope, thread, frame);
    } finally {
      thread.callStack.pop();
      this.emit('FRAME_POP', thread, `${className}.${method.name}() popped from Call Stack`);
    }
    if (result && result.type === 'exception') return result;
    return result && result.type === 'return' ? result.value : undefined;
  }

  callLambda(lambda, args, thread) {
    const scope = new Scope(lambda.closure);
    lambda.params.forEach((p, i) => scope.declare(p, args[i]));
    const frame = { className: '(lambda)', method: 'run', scope, line: null };
    thread.callStack.push(frame);
    this.emit('FRAME_PUSH', thread, `lambda pushed onto Call Stack`);
    let result;
    try {
      result = lambda.body.type === 'Block'
        ? this.execBlock(lambda.body, scope, thread, frame)
        : this.execStmt(lambda.body, scope, thread, frame);
    } finally {
      thread.callStack.pop();
      this.emit('FRAME_POP', thread, `lambda popped from Call Stack`);
    }
    if (result && result.type === 'exception') return result;
    return result && result.type === 'return' ? result.value : undefined;
  }

  // ---- statement execution ----
  execBlock(block, parentScope, thread, frame) {
    const scope = new Scope(parentScope);
    for (const stmt of block.body) {
      const r = this.execStmt(stmt, scope, thread, frame);
      if (r) return r;
    }
    return null;
  }

  execStmt(stmt, scope, thread, frame) {
    if (stmt.line) frame.line = stmt.line;
    switch (stmt.type) {
      case 'Block':
        return this.execBlock(stmt, scope, thread, frame);

      case 'VarDecl':
        for (const d of stmt.decls) {
          const val = d.init ? this.evalExpr(d.init, scope, thread) : defaultForField();
          if (val && val.type === 'exception') return val;
          scope.declare(d.name, val);
        }
        this.emit('VAR_DECLARE', thread, `Declared ${stmt.decls.map(d => d.name).join(', ')} on Stack frame`, { line: stmt.line });
        return null;

      case 'ExprStmt': {
        const r = this.evalExpr(stmt.expr, scope, thread);
        if (r && r.type === 'exception') return r;
        return null;
      }

      case 'Print': {
        const val = stmt.arg ? this.evalExpr(stmt.arg, scope, thread) : '';
        const text = formatValue(val);
        this.stdout.push(text + (stmt.newline ? '\n' : ''));
        this.emit('PRINT', thread, `Printed: ${text}`, { line: stmt.line });
        return null;
      }

      case 'If': {
        const cond = truthy(this.evalExpr(stmt.test, scope, thread));
        this.emit('BRANCH', thread, `if (${cond}) evaluated`, { line: stmt.line });
        if (cond) return this.execStmt(stmt.cons, scope, thread, frame);
        if (stmt.alt) return this.execStmt(stmt.alt, scope, thread, frame);
        return null;
      }

      case 'Break':
        return { type: 'break' };

      case 'Continue':
        return { type: 'continue' };

      case 'Throw': {
        const exc = this.evalExpr(stmt.expr, scope, thread);
        this.emit('EXCEPTION_THROW', thread, `Exception thrown: ${formatValue(exc)}`, { line: stmt.line });
        return { type: 'exception', value: exc };
      }

      case 'TryCatch': {
        let r = this.execBlock(stmt.block, scope, thread, frame);
        if (r && r.type === 'exception') {
          const exc = r.value;
          for (const c of stmt.catches) {
            const catchScope = new Scope(scope);
            catchScope.declare(c.param, exc);
            this.emit('EXCEPTION_CATCH', thread, `Caught ${formatValue(exc)} in catch (${c.param})`, { line: stmt.line });
            const catchRes = this.execBlock(c.body, catchScope, thread, frame);
            if (catchRes) r = catchRes;
            else r = null;
            break;
          }
        }
        if (stmt.finalBlock) {
          const finalRes = this.execBlock(stmt.finalBlock, scope, thread, frame);
          if (finalRes) return finalRes;
        }
        return r;
      }

      case 'While': {
        while (truthy(this.evalExpr(stmt.test, scope, thread))) {
          const r = this.execStmt(stmt.body, scope, thread, frame);
          if (r) {
            if (r.type === 'break') break;
            if (r.type === 'continue') continue;
            return r;
          }
        }
        return null;
      }

      case 'For': {
        const loopScope = new Scope(scope);
        if (stmt.init) this.execStmt(stmt.init, loopScope, thread, frame);
        while (stmt.test ? truthy(this.evalExpr(stmt.test, loopScope, thread)) : true) {
          const r = this.execStmt(stmt.body, loopScope, thread, frame);
          if (r) {
            if (r.type === 'break') break;
            if (r.type === 'continue') {
              if (stmt.update) this.evalExpr(stmt.update, loopScope, thread);
              continue;
            }
            return r;
          }
          if (stmt.update) this.evalExpr(stmt.update, loopScope, thread);
        }
        return null;
      }

      case 'Switch': {
        const val = this.evalExpr(stmt.discriminant, scope, thread);
        let matched = false;
        for (const c of stmt.cases) {
          if (!matched) {
            if (c.test === null) {
              matched = true;
            } else {
              const testVal = this.evalExpr(c.test, scope, thread);
              if (testVal === val) matched = true;
            }
          }
          if (matched) {
            for (const s of c.stmts) {
              const r = this.execStmt(s, scope, thread, frame);
              if (r) {
                if (r.type === 'break') return null;
                return r;
              }
            }
          }
        }
        return null;
      }

      case 'Return': {
        const value = stmt.arg ? this.evalExpr(stmt.arg, scope, thread) : undefined;
        this.emit('RETURN', thread, `return ${stmt.arg ? formatValue(value) : ''}`, { line: stmt.line });
        return { type: 'return', value };
      }

      default:
        throw new Error(`Unknown statement type ${stmt.type}`);
    }
  }

  // ---- expression evaluation ----
  evalExpr(node, scope, thread) {
    switch (node.type) {
      case 'Literal': return node.value;
      case 'This': return scope.get('this');
      case 'Super': return scope.get('this');
      case 'Ident': {
        if (node.name === 'Math') return '__MATH__';
        if (this.classes[node.name]) return { __classRef: node.name };
        if (scope.has(node.name)) return scope.get(node.name);
        if (scope.has('this')) {
          const thisObj = scope.get('this');
          if (thisObj && thisObj.__heapRef && node.name in thisObj) {
            return thisObj[node.name];
          }
        }
        return scope.get(node.name);
      }
      case 'SystemOut': return '__SYSTEM_OUT__';

      case 'Lambda':
        return { __lambda: true, params: node.params, body: node.body, closure: scope };

      case 'Assign': {
        let newVal;
        const current = node.op === '=' ? undefined : this.evalExpr(node.target, scope, thread);
        const rhs = this.evalExpr(node.value, scope, thread);
        switch (node.op) {
          case '=': newVal = rhs; break;
          case '+=': newVal = binaryOp('+', current, rhs); break;
          case '-=': newVal = binaryOp('-', current, rhs); break;
          case '*=': newVal = binaryOp('*', current, rhs); break;
          case '/=': newVal = binaryOp('/', current, rhs); break;
          case '%=': newVal = binaryOp('%', current, rhs); break;
        }
        this.assignTo(node.target, newVal, scope, thread);
        return newVal;
      }

      case 'Unary': {
        if (node.op === '++' || node.op === '--') {
          const current = this.evalExpr(node.arg, scope, thread);
          const next = current + (node.op === '++' ? 1 : -1);
          this.assignTo(node.arg, next, scope, thread);
          return node.prefix ? next : current;
        }
        const v = this.evalExpr(node.arg, scope, thread);
        if (node.op === '!') return !truthy(v);
        if (node.op === '-') return -v;
        if (node.op === '+') return +v;
        break;
      }

      case 'Binary':
        return binaryOp(node.op, this.evalExpr(node.left, scope, thread), this.evalExpr(node.right, scope, thread));

      case 'Conditional':
        return truthy(this.evalExpr(node.test, scope, thread))
          ? this.evalExpr(node.cons, scope, thread)
          : this.evalExpr(node.alt, scope, thread);

      case 'Member': {
        if (node.object.type === 'Super') {
          const currentFrame = currentFrameOf(thread);
          const currentClass = currentFrame ? currentFrame.className : null;
          const superClass = (currentClass && this.classes[currentClass]) ? this.classes[currentClass].superClass : null;
          const thisObj = scope.get('this');
          if (thisObj && thisObj.__shadowedFields && superClass && thisObj.__shadowedFields[superClass + '.' + node.property] !== undefined) {
            return thisObj.__shadowedFields[superClass + '.' + node.property];
          }
          if (thisObj && thisObj.__heapRef) return thisObj[node.property];
        }
        const obj = this.evalExpr(node.object, scope, thread);
        if (obj === '__SYSTEM_OUT__') return obj;
        if (obj && obj.__classRef) return undefined;
        if (obj && obj.__heapRef) return obj[node.property];
        if (obj && typeof obj === 'string' && node.property === 'length') return obj.length;
        if (Array.isArray(obj) && node.property === 'length') return obj.length;
        return undefined;
      }

      case 'Index': {
        const obj = this.evalExpr(node.object, scope, thread);
        const idx = this.evalExpr(node.index, scope, thread);
        if (obj && obj.__heapRef && Array.isArray(obj.__elements)) return obj.__elements[idx];
        if (Array.isArray(obj)) return obj[idx];
        return undefined;
      }

      case 'New':
        if (node.className === 'Thread') {
          const targetVal = node.args.length ? this.evalExpr(node.args[0], scope, thread) : null;
          const id = this.nextHeapId++;
          const threadObj = { __heapRef: true, id, class: 'Thread', __target: targetVal };
          this.heap[id] = { class: 'Thread', fields: { target: '<runnable>' } };
          this.emit('HEAP_ALLOC', thread, `new Thread() allocated on Heap as #${id}`);
          return threadObj;
        }
        return this.allocObject(node.className, node.args.map(a => this.evalExpr(a, scope, thread)), thread);

      case 'NewArray': {
        const elements = node.inits
          ? node.inits.map(i => this.evalExpr(i, scope, thread))
          : new Array(node.size ? this.evalExpr(node.size, scope, thread) : 0).fill(0);
        const id = this.nextHeapId++;
        const arrObj = { __heapRef: true, id, class: `${node.className}[]`, __elements: elements, length: elements.length };
        this.heap[id] = { class: `${node.className}[]`, fields: { length: elements.length, elements: elements.map(formatValue) } };
        this.emit('HEAP_ALLOC', thread, `new ${node.className}[${elements.length}] allocated on Heap as #${id}`);
        return arrObj;
      }

      case 'Call':
        return this.evalCall(node, scope, thread);

      default:
        throw new Error(`Unknown expression type ${node.type}`);
    }
  }

  assignTo(target, value, scope, thread) {
    if (target.type === 'Ident') { scope.set(target.name, value); return; }
    if (target.type === 'Member') {
      const obj = this.evalExpr(target.object, scope, thread);
      obj[target.property] = value;
      if (obj.__heapRef) {
        this.heap[obj.id].fields[target.property] = describeValue(value);
        this.emit('HEAP_FIELD_SET', thread, `#${obj.id}.${target.property} = ${formatValue(value)}`);
      }
      return;
    }
    if (target.type === 'Index') {
      const obj = this.evalExpr(target.object, scope, thread);
      const idx = this.evalExpr(target.index, scope, thread);
      if (obj && obj.__heapRef && Array.isArray(obj.__elements)) {
        obj.__elements[idx] = value;
        this.heap[obj.id].fields.elements = obj.__elements.map(formatValue);
        this.emit('HEAP_FIELD_SET', thread, `#${obj.id}[${idx}] = ${formatValue(value)}`);
      } else if (Array.isArray(obj)) {
        obj[idx] = value;
      }
      return;
    }
    throw new Error('Invalid assignment target');
  }

  evalCall(node, scope, thread) {
    if (node.callee.type === 'SystemOut') {
      const val = node.args.length ? this.evalExpr(node.args[0], scope, thread) : '';
      const text = formatValue(val);
      this.stdout.push(text + (node.method === 'println' ? '\n' : ''));
      this.emit('PRINT', thread, `Printed: ${text}`);
      return undefined;
    }

    if (node.callee.type === 'Ident' && node.callee.name === 'Math') {
      const args = node.args.map(a => this.evalExpr(a, scope, thread));
      if (node.method === 'max') return Math.max(...args);
      if (node.method === 'min') return Math.min(...args);
      if (node.method === 'abs') return Math.abs(args[0]);
      if (node.method === 'pow') return Math.pow(args[0], args[1]);
      if (node.method === 'sqrt') return Math.sqrt(args[0]);
    }

    // super(...) constructor call
    if (node.method === null && node.callee.type === 'Super') {
      const currentFrame = currentFrameOf(thread);
      const currentClass = currentFrame ? currentFrame.className : null;
      const superClass = (currentClass && this.classes[currentClass]) ? this.classes[currentClass].superClass : null;
      if (!superClass || !this.classes[superClass]) return undefined;
      const thisObj = scope.get('this');
      const ctor = this.classes[superClass].methods.find(m => m.isCtor && m.params.length === node.args.length);
      if (!ctor) return undefined;
      const args = node.args.map(a => this.evalExpr(a, scope, thread));
      return this.invoke(superClass, ctor, thisObj, args, thread);
    }

    // super.method(...) method call
    if (node.callee.type === 'Member' && node.callee.object.type === 'Super') {
      const currentFrame = currentFrameOf(thread);
      const currentClass = currentFrame ? currentFrame.className : null;
      const superClass = (currentClass && this.classes[currentClass]) ? this.classes[currentClass].superClass : null;
      const methodName = node.callee.property;
      const thisObj = scope.get('this');
      const found = this.findMethod(superClass, methodName, node.args.length);
      if (!found) throw new Error(`Method '${methodName}' not found on superclass ${superClass}`);
      const args = node.args.map(a => this.evalExpr(a, scope, thread));
      return this.invoke(found.ownerClass, found.method, thisObj, args, thread);
    }

    // static method call or method call on member expr e.g. Class.method() or obj.method()
    if (node.callee.type === 'Member') {
      const obj = this.evalExpr(node.callee.object, scope, thread);
      const methodName = node.callee.property;
      if (obj && obj.__classRef) {
        const args = node.args.map(a => this.evalExpr(a, scope, thread));
        const found = this.findMethod(obj.__classRef, methodName, args.length);
        if (found) return this.invoke(found.ownerClass, found.method, null, args, thread);
      }
      if (obj && obj.__heapRef) {
        const args = node.args.map(a => this.evalExpr(a, scope, thread));
        const found = this.findMethod(obj.class, methodName, args.length);
        if (found) {
          return this.invoke(found.ownerClass, found.method, found.method.isStatic ? null : obj, args, thread);
        }
      }
    }

    // implicit this-call: foo(args) with no explicit object
    if (node.method === null && node.callee.type === 'Ident') {
      const name = node.callee.name;
      if (scope.has(name)) {
        const v = scope.get(name);
        if (v && v.__lambda) return this.callLambda(v, node.args.map(a => this.evalExpr(a, scope, thread)), thread);
      }
      const thisObj = scope.has('this') ? scope.get('this') : null;
      const className = thisObj ? thisObj.class : frameClassOf(thread);
      const found = this.findMethod(className, name, node.args.length);
      if (!found) throw new Error(`Method '${name}' not found`);
      const args = node.args.map(a => this.evalExpr(a, scope, thread));
      return this.invoke(found.ownerClass, found.method, found.method.isStatic ? null : thisObj, args, thread);
    }

    const obj = this.evalExpr(node.callee, scope, thread);

    if (obj === '__SYSTEM_OUT__') {
      const val = node.args.length ? this.evalExpr(node.args[0], scope, thread) : '';
      const text = formatValue(val);
      this.stdout.push(text + (node.method === 'println' ? '\n' : ''));
      this.emit('PRINT', thread, `Printed: ${text}`);
      return undefined;
    }

    if (typeof obj === 'string') {
      const args = node.args.map(a => this.evalExpr(a, scope, thread));
      if (node.method === 'length') return obj.length;
      if (node.method === 'substring') return obj.substring(args[0], args[1]);
      if (node.method === 'charAt') return obj.charAt(args[0]);
    }

    if (obj && obj.class === 'Thread') {
      if (node.method === 'start') return this.startThread(obj, thread);
      if (node.method === 'run') {
        return this.runRunnable(obj.__target, thread);
      }
    }

    if (obj && obj.__lambda) {
      const args = node.args.map(a => this.evalExpr(a, scope, thread));
      return this.callLambda(obj, args, thread);
    }

    if (obj && obj.__classRef) {
      const args = node.args.map(a => this.evalExpr(a, scope, thread));
      const found = this.findMethod(obj.__classRef, node.method, args.length);
      if (!found) throw new Error(`Static method '${node.method}' not found on ${obj.__classRef}`);
      return this.invoke(found.ownerClass, found.method, null, args, thread);
    }

    if (obj && obj.__heapRef) {
      const args = node.args.map(a => this.evalExpr(a, scope, thread));
      const found = this.findMethod(obj.class, node.method, args.length);
      if (!found) throw new Error(`Method '${node.method}' not found on ${obj.class}`);
      return this.invoke(found.ownerClass, found.method, found.method.isStatic ? null : obj, args, thread);
    }

    throw new Error(`Cannot call '${node.method}' on given target`);
  }

  runRunnable(target, thread) {
    if (target && target.__lambda) return this.callLambda(target, [], thread);
    if (target && target.__heapRef) {
      const found = this.findMethod(target.class, 'run', 0);
      if (found) return this.invoke(found.ownerClass, found.method, target, [], thread);
    }
    return undefined;
  }

  startThread(threadObj, parentThread) {
    const id = 'Thread-' + (this.nextThreadId++);
    const t = { id, name: id, status: 'RUNNABLE', callStack: [] };
    this.threads[id] = t;
    this.emit('THREAD_START', t, `${id} created and started`);
    t.status = 'RUNNING';
    // Simplified scheduling: the new thread runs to completion immediately
    // (a real JVM would interleave; this keeps the visualization legible).
    try {
      this.runRunnable(threadObj.__target, t);
    } finally {
      t.status = 'TERMINATED';
      this.emit('THREAD_END', t, `${id} finished (TERMINATED)`);
    }
    return undefined;
  }

  run() {
    // find class with a main(...) method
    let mainClass = null, mainMethod = null;
    for (const name of Object.keys(this.classes)) {
      const m = this.classes[name].methods.find(m => m.name === 'main');
      if (m) { mainClass = name; mainMethod = m; break; }
    }
    if (!mainClass) throw new Error("No 'main' method found in any class.");
    const mainThread = { id: 'main', name: 'main', status: 'RUNNING', callStack: [] };
    this.threads.main = mainThread;
    this.loadClass(mainClass);
    this.emit('PROGRAM_START', mainThread, 'Program starting — main thread created');
    try {
      this.invoke(mainClass, mainMethod, null, [], mainThread);
      mainThread.status = 'TERMINATED';
      this.emit('PROGRAM_END', mainThread, 'main() finished — program complete');
    } catch (e) {
      this.emit('ERROR', mainThread, 'Error: ' + e.message);
      throw e;
    }
    return this.trace;
  }
}

function currentFrameOf(thread) {
  return thread && thread.callStack ? thread.callStack[thread.callStack.length - 1] : null;
}

function frameClassOf(thread) {
  const f = thread.callStack[thread.callStack.length - 1];
  return f ? f.className : null;
}

function defaultForField() { return 0; }

function truthy(v) { return !!v; }

function formatValue(v) {
  if (v && v.__heapRef) return `${v.class}@${v.id}`;
  if (Array.isArray(v)) return '[' + v.join(', ') + ']';
  if (v === null || v === undefined) return 'null';
  return String(v);
}

function binaryOp(op, a, b) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return (typeof a === 'number' && typeof b === 'number' && Number.isInteger(a) && Number.isInteger(b))
      ? Math.trunc(a / b) : a / b;
    case '%': return a % b;
    case '==': return (a && a.__heapRef && b && b.__heapRef) ? a.id === b.id : a === b;
    case '!=': return !(a && a.__heapRef && b && b.__heapRef ? a.id === b.id : a === b);
    case '<': return a < b;
    case '>': return a > b;
    case '<=': return a <= b;
    case '>=': return a >= b;
    case '&&': return truthy(a) && truthy(b);
    case '||': return truthy(a) || truthy(b);
    default: throw new Error(`Unknown operator ${op}`);
  }
}

function interpret(source, opts) {
  const ast = parse(source);
  const interp = new Interp(ast, opts);
  interp.run();
  return interp.trace;
}

module.exports = { interpret, Interp };
