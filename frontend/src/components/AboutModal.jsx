import React from 'react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border-subtle rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="JavaFlow Icon" className="h-10 w-10 object-contain" />
            <div>
              <h2 className="text-on-surface font-bold text-2xl leading-tight">About JavaFlow</h2>
              <p className="text-on-surface-variant text-body-sm mt-1">v1.0.0 • Open Source Educational Tool</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5 text-[14px] text-on-surface-variant leading-relaxed">
          <section>
            <h3 className="text-on-surface font-bold text-[15px] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">visibility</span>
              What is JavaFlow?
            </h3>
            <p>
              JavaFlow is an interactive <strong>Java Memory Management</strong> and <strong>Data Structures & Algorithms (DSA) Visualizer</strong>. 
              Unlike static parsers, JavaFlow attaches directly to a running Java Virtual Machine (JVM) using the Java Debug Interface (JDI) to trace bytecode execution step-by-step.
            </p>
          </section>

          <section>
            <h3 className="text-on-surface font-bold text-[15px] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">flag</span>
              Our Goal
            </h3>
            <p>
              Our mission is to make learning Java internals intuitive. We want to help students and developers visualize exactly how the Call Stack, Heap Memory, and Object References evolve during execution, and provide AI-generated diagrams to understand complex algorithms instantly.
            </p>
          </section>

          <section className="bg-surface-container-low p-4 rounded-lg border border-border-subtle">
            <h3 className="text-on-surface font-bold text-[15px] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">code</span>
              100% Free & Open Source
            </h3>
            <p className="mb-4">
              JavaFlow is entirely open-source and community-driven. We welcome contributions, feature requests, and bug reports!
            </p>
            <div className="flex flex-wrap gap-3">
              <a 
                href="https://github.com/abhinavkumar0811/Java-arch-visulization" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 bg-[#24292e] text-white hover:bg-[#2f363d] px-4 py-2 rounded-lg font-bold text-[13px] transition-colors"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
                Star on GitHub
              </a>
              <a 
                href="https://github.com/abhinavkumar0811/Java-arch-visulization/issues/new?template=bug_report.yml" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 border border-border-subtle bg-surface hover:bg-surface-container text-on-surface px-4 py-2 rounded-lg font-bold text-[13px] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">bug_report</span>
                Report a Bug
              </a>
              <a 
                href="https://github.com/abhinavkumar0811/Java-arch-visulization/issues/new?template=feature_request.yml" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 border border-border-subtle bg-surface hover:bg-surface-container text-on-surface px-4 py-2 rounded-lg font-bold text-[13px] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                Suggest Feature
              </a>
            </div>
          </section>
        </div>
        
        {/* Footer */}
        <div className="pt-2 text-center text-[12px] text-on-surface-variant/70 border-t border-border-subtle">
          Developed by Avinash Mourya & Abhinav Chaubey
        </div>
      </div>
    </div>
  );
}
