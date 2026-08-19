import React from 'react';
import Panel from './Panel.jsx';

export default function MetricsView({ step, total, heapCount, threadCount }) {
  return (
    <Panel title="Metrics">
      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-value">{step}</div>
          <div className="metric-label">Step</div>
        </div>
        <div className="metric">
          <div className="metric-value">{total}</div>
          <div className="metric-label">Total Steps</div>
        </div>
        <div className="metric">
          <div className="metric-value">{heapCount}</div>
          <div className="metric-label">Heap Objects</div>
        </div>
        <div className="metric">
          <div className="metric-value">{threadCount}</div>
          <div className="metric-label">Threads</div>
        </div>
      </div>
    </Panel>
  );
}
