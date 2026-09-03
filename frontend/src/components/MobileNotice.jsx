import React, { useState, useEffect } from 'react';

export default function MobileNotice() {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function checkDevice() {
      // Small screen or mobile user agent
      const isSmallScreen = window.innerWidth < 1024;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isSmallScreen || isMobileUA);
    }

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (!isMobile || dismissed) return null;

  function handleCopyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <div className="bg-[#111317] border border-[#2D3139] rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Subtle background glows */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <img src="/logo-full.png" alt="JavaFlow Logo" className="h-10 w-auto mb-6 object-contain" />

        {/* Device Switch Graphic */}
        <div className="flex items-center justify-center gap-3 mb-6 p-4 rounded-2xl bg-surface-container border border-border-subtle">
          <div className="w-12 h-12 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[26px]">smartphone</span>
          </div>
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant animate-pulse">arrow_forward</span>
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[26px]">laptop_mac</span>
          </div>
        </div>

        {/* Heading & description */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
          Please Switch to Desktop
        </h2>
        <p className="text-on-surface-variant text-[13px] sm:text-[14px] leading-relaxed mb-6">
          <strong>JavaFlow</strong> is designed for desktop and laptop screens. Visualizing multi-threaded JVM memory, bytecode, step-by-step traces, and complexity analysis requires a larger display.
        </p>

        {/* Spec box */}
        <div className="w-full bg-surface-container rounded-xl p-3.5 border border-border-subtle text-left mb-6 space-y-2">
          <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Device Requirements</div>
          <div className="flex items-center gap-2 text-[12px] text-on-surface">
            <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
            <span>Screen width: <strong>1024px or higher</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-on-surface">
            <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
            <span>Desktop, laptop, or landscape tablet recommended</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col w-full gap-2.5">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-fixed transition-colors py-3 rounded-xl font-bold text-[13px] shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Link to Open on Desktop'}</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="w-full py-2 text-on-surface-variant hover:text-on-surface text-[12px] transition-colors hover:underline cursor-pointer"
          >
            Continue to mobile view anyway
          </button>
        </div>
      </div>
    </div>
  );
}
