import React from 'react';

export default function ConsoleView({ lines }) {
  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-controls">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
        <div className="terminal-title">user@jvm-visualizer:~$ stdout</div>
      </div>
      <div className="terminal-body">
        {lines.length === 0 ? (
          <div className="terminal-empty">
            <span className="prompt">$</span> Output will appear here as System.out.print() executes...
          </div>
        ) : (
          <pre className="terminal-pre">
            <span className="prompt">$ java Main</span>
            {'\n'}
            {lines.join('')}
          </pre>
        )}
      </div>
    </div>
  );
}
