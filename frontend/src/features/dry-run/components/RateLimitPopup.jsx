import React from 'react';

export default function RateLimitPopup({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center gap-3">
          <span className="material-symbols-outlined text-[#e34c26] text-[20px]">error</span>
          <h2 className="text-[#c9d1d9] font-semibold text-[15px] m-0">AI Visualizer Limit Reached</h2>
        </div>
        
        <div className="p-6 text-[13px] text-[#8b949e] leading-relaxed flex flex-col gap-4">
          <p>
            Sorry for the limit, but we want everyone to be able to use this properly to learn and explore. We are providing this as a free tool.
          </p>
          <p>
            If we do not set limits, some users try to use it an unlimited number of times, wasting computational power and costs. We don't want a heavy cost burden on us right now because we are early in development.
          </p>
          <p>
            If you support us, it's possible we can increase the limits and keep it free forever. Currently, we can't provide unlimited use.
          </p>
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 mt-2">
            <div className="text-[#c9d1d9] font-medium mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#eab308]">warning</span>
              Important Notice
            </div>
            Please do not try to send multiple requests to bypass this—it will create issues and result in a permanent ban. Instead, please wait 24 hours to recover your limit.
          </div>
        </div>

        <div className="px-6 py-4 bg-[#161b22] border-t border-[#30363d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-[13px] font-medium transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
