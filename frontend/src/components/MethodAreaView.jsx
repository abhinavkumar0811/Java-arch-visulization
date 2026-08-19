import React from 'react';
import Panel from './Panel.jsx';

export default function MethodAreaView({ methodArea, highlight }) {
  const classNames = Object.keys(methodArea || {});
  return (
    <Panel title="Method Area (Class Templates)" badge={`${classNames.length} Loaded`}>
      {classNames.length === 0 ? (
        <div className="empty-hint">Method Area is empty (classes load dynamically during step execution)</div>
      ) : (
        <div className="method-area-grid">
          {classNames.map((name) => {
            const clsData = methodArea[name];
            return (
              <div key={name} className={`class-template-card ${highlight === name ? 'flash' : ''}`}>
                <div className="class-header">
                  <span className="class-icon">🏛️</span>
                  <span className="class-name">class {name}</span>
                  {clsData.superClass && <span className="super-badge">extends {clsData.superClass}</span>}
                </div>
                {clsData.fields && clsData.fields.length > 0 && (
                  <div className="class-section">
                    <div className="section-title">Fields ({clsData.fields.length})</div>
                    <div className="field-chips">
                      {clsData.fields.map(f => (
                        <span key={f} className="field-chip">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="class-section">
                  <div className="section-title">Methods ({clsData.methods.length})</div>
                  <div className="method-list">
                    {clsData.methods.map(m => (
                      <div key={m} className="method-item">
                        <span className="method-icon">⚡</span> {m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
