/**
 * complexityAnalyzer.js
 * 
 * Two exports:
 *   inferBigO(code)     — static analysis: pattern-match Java code to infer Big-O
 *   computeMetrics(trace) — dynamic analysis: extract runtime metrics from trace data
 */

// ─────────────────────────────────────────────────────────────────────────────
// STATIC ANALYSIS — infer Big-O from source code patterns
// ─────────────────────────────────────────────────────────────────────────────

function countLoopNesting(code) {
  const lines = code.split('\n');
  let maxDepth = 0;
  let currentDepth = 0;
  for (const line of lines) {
    const stripped = line.trim();
    if (/^\s*(for|while)\s*\(/.test(stripped)) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
    // Closing braces reduce depth (rough heuristic)
    if (stripped === '}') {
      currentDepth = Math.max(0, currentDepth - 0.5); // conservative
    }
  }
  return Math.round(maxDepth);
}

function hasRecursion(code) {
  // Find all method names and check if any method calls itself
  const methodDefs = [...code.matchAll(/(?:static\s+)?(?:\w+\s+)+(\w+)\s*\(/g)]
    .map(m => m[1])
    .filter(name => name !== 'main' && !/^(if|for|while|switch|catch|new|return|class)$/.test(name));
  
  for (const name of methodDefs) {
    const defRegex = new RegExp(`(?:\\w+\\s+)+${name}\\s*\\([^)]*\\)\\s*\\{`);
    const match = code.match(defRegex);
    if (!match) continue;
    
    const startIndex = match.index + match[0].length - 1; // index of '{'
    let depth = 0;
    let bodyContent = null;
    for (let i = startIndex; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') {
        depth--;
        if (depth === 0) {
          bodyContent = code.slice(startIndex, i + 1);
          break;
        }
      }
    }

    if (bodyContent) {
      // Count calls to the method name inside its own body (excluding the definition line)
      const callCount = (bodyContent.match(new RegExp('\\b' + name + '\\s*\\(', 'g')) || []).length;
      const hasLoop = /\b(for|while)\b/.test(bodyContent);
      
      if (callCount >= 1 && hasLoop) return { isRecursive: true, isBranching: true, inLoop: true, name };
      if (callCount >= 2) return { isRecursive: true, isBranching: true, inLoop: false, name };
      if (callCount === 1) return { isRecursive: true, isBranching: false, inLoop: false, name };
    }
  }
  return { isRecursive: false, isBranching: false, name: null };
}

function hasDivideAndConquer(code) {
  return /\/\s*2\b/.test(code) || />>\s*1/.test(code) || /mid\s*=/.test(code);
}

export function inferBigO(code) {
  if (!code || !code.trim()) {
    return {
      time: 'O(?)',
      space: 'O(?)',
      timeColor: '#6B7280',
      spaceColor: '#6B7280',
      explanation: 'Write some code and click Run to analyze complexity.',
    };
  }

  const loopDepth = countLoopNesting(code);
  const recursion = hasRecursion(code);
  const divideConquer = hasDivideAndConquer(code);

  let time = 'O(1)';
  let space = 'O(1)';
  let explanation = '';

  if (recursion.isRecursive && recursion.inLoop) {
    // e.g. permutations or combinations where recursion is inside a loop
    time = 'O(n!)';
    space = 'O(n)';
    explanation = `The \`${recursion.name}\` method calls itself recursively **inside a loop**. This creates a branching factor that grows factorially or exponentially with the input size (like generating permutations). This leads to **O(n!) time** or **O(nⁿ) time**. Space is **O(n)** because the call stack depth grows linearly with the input.`;
  } else if (recursion.isRecursive && recursion.isBranching && divideConquer) {
    // e.g. Merge Sort, Quick Sort
    time = 'O(n log n)';
    space = 'O(n)';
    explanation = `The \`${recursion.name}\` method uses **divide-and-conquer recursion**, splitting the problem and branching recursively (e.g., Merge Sort). This gives **O(n log n) time** (n elements × log n levels). Space is often **O(n)** for auxiliary arrays or **O(log n)** for the recursive call stack.`;
  } else if (recursion.isRecursive && recursion.isBranching) {
    // e.g. fibonacci without memoization
    time = 'O(2ⁿ)';
    space = 'O(n)';
    explanation = `The \`${recursion.name}\` method calls itself **twice** per invocation without dividing the problem space logarithmically. This creates a binary recursion tree, leading to **exponential time O(2ⁿ)**. Stack space is **O(n)**.`;
  } else if (recursion.isRecursive && divideConquer) {
    // e.g. Binary Search
    time = 'O(log n)';
    space = 'O(log n)';
    explanation = `The \`${recursion.name}\` method uses **divide-and-conquer recursion** but only makes a single recursive call per level (e.g., Binary Search). This gives **O(log n) time**. Space is **O(log n)** for the recursive call stack.`;
  } else if (recursion.isRecursive) {
    // e.g. factorial — linear recursion
    time = 'O(n)';
    space = 'O(n)';
    explanation = `The \`${recursion.name}\` method is **linearly recursive** — each call makes exactly one recursive call with a smaller input. Time is **O(n)** since there are n recursive calls. Space is also **O(n)** because each call adds a frame to the call stack until base case is reached.`;
  } else if (loopDepth >= 3) {
    time = 'O(n³)';
    space = 'O(1)';
    explanation = `There are **3 levels of nested loops**. For each iteration of the outer loop, the middle loop runs n times, and the inner loop runs n times again — giving **O(n³) cubic time**. Space is **O(1)** since no extra data structures grow with input.`;
  } else if (loopDepth === 2) {
    if (divideConquer) {
      time = 'O(n log n)';
      space = 'O(1)';
      explanation = `There are **2 nested loops**, but the inner loop halves the problem size (like in binary search or merging). This gives **O(n log n) time**. Space is **O(1)**.`;
    } else {
      time = 'O(n²)';
      space = 'O(1)';
      explanation = `There are **2 nested loops**. For each iteration of the outer loop, the inner loop runs through all n elements — giving **O(n²) quadratic time**. Common in algorithms like Bubble Sort or Selection Sort. Space is **O(1)**.`;
    }
  } else if (loopDepth === 1) {
    if (divideConquer) {
      time = 'O(log n)';
      space = 'O(1)';
      explanation = `The loop **halves the search space** each iteration (like Binary Search). This gives **O(log n) time** — for n=1000, only ~10 iterations are needed. Space is **O(1)** since no extra memory grows with input.`;
    } else {
      time = 'O(n)';
      space = 'O(1)';
      explanation = `There is a **single loop** that iterates proportionally to the input size. This gives **O(n) linear time** — doubling the input doubles the time. Space is **O(1)** (constant) if no new data structures are allocated inside the loop.`;
    }
  } else {
    time = 'O(1)';
    space = 'O(1)';
    explanation = `No loops or recursion detected. The code runs in **O(1) constant time** — it executes the same number of operations regardless of input size. Space is also **O(1)**.`;
  }

  const timeColors = {
    'O(1)': '#10B981',       // green
    'O(log n)': '#34D399',   // light green
    'O(n)': '#FBBF24',       // yellow
    'O(nlog n)': '#F59E0B', // amber (no spaces in keys just in case? wait, previous had space)
    'O(n log n)': '#F59E0B', // amber
    'O(n²)': '#F97316',      // orange
    'O(n³)': '#EF4444',      // red
    'O(2ⁿ)': '#DC2626',      // dark red
    'O(n!)': '#9333EA',      // purple
  };

  return {
    time,
    space,
    timeColor: timeColors[time] || '#6B7280',
    spaceColor: timeColors[space] || '#6B7280',
    explanation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC ANALYSIS — compute metrics from the actual trace
// ─────────────────────────────────────────────────────────────────────────────

export function computeMetrics(trace) {
  if (!trace || trace.length === 0) {
    return {
      lineHits: {},
      heapSeries: [],
      stackSeries: [],
      operationSeries: [],
      maxStackDepth: 0,
      peakHeapCount: 0,
      totalOperations: 0,
    };
  }

  const lineHits = {}; // lineNumber → count
  const heapSeries = []; // heap object count at each step
  const stackSeries = []; // call stack depth at each step
  const operationSeries = []; // cumulative operation count

  let maxStackDepth = 0;
  let peakHeapCount = 0;

  trace.forEach((step, i) => {
    // Count line executions
    if (step.threads && step.threadId) {
      const thread = step.threads[step.threadId];
      if (thread?.callStack?.length > 0) {
        const topFrame = thread.callStack[thread.callStack.length - 1];
        if (topFrame?.line != null) {
          lineHits[topFrame.line] = (lineHits[topFrame.line] || 0) + 1;
        }
        const depth = thread.callStack.length;
        stackSeries.push(depth);
        maxStackDepth = Math.max(maxStackDepth, depth);
      } else {
        stackSeries.push(0);
      }
    } else {
      stackSeries.push(0);
    }

    // Heap object count (excluding garbage)
    const heap = step.heap || {};
    const liveCount = Object.values(heap).filter(o => !o.isGarbage).length;
    heapSeries.push(liveCount);
    peakHeapCount = Math.max(peakHeapCount, liveCount);

    // Cumulative operations = step index + 1
    operationSeries.push(i + 1);
  });

  return {
    lineHits,
    heapSeries,
    stackSeries,
    operationSeries,
    maxStackDepth,
    peakHeapCount,
    totalOperations: trace.length,
  };
}

// Get color for line heatmap based on hit count and max hit count
export function getLineHeatColor(hits, maxHits) {
  if (!hits || !maxHits) return null;
  const ratio = hits / maxHits;
  if (ratio >= 0.8) return 'rgba(239, 68, 68, 0.35)';   // red - hot
  if (ratio >= 0.5) return 'rgba(249, 115, 22, 0.28)';  // orange
  if (ratio >= 0.25) return 'rgba(251, 191, 36, 0.22)'; // yellow
  if (ratio > 0) return 'rgba(59, 130, 246, 0.15)';     // blue - cool
  return null;
}
