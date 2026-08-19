import React from 'react';

export default function StepControls({
  index, total, playing, onPrev, onNext, onPlayPause, onReset, onScrub, speed, setSpeed, currentEvent
}) {
  return (
    <div className="step-controls">
      <div className="step-controls-row">
        <button className="ctrl-btn icon-btn" onClick={onReset} title="Reset (Beginning)">⏮</button>
        <button className="ctrl-btn icon-btn" onClick={onPrev} title="Previous Step (Left Arrow)" disabled={index <= 0}>◀ Step</button>
        <button className="ctrl-btn primary-btn" onClick={onPlayPause} title="Play / Pause">
          {playing ? '⏸ Pause' : '▶ Auto-Play'}
        </button>
        <button className="ctrl-btn icon-btn" onClick={onNext} title="Next Step (Right Arrow)" disabled={index >= total - 1}>Step ▶</button>
        
        <input
          className="step-slider"
          type="range"
          min={0}
          max={Math.max(total - 1, 0)}
          value={index}
          onChange={(e) => onScrub(Number(e.target.value))}
        />
        
        <span className="step-counter">
          Step <strong className="highlight">{total ? index + 1 : 0}</strong> of {total}
        </span>

        <select className="speed-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={1400}>0.5x Speed</option>
          <option value={700}>1.0x Speed</option>
          <option value={350}>2.0x Speed</option>
          <option value={150}>4.0x Speed</option>
        </select>
      </div>

      {currentEvent ? (
        <div className="event-banner">
          <span className={`event-badge badge-${currentEvent.type}`}>
            {currentEvent.type}
          </span>
          <span className="event-message">{currentEvent.description}</span>
          {currentEvent.line && <span className="event-line-tag">Line {currentEvent.line}</span>}
        </div>
      ) : (
        <div className="event-banner empty">
          <span className="event-message muted">Click "Run" to generate execution steps & visualize JVM architecture</span>
        </div>
      )}
    </div>
  );
}
