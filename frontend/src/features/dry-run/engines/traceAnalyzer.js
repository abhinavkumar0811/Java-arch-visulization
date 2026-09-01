/**
 * traceAnalyzer.js
 * Robust analyzer that parses ANY code trace:
 * - Handles array elements with keys like "[0]", "0", etc.
 * - Resolves __ref object references to heap objects and names variables.
 * - Extracts primitive values, objects, call stack, stdout, metrics.
 * - Extracts pointer overlays only for genuine index variables.
 */

const INDEX_VAR_REGEX = /^[ijklmn]$/;
const INDEX_VAR_NAMES = new Set([
  'left', 'right', 'lo', 'hi', 'low', 'high', 'start', 'end',
  'slow', 'fast', 'idx', 'index', 'curr', 'cur', 'head', 'tail',
  'top', 'bot', 'mid', 'ptr', 'l', 'r', 'p', 'p1', 'p2'
]);

export function analyzeStep(step, sourceCode = '', fingerprint = {}) {
  if (!step) return { arrays: [], pointers: {}, primitives: {}, allVars: {}, heap: [], callStack: [], stdout: [] };

  const rawVars = step.variables || {};
  const heap = step.heap || [];
  const heapMap = new Map(heap.map(h => [String(h.id), h]));

  const arrays = [];
  const pointers = {};
  const primitives = {};
  const resolvedVars = {};

  // 1. Extract arrays from heap (int[], String[], etc.)
  for (const obj of heap) {
    if (obj.type === 'array' && !obj.isGarbage) {
      const fields = obj.value || {};
      const indexedEntries = [];
      for (const [k, v] of Object.entries(fields)) {
        const numStr = k.replace(/[^\d]/g, '');
        if (numStr !== '') {
          indexedEntries.push({ idx: parseInt(numStr, 10), val: formatValue(v, heapMap) });
        }
      }
      indexedEntries.sort((a, b) => a.idx - b.idx);

      if (indexedEntries.length > 0) {
        arrays.push({
          name: obj.label || 'array',
          id: String(obj.id),
          elements: indexedEntries.map(e => e.val),
          label: obj.label,
          activeIndex: null,
        });
      }
    }
  }

  // 2. Resolve local variables (including __ref to heap objects)
  for (const [name, value] of Object.entries(rawVars)) {
    if (value === null || value === undefined) {
      resolvedVars[name] = 'null';
      continue;
    }

    if (typeof value === 'object' && value.__ref) {
      const refId = String(value.__ref);
      const heapObj = heapMap.get(refId);
      if (heapObj) {
        // Link array name
        const arr = arrays.find(a => a.id === refId);
        if (arr) {
          arr.name = name;
          arr.varName = name;
          resolvedVars[name] = `${name}: ${heapObj.label} [${arr.elements.length}]`;
        } else {
          resolvedVars[name] = `${heapObj.label} #${refId}`;
        }
      } else {
        resolvedVars[name] = `ref#${refId}`;
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      primitives[name] = value;
      resolvedVars[name] = value;
    } else if (typeof value === 'string') {
      primitives[name] = value;
      resolvedVars[name] = value;
    } else if (Array.isArray(value)) {
      arrays.push({ name, id: `var-${name}`, elements: value.map(v => formatValue(v, heapMap)), activeIndex: null });
      resolvedVars[name] = `[${value.join(', ')}]`;
    } else {
      resolvedVars[name] = JSON.stringify(value);
    }
  }

  // 3. Extract pointer overlays for integer index variables only
  const intVars = Object.entries(rawVars).filter(([name, v]) => {
    if (!Number.isInteger(v) || v < 0) return false;
    const lname = name.toLowerCase();
    return INDEX_VAR_REGEX.test(lname) || INDEX_VAR_NAMES.has(lname);
  });

  for (const arr of arrays) {
    const len = arr.elements.length;
    for (const [name, val] of intVars) {
      if (val < len) {
        pointers[name] = { arrayName: arr.name, arrayId: arr.id, index: val };
      }
    }
  }

  return {
    arrays,
    pointers,
    primitives,
    allVars: resolvedVars,
    variables: step.variables || {}, // PRESERVE RAW VARIABLES FOR AI
    heap: heap.filter(h => !h.isGarbage),
    callStack: step.callStack || [],
    stdout: step.stdout || [],
    metrics: step.metrics || {},
    line: step.line,
    event: step.event,
    functionName: step.functionName,
  };
}

function formatValue(v, heapMap) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') {
    if (v.__ref && heapMap) {
      const target = heapMap.get(String(v.__ref));
      if (target) return target.label || `@${v.__ref}`;
    }
    return JSON.stringify(v);
  }
  return v;
}

/**
 * Extracts a tree from heap nodes that have left/right refs.
 */
export function extractTree(heap) {
  const nodeMap = {};
  for (const obj of heap) {
    if (obj.type === 'node' || obj.type === 'tree') {
      const fields = obj.value || {};
      const valKey = Object.keys(fields).find(k => ['val', 'value', 'key', 'data'].includes(k)) || Object.keys(fields)[0];
      nodeMap[obj.id] = {
        id: obj.id,
        label: String(fields[valKey] ?? obj.label ?? obj.id),
        left: fields.left || fields.leftChild || null,
        right: fields.right || fields.rightChild || null,
      };
    }
  }
  const childIds = new Set(Object.values(nodeMap).flatMap(n => [n.left, n.right].filter(Boolean)));
  const roots = Object.keys(nodeMap).filter(id => !childIds.has(id));
  return { nodes: nodeMap, root: roots[0] || null };
}

/**
 * Extracts a linked list chain from heap nodes with 'next' refs.
 */
export function extractLinkedList(heap, headRef) {
  const nodeMap = {};
  for (const obj of heap) {
    if (obj.type === 'node') {
      const fields = obj.value || {};
      const valKey = Object.keys(fields).find(k => ['val', 'value', 'key', 'data'].includes(k)) || Object.keys(fields)[0];
      nodeMap[obj.id] = {
        id: obj.id,
        label: String(fields[valKey] ?? obj.label ?? obj.id),
        next: fields.next || null,
      };
    }
  }
  const chain = [];
  let cur = headRef || Object.keys(nodeMap)[0];
  const visited = new Set();
  while (cur && nodeMap[cur] && !visited.has(cur)) {
    visited.add(cur);
    chain.push(nodeMap[cur]);
    cur = nodeMap[cur].next;
  }
  return chain;
}
