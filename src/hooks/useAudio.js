import { useRef, useCallback } from "react";

const NOTE_FREQUENCIES = {
  DO: 261.63,
  RE: 293.66,
  MI: 329.63,
  FA: 349.23,
  SOL: 392.0,
  LA: 440.0,
  SI: 493.88,
};

export function useAudio() {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const playPiano = useCallback((noteName) => {
    const ctx = getCtx();
    const freq = NOTE_FREQUENCIES[noteName];
    if (!freq) return;

    const now = ctx.currentTime;

    // Main tone - triangle wave for piano-like tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const master = ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, now); // octave harmonic

    // Envelope: fast attack, long decay like piano
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.6, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    master.gain.setValueAtTime(0.8, now);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(master);
    gain2.connect(master);
    master.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2);
    osc2.stop(now + 2);
  }, []);

  const playCorrect = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.3, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }, []);

  const playWrong = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }, []);

  return { playPiano, playCorrect, playWrong };
}
