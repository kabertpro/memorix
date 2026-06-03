import React, { useEffect, useState } from "react";

export default function StarBurst({ trigger }) {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    const newStars = Array.from({ length: 14 }, (_, i) => ({
      id: Date.now() + i,
      angle: (i / 14) * 360,
      dist: 60 + Math.random() * 50,
      size: 8 + Math.random() * 10,
      color: ["#f5c842", "#42c5f5", "#e84393", "#42f5a7", "#b842f5"][i % 5],
    }));
    setStars(newStars);
    const t = setTimeout(() => setStars([]), 700);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!stars.length) return null;

  return (
    <div className="starburst">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star-particle"
          style={{
            width: s.size,
            height: s.size,
            background: s.color,
            "--angle": `${s.angle}deg`,
            "--dist": `${s.dist}px`,
            boxShadow: `0 0 6px ${s.color}`,
          }}
        />
      ))}
    </div>
  );
}
