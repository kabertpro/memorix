import React from "react";

export default function HUD({ lives, score, level, round, maxLives = 3, roundsPerLevel = 5 }) {
  return (
    <div className="hud">
      <div className="hud-lives">
        {Array.from({ length: maxLives }).map((_, i) => (
          <span key={i} className={`heart ${i < lives ? "alive" : "dead"}`}>❤</span>
        ))}
      </div>
      <div className="hud-center">
        <span className="hud-level">NVL {level}</span>
        <div className="hud-progress">
          {Array.from({ length: roundsPerLevel }).map((_, i) => (
            <span key={i} className={`progress-dot ${i < round ? "done" : ""}`} />
          ))}
        </div>
      </div>
      <div className="hud-score">
        <span className="score-label">PTS</span>
        <span className="score-value">{score}</span>
      </div>
    </div>
  );
}
