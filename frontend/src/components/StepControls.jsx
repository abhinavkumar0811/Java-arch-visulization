import React from 'react';

export default function StepControls({
  index, total, playing, onPrev, onNext, onPlayPause, onReset, onScrub, speed, setSpeed, currentEvent
}) {
  return (
    <div className="step-controls-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="step-controls">
        <div className="step-controls-row">
          <button className="ctrl-btn" onClick={onReset} title="Reset to start">↻</button>
          <button className="ctrl-btn" onClick={onPrev} title="Previous step">◀</button>
          <button className="ctrl-btn primary" onClick={onPlayPause} title="Play / Pause">
            {playing ? '⏸' : '▶'}
          </button>
          <button className="ctrl-btn" onClick={onNext} title="Next step">▶</button>
          <input
            className="step-slider"
            type="range"
            min={0}
            max={Math.max(total - 1, 0)}
            value={index}
            onChange={(e) => onScrub(Number(e.target.value))}
          />
          <span className="step-count">{total ? index + 1 : 0} / {total}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Speed</span>
            <input 
              className="step-slider" 
              type="range" 
              min={100} 
              max={2000} 
              step={100} 
              value={2100 - speed} 
              onChange={(e) => setSpeed(2100 - Number(e.target.value))} 
              style={{ width: '60px' }}
              title="Playback speed"
            />
          </div>
        </div>
      </div>
      {currentEvent && (
        <div className="event-desc" style={{ marginTop: 0, padding: '0 12px' }}>
          <span className={`event-tag tag-${currentEvent.type}`}>{currentEvent.type}</span>
          {currentEvent.description}
        </div>
      )}
    </div>
  );
}
