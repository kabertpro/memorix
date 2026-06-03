import React, { useEffect, useState } from "react";
import { getTopScores } from "../firebase/firestore";

export default function Ranking({ onBack }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopScores().then((data) => {
      setScores(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="screen ranking-screen">
      <div className="logo-small">🎵 MEMORIX</div>
      <h2 className="ranking-title">TOP 20</h2>

      {loading ? (
        <div className="loading-text">Cargando...</div>
      ) : (
        <div className="ranking-list">
          {scores.length === 0 && (
            <div className="empty-ranking">¡Sé el primero en el ranking!</div>
          )}
          {scores.map((s, i) => (
            <div key={s.id} className={`ranking-row ${i < 3 ? "top3" : ""}`}>
              <span className="rank-pos">{medals[i] || `#${i + 1}`}</span>
              <span className="rank-user">{s.username}</span>
              <span className="rank-score">{s.score} pts</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn-secondary" onClick={onBack}>← Volver</button>
    </div>
  );
}
