/**
 * fingerprinter.js
 * Identifies the algorithm pattern from source code + trace.
 * Returns a fingerprint object used to select the right scene type(s).
 */

const POINTER_NAMES = new Set(['left', 'right', 'lo', 'hi', 'low', 'high', 'start', 'end', 'slow', 'fast', 'l', 'r']);
const TREE_NODE_NAMES = /\b(TreeNode|BSTNode|Node|treeNode)\b/;
const LIST_NODE_NAMES = /\b(ListNode|LinkedNode|Node)\b.*\bnext\b/;
const GRAPH_NAMES = /\b(adj|graph|edges|neighbors|adjList|adjacency)\b/;
const DP_NAMES = /\b(dp|memo|cache|table)\b/;
const GRID_NAMES = /\b(grid|matrix|board|map|dungeon|island)\b/;
const SORT_NAMES = /\b(sort|swap|bubble|selection|insertion|merge|quick|heap)\b/i;

export function fingerprint(sourceCode = '', trace = []) {
  const code = sourceCode;
  const scenes = [];
  const labels = [];

  // ── Detect data structures ─────────────────────────────────────────────────

  // Array detection: any variable with [] type or being indexed
  const hasArray = /\bint\s*\[\s*\]|\bString\s*\[\s*\]|\bchar\s*\[\s*\]|\bdouble\s*\[\s*\]|\blong\s*\[\s*\]|\bboolean\s*\[\s*\]|\bList</.test(code);
  if (hasArray) scenes.push('array');

  // 2D grid / matrix
  const hasGrid = GRID_NAMES.test(code) || /int\s*\[\s*\]\s*\[\s*\]/.test(code);
  if (hasGrid) { scenes.push('grid'); labels.push('Matrix / Grid'); }

  // Linked list (Node with next field)
  const hasList = LIST_NODE_NAMES.test(code) || /\.next\s*[=;]/.test(code);
  if (hasList) { scenes.push('list'); labels.push('Linked List'); }

  // Tree (Node with left/right fields)
  const hasTree = TREE_NODE_NAMES.test(code) && (/\.left\s*[=;]/.test(code) || /\.right\s*[=;]/.test(code));
  if (hasTree) { scenes.push('tree'); labels.push('Binary Tree'); }

  // Graph (adjacency list / graph variable)
  const hasGraph = GRAPH_NAMES.test(code);
  if (hasGraph) { scenes.push('graph'); labels.push('Graph'); }

  // Stack
  const hasStack = /\bStack\b|\bDeque\b.*push|\bArrayDeque\b/.test(code) && /\.push\(|\.pop\(/.test(code);
  if (hasStack) { scenes.push('stack'); labels.push('Stack'); }

  // Queue
  const hasQueue = /\bQueue\b|\bLinkedList\b|\bArrayDeque\b/.test(code) && /\.offer\(|\.poll\(|\.add\(/.test(code);
  if (hasQueue && !hasStack) { scenes.push('queue'); labels.push('Queue'); }

  // HashMap
  const hasMap = /\bHashMap\b|\bMap\b|\bTreeMap\b/.test(code) && /\.put\(|\.get\(/.test(code);
  if (hasMap) { scenes.push('hashmap'); labels.push('HashMap'); }

  // DP table
  const hasDP = DP_NAMES.test(code);
  if (hasDP && hasGrid) { labels.push('Dynamic Programming'); }
  else if (hasDP && hasArray) { labels.push('Dynamic Programming'); }

  // ── Detect algorithm technique ────────────────────────────────────────────

  // Two pointers
  const varNames = Object.keys(trace[0]?.variables || {});
  const twoPointerVars = varNames.filter(v => POINTER_NAMES.has(v.toLowerCase()));
  const hasTwoPointer = twoPointerVars.length >= 2 ||
    (/\bleft\b.*\bright\b|\bslow\b.*\bfast\b|\blo\b.*\bhi\b/.test(code));
  if (hasTwoPointer && hasArray && !hasTree) { labels.unshift('Two Pointer'); }

  // Recursion (method calling itself)
  const methodMatch = code.match(/(?:static\s+)?(?:\w+\s+)+(\w+)\s*\(/);
  const methodName = methodMatch ? methodMatch[1] : null;
  const hasRecursion = methodName && methodName !== 'main' &&
    new RegExp(`\\b${methodName}\\s*\\(`).test(code.replace(new RegExp(`^[^{]*${methodName}[^{]*{`), ''));
  if (hasRecursion) { labels.unshift('Recursion'); scenes.push('recursion'); }

  // BFS / DFS
  const hasBFS = /bfs|breadth.first/i.test(code) || (hasQueue && hasGraph);
  const hasDFS = /dfs|depth.first/i.test(code) || (hasStack && hasGraph);
  if (hasBFS) labels.push('BFS');
  if (hasDFS) labels.push('DFS');

  // Sorting
  const hasSort = SORT_NAMES.test(code) && hasArray;
  if (hasSort) { labels.unshift('Sorting'); scenes.push('sort'); }

  // Fallback
  if (scenes.length === 0) scenes.push('generic');
  if (labels.length === 0) labels.push('General Algorithm');

  // Pointer variable names from the actual code (used as overlay labels)
  const pointerVars = varNames.filter(v => {
    const lv = v.toLowerCase();
    return POINTER_NAMES.has(lv) || ['i', 'j', 'k', 'idx', 'index', 'curr', 'cur', 'head', 'tail', 'top'].includes(lv);
  });

  return {
    primaryScene: scenes[0],
    allScenes: [...new Set(scenes)],
    label: labels.join(' — '),
    pointerVars,
    hasRecursion: !!hasRecursion,
    hasTwoPointer,
    hasGrid,
    hasDP,
    hasSort,
  };
}
