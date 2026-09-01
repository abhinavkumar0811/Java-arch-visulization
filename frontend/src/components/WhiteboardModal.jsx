import React from 'react';

export default function WhiteboardModal({ isOpen, onClose, bigO, metrics, currentIndex, trace }) {
  if (!isOpen) return null;

  const total = metrics?.totalOperations ?? 0;
  const step = currentIndex ?? 0;
  const time = bigO?.time ?? 'O(?)';
  const ops = metrics?.operationSeries?.[step] ?? step + 1;
  const renderLogN = () => {
    const theoreticalN = 16;
    
    return (
      <div className="flex flex-col h-full w-full p-8 overflow-y-auto bg-[#0d1117] text-[#c9d1d9] font-sans rounded-b-2xl">
        <h2 className="text-3xl font-bold mb-8 text-white tracking-wide">O(log n) Logarithmic Time Complexity</h2>
        
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 1: Analyze the Loop Mechanics</h3>
          <p className="mb-3 text-[16px]">Assume an initial problem size of <span className="font-serif italic">n = {theoreticalN}</span>.</p>
          <p className="mb-3 text-[16px]">At each iteration of the loop:</p>
          <ul className="list-disc pl-6 mb-3 space-y-2 text-[15px]">
            <li><code className="bg-[#161b22] px-2 py-1 rounded text-sm text-[#58a6ff]">n</code> is updated to <span className="font-serif italic">&lfloor; n/2 &rfloor;</span>.</li>
            <li>The algorithm performs 1 core operation.</li>
          </ul>
          <p className="text-[16px]">The loop terminates as soon as <span className="font-serif italic">n &le; 1</span>.</p>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 2: Formulate the Mathematical Sequence</h3>
          <p className="mb-6 text-[16px]">After <span className="font-serif italic">k</span> iterations, the value of <span className="font-serif italic">n</span> is:</p>
          <div className="flex justify-center mb-8">
             <span className="font-serif italic text-2xl tracking-widest">n<sub>k</sub> = n<sub>0</sub> / 2<sup>k</sup></span>
          </div>
          <p className="mb-6 text-[16px]">We want to find the smallest integer <span className="font-serif italic">k</span> such that:</p>
          <div className="flex justify-center mb-8">
             <span className="font-serif italic text-2xl tracking-widest">n<sub>0</sub> / 2<sup>k</sup> &le; 1 ⇒ 2<sup>k</sup> &ge; n<sub>0</sub></span>
          </div>
          <p className="mb-6 text-[16px]">Taking the logarithm base 2 of both sides:</p>
          <div className="flex justify-center mb-4">
             <span className="font-serif italic text-2xl font-bold text-white tracking-widest">k = log<sub>2</sub>(n<sub>0</sub>)</span>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 3: Algorithm vs. Execution Trace</h3>
          <p className="mb-4 text-[16px]">
            In theoretical math, we count the <strong>fundamental algorithmic operations</strong>. For <span className="font-serif italic">n = 16</span>:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-[15px]">
            <li><span className="font-serif italic">log<sub>2</sub>(16) = 4</span></li>
            <li>The division sequence is: <strong>16 &rarr; 8 &rarr; 4 &rarr; 2 &rarr; 1</strong></li>
            <li>Total algorithmic operations: <span className="font-serif italic text-white font-bold">4 divisions</span>.</li>
          </ul>
          <div className="bg-[#1f6feb] bg-opacity-10 border-l-4 border-l-[#58a6ff] p-4 rounded-r-lg mt-6">
            <p className="text-[14px] text-[#c9d1d9] leading-relaxed">
              <strong>Why are there {total} trace steps?</strong> The visualizer trace records <em>every single low-level JVM instruction</em> executed (variable initializations, conditional checks, stack frames, etc.), whereas theoretical Big-O only counts the dominant mathematical operations. The true algorithmic complexity is still logarithmic.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderLinear = () => {
    return (
      <div className="flex flex-col h-full w-full p-8 overflow-y-auto bg-[#0d1117] text-[#c9d1d9] font-sans rounded-b-2xl">
        <h2 className="text-3xl font-bold mb-8 text-white tracking-wide">O(n) Linear Time Complexity</h2>
        
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 1: Analyze the Loop Mechanics</h3>
          <p className="mb-3 text-[16px]">At each iteration of the loop:</p>
          <ul className="list-disc pl-6 mb-3 space-y-2 text-[15px]">
            <li>We process exactly one element.</li>
            <li>The algorithmic operations count increments by 1.</li>
          </ul>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 2: Formulate the Mathematical Sequence</h3>
          <p className="mb-6 text-[16px]">After <span className="font-serif italic">k</span> iterations, the total algorithmic operations <span className="font-serif italic">T(k)</span> is simply:</p>
          <div className="flex justify-center mb-8">
             <span className="font-serif italic text-2xl tracking-widest">T(k) = k</span>
          </div>
          <p className="mb-6 text-[16px]">Since the loop runs exactly <span className="font-serif italic">n</span> times:</p>
          <div className="flex justify-center mb-4">
             <span className="font-serif italic text-2xl font-bold text-white tracking-widest">T(n) = n</span>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 3: Algorithm vs. Execution Trace</h3>
          <div className="bg-[#1f6feb] bg-opacity-10 border-l-4 border-l-[#58a6ff] p-4 rounded-r-lg mt-6">
            <p className="text-[14px] text-[#c9d1d9] leading-relaxed">
              <strong>Why are there {total} trace steps instead of n?</strong> The visualizer trace records <em>every single low-level JVM instruction</em> (like <code>int i = 0</code>, <code>i &lt; n</code>, <code>i++</code>, and operations inside the loop body). Even though the trace length is larger than <span className="font-serif italic">n</span>, it scales linearly with <span className="font-serif italic">n</span>, keeping the overall complexity exactly <strong>O(n)</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderQuadratic = () => {
    return (
      <div className="flex flex-col h-full w-full p-8 overflow-y-auto bg-[#0d1117] text-[#c9d1d9] font-sans rounded-b-2xl">
        <h2 className="text-3xl font-bold mb-8 text-white tracking-wide">O(n²) Quadratic Time Complexity</h2>
        
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 1: Analyze the Loop Mechanics</h3>
          <p className="mb-3 text-[16px]">There is an outer loop and an inner loop.</p>
          <ul className="list-disc pl-6 mb-3 space-y-2 text-[15px]">
            <li>Outer loop runs <span className="font-serif italic">n</span> times.</li>
            <li>Inner loop runs <span className="font-serif italic">n</span> times for <strong>every</strong> outer loop iteration.</li>
            <li>The core algorithm operation happens at the deepest nesting level.</li>
          </ul>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 2: Formulate the Mathematical Sequence</h3>
          <p className="mb-6 text-[16px]">The total number of core operations <span className="font-serif italic">T(n)</span> is:</p>
          <div className="flex justify-center mb-8">
             <span className="font-serif italic text-2xl font-bold text-white tracking-widest">T(n) = n &times; n = n<sup>2</sup></span>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 3: Algorithm vs. Execution Trace</h3>
          <p className="mb-4 text-[16px]">
            For a small input like <span className="font-serif italic">n = 5</span>, the theoretical core operations are <span className="font-serif italic">5 &times; 5 = 25</span>.
          </p>
          <div className="bg-[#1f6feb] bg-opacity-10 border-l-4 border-l-[#58a6ff] p-4 rounded-r-lg mt-6">
            <p className="text-[14px] text-[#c9d1d9] leading-relaxed">
              <strong>Why does the trace show {total} steps?</strong> The execution trace includes loop variable declarations, condition evaluations, and inner loop resets for every single cycle. The constant factor is larger, but as <span className="font-serif italic">n</span> grows, the execution steps form a perfect quadratic parabola, dictated purely by the <strong>O(n²)</strong> algorithm structure.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderNLogN = () => {
    return (
      <div className="flex flex-col h-full w-full p-8 overflow-y-auto bg-[#0d1117] text-[#c9d1d9] font-sans rounded-b-2xl">
        <h2 className="text-3xl font-bold mb-8 text-white tracking-wide">O(n log n) Linearithmic Time Complexity</h2>
        
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 1: Analyze the Loop Mechanics</h3>
          <p className="mb-3 text-[16px]">We have a nested structure where the outer loop iterates linearly.</p>
          <ul className="list-disc pl-6 mb-3 space-y-2 text-[15px]">
            <li>Outer loop runs <span className="font-serif italic">n</span> times.</li>
            <li>Inner loop runs <span className="font-serif italic">log<sub>2</sub>(n)</span> times for every outer loop iteration (e.g., dividing a value by 2).</li>
          </ul>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 2: Formulate the Mathematical Sequence</h3>
          <p className="mb-6 text-[16px]">The total number of algorithmic operations <span className="font-serif italic">T(n)</span> is the product of both loops:</p>
          <div className="flex justify-center mb-8">
             <span className="font-serif italic text-2xl font-bold text-white tracking-widest">T(n) = n &times; log<sub>2</sub>(n)</span>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 text-white">Step 3: Algorithm vs. Execution Trace</h3>
          <p className="mb-4 text-[16px]">
            In theoretical math, we only count the <strong>fundamental algorithmic operations</strong>. Consider an example where <span className="font-serif italic">n = 25</span>:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-[15px]">
            <li><span className="font-serif italic">log<sub>2</sub>(25) &approx; 4.64</span></li>
            <li>The integer division sequence is: <strong>25 &rarr; 12 &rarr; 6 &rarr; 3 &rarr; 1</strong></li>
            <li>So there are exactly <strong>4</strong> inner loop executions per outer iteration.</li>
            <li>Total core algorithmic operations: <span className="font-serif italic text-white font-bold">25 &times; 4 = 100</span>.</li>
          </ul>
          <div className="bg-[#1f6feb] bg-opacity-10 border-l-4 border-l-[#58a6ff] p-4 rounded-r-lg mt-6">
            <p className="text-[14px] text-[#c9d1d9] leading-relaxed">
              <strong>Why are there {total} trace steps?</strong> The 100 algorithmic divisions are surrounded by lower-level JVM instructions: <code>for</code> loop checks, <code>while</code> condition evaluations, and variable assignments. The visualizer records a "step" for every single bytecode-level action, causing the execution trace to be roughly ~3-4x larger than the pure mathematical operation count.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderDefault = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 bg-[#0d1117] text-[#c9d1d9] rounded-b-2xl">
        <div className="text-[56px] mb-8 font-bold tracking-wide text-white font-serif">
          {time}
        </div>
        <div className="text-[32px] font-mono text-[#58a6ff]">
          f(n) = {ops} operations
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (time === 'O(1)') return renderDefault();
    if (time === 'O(n)') return renderLinear();
    if (time === 'O(n^2)' || time === 'O(n²)') return renderQuadratic();
    if (time === 'O(n log n)') return renderNLogN();
    if (time === 'O(log n)') return renderLogN();
    return renderDefault();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8 transition-opacity duration-300">
      <div className="w-full max-w-[1000px] h-[85vh] flex flex-col relative animate-in zoom-in-95 duration-200 bg-[#161b22] rounded-2xl shadow-2xl border border-[#30363d] overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#30363d] bg-[#010409]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1f6feb]/20 text-[#58a6ff] flex items-center justify-center rounded-lg border border-[#1f6feb]/30">
              <span className="material-symbols-outlined text-[18px]">functions</span>
            </div>
            <div>
              <div className="text-white font-bold text-[16px] tracking-wide">Mathematical Derivation</div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 text-[#8b949e] hover:text-white hover:bg-[#21262d] flex items-center justify-center rounded-md transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* The Content */}
        {renderContent()}

      </div>
    </div>
  );
};
