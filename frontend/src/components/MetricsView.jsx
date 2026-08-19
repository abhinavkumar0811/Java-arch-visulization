import React from 'react';
import Panel from './Panel.jsx';

export default function MetricsView({ step, total, heapCount, threadCount, stackDepth = 0 }) {
  return (
    <Panel title="JVM Telemetry & Metrics">
      <div className="metrics-grid">
        <div className="metric-card step-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-data">
            <div className="metric-value">{step} <span className="metric-sub">/ {total}</span></div>
            <div className="metric-label">Execution Step</div>
          </div>
        </div>
        <div className="metric-card heap-card">
          <div className="metric-icon">📦</div>
          <div className="metric-data">
            <div className="metric-value">{heapCount}</div>
            <div className="metric-label">Heap Allocations</div>
          </div>
        </div>
        <div className="metric-card stack-card">
          <div className="metric-icon">📚</div>
          <div className="metric-data">
            <div className="metric-value">{stackDepth}</div>
            <div className="metric-label">Stack Depth</div>
          </div>
        </div>
        <div className="metric-card thread-card">
          <div className="metric-icon">🧵</div>
          <div className="metric-data">
            <div className="metric-value">{threadCount}</div>
            <div className="metric-label">Active Threads</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
