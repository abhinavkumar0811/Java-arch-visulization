/**
 * traceNormalizer.js
 * Converts raw backend /api/dry-run response into clean DryRunStep[].
 * Handles the case where variables come as flat key/value in the response.
 */

export function normalizeTrace(rawSteps) {
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps.map((step, idx) => ({
    step: step.step ?? idx,
    line: step.line ?? 0,
    event: step.event ?? 'line',
    scopeId: step.scopeId ?? `scope-${idx}`,
    functionName: step.functionName ?? 'main',
    variables: step.variables ?? {},
    callStack: step.callStack ?? [],
    heap: step.heap ?? [],
    stdout: step.stdout ?? [],
    metrics: step.metrics ?? {
      operations: 0,
      liveObjects: 0,
      stackDepth: 1,
      maxStackDepth: 1,
    },
  }));
}

/**
 * Computes per-line hit counts for the heatmap.
 */
export function computeLineHits(trace) {
  const hits = {};
  for (const step of trace) {
    if (step.line) hits[step.line] = (hits[step.line] || 0) + 1;
  }
  return hits;
}

/**
 * Extracts all unique variable names observed across the entire trace.
 */
export function extractAllVariableNames(trace) {
  const names = new Set();
  for (const step of trace) {
    Object.keys(step.variables || {}).forEach(k => names.add(k));
  }
  return [...names];
}
