import React from 'react';
import Panel from './Panel.jsx';

export default function HeapView({ heap, highlightId }) {
  const ids = Object.keys(heap || {});
  return (
    <Panel title="Heap Memory (Objects & Arrays)" badge={`${ids.length} Objects`}>
      {ids.length === 0 ? (
        <div className="empty-hint">Heap is empty (new Object() or array instantiations will allocate here)</div>
      ) : (
        <div className="heap-grid">
          {ids.map((id) => {
            const obj = heap[id];
            const isHighlighted = String(highlightId) === id;
            return (
              <div key={id} className={`heap-object-card ${isHighlighted ? 'flash' : ''}`}>
                <div className="heap-card-header">
                  <span className="object-type">{obj.class}</span>
                  <span className="object-id">#{id}</span>
                </div>
                <div className="heap-card-body">
                  {Object.entries(obj.fields).map(([k, v]) => (
                    <div className="heap-field-row" key={k}>
                      <span className="field-name">{k}</span>
                      <span className="field-value">{formatFieldValue(v)}</span>
                    </div>
                  ))}
                  {Object.keys(obj.fields).length === 0 && (
                    <div className="empty-hint small">no instance fields</div>
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

function formatFieldValue(v) {
  if (v && typeof v === 'object' && v.__ref) return <span className="heap-ref-tag">→ #${v.__ref}</span>;
  if (Array.isArray(v)) return `[ ${v.join(', ')} ]`;
  if (v === null || v === undefined) return <span className="null-tag">null</span>;
  return String(v);
}
