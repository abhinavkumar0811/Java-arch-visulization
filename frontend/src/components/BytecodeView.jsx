import React from 'react';
import Editor from '@monaco-editor/react';

export default function BytecodeView({ bytecode }) {
  return (
    <div className="flex-1 w-full bg-[#0d1117]">
      <Editor
        height="100%"
        language="java"
        theme="vs-dark"
        value={bytecode || "No bytecode generated yet. Run the code first."}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 22,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          renderLineHighlight: "none",
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}
