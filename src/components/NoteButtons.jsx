import React from "react";

const NOTE_COLORS = {
  DO:  "#f5c842",
  RE:  "#f5a742",
  MI:  "#f57242",
  FA:  "#e84393",
  SOL: "#42c5f5",
  LA:  "#42f5a7",
  SI:  "#b842f5",
};

export default function NoteButtons({ notes, onAnswer, disabled, correctNote, lastResult }) {
  return (
    <div className="note-buttons">
      {notes.map((note) => {
        let cls = "note-btn";
        if (disabled && lastResult) {
          if (note === correctNote) cls += " correct-btn";
          else cls += " dim-btn";
        }
        return (
          <button
            key={note}
            className={cls}
            style={{ "--note-color": NOTE_COLORS[note] }}
            onClick={() => !disabled && onAnswer(note)}
            disabled={disabled}
          >
            {note}
          </button>
        );
      })}
    </div>
  );
}
