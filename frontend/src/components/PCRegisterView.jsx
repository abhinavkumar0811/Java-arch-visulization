import React from 'react';

export default function PCRegisterView({ activeLine, onInfoClick }) {
  // Try to parse the bytecode line if we had it, but for now we just show the active line.
  return (
    <div className="bg-surface border border-border-subtle rounded-lg h-24 flex flex-col shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-pc-register"></div>
      <div className="bg-surface-container border-b border-border-subtle px-panel-padding py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-label-caps font-label-caps text-pc-register uppercase tracking-wider font-bold mt-[2px]">PC Register</div>
          <button onClick={onInfoClick} className="text-pc-register/50 hover:text-pc-register transition-colors flex items-center" title="About PC Register">
            <span className="material-symbols-outlined text-[14px]">info</span>
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-between px-panel-padding bg-[#06B6D4]/5">
        <div className="text-headline-lg font-headline-lg text-on-surface font-bold">
          {activeLine ? `Line ${activeLine}` : 'Idle'}
        </div>
        {activeLine && (
          <div className="font-code-md text-code-md text-pc-register monospaced-digits bg-surface-container px-2 py-1 rounded border border-border-subtle">
            Executing...
          </div>
        )}
      </div>
    </div>
  );
}
