import React, { useRef } from 'react';

export default function CodeEditor({ code, setCode, activeLine, onRun }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const lines = code.split('\n');

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (onRun) onRun();
    }
  }

  function handleScroll(e) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  }

  return (
    <div className="editor-panel">
      <div className="editor-header">
        <div className="editor-title">
          <span className="file-icon">📄</span> Main.java
        </div>
        <div className="editor-hint">Press Tab to indent • Ctrl+Enter to Run</div>
      </div>
      <div className="editor-container">
        <div className="editor-gutter" ref={gutterRef}>
          {lines.map((_, i) => (
            <div key={i} className={activeLine === i + 1 ? 'gutter-line active' : 'gutter-line'}>
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          spellCheck={false}
          value={code}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
    </div>
  );
}
