import React from 'react';

export default function ThreadsView({ threads, activeThreadId, onInfoClick }) {
  const threadList = Object.values(threads || {});

  return (
    <div className="bg-surface border border-border-subtle rounded-lg flex-1 flex flex-col shadow-sm">
      <div className="bg-surface-container border-b border-border-subtle px-panel-padding py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider font-bold">Threads</div>
          <button onClick={onInfoClick} className="text-on-surface-variant/50 hover:text-on-surface-variant transition-colors flex items-center" title="About Threads">
            <span className="material-symbols-outlined text-[14px]">info</span>
          </button>
        </div>
      </div>
      <div className="p-panel-padding overflow-auto scrollbar-hide flex-1 flex flex-col gap-1">
        {threadList.length === 0 ? (
          <div className="text-on-surface-variant/50 italic text-center py-4 font-body-sm text-body-sm my-auto">
            No threads running.
          </div>
        ) : (
          threadList.map(t => {
            const isActive = t.id === activeThreadId;
            return (
              <div key={t.id} className={`flex items-center justify-between p-2 rounded ${isActive ? 'bg-surface-container-high border border-border-subtle' : 'hover:bg-surface-container transition-colors'}`}>
                <div className={`flex items-center gap-2 ${!isActive ? 'opacity-50' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-pc-register shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-outline-variant'}`}></div>
                  <span className={`font-code-sm text-code-sm ${isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {t.name}
                  </span>
                </div>
                <span className={`text-[10px] font-code-sm ${isActive ? 'text-pc-register' : 'text-on-surface-variant opacity-50'}`}>
                  {t.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
