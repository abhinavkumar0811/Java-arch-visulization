import React from 'react';

export default function CallStackView({ currentThread, onInfoClick }) {
  const frames = currentThread ? currentThread.callStack : [];

  return (
    <div className="bg-surface border border-border-subtle rounded-lg flex-[2] flex flex-col shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-stack"></div>
      <div className="bg-surface-container border-b border-border-subtle px-panel-padding py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-label-caps font-label-caps text-stack uppercase tracking-wider font-bold">Call Stack</div>
          <button onClick={onInfoClick} className="text-stack/50 hover:text-stack transition-colors flex items-center" title="About Call Stack">
            <span className="material-symbols-outlined text-[14px]">info</span>
          </button>
        </div>
        <span className="material-symbols-outlined text-stack/70 text-[16px]">layers</span>
      </div>
      <div className="p-panel-padding overflow-auto scrollbar-hide flex-1 flex flex-col-reverse gap-2 bg-surface-container-low">
        {frames.length === 0 ? (
          <div className="text-on-surface-variant/50 italic text-center py-4 font-body-sm text-body-sm my-auto">
            No active stack frames.
          </div>
        ) : (
          frames.map((frame, idx) => {
            const isActive = idx === frames.length - 1;
            return (
              <div key={idx} className={isActive ? "bg-stack/10 border border-stack rounded p-2" : "bg-surface border border-border-subtle rounded p-2 opacity-60"}>
                <div className="flex justify-between items-center mb-2">
                  <div className={`font-code-sm text-code-sm ${isActive ? 'text-stack' : 'text-on-surface'} font-bold`}>
                    {frame.className}.{frame.method}
                  </div>
                  {isActive && <span className="text-[9px] bg-stack/20 text-stack px-1 rounded monospaced-digits">FRAME-ACTIVE</span>}
                </div>
                
                <table className="w-full text-left font-code-sm text-[10px]">
                  <tbody className="divide-y divide-border-subtle/30 text-on-surface-variant">
                    {Object.entries(frame.vars || {}).map(([vname, vval]) => (
                      <tr key={vname}>
                        <td className="py-1">{vname}</td>
                        <td className="py-1 text-right text-heap monospaced-digits">
                          {typeof vval === 'object' && vval !== null ? (vval.__ref ? `@${vval.__ref}` : vval.__string ? `String@${vval.__string}` : JSON.stringify(vval)) : String(vval)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
