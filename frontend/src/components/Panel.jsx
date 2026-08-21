import React from 'react';

export default function Panel({ title, badge, infoTooltip, children, className = '' }) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <span className="panel-title">
          {title}
          {infoTooltip && <span className="info-icon" title={infoTooltip}>?</span>}
        </span>
        {badge !== undefined && <span className="panel-badge">{badge}</span>}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}
