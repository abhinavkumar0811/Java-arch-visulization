import React, { useState } from 'react';

export default function ExecutionErrorNotice({ error, code, onDismiss }) {
  const [showRaw, setShowRaw] = useState(false);

  if (!error) return null;

  const isNonJava = 
    error.includes('JavaFlow currently supports Java only') ||
    error.includes("illegal character: '#'") ||
    error.includes('#include') ||
    (error.includes('class, interface, enum, or record expected') && !/\bclass\s+\w+/.test(code || ''));

  if (isNonJava) {
    return (
      <div className="bg-[#1f1614] border border-[#f85149]/40 rounded-xl p-4 text-left shadow-lg animate-in fade-in duration-200 shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f85149]/15 border border-[#f85149]/30 flex items-center justify-center text-[#f85149] shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">code_off</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-bold text-white text-[14px]">Java Language Only</span>
              <span className="bg-[#f85149]/20 text-[#ff7b72] border border-[#f85149]/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wide">
                Unsupported Language
              </span>
            </div>
            <p className="text-[#c9d1d9] text-[13px] leading-relaxed mb-3">
              JavaFlow is built specifically to visualize the <strong>Java Virtual Machine (JVM)</strong> architecture, bytecode, and heap. Other languages (such as C, C++, Python, or JavaScript) are not supported.
            </p>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-[12px] font-mono text-[#8b949e]">
              <div className="text-[#58a6ff] font-bold text-[11px] uppercase tracking-wider mb-1">
                💡 Required Java Structure:
              </div>
              <div className="text-[#e6edf3]">
                <span className="text-[#ff7b72]">class</span> <span className="text-[#d2a8ff]">Main</span> &#123;<br/>
                &nbsp;&nbsp;<span className="text-[#ff7b72]">public static void</span> <span className="text-[#d2a8ff]">main</span>(String[] args) &#123;<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#8b949e]">// Your Java code here</span><br/>
                &nbsp;&nbsp;&#125;<br/>
                &#125;
              </div>
            </div>

            {error.includes('Main.java:') && (
              <div className="mt-3">
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-[11px] text-[#8b949e] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">{showRaw ? 'expand_less' : 'expand_more'}</span>
                  <span>{showRaw ? 'Hide Raw Compiler Log' : 'Show Raw Compiler Log'}</span>
                </button>
                {showRaw && (
                  <pre className="mt-2 p-2.5 bg-black/40 border border-[#30363d] rounded text-[11px] text-[#f85149] font-mono whitespace-pre-wrap max-h-32 overflow-auto">
                    {error}
                  </pre>
                )}
              </div>
            )}
          </div>
          {onDismiss && (
            <button onClick={onDismiss} className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#30363d]/50 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Standard compile or runtime error
  return (
    <div className="bg-[#da3633]/10 border border-[#da3633]/30 rounded-xl p-3.5 text-[#da3633] text-[12px] font-mono whitespace-pre-wrap max-h-[140px] overflow-auto shadow-sm">
      <div className="flex items-center gap-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-[#ff7b72]">
        <span className="material-symbols-outlined text-[14px]">error</span>
        <span>Execution Error</span>
      </div>
      {error}
    </div>
  );
}
