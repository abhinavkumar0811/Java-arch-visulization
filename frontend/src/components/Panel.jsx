import React from 'react';

export default function Panel({ title, badge, children, className = '' }) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <span className="panel-title">{title}</span>
        {badge !== undefined && <span className="panel-badge">{badge}</span>}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}
