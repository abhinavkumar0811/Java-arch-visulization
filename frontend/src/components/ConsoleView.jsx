import React from 'react';
import Panel from './Panel.jsx';

export default function ConsoleView({ lines }) {
  return (
    <Panel title="Console (stdout)">
      <div className="console">
        {lines.length === 0 && <div className="empty-hint">Nothing printed yet</div>}
        <pre className="console-pre">{lines.join('')}</pre>
      </div>
    </Panel>
  );
}
