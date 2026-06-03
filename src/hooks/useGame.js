import { useState, useCallback } from "react";

const LEVEL_NOTES = {
  1: ["DO"],
  2: ["DO", "RE"],
  3: ["DO", "RE", "MI"],
  4: ["DO", "RE", "MI", "FA"],
  5: ["DO", "RE", "MI", "FA", "SOL"],
  6: ["DO", "RE", "MI", "FA", "SOL", "LA"],
  7: ["DO", "RE", "MI", "FA", "SOL", "LA", "SI"],
};

const MAX_LEVEL = 7;
const ROUNDS_PER_LEVEL = 5;
const MAX_LIVES = 3;

function randomNote(level) {
  const pool = LEVEL_NOTES[level];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function useGame() {
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [currentNote, setCurrentNote] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | showing | answering | feedback
  const [lastResult, setLastResult] = useState(null); // correct | wrong | null
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);

  const startRound = useCallback((lvl) => {
    const note = randomNote(lvl);
    setCurrentNote(note);
    setPhase("showing");
    setLastResult(null);
    return note;
  }, []);

  const revealButtons = useCallback(() => {
    setPhase("answering");
  }, []);

  const answer = useCallback((chosen, lvl, currentRound) => {
    const correct = chosen === currentNote;
    setLastResult(correct ? "correct" : "wrong");
    setPhase("feedback");

    if (correct) {
      setScore((s) => s + 10);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setGameOver(true);
        return { result: "wrong", gameOver: true };
      }
    }

    // Advance round/level
    const nextRound = currentRound + 1;
    if (nextRound >= ROUNDS_PER_LEVEL) {
      const nextLevel = lvl + 1;
      if (nextLevel > MAX_LEVEL) {
        setVictory(true);
        return { result: correct ? "correct" : "wrong", victory: true };
      }
      return { result: correct ? "correct" : "wrong", nextLevel, nextRound: 0 };
    }
    return { result: correct ? "correct" : "wrong", nextLevel: lvl, nextRound };
  }, [currentNote, lives]);

  const advanceState = useCallback((nextLevel, nextRound) => {
    setLevel(nextLevel);
    setRound(nextRound);
  }, []);

  const reset = useCallback(() => {
    setLevel(1);
    setRound(0);
    setLives(MAX_LIVES);
    setScore(0);
    setCurrentNote(null);
    setPhase("idle");
    setLastResult(null);
    setGameOver(false);
    setVictory(false);
  }, []);

  return {
    level, round, lives, score, currentNote,
    phase, lastResult, gameOver, victory,
    LEVEL_NOTES, MAX_LIVES,
    startRound, revealButtons, answer, advanceState, reset,
  };
}
