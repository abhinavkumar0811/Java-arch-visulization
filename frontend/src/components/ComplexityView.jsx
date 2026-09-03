import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './CodeEditor.jsx';
import WhiteboardModal from './WhiteboardModal.jsx';

// ─── SVG Chart with visible clickable dots ────────────────────────────────────
function Chart({ data, color, label, currentIndex, onStepHover, height = 120 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  
  const safeData = data || [];
  const max = Math.max(...safeData, 1);
  const min = Math.min(...safeData, 0);
  const range = max - min || 1;
  const W = 400, H = height, pad = 16;

  const pts = React.useMemo(() => safeData.map((v, i) => ({
    x: pad + (i / Math.max(safeData.length - 1, 1)) * (W - pad * 2),
    y: pad + ((1 - (v - min) / range) * (H - pad * 2)),
    v,
  })), [safeData, min, range, W, H, pad]);

  const polyline = React.useMemo(() => pts.map(p => `${p.x},${p.y}`).join(' '), [pts]);
  const fill = React.useMemo(() => pts.length > 0 ? `${pts[0].x},${H - pad} ${polyline} ${pts[pts.length-1].x},${H - pad}` : '', [pts, polyline, H, pad]);

  const staticPath = React.useMemo(() => {
    if (pts.length === 0) return null;
    return (
      <>
        <defs>
          <linearGradient id={`g-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={fill} fill={`url(#g-${label.replace(/\s+/g, '')})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.length <= 200 && pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="rgba(255,255,255,0.3)" />
        ))}
      </>
    );
  }, [pts, fill, polyline, color, label]);

  if (!data || data.length === 0) return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">{label}</span>
      <div style={{ height, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} className="rounded flex items-center justify-center text-[11px] text-on-surface-variant">No data</div>
    </div>
  );

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    
    let i = Math.round(((mouseX - pad) / (W - pad * 2)) * Math.max(pts.length - 1, 1));
    i = Math.max(0, Math.min(pts.length - 1, i));
    
    if (i !== hoveredIdx) {
      setHoveredIdx(i);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">{label}</span>
        <span className="text-[12px] font-bold monospaced-digits" style={{ color }}>
          {currentIndex != null && data[currentIndex] != null ? data[currentIndex] : data[data.length - 1]}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded cursor-pointer"
        style={{ height, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
        onClick={() => hoveredIdx != null && onStepHover?.(hoveredIdx, true)}
      >
        {staticPath}
        
        {currentIndex != null && pts[currentIndex] && (
          <g>
            <line x1={pts[currentIndex].x} y1={pad} x2={pts[currentIndex].x} y2={H - pad} stroke={color} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.7" />
            <circle cx={pts[currentIndex].x} cy={pts[currentIndex].y} r={5} fill={color} stroke={color} strokeWidth={2} />
          </g>
        )}

        {hoveredIdx != null && pts[hoveredIdx] && hoveredIdx !== currentIndex && (
          <circle cx={pts[hoveredIdx].x} cy={pts[hoveredIdx].y} r={4} fill={color} stroke={color} strokeWidth={2} />
        )}

        {hoveredIdx != null && pts[hoveredIdx] && (
          <g pointerEvents="none">
            {(() => {
              const p = pts[hoveredIdx];
              let rY = p.y - 24;
              if (rY < 0) rY = p.y + 10; // Flip below if too high
              
              const textStr = `S${hoveredIdx + 1}: ${p.v}`;
              // dynamically size width based on text length roughly (S123: 1000 is ~10 chars)
              const rW = Math.max(60, textStr.length * 7 + 10);
              
              // constrain X so it doesn't go off the right edge
              const rX = Math.min(p.x + 6, W - rW - 4);

              return (
                <>
                  <rect
                    x={rX} y={rY}
                    width={rW} height={18} rx={4}
                    fill="rgba(0,0,0,0.8)" stroke={color} strokeWidth="0.5"
                  />
                  <text
                    x={rX + rW / 2} y={rY + 12}
                    textAnchor="middle" fill="white" fontSize="10" fontFamily="monospace"
                  >
                    {textStr}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
}

// Helper to format variables cleanly without [object Object]
function formatVarValue(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') {
    if (Array.isArray(v)) {
      if (v.length === 0) return '[]';
      return `[${v.map(formatVarValue).join(', ')}]`;
    }
    if (v.value !== undefined) return formatVarValue(v.value);
    if (v.name) return String(v.name);
    if (v.type === 'reference') return `ref#${v.id ?? ''}`;
    try {
      const s = JSON.stringify(v);
      return s.length > 20 ? s.slice(0, 20) + '…' : s;
    } catch {
      return '{...}';
    }
  }
  return String(v);
}

// ─── Simplified Step-by-step Math Panel ──────────────────────────────────────
function StepMathPanel({ metrics, currentIndex, bigO, trace, onOpenWhiteboard }) {
  if (!metrics || metrics.totalOperations === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <span className="material-symbols-outlined text-[56px] text-on-surface-variant/20">functions</span>
        <div>
          <div className="text-on-surface font-bold mb-2">No trace data yet</div>
          <div className="text-on-surface-variant text-[13px]">Run your code first, then open Complexity Analysis.</div>
        </div>
      </div>
    );
  }

  const step = currentIndex ?? 0;
  const ops = metrics.operationSeries?.[step] ?? step + 1;
  const heap = metrics.heapSeries?.[step] ?? 0;
  const stackDepth = metrics.stackSeries?.[step] ?? 0;
  const total = metrics.totalOperations;

  const currentStep = trace?.[step];
  const thread = currentStep?.threads?.[currentStep?.threadId];
  const topFrame = thread?.callStack?.slice(-1)[0];
  const currentLine = topFrame?.line;
  const currentVars = topFrame?.vars || {};

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* ── Quick Stats Grid ── */}
      <div className="grid grid-cols-2 gap-2.5 mb-1">
        <div className="bg-surface-container rounded-xl p-3 border border-border-subtle min-w-0">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 truncate">Time Complexity</div>
          <div className="text-[18px] sm:text-[20px] font-bold truncate" style={{ color: bigO?.timeColor || '#10B981' }}>{bigO?.time ?? 'O(?)'}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-3 border border-border-subtle min-w-0">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 truncate">Space Complexity</div>
          <div className="text-[18px] sm:text-[20px] font-bold truncate" style={{ color: bigO?.spaceColor || '#8B5CF6' }}>{bigO?.space ?? 'O(?)'}</div>
        </div>
      </div>

      {/* ── Current Execution State ── */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 min-w-0">
        <div className="text-[11px] text-on-surface-variant uppercase tracking-widest mb-1.5 font-bold">Currently Executing</div>
        <div className="text-on-surface mb-1 font-code-sm text-[13px] font-bold">
          Step {step + 1} of {total}
        </div>
        {Object.keys(currentVars).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-primary/10">
            {Object.entries(currentVars).slice(0, 10).map(([k, v]) => {
              const displayVal = formatVarValue(v);
              return (
                <span key={k} className="text-[11px] font-code-sm bg-surface px-2 py-1 rounded border border-border-subtle flex items-center gap-1.5 max-w-full shadow-xs">
                  <span className="text-on-surface-variant shrink-0">{k}</span>
                  <span className="text-primary font-bold truncate max-w-[130px]">{displayVal}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Simplified Math View ── */}
      <div className="flex flex-col gap-3">
        <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 font-bold">Step Analysis</div>
        
        {/* Operations */}
        <div className="bg-surface-container rounded-lg p-3 border border-border-subtle">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[12px] text-on-surface">Operations</span>
            <span className="text-[14px] font-bold text-green-400 font-code-sm">{ops}</span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(ops / total) * 100}%` }} />
          </div>
        </div>

        {/* Heap */}
        <div className="bg-surface-container rounded-lg p-3 border border-border-subtle">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[12px] text-on-surface">Live Memory Objects</span>
            <span className="text-[14px] font-bold text-purple-400 font-code-sm">{heap} / {metrics.peakHeapCount}</span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${metrics.peakHeapCount ? (heap / metrics.peakHeapCount) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Stack */}
        <div className="bg-surface-container rounded-lg p-3 border border-border-subtle">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[12px] text-on-surface">Call Stack Depth</span>
            <span className="text-[14px] font-bold text-amber-400 font-code-sm">{stackDepth} / {metrics.maxStackDepth}</span>
          </div>
          <div className="flex items-end gap-1 h-6">
            {Array.from({ length: Math.max(stackDepth, 1) }).map((_, i) => (
              <div key={i} className="flex-1 rounded-sm transition-all duration-200"
                style={{
                  height: `${((i + 1) / Math.max(stackDepth, 1)) * 100}%`,
                  background: i === stackDepth - 1 ? '#F59E0B' : 'rgba(245,158,11,0.3)',
                }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Live Equation / Math Visualization ── */}
      <div className="mt-2">
        <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-2 font-bold">Mathematical Calculation</div>
        <div className="bg-surface-container rounded-xl p-4 border border-border-subtle flex flex-col gap-4">
          {/* Theoretical Model */}
          <div className="flex flex-col gap-1.5 pb-3 border-b border-border-subtle min-w-0">
            <span className="text-on-surface-variant text-[10px] uppercase tracking-wider font-bold">Theoretical Model</span>
            <span className="text-primary font-code-sm text-[12px] sm:text-[13px] font-bold tracking-wide break-words">
              {bigO?.time === 'O(1)' && "T(n) = c  (Constant)"}
              {bigO?.time === 'O(n)' && "T(n) = c₁·n + c₂  (Linear)"}
              {bigO?.time === 'O(n²)' && "T(n) = c₁·n² + c₂·n + c₃  (Quadratic)"}
              {bigO?.time === 'O(log n)' && "T(n) = c₁·log(n) + c₂  (Logarithmic)"}
              {bigO?.time === 'O(n log n)' && "T(n) = c₁·n·log(n) + c₂  (Linearithmic)"}
              {bigO?.time === 'O(2^n)' && "T(n) = c₁·2ⁿ  (Exponential)"}
              {bigO?.time === 'O(n!)' && "T(n) = c₁·n!  (Factorial)"}
              {!bigO?.time?.match(/O\(.*\)/) && "T(n) = ?"}
            </span>
          </div>

          {/* Step-by-Step accumulation */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-[11px] sm:text-[12px]">
              <span className="text-on-surface-variant uppercase tracking-wider font-bold">Time (t)</span>
              <span className="text-on-surface font-code-sm font-bold">Step {step + 1}</span>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">Live Function</span>
              <div className="bg-surface px-2.5 py-1 rounded-lg border border-border-subtle flex items-center gap-1.5 font-code-sm text-[12px] shadow-xs">
                <span className="text-primary font-bold">f(t)</span>
                <span className="text-on-surface-variant">=</span>
                <span className="text-green-400 font-bold">{ops} ops</span>
              </div>
            </div>
          </div>
          
          {/* Variables acting as N */}
          {Object.keys(currentVars).length > 0 && (
            <div className="pt-3 border-t border-border-subtle min-w-0">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-2">Variables influencing 'n'</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(currentVars).map(([k, v]) => {
                  const displayVal = formatVarValue(v);
                  return (
                    <span key={k} className="text-[11px] font-code-sm bg-surface px-2 py-1 rounded border border-border-subtle flex gap-1.5 items-center shadow-xs max-w-full">
                      <span className="text-primary font-bold shrink-0">{k}</span>
                      <span className="text-on-surface-variant shrink-0">=</span>
                      <span className="text-on-surface font-bold truncate max-w-[120px]">{displayVal}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Math explanation */}
      {bigO?.explanation && (
        <div className="mt-1 min-w-0">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1.5 font-bold">Why is it {bigO.time}?</div>
          <div className="bg-surface-container rounded-xl p-3.5 border border-border-subtle break-words">
            <p className="text-[12px] text-on-surface leading-relaxed">
              {bigO.explanation.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-on-surface">{part.slice(2, -2)}</strong>;
                if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-surface px-1.5 py-0.5 rounded text-primary font-code-sm text-[11px] break-all">{part.slice(1, -1)}</code>;
                return <span key={i}>{part}</span>;
              })}
            </p>
          </div>
        </div>
      )}
      {/* ── Open Whiteboard Button ── */}
      <div className="mt-3 pb-4">
        <button 
          onClick={onOpenWhiteboard}
          className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors py-2.5 rounded-xl border border-primary/20 shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">school</span>
          <span className="font-bold text-[11px] uppercase tracking-wider">View Mathematical Derivation</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────
export default function ComplexityView({ code, setCode, bigO, metrics, currentIndex, setCurrentIndex, playing, setPlaying, trace }) {
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const total = metrics?.totalOperations ?? 0;
  const { lineHits = {} } = metrics || {};
  
  // Current line from trace
  const currentStep = trace?.[currentIndex];
  const thread = currentStep?.threads?.[currentStep?.threadId];
  const topFrame = thread?.callStack?.slice(-1)[0];
  const currentLine = topFrame?.line;

  function handleChartHover(i, shouldJump) {
    if (shouldJump && i != null) {
      setCurrentIndex(i);
      setPlaying(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-gutter overflow-y-auto lg:overflow-hidden bg-surface-container-lowest min-w-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Main Content: 3 columns (Code Editor | Math | Charts) ── */}
      {/* LEFT: Code Editor (38%) */}
      <div className="w-full lg:w-[38%] min-w-0 border border-border-subtle rounded-lg flex flex-col overflow-hidden shadow-sm h-[420px] lg:h-full shrink-0 lg:shrink">
        <div className="bg-surface-container border-b border-border-subtle px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-on-surface-variant uppercase tracking-widest font-bold">Source Code</span>
          <span className="text-[11px] text-on-surface-variant">Editable • Line Heatmap active</span>
        </div>
        <div className="flex-1 min-h-0 bg-[#0d1117] flex flex-col">
          <CodeEditor code={code} setCode={setCode} activeLine={currentLine} lineHits={lineHits} />
        </div>
      </div>

      {/* CENTER: Step Math & Analysis (34%) */}
      <div className="w-full lg:w-[34%] min-w-0 border border-border-subtle rounded-lg p-4 sm:p-5 overflow-y-auto bg-surface shadow-sm h-auto lg:h-full shrink-0 lg:shrink">
        <StepMathPanel
          metrics={metrics}
          currentIndex={currentIndex}
          bigO={bigO}
          trace={trace}
          onOpenWhiteboard={() => setIsWhiteboardOpen(true)}
        />
      </div>

      {/* RIGHT: Charts (28%) */}
      <div className="w-full lg:w-[28%] min-w-0 p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 bg-surface border border-border-subtle rounded-lg shadow-sm h-auto lg:h-full shrink-0 lg:shrink">
        <div className="text-[11px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">
          Live Charts — Click point to jump step
        </div>

        <Chart
          data={metrics?.operationSeries}
          color="#10B981"
          label="Operations (cumulative)"
          currentIndex={currentIndex}
          onStepHover={handleChartHover}
          height={120}
        />
        <Chart
          data={metrics?.heapSeries}
          color="#8B5CF6"
          label="Live Heap Objects"
          currentIndex={currentIndex}
          onStepHover={handleChartHover}
          height={120}
        />
        <Chart
          data={metrics?.stackSeries}
          color="#F59E0B"
          label="Call Stack Depth"
          currentIndex={currentIndex}
          onStepHover={handleChartHover}
          height={120}
        />

        {/* Step counter at bottom */}
        {total > 0 && (
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant border-t border-border-subtle pt-3 mt-auto">
            <span>Step <strong className="text-on-surface monospaced-digits">{currentIndex + 1}</strong> of <strong className="text-on-surface monospaced-digits">{total}</strong></span>
          </div>
        )}
      </div>
      
      <WhiteboardModal 
        isOpen={isWhiteboardOpen} 
        onClose={() => setIsWhiteboardOpen(false)} 
        bigO={bigO} 
        metrics={metrics} 
        currentIndex={currentIndex} 
        trace={trace} 
      />
    </div>
  );
}
