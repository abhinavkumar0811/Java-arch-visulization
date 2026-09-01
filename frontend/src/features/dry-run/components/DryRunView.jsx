import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../design-tokens.css';
import { normalizeTrace, computeLineHits } from '../engines/traceNormalizer.js';
import { fingerprint as computeFingerprint } from '../engines/fingerprinter.js';
import { analyzeStep } from '../engines/traceAnalyzer.js';
import VisualizerCanvas from './VisualizerCanvas.jsx';
import CodeEditor from '../../../components/CodeEditor.jsx';
import RateLimitPopup from './RateLimitPopup.jsx';
import { Group, Panel, Separator } from 'react-resizable-panels';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

// ─── Variable Panel ───────────────────────────────────────────────────────────
function VariablePanel({ variables = {}, prevVariables = {} }) {
  const entries = Object.entries(variables);
  if (entries.length === 0) return (
    <div className="text-[11px] text-[#4d5566] italic px-1">No local variables in scope</div>
  );
  return (
    <div className="flex flex-col gap-1">
      {entries.map(([k, v]) => {
        const prev = prevVariables[k];
        const changed = prev !== undefined && prev !== v;
        const display = Array.isArray(v) ? `[${v.join(', ')}]` : typeof v === 'object' ? JSON.stringify(v) : String(v ?? 'null');
        return (
          <div key={k} className={`flex justify-between items-center px-2 py-1 rounded text-[12px] font-mono transition-colors ${changed ? 'bg-[#1f6feb]/15 border border-[#1f6feb]/40' : 'bg-[#161b22]'}`}>
            <span className="text-[#58a6ff] font-bold">{k}</span>
            <span className={`${changed ? 'text-[#f0c040] font-bold' : 'text-[#adbac7]'}`}>{display.length > 20 ? display.slice(0, 20) + '…' : display}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Call Stack Panel ─────────────────────────────────────────────────────────
function CallStackPanel({ callStack = [] }) {
  if (callStack.length === 0) return (
    <div className="text-[11px] text-[#4d5566] italic px-1">Empty call stack</div>
  );
  return (
    <div className="flex flex-col gap-1">
      {[...callStack].reverse().map((frame, i) => (
        <div key={frame.id} className={`px-3 py-2 rounded-lg border text-[12px] font-mono transition-all overflow-hidden ${i === 0 ? 'bg-[#1f6feb]/15 border-[#1f6feb]/40 text-white' : 'bg-[#161b22] border-[#30363d] text-[#8b949e]'}`}>
          <div className="flex justify-between items-center w-full min-w-0">
            <span className={`font-bold truncate ${i === 0 ? 'text-[#58a6ff]' : 'text-[#6e7681]'}`}>{frame.className ? `${frame.className}.` : ''}{frame.name}()</span>
            <span className="text-[10px] opacity-60 shrink-0 ml-2">line {frame.line}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Console Panel ────────────────────────────────────────────────────────────
function ConsolePanel({ stdout = [] }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [stdout.length]);
  return (
    <div ref={ref} className="font-mono text-[12px] text-[#adbac7] overflow-y-auto max-h-[100px] bg-[#0d1117] rounded-lg p-2 border border-[#30363d]">
      {stdout.length === 0
        ? <span className="text-[#4d5566] italic">No output yet</span>
        : stdout.map((line, i) => <div key={i} className="leading-[18px]">{line}</div>)
      }
    </div>
  );
}

// ─── Metrics Bar ──────────────────────────────────────────────────────────────
function MetricsBar({ metrics = {}, total = 0, step = 0 }) {
  const items = [
    { icon: 'functions', label: 'Ops', value: metrics.operations ?? 0, color: '#10b981' },
    { icon: 'layers', label: 'Stack', value: metrics.stackDepth ?? 0, color: '#f59e0b' },
    { icon: 'storage', label: 'Objects', value: metrics.liveObjects ?? 0, color: '#8b5cf6' },
    { icon: 'timer', label: 'Steps', value: `${step + 1}/${total}`, color: '#58a6ff' },
  ];
  return (
    <div className="flex gap-2">
      {items.map(item => (
        <div key={item.label} className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg p-2 flex flex-col items-center gap-0.5">
          <span className="material-symbols-outlined text-[16px]" style={{ color: item.color }}>{item.icon}</span>
          <span className="text-[15px] font-bold font-mono" style={{ color: item.color }}>{item.value}</span>
          <span className="text-[10px] text-[#6e7681] uppercase tracking-wide">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Fingerprint Badge ────────────────────────────────────────────────────────
function FingerprintBadge({ label }) {
  if (!label) return null;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1f6feb]/15 border border-[#1f6feb]/30 text-[#58a6ff] text-[11px] font-bold uppercase tracking-wide">
      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
      {label}
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function Toolbar({ isPlaying, onPlay, onPause, onNext, onPrev, onSkipStart, onReset, onSkipEnd, onSeek, step, total, speed, onSpeedChange, loading, onRun }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d] shrink-0">
      {/* Step controls */}
      <button onClick={onSkipStart} disabled={loading || total === 0} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#21262d] text-[#6e7681] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Jump to Start">
        <span className="material-symbols-outlined text-[18px]">skip_previous</span>
      </button>
      <button onClick={onPrev} disabled={loading || total === 0} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#21262d] text-[#6e7681] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Previous">
        <span className="material-symbols-outlined text-[18px]">navigate_before</span>
      </button>
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={loading || total === 0}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        <span className="material-symbols-outlined text-[20px]">{isPlaying ? 'pause' : 'play_arrow'}</span>
      </button>
      <button onClick={onNext} disabled={loading || total === 0} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#21262d] text-[#6e7681] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Next">
        <span className="material-symbols-outlined text-[18px]">navigate_next</span>
      </button>
      <button onClick={onSkipEnd} disabled={loading || total === 0} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#21262d] text-[#6e7681] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Jump to End">
        <span className="material-symbols-outlined text-[18px]">skip_next</span>
      </button>

      {/* Progress slider */}
      <div className="flex items-center gap-2 flex-1 min-w-0 mx-2">
        <span className="text-[11px] text-[#6e7681] font-mono shrink-0">{total > 0 ? step + 1 : 0}/{total}</span>
        <input
          type="range" min={0} max={Math.max(0, total - 1)} value={step}
          onChange={e => onSeek && onSeek(Number(e.target.value))}
          disabled={loading || total === 0}
          className="flex-1 h-1 accent-[#1f6feb] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ accentColor: '#1f6feb' }}
          onMouseDown={() => onPause()}
        />
      </div>

      {/* Speed */}
      <div className="flex items-center gap-1 text-[#6e7681]">
        <span className="material-symbols-outlined text-[15px]">speed</span>
        <input type="range" min={100} max={2000} step={100} value={2100 - speed}
          onChange={e => onSpeedChange(2100 - Number(e.target.value))}
          disabled={loading || total === 0}
          className="w-16 h-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" style={{ accentColor: '#1f6feb' }}
        />
        <span className="text-[11px] font-mono w-6">{speed === 1200 ? '1x' : (1200/speed).toFixed(1).replace('.0','')+'x'}</span>
      </div>

      {/* Reset All and Run button */}
      <button
        onClick={onReset}
        disabled={loading}
        className="ml-auto px-4 py-1.5 rounded-lg border border-[#30363d] hover:bg-[#21262d] text-[#e6edf3] text-[13px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        Reset All
      </button>
      <button
        onClick={onRun}
        disabled={loading}
        className="ml-2 px-4 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-[13px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? (
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
            Running…
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">play_circle</span>
            Run
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Module-Level Cache (Persists across tab switches) ───────────
let cachedDryRunState = {
  code: null,
  trace: [],
  step: 0,
  aiVisualizerHtml: '',
  aiStats: null
};

// ─── Custom Drag Handle ───────────────────────────────────────────────────────
function ResizeHandle() {
  return (
    <Separator className="w-[4px] bg-[#0d1117] hover:bg-[#388bfd] transition-colors cursor-col-resize flex items-center justify-center group relative z-10">
      <div className="w-[1px] h-8 bg-[#30363d] group-hover:bg-transparent" />
    </Separator>
  );
}

// ─── Main DryRunView ──────────────────────────────────────────────────────────
export default function DryRunView({ initialCode = '', forceSyncCode = null, setForceSyncCode = null }) {
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem('dryRunCode');
    return cachedDryRunState.code || saved || initialCode || DEFAULT_CODE;
  });
  const [trace, setTrace] = useState(cachedDryRunState.trace);
  const [step, setStep] = useState(cachedDryRunState.step);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle Tab Switch Sync
  useEffect(() => {
    if (forceSyncCode !== null) {
      setCode(forceSyncCode);
      setTrace([]);
      setStep(0);
      setAiVisualizerHtml('');
      setAiStats(null);
      if (setForceSyncCode) setForceSyncCode(null);
    }
  }, [forceSyncCode, setForceSyncCode]);

  // AI Visualizer States
  const [aiVisualizerHtml, setAiVisualizerHtml] = useState(cachedDryRunState.aiVisualizerHtml);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStats, setAiStats] = useState(cachedDryRunState.aiStats);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(null);
  const [showLimitPopup, setShowLimitPopup] = useState(false);

  // Fetch initial rate limit status on load
  useEffect(() => {
    fetch(`${API_BASE}/api/rate-limit-status`)
      .then(res => {
        const rem = res.headers.get('RateLimit-Remaining');
        if (rem !== null) setRateLimitRemaining(parseInt(rem, 10));
        return res.json();
      })
      .then(data => {
        if (data && data.remaining !== undefined) {
          setRateLimitRemaining(data.remaining);
        }
      })
      .catch(() => {});
  }, []);

  // Update Cache and LocalStorage on change
  useEffect(() => {
    cachedDryRunState.code = code;
    localStorage.setItem('dryRunCode', code);
  }, [code]);
  useEffect(() => { cachedDryRunState.trace = trace; }, [trace]);
  useEffect(() => { cachedDryRunState.step = step; }, [step]);
  useEffect(() => { cachedDryRunState.aiVisualizerHtml = aiVisualizerHtml; }, [aiVisualizerHtml]);
  useEffect(() => { cachedDryRunState.aiStats = aiStats; }, [aiStats]);

  const timerRef = useRef(null);

  const total = trace.length;
  const currentStep = trace[step] || null;
  const prevStep = trace[step - 1] || null;

  // Line heatmap
  const lineHits = useMemo(() => computeLineHits(trace), [trace]);

  // Fingerprint (memoized — only changes when code changes)
  const fp = useMemo(() => computeFingerprint(code, trace), [code, trace.length > 0 ? trace[0] : null]);

  // Analyze current step
  const snapshot = useMemo(() => analyzeStep(currentStep, code, fp), [currentStep, code, fp]);
  const prevSnapshot = useMemo(() => analyzeStep(prevStep, code, fp), [prevStep, code, fp]);

  const displayStep = isGeneratingAi ? null : currentStep;
  const displaySnapshot = isGeneratingAi ? null : snapshot;
  const displayPrevStep = isGeneratingAi ? null : prevStep;
  const displayPrevSnapshot = isGeneratingAi ? null : prevSnapshot;

  // Active line
  const activeLine = displayStep?.line || null;

  // Sync initialCode if provided/changed from top navigation
  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      setCode(initialCode);
      setTrace([]);
      setStep(0);
      setIsPlaying(false);
      setAiVisualizerHtml('');
      setAiStats(null);
    }
  }, [initialCode]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setStep(s => {
        if (s >= total - 1) { setIsPlaying(false); return s; }
        return s + 1;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [isPlaying, speed, total]);

  const handleGenerateAi = useCallback(async (traceDataToUse) => {
    setIsGeneratingAi(true);
    setError(null);
    try {
      const endpoint = aiVisualizerHtml 
        ? `${API_BASE}/api/ai-visualize/regenerate` 
        : `${API_BASE}/api/ai-visualize`;
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode: code
        }),
      });
      
      const remaining = res.headers.get('RateLimit-Remaining');
      if (remaining !== null) {
        setRateLimitRemaining(parseInt(remaining, 10));
      }

      const data = await res.json();
      if (!data.ok) {
        if (data.type === 'rate_limit' || data.type === 'rate_limit_daily' || data.type === 'rate_limit_regen') {
          setShowLimitPopup(true);
          setRateLimitRemaining(0);
        }
        throw new Error(data.message || 'AI Visualizer generation failed');
      }
      setAiVisualizerHtml(data.visualizerHtml);
      setAiStats({
        model: data.model || 'Unknown',
        timingMs: data.timingMs,
      });
      return true;
    } catch (err) {
      console.error('AI visualize error:', err);
      setError(err.message || 'Failed to generate visualizer');
      return false;
    } finally {
      setIsGeneratingAi(false);
    }
  }, [code, trace]);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTrace([]);
    setStep(0);
    setIsPlaying(false);
    try {
      const res = await fetch(`${API_BASE}/api/dry-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode: code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || 'Execution failed');
      } else {
        const normalized = normalizeTrace(data.trace);
        setTrace(normalized);

        // Auto-generate AI visualizer on successful run (wait for it to finish)
        const success = await handleGenerateAi(normalized);
        
        // Start playback ONLY if visualizer successfully generated
        if (success) {
          setIsPlaying(true);
        }
      }
    } catch (e) {
      setError('Cannot reach backend. Is it running?');
    } finally {
      setLoading(false);
    }
  }, [code, handleGenerateAi]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0d1117] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Toolbar ── */}
      <Toolbar
        isPlaying={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onNext={() => { setIsPlaying(false); setStep(s => Math.min(total - 1, s + 1)); }}
        onPrev={() => { setIsPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onSkipStart={() => { setIsPlaying(false); setStep(0); }}
        onSkipEnd={() => { setIsPlaying(false); setStep(Math.max(0, total - 1)); }}
        onSeek={s => { setIsPlaying(false); setStep(s); }}
        step={step}
        total={total}
        speed={speed}
        onSpeedChange={setSpeed}
        loading={loading || isGeneratingAi}
        onRun={handleRun}
        onReset={() => {
          setCode(DEFAULT_CODE);
          setTrace([]);
          setStep(0);
          setAiVisualizerHtml('');
          setAiStats(null);
        }}
      />

      {/* ── 3-Panel Main Layout ── */}
      <Group direction="horizontal" className="flex-1 overflow-hidden bg-[#21262d] gap-px">
        
        {/* LEFT: Code Editor */}
        <Panel defaultSize={33} minSize={20} className="flex flex-col bg-[#0d1117] overflow-hidden">
          <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#6e7681] uppercase tracking-widest font-bold">Source Code</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCode(DEFAULT_CODE)} disabled={loading || isGeneratingAi} className="hover:text-white text-[#6e7681] w-6 h-6 flex items-center justify-center rounded hover:bg-[#21262d] transition-colors" title="Reset Code">
                <span className="material-symbols-outlined text-[14px] leading-none">refresh</span>
              </button>
              <span className="text-[11px] text-[#6e7681]">Java • Monaco Editor</span>
            </div>
          </div>
          <CodeEditor code={code} setCode={setCode} activeLine={activeLine} lineHits={null} />
          {error && (
            <div className="bg-[#da3633]/10 border-t border-[#da3633]/30 px-4 py-3 text-[#da3633] text-[12px] font-mono whitespace-pre-wrap max-h-[120px] overflow-auto">
              {error}
            </div>
          )}
        </Panel>

        <ResizeHandle />

        {/* CENTER: Info Panels */}
        <Panel defaultSize={20} minSize={15} className="flex flex-col bg-[#0d1117] overflow-y-auto">
          <div className="p-3 flex flex-col gap-4">

            {/* Event badge */}
            {displayStep?.event && displayStep.event !== 'line' && (
              <div className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[11px] font-mono text-[#8b949e] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1f6feb] shrink-0" />
                <span className="font-bold text-white">{displayStep.functionName}()</span>
                <span className="ml-auto text-[#4d5566]">{displayStep.event}</span>
              </div>
            )}

            {/* Metrics */}
            <div>
              <div className="text-[10px] text-[#6e7681] uppercase tracking-widest mb-2 font-bold">Metrics</div>
              <MetricsBar metrics={displayStep?.metrics} total={total} step={step} />
            </div>

            {/* Variables */}
            <div>
              <div className="text-[10px] text-[#6e7681] uppercase tracking-widest mb-2 font-bold">Variables</div>
              <VariablePanel
                variables={displaySnapshot?.allVars || displayStep?.variables}
                prevVariables={displayPrevSnapshot?.allVars || displayPrevStep?.variables}
              />
            </div>

            {/* Call Stack */}
            <div>
              <div className="text-[10px] text-[#6e7681] uppercase tracking-widest mb-2 font-bold">Call Stack</div>
              <CallStackPanel callStack={displayStep?.callStack} />
            </div>

            {/* Console */}
            <div>
              <div className="text-[10px] text-[#6e7681] uppercase tracking-widest mb-2 font-bold">Console Output</div>
              <ConsolePanel stdout={displayStep?.stdout} />
            </div>
          </div>
        </Panel>

        <ResizeHandle />

        {/* RIGHT: Dynamic Visualizer */}
        <Panel defaultSize={47} minSize={25} className="flex flex-col bg-[#0d1117] overflow-hidden">
          {/* Header Bar for Visualizer Panel */}
          <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1 rounded-[4px] text-[11px] font-medium flex items-center gap-1.5 bg-[#161b22] text-[#8b949e] border border-[#30363d]">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                AI Visualizer
              </div>
              {aiStats && total > 0 && (
                <span className="text-[11px] text-[#8b949e] font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                  {aiStats.model} <span className="opacity-40">/</span> {aiStats.timingMs}ms
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {rateLimitRemaining !== null && rateLimitRemaining !== undefined && (
                <div
                  className="px-2 py-1 bg-[#161b22] border border-[#30363d] rounded-[6px] text-[11px] font-mono text-[#8b949e] flex items-center gap-1.5"
                  title="Remaining AI Generations today"
                >
                  <span className="material-symbols-outlined text-[13px] text-[#eab308]">battery_charging_full</span>
                  {rateLimitRemaining} left
                </div>
              )}
              {total > 0 && (
                <button
                  onClick={() => handleGenerateAi()}
                  disabled={isGeneratingAi}
                  className="px-3 py-1 rounded-[6px] bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  title="Regenerate with AI"
                >
                  <span className={`material-symbols-outlined text-[14px] ${isGeneratingAi ? 'animate-spin' : ''}`}>
                    {isGeneratingAi ? 'progress_activity' : 'refresh'}
                  </span>
                  {isGeneratingAi ? 'Generating...' : aiVisualizerHtml ? 'Regenerate' : 'Generate'}
                </button>
              )}
            </div>
          </div>

          {total === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-full border border-[#30363d] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-[#4d5566]">data_object</span>
              </div>
              <div>
                <div className="text-[14px] font-medium text-[#c9d1d9] mb-1">Visualizer Canvas</div>
                <div className="text-[12px] text-[#8b949e]">Write your code and click Run to see the step-by-step execution.</div>
              </div>
            </div>
          ) : (
            <VisualizerCanvas
              snapshot={snapshot}
              prevSnapshot={prevSnapshot}
              fingerprint={fp}
              step={step}
              total={total}
              speed={speed}
              fullTrace={trace}
              aiVisualizerHtml={aiVisualizerHtml}
              isGeneratingAi={isGeneratingAi}
              onGenerateAi={() => handleGenerateAi()}
              aiStats={aiStats}
              rateLimitRemaining={rateLimitRemaining}
            />
          )}
        </Panel>
      </Group>
      <RateLimitPopup isOpen={showLimitPopup} onClose={() => setShowLimitPopup(false)} />
    </div>
  );
}

const DEFAULT_CODE = `class Main {
    public static void main(String[] args) {
        int[] nums = {5, 3, 8, 1, 9, 2, 7};
        
        // Bubble Sort
        for (int i = 0; i < nums.length - 1; i++) {
            for (int j = 0; j < nums.length - 1 - i; j++) {
                if (nums[j] > nums[j + 1]) {
                    int temp = nums[j];
                    nums[j] = nums[j + 1];
                    nums[j + 1] = temp;
                }
            }
        }
        
        System.out.println("Sorted!");
    }
}`;
