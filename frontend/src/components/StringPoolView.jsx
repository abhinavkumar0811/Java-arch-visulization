import React from 'react';
import Panel from './Panel.jsx';

export default function StringPoolView({ stringPool }) {
  const ids = Object.keys(stringPool || {});
  return (
    <Panel title="String Pool" badge={ids.length} infoTooltip="A special storage area in the Heap for caching string literals to save memory.">
      {ids.length === 0 && <div className="empty-hint">No strings interned yet</div>}
      <div className="heap-grid">
        {ids.map((id) => (
          <div key={id} className="entry-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--accent-primary-hover)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>"{stringPool[id]}"</span>
            <span className="heap-id">#{id}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
