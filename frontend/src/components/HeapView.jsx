import React from 'react';
import Panel from './Panel.jsx';

export default function HeapView({ heap, highlightId }) {
  const ids = Object.keys(heap || {});
  return (
    <Panel title="Heap" badge={ids.length}>
      {ids.length === 0 && <div className="empty-hint">No objects allocated yet</div>}
      <div className="heap-grid">
        {ids.map((id) => {
          const obj = heap[id];
          return (
            <div key={id} className={`heap-object ${String(highlightId) === id ? 'flash' : ''}`}>
              <div className="heap-object-title">{obj.class} <span className="heap-id">#{id}</span></div>
              {Object.entries(obj.fields).map(([k, v]) => (
                <div className="entry-row small" key={k}>
                  <span className="entry-label">{k}</span>
                  <span className="entry-value">{formatFieldValue(v)}</span>
                </div>
              ))}
              {Object.keys(obj.fields).length === 0 && <div className="entry-row small muted">no fields</div>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function formatFieldValue(v) {
  if (v && typeof v === 'object' && v.__ref) return `→ #${v.__ref}`;
  if (v === null || v === undefined) return 'null';
  return String(v);
}
