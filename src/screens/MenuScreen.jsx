import React from "react";

export default function MenuScreen({ user, onPlay, onRanking, onLogin, onRegister, onLogout }) {
  return (
    <div className="screen menu-screen">
      <div className="menu-bg-glow" />

      <div className="logo-wrapper">
        <div className="logo-icon">🎵</div>
        <h1 className="logo-title">MEMORIX</h1>
        <p className="logo-sub">Escucha · Recuerda · Responde</p>
        <p className="logo-credit">Kabert Studio — LMKE</p>
      </div>

      {user && (
        <div className="user-pill">
          👤 {user.username}
        </div>
      )}

      <div className="menu-buttons">
        <button className="btn-primary btn-play" onClick={onPlay}>
          ▶ JUGAR
        </button>
        <button className="btn-secondary" onClick={onRanking}>
          🏆 Ranking
        </button>
        {!user ? (
          <>
            <button className="btn-secondary" onClick={onLogin}>
              🔑 Iniciar Sesión
            </button>
            <button className="btn-outline" onClick={onRegister}>
              ✨ Registrarse
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onLogout}>
            Cerrar Sesión
          </button>
        )}
      </div>
    </div>
  );
}
