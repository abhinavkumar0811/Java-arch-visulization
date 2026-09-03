import React, { useState, useEffect } from 'react';

export default function MobileNotice() {
  const [isMobile, setIsMobile] = useState(false);
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

  if (!isMobile) return null;

  function handleCopyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0c0e12] p-5 select-none overflow-y-auto">
      <div className="bg-[#111317] border border-[#2D3139] rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo */}
        <img src="/logo-full.png" alt="JavaFlow Logo" className="h-10 w-auto mb-6 object-contain" />

        {/* Device Switch Graphic */}
        <div className="flex items-center justify-center gap-3 mb-5 p-3.5 rounded-2xl bg-surface-container border border-border-subtle">
          <div className="w-11 h-11 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[24px]">smartphone</span>
          </div>
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant animate-pulse">arrow_forward</span>
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">laptop_mac</span>
          </div>
        </div>

        {/* Restriction Headline */}
        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
          Mobile Not Supported
        </h2>
        <p className="text-on-surface-variant text-[13px] leading-relaxed mb-5">
          <strong>JavaFlow</strong> is an interactive IDE and JVM architecture visualizer designed strictly for desktop and laptop screens.
        </p>

        {/* Requirements Box */}
        <div className="w-full bg-surface-container rounded-xl p-3.5 border border-border-subtle text-left mb-6 space-y-2">
          <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Device Requirements</div>
          <div className="flex items-center gap-2 text-[12px] text-on-surface">
            <span className="material-symbols-outlined text-primary text-[16px]">desktop_windows</span>
            <span>Desktop or Laptop PC required</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-on-surface">
            <span className="material-symbols-outlined text-primary text-[16px]">aspect_ratio</span>
            <span>Minimum width: <strong>1024px</strong></span>
          </div>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-fixed transition-colors py-3 rounded-xl font-bold text-[13px] shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Link to Open on Desktop'}</span>
        </button>

        <p className="text-[11px] text-on-surface-variant/70 mt-4">
          Send or open this link on your computer to view the visualizer.
        </p>
      </div>
    </div>
  );
}
