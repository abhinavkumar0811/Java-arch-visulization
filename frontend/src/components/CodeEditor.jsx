import React from 'react';

export default function CodeEditor({ code, setCode, activeLine }) {
  const lines = code.split('\n');
  return (
    <div className="editor">
      <div className="editor-gutter">
        {lines.map((_, i) => (
          <div key={i} className={activeLine === i + 1 ? 'gutter-line active' : 'gutter-line'}>
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        className="editor-textarea"
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
    </div>
  );
}
