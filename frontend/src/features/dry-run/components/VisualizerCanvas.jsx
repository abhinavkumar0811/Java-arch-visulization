/**
 * VisualizerCanvas.jsx
 * ⚡ AI Dynamic Visualizer (LLM code generation - Claude Visualizer style)
 */
import React from 'react';
import AIVisualizerSandbox from './AIVisualizerSandbox.jsx';

export default function VisualizerCanvas({
  snapshot,
  prevSnapshot,
  fingerprint,
  step,
  total,
  speed,
  fullTrace,
  aiVisualizerHtml,
  isGeneratingAi,
  onGenerateAi,
  aiStats,
  rateLimitRemaining,
}) {
  if (!snapshot) return null;

  const speedClass = speed < 500 ? 'dr-fast' : speed > 1500 ? 'dr-slow' : '';

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${speedClass}`} style={{ minHeight: 0 }}>
      {/* ── Visualizer Content ── */}

      {/* ── Main View Content ── */}
      <div className="flex-1 overflow-hidden p-3 flex flex-col min-h-0">
        {isGeneratingAi ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117] rounded-lg p-6 border border-[#30363d]">
            <DynamicLoader />
          </div>
        ) : aiVisualizerHtml ? (
          <AIVisualizerSandbox
            htmlContent={aiVisualizerHtml}
            step={step}
            snapshot={snapshot}
            fullTrace={fullTrace}
            isPlaying={false}
            speed={speed}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-12 h-12 rounded-[8px] border border-[#30363d] bg-[#161b22] flex items-center justify-center text-[#8b949e]">
              <span className="material-symbols-outlined text-[24px]">architecture</span>
            </div>
            <div>
              <div className="text-[14px] font-medium text-[#c9d1d9] mb-1">AI Architecture Generator</div>
              <div className="text-[12px] text-[#8b949e] max-w-[320px] mx-auto">
                Generate a custom interactive data structure UI specifically designed for this algorithm.
              </div>
            </div>
            <div className="mt-2">
              <button
                onClick={onGenerateAi}
                className="px-4 py-1.5 rounded-[6px] bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] text-[#c9d1d9] text-[12px] font-medium transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                Generate Visualizer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Step Indicator Footer Bar ── */}
      <div className="px-4 py-2 border-t border-[#21262d] bg-[#0d1117] flex items-center justify-between shrink-0">
        <span className="text-[11px] text-[#4d5566] font-mono">Step {step + 1} of {total}</span>
        <div className="flex-1 mx-4 h-[3px] bg-[#21262d] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1f6feb] rounded-full"
            style={{
              width: `${total > 1 ? (step / (total - 1)) * 100 : 0}%`,
              transition: `width ${speed < 500 ? 150 : 350}ms cubic-bezier(.4,0,.2,1)`
            }}
          />
        </div>
        <span className="text-[11px] text-[#6e7681] font-mono italic">{eventLabel(snapshot.event)}</span>
      </div>
    </div>
  );
}



function eventLabel(event) {
  const map = {
    assignment: '← assign',
    loop: '↻ loop',
    condition: '? branch',
    method_enter: '→ call',
    method_exit: '← return',
    return: '← return',
    array_update: '[] update',
    stdout: '⎙ print',
    line: '',
  };
  return map[event] || event || '';
}

function DynamicLoader() {
  const [loadingStep, setLoadingStep] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  
  const loadingSteps = [
    'Analyzing code structure & logic...',
    'Mapping variables to memory graph...',
    'Synthesizing interactive visualization...',
    'Generating AI spatial layout...',
    'Compiling animations & transitions...',
    'Polishing UI components...',
    'Waiting for AI reasoning engine...'
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingSteps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [loadingSteps.length]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds) => {
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs}hr`;
    }
    return `${mins}:${secs} m`;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 w-full h-full text-[#8b949e]">
      <span className="material-symbols-outlined text-[24px] animate-spin text-[#30363d]">
        progress_activity
      </span>
      <div className="flex flex-col items-center gap-1">
        <div className="text-[13px] font-medium">
          {loadingSteps[loadingStep]}
        </div>
        <div className="text-[11px] font-mono text-[#4d5566]">
          {formatTime(elapsed)}
        </div>
      </div>
    </div>
  );
}
