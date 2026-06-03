import React, { useEffect, useRef, useState, useCallback } from "react";
import { useGame } from "../hooks/useGame";
import { useAudio } from "../hooks/useAudio";
import { saveScore, updateBestScore } from "../firebase/firestore";
import HUD from "../components/HUD";
import Staff from "../components/Staff";
import NoteButtons from "../components/NoteButtons";
import StarBurst from "../components/StarBurst";
import GameOverScreen from "./GameOverScreen";

const ROUNDS_PER_LEVEL = 5;
const SHOW_DURATION = 2000;
const FEEDBACK_DURATION = 900;

export default function GameScreen({ user, onMenu, onRetry }) {
  const game = useGame();
  const { playPiano, playCorrect, playWrong } = useAudio();
  const [starTrigger, setStarTrigger] = useState(0);
  const [feedbackClass, setFeedbackClass] = useState("");
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const roundRef = useRef(0);
  const runningRef = useRef(false);

  const runRound = useCallback((lvl, roundNum) => {
    if (runningRef.current) return;
    runningRef.current = true;
    const note = game.startRound(lvl);
    playPiano(note);

    setTimeout(() => {
      game.revealButtons();
      runningRef.current = false;
    }, SHOW_DURATION);
  }, [game, playPiano]);

  // Start first round on mount
  useEffect(() => {
    runRound(1, 0);
    // eslint-disable-next-line
  }, []);

  const handleAnswer = useCallback((chosen) => {
    if (game.phase !== "answering") return;

    const res = game.answer(chosen, levelRef.current, roundRef.current);

    if (res.result === "correct") {
      playCorrect();
      setStarTrigger((t) => t + 1);
      setFeedbackClass("feedback-correct");
    } else {
      playWrong();
      setFeedbackClass("feedback-wrong");
    }

    // Update refs with new values
    const nextLevel = res.nextLevel ?? levelRef.current;
    const nextRound = res.nextRound ?? roundRef.current;
    scoreRef.current = game.score + (res.result === "correct" ? 10 : 0);
    levelRef.current = nextLevel;
    roundRef.current = nextRound;

    if (res.gameOver || res.victory) {
      // Save score to Firestore
      const finalScore = scoreRef.current;
      if (user) {
        saveScore(user.username, finalScore).catch(() => {});
        updateBestScore(user.uid, finalScore).catch(() => {});
      }
      setTimeout(() => setFeedbackClass(""), FEEDBACK_DURATION);
      return;
    }

    game.advanceState(nextLevel, nextRound);

    setTimeout(() => {
      setFeedbackClass("");
      runRound(nextLevel, nextRound);
    }, FEEDBACK_DURATION);
  }, [game, playCorrect, playWrong, user, runRound]);

  if (game.gameOver || game.victory) {
    return (
      <GameOverScreen
        score={game.score}
        level={game.level}
        victory={game.victory}
        onMenu={onMenu}
        onRetry={onRetry}
      />
    );
  }

  const currentLevelNotes = game.LEVEL_NOTES[game.level] || [];

  return (
    <div className={`screen game-screen ${feedbackClass}`}>
      <HUD
        lives={game.lives}
        score={game.score}
        level={game.level}
        round={game.round}
        maxLives={game.MAX_LIVES}
        roundsPerLevel={ROUNDS_PER_LEVEL}
      />

      <div className="staff-area">
        <Staff
          note={game.currentNote}
          visible={game.phase === "showing"}
        />
        {game.phase === "showing" && (
          <div className="listening-label">🎧 Escucha...</div>
        )}
        {game.phase === "answering" && (
          <div className="question-label">❓ ¿Qué nota fue?</div>
        )}
        {game.phase === "feedback" && game.lastResult === "correct" && (
          <div className="feedback-label correct-label">✅ ¡Correcto! +10</div>
        )}
        {game.phase === "feedback" && game.lastResult === "wrong" && (
          <div className="feedback-label wrong-label">❌ ¡Incorrecto!</div>
        )}
        <StarBurst trigger={starTrigger} />
      </div>

      <NoteButtons
        notes={currentLevelNotes}
        onAnswer={handleAnswer}
        disabled={game.phase !== "answering"}
        correctNote={game.currentNote}
        lastResult={game.lastResult}
      />

      <button className="btn-exit" onClick={onMenu}>✕ Salir</button>
    </div>
  );
}
