import React from 'react';
import Panel from './Panel.jsx';

const STATUS_COLOR = {
  RUNNING: '#10b981',
  RUNNABLE: '#f59e0b',
  WAITING: '#38bdf8',
  TERMINATED: '#6b7280'
};

export default function ThreadsView({ threads, activeThreadId }) {
  const ids = Object.keys(threads || {});
  return (
    <Panel title="Threads & Call Stack" badge={`${ids.length} Active`}>
      {ids.length === 0 ? (
        <div className="empty-hint">No threads running</div>
      ) : (
        <div className="threads-container">
          {ids.map((id) => {
            const t = threads[id];
            const isActive = activeThreadId === id || ids.length === 1;
            return (
              <div key={id} className={`thread-block ${isActive ? 'active-thread' : ''}`}>
                <div className="thread-header">
                  <span className="thread-dot" style={{ background: STATUS_COLOR[t.status] || '#888' }} />
                  <span className="thread-name">🧵 {t.name}</span>
                  <span className={`status-tag status-${t.status.toLowerCase()}`}>{t.status}</span>
                </div>
                <div className="stack-frames">
                  {t.callStack.length === 0 ? (
                    <div className="empty-hint small">Stack Frame Empty</div>
                  ) : (
                    [...t.callStack].reverse().map((frame, idx) => (
                      <div key={idx} className={`stack-frame ${idx === 0 ? 'top-frame' : ''}`}>
                        <div className="stack-frame-title">
                          <span className="frame-method">
                            {idx === 0 && <span className="top-indicator">➔ </span>}
                            {frame.className}.{frame.method}()
                          </span>
                          {frame.line && <span className="frame-line">Line {frame.line}</span>}
                        </div>
                        {Object.keys(frame.vars).length > 0 && (
                          <div className="frame-vars">
                            {Object.entries(frame.vars).map(([k, v]) => (
                              <span className="var-chip" key={k}>
                                <span className="var-name">{k}</span> = <span className="var-val">{formatVar(v)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function formatVar(v) {
  if (v && typeof v === 'object' && v.__ref) return `#${v.__ref}`;
  if (v === null || v === undefined) return 'null';
  return String(v);
}
