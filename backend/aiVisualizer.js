/**
 * aiVisualizer.js
 * Generates custom, dynamic AI visualizations tailored to user Java code & trace
 * using Google Gemini API.
 */

const crypto = require('crypto');

const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-latest'
];





const SYSTEM_PROMPT = `You are an Expert UI Developer and Algorithm Visualizer (similar to Claude's Artifacts).
Your task is to generate a highly accurate, 100% bespoke, self-contained, interactive HTML/SVG/JS visualization widget tailored specifically to the user's Java code and execution trace.

CRITICAL RULES:
1. Output ONLY valid self-contained HTML (with inline <style> and <script> tags). Do not include markdown code block backticks.
2. The widget will be rendered in an iframe. Ensure the body has: margin: 0; padding: 24px; box-sizing: border-box; width: 100%; min-height: 100vh; overflow-y: auto; overflow-x: auto; display: flex; flex-direction: column; align-items: center; background-color: #0d1117;. Do NOT use fixed heights like 100vh that might cause content to cut off.
3. You MUST implement this global function to receive execution updates:
   window.onStepChange = function(stepIndex, stepData, fullTrace) { ... }
   The 'stepData' object has this schema:
   {
     step: number,
     line: number,
     variables: { [name: string]: any }, // Primitive values or Heap References
     callStack: Array<{ id, name, line, vars }>,
     heap: Array<{ id, type, label, value, isGarbage }>,
     stdout: string[],
     metrics: { operations, liveObjects, stackDepth, maxStackDepth }
   }
4. Heap & Variables Access (CRITICAL):
   - Primitives are direct values (e.g. stepData.variables.i === 1).
   - Arrays/Objects are references in variables (e.g. stepData.variables.nums === { type: "array", __ref: "1" }).
   - To get array elements, look up __ref "1" in stepData.heap where id === "1". The elements are in the 'value' property of that heap object.
5. Visualization Design (EXTREMELY IMPORTANT):
   - DO NOT use typical "AI-generated" or "vibe-coded" aesthetics (no neon colors, no heavy gradients, no massive drop shadows, no extreme rounded corners).
   - Use a highly minimalist, flat, and professional design. It should look like an enterprise IDE tool (like VSCode or GitHub).
   - Use sharp edges (e.g., border-radius: 2px or 4px max) and subtle 1px borders.
   - Use a muted, monochromatic color palette with very subtle accent colors (e.g., slate grays, muted blues, soft muted greens). Avoid bright orange/yellow high-contrast colors unless absolutely necessary for accessibility.
   - Layout & Spacing (CRITICAL): Prevent overlapping elements! Ensure generous padding, gap sizing (e.g. gap: 16px, gap: 24px), and adequate margins. Avoid absolute positioning that forces text or nodes to overlap.
   - Colors & Pointers (CRITICAL): If you render a legend indicating specific colors for pointers (e.g., 'slow', 'fast'), you MUST dynamically apply those EXACT muted colors to the nodes/bars that those pointers reference via stepData.variables!
   - Use clean, sans-serif or monospace fonts (e.g., system-ui, 'JetBrains Mono', monospace).
   - Center your main visualization elements in the flex container.
   - Do NOT just render a generic "variables" table. You MUST extract the specific algorithm's essence and visualize it beautifully using raw DOM manipulation or SVG.
   - DO NOT hardcode arrays. You MUST fetch the array dynamically from stepData.heap on EVERY step exactly as shown below.
   - State Persistence (CRITICAL): Variables like 'count' might disappear from stepData.variables when the stack returns to main(). DO NOT reset UI counters to 0! You MUST maintain a historical state outside onStepChange to remember the maximum/last known values, or read the 'result' variable.
   - Completion Indicators: If a recursion depth drops to 0 at the end of the trace, show "Completed ✓" instead of just "0" (which looks like a failure).
   - Grid/Graph Mutations (CRITICAL): If the algorithm modifies a grid (e.g., DFS sinking an island '1' to '0'), DO NOT just show a grid of 0s at the end. You MUST maintain a conceptual history (e.g., "Original vs Current") or use distinct colors/IDs for separate components (Island 1, Island 2) so the user can see what was discovered.

6. EXAMPLE (Array Visualization Pattern):
   \`\`\`html
   <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#0d1117; color:white; font-family:sans-serif;">
     <h2 style="margin-bottom:20px; font-weight:600;">Bubble Sort</h2>
     <div id="bars" style="display:flex; gap:8px;"></div>
   </div>
   <script>
   window.onStepChange = function(stepIndex, stepData, fullTrace) {
      const numsRef = stepData.variables.nums?.__ref;
      
      function resolveArray(refId, heap) {
        if (!refId) return [];
        const obj = heap.find(h => h.id === refId);
        if (!obj || !obj.value) return [];
        if (obj.label && obj.label.includes("ArrayList") && obj.value.elementData) {
          const elRef = obj.value.elementData.__ref;
          return resolveArray(elRef, heap).filter(v => v !== null).slice(0, obj.value.size || 0);
        }
        const vals = Array.isArray(obj.value) ? obj.value : Object.values(obj.value);
        return vals.map(v => {
          if (v && v.__ref) {
            const vObj = heap.find(h => h.id === v.__ref);
            if (vObj && vObj.value && vObj.value.value !== undefined) return vObj.value.value;
          }
          return v;
        }).filter(v => v !== undefined && typeof v !== 'object');
      }

      const arr = resolveArray(numsRef, stepData.heap);
     
     const j = stepData.variables.j;
     const barsDiv = document.getElementById('bars');
     barsDiv.innerHTML = '';
     
     arr.forEach((val, idx) => {
       const bar = document.createElement('div');
       bar.style.cssText = 'width:48px;height:48px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;transition:background 0.2s;';
       if (idx === j || idx === j + 1) bar.style.background = '#eab308'; // comparing
       else bar.style.background = '#30363d';
       bar.textContent = val;
       barsDiv.appendChild(bar);
     });
   };
   </script>
   \`\`\`
   Use this standard for whichever algorithm is provided (Trees, Graphs, Arrays, DP grids). Make it delightful, accurate, and professional.`;

async function callGeminiChat(modelName, apiKey, userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(22000),
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [{
        role: "user",
        parts: [{ text: userPrompt }]
      }],
      generationConfig: {
        temperature: 0.2
      }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedMsg = errText;
    try {
      const errObj = JSON.parse(errText);
      parsedMsg = errObj.error?.message || errText;
    } catch (_) {}
    const err = new Error(`Gemini API Error (${response.status}): ${parsedMsg}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return {
    choices: [{ message: { content: text } }],
    model: modelName,
  };
}

const visualizerCache = new Map();

async function generateCustomVisualizer({ sourceCode, forceRegenerate = false }) {
  const finalApiKey = process.env.GEMINI_API_KEY;
  if (!finalApiKey) {
    throw new Error('API Key is not configured on the server. Please set GEMINI_API_KEY in your .env file.');
  }

  const hash = crypto.createHash('sha256').update(sourceCode.trim()).digest('hex');
  if (!forceRegenerate && visualizerCache.has(hash)) {
    console.log('Serving visualizer from cache (0ms)');
    return { ...visualizerCache.get(hash), timingMs: 0, cached: true };
  }

  const startTime = Date.now();
  const userPrompt = `Java Source Code:
\`\`\`java
${sourceCode}
\`\`\`

CRITICAL INSTRUCTIONS:
1. DO NOT CREATE A DASHBOARD. DO NOT CREATE VARIABLE TABLES. DO NOT SHOW THE SOURCE CODE.
2. ONLY draw the visual representation of the core data structure (e.g. the Array bars, or the Tree nodes) inside the full-screen container.
3. For descriptive text or legends, use standard block text (like <p>) with inline <span> tags. DO NOT use Flexbox for paragraphs/sentences, as it breaks word wrapping.
4. For pointers, arrows, or markers attached to elements, ensure their parent container does NOT have 'overflow: hidden', and provide enough padding/margin so they are never clipped.
5. Dynamically highlight elements based on pointers from stepData.variables (e.g., if legend says "slow", color the node where idx === stepData.variables.slow).
6. YOU MUST use the EXACT JS logic from the example to fetch arrays from stepData.heap. Do NOT hardcode arrays.
7. Output ONLY the raw HTML code without markdown code blocks.`;

  let data = null;
  let targetModel = null;
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    targetModel = model;
    try {
      data = await callGeminiChat(model, finalApiKey, userPrompt);
      break; // Success
    } catch (err) {
      lastError = err;
      const isTransient = (
        err.name === 'TimeoutError' ||
        err.status === 404 ||
        err.status === 503 ||
        err.status === 429 ||
        (err.message && (
          err.message.includes('not found') ||
          err.message.includes('aborted') ||
          err.message.includes('timeout')
        ))
      );
      if (isTransient) {
        console.log(`Model ${model} timed out or busy (${err.message}), trying next fallback...`);
        continue;
      }
      throw err; // Propagate non-transient errors (like 401 Unauthorized)
    }
  }

  if (!data) {
    throw lastError || new Error('All Gemini fallback models failed or were overloaded.');
  }

  let content = data.choices?.[0]?.message?.content || '';

  // Clean markdown backticks and reasoning blocks (e.g. <think>...</think>)
  content = content.trim();
  
  // Remove <think> blocks if present
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Extract from markdown code block if present
  const htmlMatch = content.match(/```(?:html|xml)?\s*([\s\S]*?)```/i);
  if (htmlMatch) {
    content = htmlMatch[1].trim();
  } else {
    // If no code block, try to find the first HTML tag (e.g., <!DOCTYPE, <html, <div, <svg, <style)
    const tagMatch = content.match(/(<!DOCTYPE|<html|<div|<svg|<style)[\s\S]*/i);
    if (tagMatch) {
      content = tagMatch[0].trim();
    }
  }

  const timingMs = Date.now() - startTime;

  const result = {
    visualizerHtml: content,
    model: data.model || targetModel,
    usage: data.usage || {},
    timingMs,
  };

  // Save to cache
  visualizerCache.set(hash, result);

  return result;
}

module.exports = {
  generateCustomVisualizer,
};
