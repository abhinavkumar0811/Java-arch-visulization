import React from 'react';

export default function StepControls({
  index, total, playing, onPrev, onNext, onPlayPause, onReset, onScrub, speed, setSpeed, currentEvent
}) {
  return (
    <div className="step-controls">
      <div className="step-controls-row">
        <button className="ctrl-btn" onClick={onReset} title="Reset to start">⏮</button>
        <button className="ctrl-btn" onClick={onPrev} title="Previous step">◀</button>
        <button className="ctrl-btn primary" onClick={onPlayPause} title="Play / Pause">
          {playing ? '⏸ Pause' : '▶ Play'}
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
        <select className="speed-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={1200}>0.5x</option>
          <option value={700}>1x</option>
          <option value={350}>2x</option>
          <option value={150}>4x</option>
        </select>
      </div>
      {currentEvent && (
        <div className="event-desc">
          <span className={`event-tag tag-${currentEvent.type}`}>{currentEvent.type}</span>
          {currentEvent.description}
        </div>
      )}
    </div>
  );
}
