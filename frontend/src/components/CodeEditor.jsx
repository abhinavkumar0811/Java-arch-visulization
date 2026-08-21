import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
let isJavaSnippetsRegistered = false;

export default function CodeEditor({ code, setCode, activeLine }) {
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    
    monaco.editor.defineTheme('jvm-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0d1117',
        'editor.lineHighlightBackground': '#10b98122',
      }
    });
    monaco.editor.setTheme('jvm-theme');
    
    if (!isJavaSnippetsRegistered) {
      monaco.languages.registerCompletionItemProvider('java', {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          const javaClasses = [
            'String', 'Object', 'System', 'Integer', 'Double', 'Boolean', 'Math', 
            'ArrayList', 'List', 'Map', 'HashMap', 'Set', 'HashSet', 'Scanner', 
            'File', 'Arrays', 'Collections', 'Thread', 'Runnable', 'Exception', 
            'RuntimeException', 'IllegalArgumentException', 'NullPointerException', 
            'LinkedList', 'TreeMap', 'TreeSet', 'Queue', 'Stack'
          ];
          
          const classSuggestions = javaClasses.map(cls => ({
            label: cls,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: cls,
            range: range
          }));

          return {
            suggestions: [
              ...classSuggestions,
              {
                label: 'sout',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'System.out.println(${1:});',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Print to standard output',
                range: range,
              },
              {
                label: 'psvm',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: [
                  'public static void main(String[] args) {',
                  '\t$0',
                  '}'
                ].join('\n'),
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Main method',
                range: range,
              },
              {
                label: 'fori',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: [
                  'for (int ${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++) {',
                  '\t$0',
                  '}'
                ].join('\n'),
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'For loop',
                range: range,
              },
              {
                label: 'class',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: [
                  'class ${1:Main} {',
                  '\t$0',
                  '}'
                ].join('\n'),
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Class declaration',
                range: range,
              }
            ]
          };
        }
      });
      isJavaSnippetsRegistered = true;
    }
    
    updateHighlight();
  }

  function updateHighlight() {
    if (!editorRef.current) return;
    
    if (!activeLine) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      return;
    }

    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
      {
        range: { startLineNumber: activeLine, startColumn: 1, endLineNumber: activeLine, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: 'code-highlight',
          marginClassName: 'code-highlight-margin'
        }
      }
    ]);
    
    editorRef.current.revealLineInCenter(activeLine);
  }

  useEffect(() => {
    updateHighlight();
  }, [activeLine]);

  return (
    <div className="flex-1 w-full bg-[#0d1117] min-h-0 overflow-hidden">
      <Editor
        height="100%"
        language="java"
        theme="vs-dark"
        value={code}
        onChange={(value) => setCode(value || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 24,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          renderLineHighlight: "none",
          padding: { top: 16, bottom: 16 },
          wordWrap: "on",
        }}
      />
    </div>
  );
}
