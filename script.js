// ═══════════════════════════════════════════════════════════════
// MEMORIX — script.js
// Kabert Studio - LMKE
// ═══════════════════════════════════════════════════════════════

import {
  registrarUsuario,
  loginUsuario,
  guardarPuntaje,
  obtenerRanking
} from "./firebase.js";

// ── AUDIO (Web Audio API) ────────────────────────────────────

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

// Frecuencias de las notas (octava 4, clave de Sol)
const NOTE_FREQ = {
  DO:  261.63,
  RE:  293.66,
  MI:  329.63,
  FA:  349.23,
  SOL: 392.00,
  LA:  440.00,
  SI:  493.88
};

function playNote(noteName, duration = 1.2) {
  const ctx = getAudioCtx();
  const freq = NOTE_FREQ[noteName];
  if (!freq) return;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playSFX(type) {
  const ctx = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);

  if (type === "correct") {
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(); osc.stop(ctx.currentTime + 0.35);
  } else {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  }
}

// ── NOTAS Y POSICIONES EN PENTAGRAMA ────────────────────────
// El pentagrama tiene 5 líneas (H=120px, padding 18px top/bottom)
// Líneas en Y: 18, 39, 60, 81, 102  (cada 21px)
// Entre líneas: 10.5px
// Clave de Sol: línea 2 (desde abajo) = DO central debajo del pentagrama

// Posiciones de la nota-head (top, en px, relativo a .staff 120px)
// SOL está en línea 2 (desde abajo) = 81px
// LA   línea 3 = 60px
// etc.
const NOTE_POSITIONS = {
  //        top (note-head)  stem-top  name-top  ledger-below  ledger-above
  DO:  { head: 110, stem: 70,  name: 128, ledgerB: 110, ledgerA: -1  },
  RE:  { head: 99,  stem: 59,  name: 117, ledgerB: -1,  ledgerA: -1  },
  MI:  { head: 89,  stem: 49,  name: 107, ledgerB: -1,  ledgerA: -1  },
  FA:  { head: 78,  stem: 38,  name: 97,  ledgerB: -1,  ledgerA: -1  },
  SOL: { head: 68,  stem: 28,  name: 87,  ledgerB: -1,  ledgerA: -1  },
  LA:  { head: 57,  stem: 17,  name: 76,  ledgerB: -1,  ledgerA: -1  },
  SI:  { head: 47,  stem: 7,   name: 65,  ledgerB: -1,  ledgerA: -1  },
};

// ── NIVELES ──────────────────────────────────────────────────
const LEVELS = [
  ["DO"],
  ["DO", "RE"],
  ["DO", "RE", "MI"],
  ["DO", "RE", "MI", "FA"],
  ["DO", "RE", "MI", "FA", "SOL"],
  ["DO", "RE", "MI", "FA", "SOL", "LA"],
  ["DO", "RE", "MI", "FA", "SOL", "LA", "SI"],
];

// ── STATE ────────────────────────────────────────────────────
let currentUser = null;
let gameState   = {};

// ── PARTICLES ────────────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById("particles");
  const ctx    = canvas.getContext("2d");
  let dots     = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function spawnDot() {
    return {
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.5 + 0.3,
      vx:    (Math.random() - 0.5) * 0.3,
      vy:    -Math.random() * 0.4 - 0.1,
      alpha: Math.random() * 0.5 + 0.1,
    };
  }

  resize();
  window.addEventListener("resize", resize);
  for (let i = 0; i < 60; i++) dots.push(spawnDot());

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach((d, i) => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.y < -4 || d.x < -4 || d.x > canvas.width + 4) {
        dots[i] = spawnDot();
        dots[i].y = canvas.height + 4;
      }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,180,41,${d.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  tick();
})();

// ── SCREEN MANAGER ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + id).classList.add("active");
}

// ── AUTH TABS ────────────────────────────────────────────────
window.switchTab = function(tab) {
  document.getElementById("form-login").classList.toggle("hidden",    tab !== "login");
  document.getElementById("form-register").classList.toggle("hidden", tab !== "register");
  document.getElementById("tab-login").classList.toggle("active",    tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");
};

// ── REGISTER ─────────────────────────────────────────────────
window.handleRegister = async function() {
  const user = document.getElementById("reg-user").value.trim();
  const pass = document.getElementById("reg-pass").value.trim();
  const msg  = document.getElementById("reg-msg");
  msg.className = "auth-msg";

  if (!user || !pass) { msg.textContent = "Completa todos los campos."; msg.className = "auth-msg error"; return; }
  if (user.length < 3) { msg.textContent = "Usuario mínimo 3 caracteres."; msg.className = "auth-msg error"; return; }
  if (pass.length < 4) { msg.textContent = "Contraseña mínimo 4 caracteres."; msg.className = "auth-msg error"; return; }

  msg.textContent = "Registrando...";
  try {
    const data = await registrarUsuario(user, pass);
    currentUser = data;
    localStorage.setItem("memorix_user", JSON.stringify(data));
    msg.textContent = "¡Registro exitoso!";
    msg.className = "auth-msg success";
    setTimeout(loadMenu, 600);
  } catch (e) {
    msg.textContent = e.message;
    msg.className = "auth-msg error";
  }
};

// ── LOGIN ────────────────────────────────────────────────────
window.handleLogin = async function() {
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const msg  = document.getElementById("login-msg");
  msg.className = "auth-msg";

  if (!user || !pass) { msg.textContent = "Completa todos los campos."; msg.className = "auth-msg error"; return; }

  msg.textContent = "Ingresando...";
  try {
    const data = await loginUsuario(user, pass);
    currentUser = data;
    localStorage.setItem("memorix_user", JSON.stringify(data));
    loadMenu();
  } catch (e) {
    msg.textContent = e.message;
    msg.className = "auth-msg error";
  }
};

// ── LOGOUT ───────────────────────────────────────────────────
window.logout = function() {
  currentUser = null;
  localStorage.removeItem("memorix_user");
  showScreen("auth");
};

// ── MENU ─────────────────────────────────────────────────────
function loadMenu() {
  document.getElementById("menu-username").textContent = currentUser.usuario;
  showScreen("menu");
}

window.showMenu = function() { loadMenu(); };

// ── RANKING ──────────────────────────────────────────────────
window.showRanking = async function() {
  showScreen("ranking");
  const list = document.getElementById("ranking-list");
  list.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    const rows = await obtenerRanking();
    if (rows.length === 0) {
      list.innerHTML = '<div class="loading">Sin datos aún.</div>';
      return;
    }
    const medals = ["🥇","🥈","🥉"];
    list.innerHTML = rows.map((r, i) => `
      <div class="ranking-row">
        <span class="rank-pos">${medals[i] || r.pos}</span>
        <span class="rank-user">${r.usuario}</span>
        <span class="rank-score">${r.mejorPuntaje} pts</span>
      </div>
    `).join("");
  } catch (e) {
    list.innerHTML = '<div class="loading">Error al cargar.</div>';
  }
};

// ── GAME INIT ────────────────────────────────────────────────
window.startGame = function() {
  gameState = {
    level:    1,
    round:    1,
    score:    0,
    lives:    3,
    waiting:  false,
  };
  showScreen("game");
  updateHUD();
  nextRound();
};

function updateHUD() {
  document.getElementById("hud-level").textContent = gameState.level;
  document.getElementById("hud-score").textContent = gameState.score;
  document.getElementById("hud-round").textContent = gameState.round;
  const hearts = ["","❤️","❤️❤️","❤️❤️❤️"][gameState.lives] || "";
  document.getElementById("hud-lives").textContent = hearts || "💔";
}

// ── ROUND LOGIC ──────────────────────────────────────────────
function nextRound() {
  if (gameState.waiting) return;

  const available = LEVELS[gameState.level - 1];
  const noteName  = available[Math.floor(Math.random() * available.length)];
  gameState.currentNote = noteName;

  // Ocultar botones durante la presentación
  const btnArea = document.getElementById("answer-buttons");
  btnArea.innerHTML = "";
  btnArea.style.visibility = "hidden";

  showNoteOnStaff(noteName, true);
  playNote(noteName, 1.8);

  // Después de 2 segundos, ocultar nombre y mostrar botones
  setTimeout(() => {
    hideNoteName();
    showAnswerButtons(available);
    btnArea.style.visibility = "visible";
  }, 2000);
}

function showNoteOnStaff(noteName, showName) {
  const pos  = NOTE_POSITIONS[noteName];
  const head = document.getElementById("note-head");
  const stem = document.getElementById("note-stem");
  const name = document.getElementById("note-name");
  const lB   = document.getElementById("ledger-below");
  const lA   = document.getElementById("ledger-above");

  head.style.top     = pos.head + "px";
  head.style.display = "block";
  head.classList.remove("appear");
  void head.offsetWidth; // reflow
  head.classList.add("appear");

  // Stem: arriba de la cabeza (nota grave → stem arriba)
  stem.style.top     = (pos.head - 40) + "px";
  stem.style.display = pos.head > 50 ? "block" : "none"; // ocultar stem si muy arriba

  name.style.top     = pos.name + "px";
  name.textContent   = showName ? noteName : "";
  name.style.display = "block";

  // Líneas adicionales
  lB.style.display = pos.ledgerB >= 0 ? "block" : "none";
  if (pos.ledgerB >= 0) lB.style.top = pos.ledgerB + "px";

  lA.style.display = pos.ledgerA >= 0 ? "block" : "none";
  if (pos.ledgerA >= 0) lA.style.top = pos.ledgerA + "px";
}

function hideNoteName() {
  document.getElementById("note-name").textContent = "";
}

// ── ANSWER BUTTONS ───────────────────────────────────────────
function showAnswerButtons(available) {
  const btnArea = document.getElementById("answer-buttons");
  btnArea.innerHTML = "";
  // Siempre mostrar 7 botones, deshabilitando los no disponibles
  const ALL_NOTES = ["DO","RE","MI","FA","SOL","LA","SI"];
  ALL_NOTES.forEach((note, idx) => {
    const btn = document.createElement("button");
    btn.className   = "note-btn";
    btn.textContent = note;
    btn.style.animationDelay = (idx * 0.04) + "s";
    if (!available.includes(note)) {
      btn.disabled = true;
      btn.style.opacity = "0.25";
    } else {
      btn.addEventListener("click", () => handleAnswer(note, btn));
    }
    btnArea.appendChild(btn);
  });
}

// ── ANSWER HANDLER ───────────────────────────────────────────
function handleAnswer(selected, btn) {
  if (gameState.waiting) return;
  gameState.waiting = true;

  // Deshabilitar todos
  document.querySelectorAll(".note-btn").forEach(b => b.disabled = true);

  const correct = selected === gameState.currentNote;

  // Mostrar nombre de la nota en pentagrama
  document.getElementById("note-name").textContent = gameState.currentNote;

  if (correct) {
    btn.classList.add("correct-btn");
    gameState.score += 10;
    playSFX("correct");
    flashFeedback("correct");
  } else {
    btn.classList.add("wrong-btn");
    // Marcar la correcta en verde
    document.querySelectorAll(".note-btn").forEach(b => {
      if (b.textContent === gameState.currentNote) b.classList.add("correct-btn");
    });
    gameState.lives--;
    playSFX("wrong");
    flashFeedback("wrong");
  }

  updateHUD();

  setTimeout(() => {
    gameState.waiting = false;

    if (gameState.lives <= 0) {
      endGame();
      return;
    }

    // Avanzar ronda / nivel
    if (gameState.round >= 5) {
      gameState.round = 1;
      if (gameState.level < 7) {
        gameState.level++;
      }
      // Si ya estamos en nivel 7 ronda 5, seguimos infinito en nivel 7
    } else {
      gameState.round++;
    }
    nextRound();
  }, 1200);
}

// ── FLASH FEEDBACK ───────────────────────────────────────────
function flashFeedback(type) {
  const el = document.getElementById("feedback-flash");
  el.className = "feedback-flash " + type;
  setTimeout(() => { el.className = "feedback-flash"; }, 500);
}

// ── GAME OVER ────────────────────────────────────────────────
async function endGame() {
  showScreen("gameover");
  document.getElementById("final-score").textContent = gameState.score;
  document.getElementById("final-level").textContent = gameState.level;
  try {
    await guardarPuntaje(currentUser.usuario, gameState.score);
    // Actualizar copia local
    currentUser.mejorPuntaje = Math.max(currentUser.mejorPuntaje || 0, gameState.score);
    localStorage.setItem("memorix_user", JSON.stringify(currentUser));
  } catch (e) { /* offline / error — continuar */ }
}

// ── SESSION RESTORE ──────────────────────────────────────────
function init() {
  const saved = localStorage.getItem("memorix_user");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      loadMenu();
    } catch { showScreen("auth"); }
  } else {
    showScreen("auth");
  }
}

// Enter key shortcuts for auth forms
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const authActive = document.getElementById("screen-auth").classList.contains("active");
  if (!authActive) return;
  const loginVisible = !document.getElementById("form-login").classList.contains("hidden");
  loginVisible ? window.handleLogin() : window.handleRegister();
});

init();
