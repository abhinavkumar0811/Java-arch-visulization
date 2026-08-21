import React from 'react';

export default function HeapView({ heap, stringPool, onInfoClick }) {
  const objects = Object.entries(heap || {});
  const strings = Object.entries(stringPool || {});

  return (
    <div className="bg-surface border border-border-subtle rounded-lg flex-1 flex flex-col shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-heap"></div>
      <div className="bg-surface-container border-b border-border-subtle px-panel-padding py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-label-caps font-label-caps text-heap uppercase tracking-wider font-bold">Heap Memory</div>
          <button onClick={onInfoClick} className="text-heap/50 hover:text-heap transition-colors flex items-center" title="About Heap Memory">
            <span className="material-symbols-outlined text-[14px]">info</span>
          </button>
        </div>
        <span className="material-symbols-outlined text-heap/70 text-[16px]">memory</span>
      </div>
      <div className="p-panel-padding overflow-auto scrollbar-hide flex-1 bg-surface-dim relative grid grid-cols-2 lg:grid-cols-4 gap-2 content-start">
        {/* Grid background pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #10B981 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
        
        {objects.length === 0 && strings.length === 0 && (
          <div className="col-span-full text-on-surface-variant/50 italic text-center py-4 font-body-sm text-body-sm relative z-10">
            Heap is empty.
          </div>
        )}

        {/* Regular Objects */}
        {objects.map(([id, obj]) => (
          <div key={id} className={`col-span-2 bg-heap/10 border ${obj.isGarbage ? 'border-error border-dashed opacity-50' : 'border-heap'} rounded p-2 z-10 flash-new`}>
            <div className="flex justify-between items-center mb-1 border-b border-heap/30 pb-1">
              <div className="text-[9px] text-heap font-code-sm monospaced-digits">@{id}</div>
              {obj.isGarbage && <div className="text-[9px] text-error font-code-sm font-bold">GARBAGE</div>}
            </div>
            <div className="font-code-sm text-code-sm text-on-surface font-bold truncate" title={obj.class}>{obj.class}</div>
            
            <div className="mt-1 flex flex-col gap-1">
              {Object.entries(obj.fields || {}).map(([fname, fval]) => (
                <div key={fname} className="font-code-sm text-[10px] text-on-surface-variant truncate" title={`${fname}: ${String(fval)}`}>
                  {fname}: <span className="text-heap">{typeof fval === 'object' && fval !== null ? (fval.__ref ? `@${fval.__ref}` : fval.__string ? `String@${fval.__string}` : JSON.stringify(fval)) : String(fval)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* String Pool Objects */}
        {strings.map(([id, val]) => (
          <div key={`str-${id}`} className="col-span-2 bg-primary/10 border border-primary rounded p-2 z-10 flash-new">
            <div className="flex justify-between items-center mb-1 border-b border-primary/30 pb-1">
              <div className="text-[9px] text-primary font-code-sm monospaced-digits">@{id}</div>
              <div className="text-[9px] text-primary/70 font-code-sm font-bold">STRING POOL</div>
            </div>
            <div className="font-code-sm text-[10px] text-on-surface-variant break-words">
              "<span className="text-syntax-string">{val}</span>"
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
