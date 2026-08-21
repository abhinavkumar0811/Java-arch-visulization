import React, { useRef, useEffect } from 'react';

export default function ConsoleView({ lines }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="bg-surface border border-border-subtle rounded-lg h-32 flex flex-col shadow-sm">
      <div className="bg-surface-container border-b border-border-subtle px-panel-padding py-2 flex items-center justify-between">
        <div className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Console (stdout)</div>
      </div>
      <div ref={containerRef} className="p-panel-padding font-code-sm text-code-sm text-on-surface-variant overflow-auto scrollbar-hide flex-1">
        {lines.length === 0 ? (
          <div className="text-on-surface-variant/50 italic text-center py-2">No output yet...</div>
        ) : (
          lines.map((line, idx) => (
            <div key={idx}>&gt; {line}</div>
          ))
        )}
      </div>
    </div>
  );
}
