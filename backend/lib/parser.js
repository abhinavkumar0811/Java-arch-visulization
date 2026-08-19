const { tokenize } = require('./lexer');

const TYPE_WORDS = new Set(['int', 'double', 'float', 'long', 'boolean', 'char', 'String', 'void', 'Exception', 'Throwable', 'RuntimeException']);
const MODIFIERS = new Set(['public', 'private', 'protected', 'static', 'final', 'abstract']);

class Parser {
  constructor(tokens) {
    this.toks = tokens;
    this.pos = 0;
  }

  peek(o = 0) { return this.toks[this.pos + o]; }
  at(type, value) {
    const t = this.peek();
    return t.type === type && (value === undefined || t.value === value);
  }
  atAny(type, values) {
    const t = this.peek();
    return t.type === type && values.includes(t.value);
  }
  next() { return this.toks[this.pos++]; }
  expect(type, value) {
    const t = this.peek();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error(`Parse error at line ${t.line}: expected ${value || type}, got '${t.value}'`);
    }
    return this.next();
  }
  expectIdentOrKeyword() {
    const t = this.peek();
    if (t.type === 'IDENT' || t.type === 'KEYWORD') {
      return this.next().value;
    }
    throw new Error(`Parse error at line ${t.line}: expected identifier, got '${t.value}'`);
  }
  skipModifiers() {
    while (this.at('KEYWORD') && MODIFIERS.has(this.peek().value)) this.next();
  }
  isTypeToken() {
    const t = this.peek();
    if (t.type === 'KEYWORD' && TYPE_WORDS.has(t.value)) return true;
    // A capitalized identifier followed by another ident (or [ ) is treated as a class type
    if (t.type === 'IDENT' && /^[A-Z]/.test(t.value)) {
      const n = this.peek(1);
      return (n.type === 'IDENT') || (n.type === 'PUNCT' && (n.value === '[' || n.value === '<'));
    }
    return false;
  }
  parseType() {
    this.next(); // consume base type token
    while (this.at('PUNCT', '[')) { this.next(); this.expect('PUNCT', ']'); }
    if (this.at('PUNCT', '<')) { // generics - skip until matching >
      let depth = 0;
      do {
        const t = this.next();
        if (t.value === '<') depth++;
        if (t.value === '>') depth--;
      } while (depth > 0);
    }
  }

  parseProgram() {
    const classes = [];
    while (!this.at('EOF')) {
      classes.push(this.parseClass());
    }
    return { type: 'Program', classes };
  }

  parseClass() {
    this.skipModifiers();
    let isInterface = false;
    if (this.at('KEYWORD', 'interface')) {
      this.next();
      isInterface = true;
    } else {
      this.expect('KEYWORD', 'class');
    }
    const name = this.expectIdentOrKeyword();
    let superClass = null;
    if (this.at('KEYWORD', 'extends')) { this.next(); superClass = this.expectIdentOrKeyword(); }
    if (this.at('KEYWORD', 'implements')) {
      this.next();
      this.expectIdentOrKeyword();
      while (this.at('PUNCT', ',')) { this.next(); this.expectIdentOrKeyword(); }
    }
    this.expect('PUNCT', '{');
    const fields = [];
    const methods = [];
    while (!this.at('PUNCT', '}')) {
      let isStatic = false;
      while (this.at('KEYWORD') && MODIFIERS.has(this.peek().value)) {
        if (this.peek().value === 'static') isStatic = true;
        this.next();
      }
      // constructor: IDENT matching class name followed by (
      if ((this.at('IDENT', name) || this.at('KEYWORD', name)) && this.peek(1).value === '(') {
        this.next(); // consume constructor name
        methods.push(this.parseMethodRest(name, true, isStatic));
        continue;
      }
      const typeTok = this.peek();
      const isType = this.isTypeToken();
      if (!isType) throw new Error(`Parse error at line ${typeTok.line}: expected member declaration`);
      this.parseType();
      const memberName = this.expectIdentOrKeyword();
      if (this.at('PUNCT', '(')) {
        methods.push(this.parseMethodRest(memberName, false, isStatic));
      } else {
        let init = null;
        if (this.at('PUNCT', '=')) { this.next(); init = this.parseExpression(); }
        this.expect('PUNCT', ';');
        fields.push({ name: memberName, init, isStatic });
      }
    }
    this.expect('PUNCT', '}');
    return { type: 'ClassDecl', name, superClass, fields, methods, isInterface };
  }

  parseMethod(name, isCtor, isStatic = false) {
    return this.parseMethodRest(name, isCtor, isStatic);
  }

  parseMethodRest(name, isCtor, isStatic = false) {
    this.expect('PUNCT', '(');
    const params = [];
    while (!this.at('PUNCT', ')')) {
      this.parseType();
      params.push(this.expectIdentOrKeyword());
      if (this.at('PUNCT', ',')) this.next();
    }
    this.expect('PUNCT', ')');
    if (this.at('KEYWORD', 'throws')) {
      this.next();
      this.parseType();
      while (this.at('PUNCT', ',')) {
        this.next();
        this.parseType();
      }
    }
    let body;
    if (this.at('PUNCT', ';')) {
      this.next();
      body = { type: 'Block', body: [] };
    } else {
      body = this.parseBlock();
    }
    return { type: 'MethodDecl', name, params, body, isCtor, isStatic };
  }

  parseBlock() {
    this.expect('PUNCT', '{');
    const stmts = [];
    while (!this.at('PUNCT', '}')) stmts.push(this.parseStatement());
    this.expect('PUNCT', '}');
    return { type: 'Block', body: stmts };
  }

  parseStatement() {
    const t = this.peek();

    if (this.at('PUNCT', '{')) return this.parseBlock();

    if (this.at('KEYWORD', 'break')) {
      this.next(); this.expect('PUNCT', ';');
      return { type: 'Break', line: t.line };
    }
    if (this.at('KEYWORD', 'continue')) {
      this.next(); this.expect('PUNCT', ';');
      return { type: 'Continue', line: t.line };
    }

    if (this.at('KEYWORD', 'throw')) {
      this.next();
      const expr = this.parseExpression();
      this.expect('PUNCT', ';');
      return { type: 'Throw', expr, line: t.line };
    }

    if (this.at('KEYWORD', 'try')) {
      this.next();
      const block = this.parseBlock();
      const catches = [];
      while (this.at('KEYWORD', 'catch')) {
        this.next();
        this.expect('PUNCT', '(');
        this.skipModifiers();
        this.parseType();
        const varName = this.expect('IDENT').value;
        this.expect('PUNCT', ')');
        const catchBlock = this.parseBlock();
        catches.push({ param: varName, body: catchBlock });
      }
      let finalBlock = null;
      if (this.at('KEYWORD', 'finally')) {
        this.next();
        finalBlock = this.parseBlock();
      }
      return { type: 'TryCatch', block, catches, finalBlock, line: t.line };
    }

    if (this.at('KEYWORD', 'if')) {
      this.next(); this.expect('PUNCT', '(');
      const test = this.parseExpression();
      this.expect('PUNCT', ')');
      const cons = this.parseStatement();
      let alt = null;
      if (this.at('KEYWORD', 'else')) { this.next(); alt = this.parseStatement(); }
      return { type: 'If', test, cons, alt, line: t.line };
    }

    if (this.at('KEYWORD', 'while')) {
      this.next(); this.expect('PUNCT', '(');
      const test = this.parseExpression();
      this.expect('PUNCT', ')');
      const body = this.parseStatement();
      return { type: 'While', test, body, line: t.line };
    }

    if (this.at('KEYWORD', 'for')) {
      this.next(); this.expect('PUNCT', '(');
      let init = null;
      if (!this.at('PUNCT', ';')) init = this.parseForInit();
      this.expect('PUNCT', ';');
      let test = null;
      if (!this.at('PUNCT', ';')) test = this.parseExpression();
      this.expect('PUNCT', ';');
      let update = null;
      if (!this.at('PUNCT', ')')) update = this.parseExpression();
      this.expect('PUNCT', ')');
      const body = this.parseStatement();
      return { type: 'For', init, test, update, body, line: t.line };
    }

    if (this.at('KEYWORD', 'switch')) {
      this.next(); this.expect('PUNCT', '(');
      const discriminant = this.parseExpression();
      this.expect('PUNCT', ')');
      this.expect('PUNCT', '{');
      const cases = [];
      while (!this.at('PUNCT', '}')) {
        if (this.at('KEYWORD', 'case')) {
          this.next();
          const test = this.parseExpression();
          this.expect('PUNCT', ':');
          const stmts = [];
          while (!this.at('KEYWORD', 'case') && !this.at('KEYWORD', 'default') && !this.at('PUNCT', '}')) {
            stmts.push(this.parseStatement());
          }
          cases.push({ test, stmts });
        } else if (this.at('KEYWORD', 'default')) {
          this.next(); this.expect('PUNCT', ':');
          const stmts = [];
          while (!this.at('KEYWORD', 'case') && !this.at('KEYWORD', 'default') && !this.at('PUNCT', '}')) {
            stmts.push(this.parseStatement());
          }
          cases.push({ test: null, stmts });
        } else {
          this.next();
        }
      }
      this.expect('PUNCT', '}');
      return { type: 'Switch', discriminant, cases, line: t.line };
    }

    if (this.at('KEYWORD', 'return')) {
      this.next();
      let arg = null;
      if (!this.at('PUNCT', ';')) arg = this.parseExpression();
      this.expect('PUNCT', ';');
      return { type: 'Return', arg, line: t.line };
    }

    // System.out.println / print
    if (this.at('KEYWORD', 'System')) {
      const startLine = t.line;
      this.next(); this.expect('PUNCT', '.'); this.expect('KEYWORD', 'out'); this.expect('PUNCT', '.');
      const which = this.expect('KEYWORD').value; // println | print
      this.expect('PUNCT', '(');
      let arg = null;
      if (!this.at('PUNCT', ')')) arg = this.parseExpression();
      this.expect('PUNCT', ')');
      this.expect('PUNCT', ';');
      return { type: 'Print', arg, newline: which === 'println', line: startLine };
    }

    // local variable declaration
    if (this.isTypeToken()) {
      const startLine = t.line;
      this.parseType();
      const decls = [];
      do {
        const varName = this.expect('IDENT').value;
        let init = null;
        if (this.at('PUNCT', '=')) { this.next(); init = this.parseExpression(); }
        decls.push({ name: varName, init });
      } while (this.at('PUNCT', ',') && this.next());
      this.expect('PUNCT', ';');
      return { type: 'VarDecl', decls, line: startLine };
    }

    // expression statement
    const expr = this.parseExpression();
    this.expect('PUNCT', ';');
    return { type: 'ExprStmt', expr, line: t.line };
  }

  parseForInit() {
    if (this.isTypeToken()) {
      const line = this.peek().line;
      this.parseType();
      const decls = [];
      do {
        const varName = this.expect('IDENT').value;
        let init = null;
        if (this.at('PUNCT', '=')) { this.next(); init = this.parseExpression(); }
        decls.push({ name: varName, init });
      } while (this.at('PUNCT', ',') && this.next());
      return { type: 'VarDecl', decls, line };
    }
    return { type: 'ExprStmt', expr: this.parseExpression(), line: this.peek().line };
  }

  // ---- Expressions (precedence climbing) ----
  parseExpression() { return this.parseAssignment(); }

  parseAssignment() {
    const left = this.parseTernary();
    if (this.atAny('PUNCT', ['=', '+=', '-=', '*=', '/=', '%='])) {
      const op = this.next().value;
      const right = this.parseAssignment();
      return { type: 'Assign', op, target: left, value: right };
    }
    return left;
  }

  parseTernary() {
    let expr = this.parseLogicalOr();
    if (this.at('PUNCT', '?')) {
      this.next();
      const cons = this.parseExpression();
      this.expect('PUNCT', ':');
      const alt = this.parseExpression();
      expr = { type: 'Conditional', test: expr, cons, alt };
    }
    return expr;
  }

  parseBinary(nextFn, ops) {
    let left = nextFn.call(this);
    while (this.atAny('PUNCT', ops)) {
      const op = this.next().value;
      const right = nextFn.call(this);
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  parseLogicalOr() { return this.parseBinary(this.parseLogicalAnd, ['||']); }
  parseLogicalAnd() { return this.parseBinary(this.parseEquality, ['&&']); }
  parseEquality() { return this.parseBinary(this.parseRelational, ['==', '!=']); }
  parseRelational() { return this.parseBinary(this.parseAdditive, ['<', '>', '<=', '>=']); }
  parseAdditive() { return this.parseBinary(this.parseMultiplicative, ['+', '-']); }
  parseMultiplicative() { return this.parseBinary(this.parseUnary, ['*', '/', '%']); }

  parseUnary() {
    if (this.atAny('PUNCT', ['!', '-', '+', '++', '--'])) {
      const op = this.next().value;
      const arg = this.parseUnary();
      return { type: 'Unary', op, arg, prefix: true };
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();
    for (; ;) {
      if (this.at('PUNCT', '.')) {
        this.next();
        const name = this.next().value; // IDENT or KEYWORD (e.g. 'out','length')
        if (this.at('PUNCT', '(')) {
          const args = this.parseArgs();
          expr = { type: 'Call', callee: expr, method: name, args };
        } else {
          expr = { type: 'Member', object: expr, property: name };
        }
      } else if (this.at('PUNCT', '(')) {
        const args = this.parseArgs();
        expr = { type: 'Call', callee: expr, method: null, args };
      } else if (this.at('PUNCT', '[')) {
        this.next();
        const index = this.parseExpression();
        this.expect('PUNCT', ']');
        expr = { type: 'Index', object: expr, index };
      } else if (this.atAny('PUNCT', ['++', '--'])) {
        const op = this.next().value;
        expr = { type: 'Unary', op, arg: expr, prefix: false };
      } else break;
    }
    return expr;
  }

  parseArgs() {
    this.expect('PUNCT', '(');
    const args = [];
    while (!this.at('PUNCT', ')')) {
      args.push(this.parseExpression());
      if (this.at('PUNCT', ',')) this.next();
    }
    this.expect('PUNCT', ')');
    return args;
  }

  parsePrimary() {
    const t = this.peek();

    if (t.type === 'NUMBER') { this.next(); return { type: 'Literal', value: t.value }; }
    if (t.type === 'STRING') { this.next(); return { type: 'Literal', value: t.value, isString: true }; }
    if (t.type === 'CHAR') { this.next(); return { type: 'Literal', value: t.value }; }
    if (t.type === 'KEYWORD' && t.value === 'true') { this.next(); return { type: 'Literal', value: true }; }
    if (t.type === 'KEYWORD' && t.value === 'false') { this.next(); return { type: 'Literal', value: false }; }
    if (t.type === 'KEYWORD' && t.value === 'null') { this.next(); return { type: 'Literal', value: null }; }
    if (t.type === 'KEYWORD' && t.value === 'this') { this.next(); return { type: 'This' }; }
    if (t.type === 'KEYWORD' && t.value === 'super') { this.next(); return { type: 'Super' }; }
    if (t.type === 'KEYWORD' && t.value === 'Math') { this.next(); return { type: 'Ident', name: 'Math' }; }
    if (t.type === 'KEYWORD' && t.value === 'System') { this.next(); this.expect('PUNCT', '.'); this.expect('KEYWORD', 'out'); return { type: 'SystemOut' }; }

    if (t.type === 'KEYWORD' && t.value === 'new') {
      this.next();
      const classTok = this.peek();
      if (!(classTok.type === 'IDENT' || (classTok.type === 'KEYWORD' && (TYPE_WORDS.has(classTok.value) || classTok.value === 'Thread' || classTok.value === 'Runnable')))) {
        throw new Error(`Parse error at line ${classTok.line}: expected class name after 'new'`);
      }
      const className = this.next().value;
      if (this.at('PUNCT', '[')) {
        this.next();
        let size = null;
        if (!this.at('PUNCT', ']')) size = this.parseExpression();
        this.expect('PUNCT', ']');
        let inits = null;
        if (this.at('PUNCT', '{')) {
          this.next();
          inits = [];
          while (!this.at('PUNCT', '}')) {
            inits.push(this.parseExpression());
            if (this.at('PUNCT', ',')) this.next();
          }
          this.expect('PUNCT', '}');
        }
        return { type: 'NewArray', className, size, inits };
      }
      const args = this.parseArgs();
      return { type: 'New', className, args };
    }

    if (t.type === 'PUNCT' && t.value === '(') {
      // could be lambda: (x) -> ... or ( ) -> ... or a parenthesized expr
      const save = this.pos;
      if (this.tryParseLambda()) { this.pos = save; return this.parseLambda(); }
      this.next();
      const expr = this.parseExpression();
      this.expect('PUNCT', ')');
      return expr;
    }

    if (t.type === 'IDENT') {
      // lambda with single unparenthesized param: x -> ...
      if (this.peek(1).type === 'PUNCT' && this.peek(1).value === '->') {
        const param = this.next().value;
        this.next(); // ->
        const body = this.at('PUNCT', '{') ? this.parseBlock() : { type: 'Return', arg: this.parseExpression() };
        return { type: 'Lambda', params: [param], body };
      }
      this.next();
      return { type: 'Ident', name: t.value };
    }

    throw new Error(`Parse error at line ${t.line}: unexpected token '${t.value}'`);
  }

  tryParseLambda() {
    // lookahead: ( ... ) ->
    let p = this.pos;
    if (this.toks[p].value !== '(') return false;
    let depth = 0;
    while (p < this.toks.length) {
      if (this.toks[p].value === '(') depth++;
      if (this.toks[p].value === ')') { depth--; if (depth === 0) { p++; break; } }
      p++;
    }
    return this.toks[p] && this.toks[p].value === '->';
  }

  parseLambda() {
    this.expect('PUNCT', '(');
    const params = [];
    while (!this.at('PUNCT', ')')) {
      if (this.isTypeToken()) this.parseType();
      params.push(this.expect('IDENT').value);
      if (this.at('PUNCT', ',')) this.next();
    }
    this.expect('PUNCT', ')');
    this.expect('PUNCT', '->');
    const body = this.at('PUNCT', '{') ? this.parseBlock() : { type: 'Return', arg: this.parseExpression() };
    return { type: 'Lambda', params, body };
  }
}

function parse(src) {
  const tokens = tokenize(src);
  return new Parser(tokens).parseProgram();
}

module.exports = { parse };
