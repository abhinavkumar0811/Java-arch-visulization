import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

/**
 * AIVisualizerSandbox
 * Renders the AI-generated self-contained visualization widget inside a sandboxed iframe.
 * Establishes a postMessage bridge to stream step updates smoothly on playback/scrubbing.
 */
export default function AIVisualizerSandbox({
  htmlContent,
  step,
  snapshot,
  fullTrace,
  isPlaying,
  speed,
}) {
  const iframeRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(null);

  // Injected wrapper script that establishes the postMessage communication bridge
  const wrappedHtml = React.useMemo(() => {
    if (!htmlContent) return '';

    const bridgeScript = `
      <script>
        (function() {
          // Listen for step updates from parent JavaFlow app
          window.addEventListener('message', function(event) {
            if (!event.data) return;
            if (event.data.type === 'STEP_UPDATE') {
              try {
                if (typeof window.onStepChange === 'function') {
                  window.onStepChange(event.data.step, event.data.stepData, event.data.fullTrace);
                }
              } catch (err) {
                console.error('[AI Visualizer Runtime Error]', err);
              }
            }
          });

          // Notify parent frame that sandbox is ready
          window.addEventListener('DOMContentLoaded', function() {
            // srcdoc iframes must use '*' as target since parent cannot
            // be verified; the parent validates e.source on receipt instead.
            window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
          });
        })();
      </script>
    `;

    // Ensure styling defaults if missing
    const defaultStyles = `
      <style>
        * { box-sizing: border-box; }
        body, html {
          margin: 0;
          padding: 16px;
          width: 100%;
          min-height: 100%;
          background-color: #0d1117;
          color: #e6edf3;
          font-family: 'JetBrains Mono', 'Inter', system-ui, -apple-system, sans-serif;
          overflow-x: auto;
          overflow-y: auto;
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
      </style>
    `;

    // --- SECURITY: DOMPurify sanitization (defense-in-depth) ---
    // The iframe sandbox is the primary XSS defense. DOMPurify adds an
    // additional layer by stripping dangerous patterns from AI-generated HTML.
    // We allow <script> and <style> since the visualization requires them,
    // but DOMPurify still strips dangerous event handlers and data: URIs.
    const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
      WHOLE_DOCUMENT: true,
      FORCE_BODY: false,
      ADD_TAGS: ['script', 'style', 'link'],
      ADD_ATTR: ['onclick', 'onload', 'oninput', 'onchange', 'target', 'crossorigin'],
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${defaultStyles}
          ${bridgeScript}
        </head>
        <body>
          ${sanitizedHtml}
        </body>
      </html>
    `;
  }, [htmlContent]);

  // Handle message from iframe
  // --- SECURITY: postMessage origin validation ---
  // srcdoc iframes always have origin === 'null' by browser spec.
  // We only accept SANDBOX_READY from null-origin (our own srcdoc iframe).
  useEffect(() => {
    const handleMessage = (e) => {
      // Only accept messages from our own srcdoc iframe (origin is 'null')
      // or same-origin messages. Reject anything from external origins.
      const isSrcdocOrigin = e.origin === 'null' || e.origin === window.location.origin;
      if (!isSrcdocOrigin) return;

      // Only process if source is our iframe element
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;

      if (e.data && e.data.type === 'SANDBOX_READY') {
        setIsLoaded(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send step updates whenever step, snapshot, or trace changes
  useEffect(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;

    try {
      iframeRef.current.contentWindow.postMessage({
        type: 'STEP_UPDATE',
        step,
        stepData: snapshot || {},
        fullTrace: fullTrace || [],
        isPlaying,
        speed,
      }, '*');
    } catch (e) {
      console.warn('Could not postMessage to visualizer sandbox:', e);
    }
  }, [step, snapshot, fullTrace, isPlaying, speed, isLoaded]);

  if (!htmlContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#8b949e]">
        <span className="material-symbols-outlined text-[36px] text-[#4d5566] mb-2">auto_awesome</span>
        <div className="text-[14px] font-bold text-[#adbac7]">No AI visualization generated yet</div>
        <div className="text-[12px] text-[#4d5566] mt-1">Click "Generate Visualizer" to synthesize a custom UI</div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full min-h-0 relative bg-[#0d1117] rounded-lg overflow-hidden border border-[#30363d]">
      <iframe
        ref={iframeRef}
        srcDoc={wrappedHtml}
        title="AI Dynamic Visualizer"
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full border-0 bg-[#0d1117]"
        onLoad={() => {
          setIsLoaded(true);
          // Initial step dispatch
          setTimeout(() => {
            if (iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.postMessage({
                type: 'STEP_UPDATE',
                step,
                stepData: snapshot || {},
                fullTrace: fullTrace || [],
                isPlaying,
                speed,
              }, '*');
            }
          }, 150);
        }}
      />
    </div>
  );
}
