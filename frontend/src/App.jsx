import React, { useEffect, useMemo, useRef, useState } from 'react';
import CodeEditor from './components/CodeEditor.jsx';
import MethodAreaView from './components/MethodAreaView.jsx';
import HeapView from './components/HeapView.jsx';
import ThreadsView from './components/ThreadsView.jsx';
import CallStackView from './components/CallStackView.jsx';
import PCRegisterView from './components/PCRegisterView.jsx';
import ConsoleView from './components/ConsoleView.jsx';
import TutorView from './components/TutorView.jsx';
import BytecodeView from './components/BytecodeView.jsx';
import InfoModal from './components/InfoModal.jsx';
import { EXAMPLES, DEFAULT_EXAMPLE } from './examples.js';

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://java-arch-visulization.onrender.com').replace(/\/$/, '');

export default function App() {
  const [exampleName, setExampleName] = useState(DEFAULT_EXAMPLE);
  const [code, setCode] = useState(EXAMPLES[DEFAULT_EXAMPLE]);
  const [bytecode, setBytecode] = useState('');
  const [activeTab, setActiveTab] = useState('source');
  const [trace, setTrace] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1200);
  const [error, setError] = useState(null);
  const [infoModal, setInfoModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const current = trace[index] || null;

  async function runCode() {
    setLoading(true);
    setError(null);
    setPlaying(false);
    setTrace([]);
    setBytecode('');
    setIndex(0);
    setActiveTab('source');
    if (isEditorExpanded) setIsEditorExpanded(false);
    try {
      const res = await fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.bytecode) setBytecode(data.bytecode);
      
      if (data.error) {
        setError(data.error);
        if (data.trace) setTrace(data.trace);
      } else {
        setTrace(data.trace);
      }
    } catch (e) {
      setError('Could not reach backend at ' + API_BASE + '/api/execute');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && !error && trace.length > 0) {
      setPlaying(true);
    }
  }, [loading, error, trace.length]);

  useEffect(() => {
    if (!playing) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setIndex((i) => {
        if (i >= trace.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [playing, speed, trace.length]);

  function handleExampleChange(name) {
    setExampleName(name);
    setCode(EXAMPLES[name]);
    setTrace([]);
    setIndex(0);
    setError(null);
  }

  function handleCodeChange(newCode) {
    setCode(newCode);
    if (exampleName !== 'Default' && newCode !== EXAMPLES[exampleName]) {
      setExampleName('Default');
    }
  }

  const activeThread = current?.threads ? Object.values(current.threads).find(t => t.id === current.threadId) : null;
  const activeLine = activeThread?.callStack?.slice(-1)[0]?.line || null;

  const total = trace.length;
  const progressPercent = total > 0 ? (index / (total - 1)) * 100 : 0;

  return (
    <div style={{ '--speed-mult': speed / 1200 }} className="flex flex-col h-screen w-screen overflow-hidden bg-surface-container-lowest">
      <nav className="flex justify-between items-center w-full px-grid-margin h-14 z-50 bg-surface border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <img src="/logo-full.png" alt="JavaFlow Logo" className="h-11 w-auto object-contain" />
          </div>
          <div className="flex gap-4">
            <select 
              className="bg-surface-container-high text-on-surface-variant border border-border-subtle px-2 py-1 rounded text-body-sm outline-none cursor-pointer hover:border-outline"
              value={exampleName} 
              onChange={(e) => handleExampleChange(e.target.value)}
            >
              {Object.keys(EXAMPLES).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-1 justify-center max-w-xl">
          <button onClick={() => { setIndex(0); setPlaying(false); }} className="text-on-surface-variant hover:text-on-surface shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors" title="Reset to Start"><span className="material-symbols-outlined text-[20px] leading-none">skip_previous</span></button>
          <button onClick={() => setIndex(i => Math.max(0, i - 1))} className="text-on-surface-variant hover:text-on-surface shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors" title="Step Back"><span className="material-symbols-outlined text-[20px] leading-none">navigate_before</span></button>
          <button onClick={() => setPlaying(p => !p)} className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center shrink-0 transition-colors" title="Play/Pause">
            <span className="material-symbols-outlined text-[24px] leading-none">{playing ? 'pause' : 'play_arrow'}</span>
          </button>
          <button onClick={() => setIndex(i => Math.min(total - 1, i + 1))} className="text-on-surface-variant hover:text-on-surface shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors" title="Step Forward"><span className="material-symbols-outlined text-[20px] leading-none">navigate_next</span></button>
          <button onClick={() => { setIndex(total > 0 ? total - 1 : 0); setPlaying(false); }} className="text-on-surface-variant hover:text-on-surface shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors" title="Skip to End"><span className="material-symbols-outlined text-[20px] leading-none">skip_next</span></button>
          
          <div className="flex items-center gap-2 ml-4 w-full text-code-sm font-code-sm text-on-surface-variant monospaced-digits">
            <span className="shrink-0">Step {total > 0 ? index + 1 : 0}/{total}</span>
            <div className="h-1 bg-surface-container-high flex-1 rounded-full overflow-hidden relative cursor-pointer" onClick={(e) => {
               if (total === 0) return;
               const rect = e.currentTarget.getBoundingClientRect();
               const clickX = e.clientX - rect.left;
               const newPct = clickX / rect.width;
               setIndex(Math.floor(newPct * (total - 1)));
               setPlaying(false);
            }}>
              <div className="h-full bg-primary absolute top-0 left-0" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 bg-surface-container px-2 py-1 rounded border border-border-subtle" title="Playback Speed">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">speed</span>
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="100" 
              value={2100 - speed} 
              onChange={(e) => setSpeed(2100 - Number(e.target.value))}
              className="w-20 accent-primary cursor-pointer"
            />
            <span className="text-on-surface-variant text-[11px] font-bold w-6 text-right monospaced-digits">
              {speed === 1200 ? '1x' : (1200 / speed).toFixed(1).replace('.0', '') + 'x'}
            </span>
          </div>
          <button onClick={() => { setIndex(0); setPlaying(false); }} className="border border-border-subtle hover:border-outline text-on-surface px-3 py-1 rounded text-label-caps font-label-caps transition-colors">Reset</button>
          <button onClick={runCode} disabled={loading} className="bg-primary text-on-primary hover:bg-primary-fixed transition-colors px-4 py-1 rounded text-label-caps font-label-caps font-bold">
            {loading ? 'Running...' : 'Run'}
          </button>
        </div>
      </nav>

      <main className="flex-1 flex gap-gutter p-gutter overflow-hidden bg-surface-container-lowest">
        <section className={`flex flex-col gap-gutter h-full transition-all duration-300 ${isEditorExpanded ? 'w-full' : 'w-[40%]'}`}>
          <div className="bg-surface border border-border-subtle rounded-lg flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="bg-surface-container border-b border-border-subtle px-panel-padding py-2 flex items-center justify-between">
              <div className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider flex gap-4">
                <button onClick={() => setActiveTab('source')} className={activeTab === 'source' ? "text-on-surface border-b border-on-surface pb-1" : "opacity-50 hover:opacity-100 transition-opacity"}>Source Code (.java)</button>
                <button onClick={() => setActiveTab('bytecode')} className={activeTab === 'bytecode' ? "text-on-surface border-b border-on-surface pb-1" : "opacity-50 hover:opacity-100 transition-opacity"}>Bytecode (.class)</button>
              </div>
              <div className="flex items-center gap-1 text-on-surface-variant">
                <button onClick={() => setCode(EXAMPLES[exampleName])} className="hover:text-on-surface w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors" title="Reset Code">
                  <span className="material-symbols-outlined text-[18px] leading-none">refresh</span>
                </button>
                <button onClick={() => setIsEditorExpanded(e => !e)} className="hover:text-on-surface w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors" title={isEditorExpanded ? "Collapse" : "Expand Fullscreen"}>
                  <span className="material-symbols-outlined text-[18px] leading-none">{isEditorExpanded ? 'fullscreen_exit' : 'fullscreen'}</span>
                </button>
                <div className="w-[1px] h-4 bg-border-subtle mx-1"></div>
                <span className="material-symbols-outlined text-[18px] leading-none ml-1" title="Code Editor">code</span>
              </div>
            </div>
            
            {activeTab === 'source' ? (
              <CodeEditor code={code} setCode={handleCodeChange} activeLine={activeLine} />
            ) : (
              <BytecodeView bytecode={bytecode} />
            )}
          </div>
          
          {error && <div className="bg-error-container text-error p-4 rounded-lg text-body-sm font-code-sm whitespace-pre-wrap">{error}</div>}
          <TutorView prev={trace[index - 1]} curr={current} activeLine={activeLine} />
          <ConsoleView lines={current?.stdout || []} />
        </section>

        {!isEditorExpanded && (
          <>
            <section className="flex flex-col gap-gutter w-[30%] h-full">
              <MethodAreaView methodArea={current?.methodArea || {}} onInfoClick={() => setInfoModal('METHOD_AREA')} />
              <HeapView heap={current?.heap || {}} stringPool={current?.stringPool || {}} onInfoClick={() => setInfoModal('HEAP')} />
              <PCRegisterView activeLine={activeLine} onInfoClick={() => setInfoModal('PC_REGISTER')} />
            </section>

            <section className="flex flex-col gap-gutter w-[30%] h-full">
              <CallStackView currentThread={activeThread} onInfoClick={() => setInfoModal('CALL_STACK')} />
              <ThreadsView threads={current?.threads || {}} activeThreadId={current?.threadId} onInfoClick={() => setInfoModal('THREADS')} />
            </section>
          </>
        )}
      </main>
      
      <InfoModal type={infoModal} onClose={() => setInfoModal(null)} />
    </div>
  );
}
