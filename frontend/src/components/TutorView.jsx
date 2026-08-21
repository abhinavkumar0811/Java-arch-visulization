import React from 'react';

export default function TutorView({ prev, curr, activeLine }) {
  if (!curr) return null;
  if (!prev) {
    return (
      <div className="bg-primary-container/10 border border-primary-container rounded-lg p-3 flex gap-3 shadow-sm my-3 shrink-0">
        <div className="text-[24px]">🎓</div>
        <div className="font-body-sm text-body-sm text-on-surface">
          <strong>Program Started!</strong><br />
          The JVM has launched and we are starting execution at <span className="text-primary font-bold">line {activeLine}</span>.
        </div>
      </div>
    );
  }
  
  if (curr.description?.startsWith('Exception:')) {
    return (
      <div className="bg-error-container/10 border border-error rounded-lg p-3 flex gap-3 shadow-sm my-3 shrink-0">
        <div className="text-[24px]">💥</div>
        <div className="font-body-sm text-body-sm text-on-surface">
          <strong>Program Crashed!</strong><br />
          <span className="text-error font-bold">{curr.description}</span>
        </div>
      </div>
    );
  }

  if (curr.description === 'Program Terminated') {
    return (
      <div className="bg-primary-container/10 border border-primary-container rounded-lg p-3 flex gap-3 shadow-sm my-3 shrink-0">
        <div className="text-[24px]">✅</div>
        <div className="font-body-sm text-body-sm text-on-surface">
          <strong>Program Terminated Successfully.</strong>
        </div>
      </div>
    );
  }

  const messages = [];
  
  // 1. Stack changes
  const prevThread = prev.threads[curr.threadId] || { callStack: [] };
  const currThread = curr.threads[curr.threadId] || { callStack: [] };
  const prevTopFrame = prevThread.callStack[prevThread.callStack.length - 1];
  const currTopFrame = currThread.callStack[currThread.callStack.length - 1];
  
  const prevVars = prevTopFrame?.vars || {};
  const currVars = currTopFrame?.vars || {};
  
  const addedVars = Object.keys(currVars).filter(k => !prevVars.hasOwnProperty(k));
  if (addedVars.length > 0) {
    let text = addedVars.slice(0, 10).join(', ');
    if (addedVars.length > 10) text += ` and ${addedVars.length - 10} others`;
    messages.push(`Added variable(s) <code class="bg-surface-container px-1 py-0.5 rounded text-primary">${text}</code> to the Stack.`);
  }

  // 2. Heap changes
  const prevHeap = prev.heap || {};
  const currHeap = curr.heap || {};
  
  const addedObjects = Object.keys(currHeap).filter(k => !prevHeap.hasOwnProperty(k));
  if (addedObjects.length > 0) {
    const classNames = addedObjects.slice(0, 5).map(k => {
      const cls = currHeap[k].class.split('.').pop();
      return cls;
    }).join(', ');
    let text = classNames;
    if (addedObjects.length > 5) text += ` and ${addedObjects.length - 5} others`;
    messages.push(`Allocated new <strong>${text}</strong> object(s) on the Heap.`);
  }

  const newGarbage = Object.keys(currHeap).filter(k => currHeap[k].isGarbage && prevHeap[k] && !prevHeap[k].isGarbage);
  if (newGarbage.length > 0) {
    let text = newGarbage.slice(0, 10).join(', ');
    if (newGarbage.length > 10) text += ` and ${newGarbage.length - 10} others`;
    messages.push(`<span class="text-error font-bold">Garbage Collection Alert!</span> Object(s) #${text} lost all references and became Garbage.`);
  }

  // 3. String Pool changes
  const prevPool = prev.stringPool || {};
  const currPool = curr.stringPool || {};
  const addedStrings = Object.keys(currPool).filter(k => !prevPool.hasOwnProperty(k));
  if (addedStrings.length > 0) {
    let items = addedStrings.slice(0, 5).map(k => `"${currPool[k]}"`);
    let text = items.join(', ');
    if (addedStrings.length > 5) text += ` and ${addedStrings.length - 5} others`;
    messages.push(`Added new string(s) to the String Pool: <em>${text}</em>.`);
  }
  
  if (messages.length === 0) {
    messages.push(`Stepped past <span class="text-primary font-bold">line ${activeLine}</span> with no major memory changes.`);
  } else {
    messages.unshift(`<strong>Memory changes after executing <span class="text-primary font-bold">line ${activeLine}</span>:</strong>`);
  }

  return (
    <div className="bg-primary-container/10 border border-primary-container rounded-lg p-3 flex gap-3 shadow-sm my-3 shrink-0 max-h-40 overflow-y-auto scrollbar-hide">
      <div className="text-[24px]">🎓</div>
      <div className="font-body-sm text-body-sm text-on-surface flex flex-col gap-1">
        {messages.map((m, i) => <div key={i} dangerouslySetInnerHTML={{__html: m}} />)}
      </div>
    </div>
  );
}
