import React from 'react';
import Panel from './Panel.jsx';

export default function MethodAreaView({ methodArea, highlight }) {
  const classNames = Object.keys(methodArea || {});
  return (
    <Panel title="Method Area" badge={classNames.length}>
      {classNames.length === 0 && <div className="empty-hint">No classes loaded yet</div>}
      {classNames.map((name) => (
        <div key={name} className={`entry-card ${highlight === name ? 'flash' : ''}`}>
          <div className="entry-card-title">class {name}</div>
          {methodArea[name].fields.length > 0 && (
            <div className="entry-row">
              <span className="entry-label">fields</span>
              <span className="entry-value">{methodArea[name].fields.join(', ')}</span>
            </div>
          )}
          <div className="entry-row">
            <span className="entry-label">methods</span>
            <span className="entry-value">{methodArea[name].methods.join(', ')}</span>
          </div>
        </div>
      ))}
    </Panel>
  );
}
