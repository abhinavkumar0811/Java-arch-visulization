/**
 * dryRunEnricher.js — FIXED
 * Reads the ACTUAL TraceGenerator output format:
 *   step.threads[id].callStack[n].vars   (NOT .locals)
 *   step.threads[id].callStack[n].method / .className / .line
 *   step.heap[objId].fields / .class
 */

function enrichTrace(rawTrace) {
  if (!Array.isArray(rawTrace)) return [];

  let maxStackDepth = 0;
  let operations = 0;

  return rawTrace.map((step, idx) => {
    const threads = step.threads || {};
    const threadId = step.threadId;
    const activeThread = threadId ? threads[threadId] : Object.values(threads)[0];
    const rawFrames = activeThread?.callStack || [];

    // ── Normalize callStack using actual field names ─────────────────────────
    const callStack = rawFrames.map((frame, i) => ({
      id: `frame-${i}`,
      name: frame.method || 'unknown',
      className: frame.className || '',
      line: frame.line || 0,
      vars: frame.vars || {},          // actual field name from TraceGenerator
      status: i === rawFrames.length - 1 ? 'active' : 'waiting',
    }));

    // Top frame (most recently executing)
    const topFrame = callStack[callStack.length - 1] || {};
    const variables = topFrame.vars || {};

    // ── Normalize heap ────────────────────────────────────────────────────────
    const rawHeap = step.heap || {};
    const heap = Object.entries(rawHeap).map(([id, obj]) => ({
      id,
      type: inferHeapType(obj),
      label: obj.class || obj.className || 'Object',
      value: obj.fields || {},         // actual field name from TraceGenerator
      isGarbage: obj.isGarbage || false,
    }));

    // ── Metrics ───────────────────────────────────────────────────────────────
    const stackDepth = callStack.length;
    if (stackDepth > maxStackDepth) maxStackDepth = stackDepth;
    operations++;                       // count every step as one operation

    return {
      step: idx,
      line: step.line || topFrame.line || 0,
      event: step.event || 'line',
      scopeId: `scope-${stackDepth}`,
      functionName: topFrame.name || 'main',
      variables,
      callStack,
      heap,
      stdout: step.stdout || [],
      metrics: {
        operations,
        liveObjects: heap.filter(h => !h.isGarbage).length,
        stackDepth,
        maxStackDepth,
      },
    };
  });
}

function inferHeapType(obj) {
  if (!obj) return 'object';
  const t = (obj.class || obj.className || '').toLowerCase();
  if (t.endsWith('[]') || t.includes('array')) return 'array';
  if (t.includes('string')) return 'string';
  if (t.includes('node')) return 'node';
  if (t.includes('map') || t.includes('hashmap') || t.includes('treemap')) return 'map';
  if (t.includes('set') || t.includes('hashset')) return 'set';
  if (t.includes('stack')) return 'stack';
  if (t.includes('queue') || t.includes('deque') || t.includes('linkedlist')) return 'queue';
  if (t.includes('tree')) return 'tree';
  if (t.includes('graph')) return 'graph';
  return 'object';
}

module.exports = { enrichTrace };
