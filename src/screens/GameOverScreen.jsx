import React from "react";

export default function GameOverScreen({ score, level, victory, onMenu, onRetry }) {
  return (
    <div className="screen gameover-screen">
      <div className="gameover-glow" />

      {victory ? (
        <>
          <div className="gameover-icon">🏆</div>
          <h2 className="gameover-title victory">¡VICTORIA!</h2>
          <p className="gameover-sub">¡Completaste todos los niveles!</p>
        </>
      ) : (
        <>
          <div className="gameover-icon">💔</div>
          <h2 className="gameover-title">GAME OVER</h2>
          <p className="gameover-sub">Sin vidas restantes</p>
        </>
      )}

      <div className="gameover-stats">
        <div className="stat-card">
          <span className="stat-label">PUNTAJE</span>
          <span className="stat-value">{score}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">NIVEL</span>
          <span className="stat-value">{level}</span>
        </div>
      </div>

      <div className="gameover-buttons">
        <button className="btn-primary" onClick={onRetry}>
          🔄 Jugar de nuevo
        </button>
        <button className="btn-outline" onClick={onMenu}>
          🏠 Menú principal
        </button>
      </div>
    </div>
  );
}
