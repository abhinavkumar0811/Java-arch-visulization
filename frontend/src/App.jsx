import React, { useEffect, useRef, useState } from 'react';
import CodeEditor from './components/CodeEditor.jsx';
import MethodAreaView from './components/MethodAreaView.jsx';
import HeapView from './components/HeapView.jsx';
import ThreadsView from './components/ThreadsView.jsx';
import MetricsView from './components/MetricsView.jsx';
import ConsoleView from './components/ConsoleView.jsx';
import StepControls from './components/StepControls.jsx';
import { EXAMPLES, DEFAULT_EXAMPLE } from './examples.js';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function App() {
  const [exampleName, setExampleName] = useState(DEFAULT_EXAMPLE);
  const [code, setCode] = useState(EXAMPLES[DEFAULT_EXAMPLE]);
  const [trace, setTrace] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const current = trace[index] || null;

  async function runCode() {
    setLoading(true);
    setError(null);
    setPlaying(false);
    setTrace([]);
    setIndex(0);
    try {
      const res = await fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        if (data.trace) setTrace(data.trace);
      } else {
        setTrace(data.trace);
      }
    } catch (e) {
      setError('Could not reach backend at ' + API_BASE + '/api/execute — is the server running (npm start in /backend)?');
    } finally {
      setLoading(false);
    }
  }

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

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') {
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setIndex((i) => Math.min(trace.length - 1, i + 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trace.length]);

  function handleExampleChange(name) {
    setExampleName(name);
    setCode(EXAMPLES[name]);
    setTrace([]);
    setIndex(0);
    setError(null);
  }

  const activeThread = current?.threads
    ? Object.values(current.threads).find(t => t.id === current.threadId) || Object.values(current.threads)[0]
    : null;

  const activeLine = current?.line || (activeThread?.callStack?.slice(-1)[0]?.line || null);
  const stackDepth = activeThread?.callStack?.length || 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">☕</div>
          <div>
            <h1>JVM Visualizer</h1>
            <p className="subtitle">Interactive Step-by-step Java Execution — Method Area · Heap · Stack · Threads</p>
          </div>
        </div>
        <div className="toolbar">
          <div className="example-picker">
            <span className="picker-label">Preset:</span>
            <select className="example-select" value={exampleName} onChange={(e) => handleExampleChange(e.target.value)}>
              {Object.keys(EXAMPLES).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <button className="run-btn" onClick={runCode} disabled={loading}>
            {loading ? 'Running...' : '▶ Run Code'}
          </button>
        </div>
      </header>

      <main className="main-grid">
        <section className="left-col">
          <CodeEditor code={code} setCode={setCode} activeLine={activeLine} onRun={runCode} />
          {error && <div className="error-banner">❌ {error}</div>}
          <StepControls
            index={index}
            total={trace.length}
            playing={playing}
            onPrev={() => setIndex((i) => Math.max(0, i - 1))}
            onNext={() => setIndex((i) => Math.min(trace.length - 1, i + 1))}
            onPlayPause={() => setPlaying((p) => !p)}
            onReset={() => { setIndex(0); setPlaying(false); }}
            onScrub={(v) => { setIndex(v); setPlaying(false); }}
            speed={speed}
            setSpeed={setSpeed}
            currentEvent={current}
          />
          <ConsoleView lines={current?.stdout || []} />
        </section>

        <section className="mid-col">
          <MethodAreaView methodArea={current?.methodArea || {}} />
          <HeapView heap={current?.heap || {}} />
        </section>

        <section className="right-col">
          <MetricsView
            step={trace.length ? index + 1 : 0}
            total={trace.length}
            heapCount={current ? Object.keys(current.heap).length : 0}
            threadCount={current ? Object.keys(current.threads).length : 0}
            stackDepth={stackDepth}
          />
          <ThreadsView threads={current?.threads || {}} activeThreadId={current?.threadId} />
        </section>
      </main>
    </div>
  );
}
