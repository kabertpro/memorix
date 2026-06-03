import React from "react";

// Y position on staff for each note (5-line staff, treble clef)
const NOTE_POSITIONS = {
  DO:  { y: 128, ledger: true },   // middle C, ledger line below
  RE:  { y: 118, ledger: false },
  MI:  { y: 108, ledger: false },  // first line
  FA:  { y: 98,  ledger: false },
  SOL: { y: 88,  ledger: false },  // second line
  LA:  { y: 78,  ledger: false },
  SI:  { y: 68,  ledger: false },  // third line
};

const NOTE_COLORS = {
  DO:  "#f5c842",
  RE:  "#f5a742",
  MI:  "#f57242",
  FA:  "#e84393",
  SOL: "#42c5f5",
  LA:  "#42f5a7",
  SI:  "#b842f5",
};

export default function Staff({ note, visible }) {
  const pos = note ? NOTE_POSITIONS[note] : null;
  const color = note ? NOTE_COLORS[note] : "#fff";

  // Staff lines Y positions
  const lines = [60, 70, 80, 90, 100];

  return (
    <div className="staff-wrapper">
      <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className="staff-svg">
        {/* Treble clef glyph approximation */}
        <text x="18" y="108" fontSize="90" fill="rgba(255,255,255,0.15)" fontFamily="serif">𝄞</text>

        {/* Staff lines */}
        {lines.map((y) => (
          <line key={y} x1="14" y1={y} x2="286" y2={y}
            stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        ))}

        {/* Ledger line for DO (middle C) */}
        {visible && note === "DO" && (
          <line x1="130" y1="128" x2="170" y2="128"
            stroke={color} strokeWidth="2" />
        )}

        {/* Note head */}
        {visible && pos && (
          <g>
            <ellipse
              cx="150" cy={pos.y} rx="13" ry="10"
              fill={color}
              style={{ filter: `drop-shadow(0 0 8px ${color})` }}
            />
            {/* Stem */}
            <line x1="163" y1={pos.y} x2="163" y2={pos.y - 40}
              stroke={color} strokeWidth="2.5" />
            {/* Glow pulse */}
            <ellipse
              cx="150" cy={pos.y} rx="18" ry="14"
              fill="none"
              stroke={color}
              strokeWidth="1"
              opacity="0.4"
              className="note-pulse"
            />
          </g>
        )}

        {/* Note name label below staff */}
        {visible && note && (
          <text x="150" y="168" textAnchor="middle"
            fontSize="18" fontWeight="900"
            fontFamily="Orbitron, sans-serif"
            fill={color}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
            {note}
          </text>
        )}
      </svg>
    </div>
  );
}
