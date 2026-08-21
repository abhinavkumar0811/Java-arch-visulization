import React, { useEffect } from 'react';

export default function LifecycleAnimation({ onComplete, speedMult = 1 }) {
  // Automatically complete after the animation finishes
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 7500 * speedMult);
    return () => clearTimeout(timer);
  }, [onComplete, speedMult]);

  return (
    <div className="lifecycle-overlay">
      <div className="lifecycle-modal">
        <h2 className="lifecycle-title">How Java Works Under the Hood</h2>
        <p className="lifecycle-subtitle">From source code to JVM execution</p>
        
        <div className="lifecycle-flow">
          <div className="lc-step lc-source">
            <div className="lc-icon">☕</div>
            <div className="lc-label">Source Code<br/>(.java)</div>
          </div>
          
          <div className="lc-arrow lc-arrow-1">➔</div>
          
          <div className="lc-step lc-compiler">
            <div className="lc-icon">⚙️</div>
            <div className="lc-label">Compiler<br/>(javac)</div>
          </div>
          
          <div className="lc-arrow lc-arrow-2">➔</div>
          
          <div className="lc-step lc-bytecode">
            <div className="lc-icon">📄</div>
            <div className="lc-label">Bytecode<br/>(.class)</div>
          </div>
          
          <div className="lc-arrow lc-arrow-3">➔</div>
          
          <div className="lc-jre-container">
            <div className="lc-jre-title">Java Runtime Environment (JRE)</div>
            <div className="lc-jvm-container">
              <div className="lc-jvm-title">Java Virtual Machine (JVM)</div>
              <div className="lc-jvm-inner">
                <div className="lc-step lc-classloader">
                  <div className="lc-label">ClassLoader</div>
                </div>
                <div className="lc-vert-arrow lc-arrow-4">⬇</div>
                <div className="lc-step lc-methodarea">
                  <div className="lc-label">Method Area</div>
                </div>
                <div className="lc-vert-arrow lc-arrow-5">⬇</div>
                <div className="lc-step lc-execengine">
                  <div className="lc-label">Execution Engine<br/>(Starts Main Thread)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lifecycle-actions">
          <button className="lc-skip-btn" onClick={onComplete}>Skip Animation ▶</button>
        </div>
      </div>
    </div>
  );
}
