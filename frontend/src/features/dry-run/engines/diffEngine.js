/**
 * diffEngine.js
 * Compares two scene shape arrays by stable `id` and assigns change intents.
 * This drives CSS transition animations between steps.
 */

/**
 * @param {Shape[]} prev - shapes from previous step
 * @param {Shape[]} next - shapes from current step
 * @returns {Map<string, ShapeDiff>}
 */
export function diffShapes(prev = [], next = []) {
  const prevMap = new Map(prev.map(s => [s.id, s]));
  const nextMap = new Map(next.map(s => [s.id, s]));
  const diffs = new Map();

  // Check all next shapes
  for (const shape of next) {
    const old = prevMap.get(shape.id);
    if (!old) {
      diffs.set(shape.id, { id: shape.id, intent: 'enter' });
    } else if (old.x !== shape.x || old.y !== shape.y) {
      diffs.set(shape.id, { id: shape.id, intent: 'move', prevX: old.x, prevY: old.y });
    } else if (old.state !== shape.state || old.label !== shape.label) {
      diffs.set(shape.id, { id: shape.id, intent: 'update' });
    } else {
      diffs.set(shape.id, { id: shape.id, intent: 'none' });
    }
  }

  // Shapes in prev but not in next → exit
  for (const shape of prev) {
    if (!nextMap.has(shape.id)) {
      diffs.set(shape.id, { id: shape.id, intent: 'exit' });
    }
  }

  return diffs;
}

/**
 * Returns CSS style object for a shape based on its diff intent.
 */
export function getTransitionStyle(diff, speedMultiplier = 1) {
  if (!diff) return {};
  const moveDur = `${Math.round(350 * speedMultiplier)}ms`;
  const highlightDur = `${Math.round(150 * speedMultiplier)}ms`;

  switch (diff.intent) {
    case 'move':
      return { transition: `transform ${moveDur} cubic-bezier(.4,0,.2,1), fill ${highlightDur}` };
    case 'enter':
      return { transition: `opacity ${highlightDur}, transform ${highlightDur}`, opacity: 0, transform: 'scale(0.8)' };
    case 'update':
      return { transition: `fill ${highlightDur}, background ${highlightDur}` };
    case 'exit':
      return { transition: `opacity ${highlightDur}`, opacity: 0 };
    default:
      return {};
  }
}
