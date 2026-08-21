import React from 'react';

export default function MethodAreaView({ methodArea, onInfoClick }) {
  const classes = Object.values(methodArea);

  return (
    <div className="bg-surface border border-border-subtle rounded-lg flex-1 flex flex-col shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-method-area"></div>
      <div className="bg-surface-container border-b border-border-subtle px-panel-padding py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-label-caps font-label-caps text-method-area uppercase tracking-wider font-bold">Method Area</div>
          <button onClick={onInfoClick} className="text-method-area/50 hover:text-method-area transition-colors flex items-center" title="About Method Area">
            <span className="material-symbols-outlined text-[14px]">info</span>
          </button>
        </div>
        <span className="material-symbols-outlined text-method-area/70 text-[16px]">account_tree</span>
      </div>
      <div className="p-panel-padding overflow-auto scrollbar-hide flex-1">
        {classes.length === 0 ? (
          <div className="text-on-surface-variant/50 italic text-center py-4 font-body-sm text-body-sm">
            No classes loaded yet.
          </div>
        ) : (
          <table className="w-full text-left font-code-sm text-code-sm border-collapse">
            <thead>
              <tr className="text-on-surface-variant border-b border-border-subtle">
                <th className="pb-1 font-normal">Class</th>
                <th className="pb-1 font-normal text-right">Offset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 text-on-surface">
              {classes.map(cls => (
                <tr key={cls.name}>
                  <td className="py-2">
                    <div className="font-bold">{cls.name}</div>
                    {cls.fields && cls.fields.map(f => (
                      <div key={f.name} className="text-on-surface-variant pl-2">- {f.name} ({f.type})</div>
                    ))}
                    {cls.methods && cls.methods.map(m => (
                      <div key={m.name} className="text-on-surface-variant pl-2">- {m.name}()</div>
                    ))}
                  </td>
                  <td className="py-2 text-right monospaced-digits text-on-surface-variant">
                    0x{Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
