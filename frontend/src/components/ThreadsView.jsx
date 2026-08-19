import React from 'react';
import Panel from './Panel.jsx';

const STATUS_COLOR = {
  RUNNING: '#4ade80',
  RUNNABLE: '#facc15',
  TERMINATED: '#6b7280'
};

export default function ThreadsView({ threads, activeThreadId }) {
  const ids = Object.keys(threads || {});
  return (
    <Panel title="Threads &amp; Call Stack" badge={ids.length}>
      {ids.length === 0 && <div className="empty-hint">No threads yet</div>}
      {ids.map((id) => {
        const t = threads[id];
        return (
          <div key={id} className={`thread-block ${activeThreadId === id ? 'active-thread' : ''}`}>
            <div className="thread-header">
              <span className="thread-dot" style={{ background: STATUS_COLOR[t.status] || '#888' }} />
              <span className="thread-name">{t.name}</span>
              <span className="thread-status">{t.status}</span>
            </div>
            <div className="stack-frames">
              {t.callStack.length === 0 && <div className="empty-hint small">stack empty</div>}
              {[...t.callStack].reverse().map((frame, idx) => (
                <div key={idx} className={`stack-frame ${idx === 0 ? 'top-frame' : ''}`}>
                  <div className="stack-frame-title">
                    {frame.className}.{frame.method}() {frame.line ? <span className="frame-line">line {frame.line}</span> : null}
                  </div>
                  {Object.keys(frame.vars).length > 0 && (
                    <div className="frame-vars">
                      {Object.entries(frame.vars).map(([k, v]) => (
                        <span className="var-chip" key={k}>{k} = {formatVar(v)}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

function formatVar(v) {
  if (v && typeof v === 'object' && v.__ref) return `obj#${v.__ref}`;
  if (v === null || v === undefined) return 'null';
  return String(v);
}
