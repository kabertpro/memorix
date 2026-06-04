// ═══════════════════════════════════════════════════════════════
// MEMORIX — script.js v2
// Kabert Studio - LMKE
// ═══════════════════════════════════════════════════════════════

import { registrarUsuario, loginUsuario, guardarPuntaje, obtenerRanking } from "./firebase.js";

// ── AUDIO ────────────────────────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Notas normales (octava 4) + agudas (octava 5)
const NOTE_FREQ = {
  "DO":   261.63, "RE":   293.66, "MI":   329.63, "FA":   349.23,
  "SOL":  392.00, "LA":   440.00, "SI":   493.88,
  "DO'":  523.25, "RE'":  587.33, "MI'":  659.25, "FA'":  698.46,
  "SOL'": 783.99,
};

function playNote(noteName, duration = 1.5) {
  const ctx  = getAudioCtx();
  const freq = NOTE_FREQ[noteName];
  if (!freq) return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playSFX(type) {
  const ctx  = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.28, ctx.currentTime);
  if (type === "correct") {
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.start(); osc.stop(ctx.currentTime + 0.32);
  } else if (type === "wrong") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.start(); osc.stop(ctx.currentTime + 0.38);
  } else if (type === "levelup") {
    [0, 0.12, 0.24].forEach((t, i) => {
      const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.type = "square";
      o2.frequency.value = [660, 880, 1100][i];
      g2.gain.setValueAtTime(0.2, ctx.currentTime + t);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o2.start(ctx.currentTime + t); o2.stop(ctx.currentTime + t + 0.2);
    });
  }
}

// ── PENTAGRAMA SVG ───────────────────────────────────────────
// Líneas: y=30(L1 sup), y=50(L2), y=70(L3 centro), y=90(L4), y=110(L5 inf)
// Entre líneas = 20px. Espacio entre línea = 10px.
//
// Clave de Sol: SOL4 está EN la línea 2 desde abajo (y=90)
// Desde SOL4 subiendo: LA4=85, SI4=80(L3=70? no—espacio)
// Calculamos con paso de 10px por posición (línea o espacio):
//
// Posición cy (centro de nota):
//   SOL4 = línea 4 (y=90) → cy=90
//   LA4  = espacio 4-5     → cy=80   (entre L4 y L3)  -- ERROR: espacio entre L2 y L3 desde ARRIBA
//
// Reconstrucción correcta (clave de Sol estándar):
//   Las 5 líneas de abajo a arriba: L5(inf)=110, L4=90, L3=70, L2=50, L1(sup)=30
//   Los espacios: S54=100, S43=80, S32=60, S21=40
//
//   MI4 = L5 (y=110)
//   FA4 = S54 (y=100)
//   SOL4= L4  (y=90)
//   LA4 = S43 (y=80)
//   SI4 = L3  (y=70)
//   DO5 = S32 (y=60)
//   RE5 = L2  (y=50)
//   MI5 = S21 (y=40)
//   FA5 = L1  (y=30)
//
//   DO4 = espacio bajo L5 (y=120)  + ledger line y=130 para DO4
//   RE4 = ledger line y=130 (DO4 ledger), RE4 está en espacio y=125? NO
//
// DO4 (central) está una línea adicional DEBAJO del pentagrama:
//   Línea adicional: y=130
//   DO4 centrado EN esa línea adicional → cy=130
//   RE4 = espacio entre L5 y línea adicional → cy=120
//   MI4 = L5 = cy=110
//   FA4 = S entre L5 y L4 → cy=100
//   SOL4= L4 = cy=90
//   LA4 = S entre L4 y L3 → cy=80
//   SI4 = L3 = cy=70
//   DO5'= S entre L3 y L2 → cy=60
//   RE5'= L2 = cy=50
//   MI5'= S entre L2 y L1 → cy=40
//   FA5'= L1 = cy=30
//   SOL5'= S sobre L1 → cy=20

const NOTE_SVG = {
  //       cy   stemDir  stemY2  ledgerLines (y values)  label_dy
  "DO":  { cy:130, sd:1, sy2:90,   ledgers:[130],         ldy:-18 },
  "RE":  { cy:120, sd:1, sy2:80,   ledgers:[130],         ldy:-18 },
  "MI":  { cy:110, sd:1, sy2:70,   ledgers:[],            ldy:-18 },
  "FA":  { cy:100, sd:1, sy2:60,   ledgers:[],            ldy:-18 },
  "SOL": { cy:90,  sd:1, sy2:50,   ledgers:[],            ldy:-18 },
  "LA":  { cy:80,  sd:-1,sy2:40,   ledgers:[],            ldy:-18 },
  "SI":  { cy:70,  sd:-1,sy2:30,   ledgers:[],            ldy:-18 },
  "DO'": { cy:60,  sd:-1,sy2:20,   ledgers:[],            ldy:-18 },
  "RE'": { cy:50,  sd:-1,sy2:10,   ledgers:[],            ldy:-18 },
  "MI'": { cy:40,  sd:-1,sy2:0,    ledgers:[],            ldy:-18 },
  "FA'": { cy:30,  sd:-1,sy2:-10,  ledgers:[],            ldy:-18 },
  "SOL'":{ cy:20,  sd:-1,sy2:-20,  ledgers:[10],          ldy:20  },
};

function placeNote(noteName, showLabel) {
  const cfg = NOTE_SVG[noteName];
  if (!cfg) return;

  const cx = 190;
  const ry = 9, rx = 13;

  // Cabeza
  const head = document.getElementById("svg-note-head");
  head.setAttribute("cx", cx);
  head.setAttribute("cy", cfg.cy);
  head.setAttribute("rx", rx);
  head.setAttribute("ry", ry);
  head.setAttribute("transform", `rotate(-15 ${cx} ${cfg.cy})`);
  head.setAttribute("display", "block");

  // Plica
  const stem = document.getElementById("svg-stem");
  const stemX = cfg.sd > 0 ? cx + rx - 1 : cx - rx + 1; // derecha si baja, izquierda si sube
  const stemY1 = cfg.cy;
  const stemY2 = cfg.sy2;
  stem.setAttribute("x1", stemX); stem.setAttribute("x2", stemX);
  stem.setAttribute("y1", stemY1); stem.setAttribute("y2", stemY2);
  stem.setAttribute("display", "block");

  // Label
  const label = document.getElementById("svg-note-label");
  const labelY = cfg.cy + cfg.ldy;
  label.setAttribute("x", cx);
  label.setAttribute("y", labelY);
  label.textContent = showLabel ? noteName : "";
  label.setAttribute("display", showLabel ? "block" : "none");

  // Ledger lines extras
  const lo1 = document.getElementById("svg-ledger-lo1");
  const lo2 = document.getElementById("svg-ledger-lo2");
  const hi1 = document.getElementById("svg-ledger-hi1");
  lo1.setAttribute("display","none");
  lo2.setAttribute("display","none");
  hi1.setAttribute("display","none");

  cfg.ledgers.forEach(ly => {
    const lx1 = cx - rx - 6, lx2 = cx + rx + 6;
    if (ly >= 110) { // debajo
      lo1.setAttribute("x1",lx1); lo1.setAttribute("x2",lx2);
      lo1.setAttribute("y1",ly);  lo1.setAttribute("y2",ly);
      lo1.setAttribute("display","block");
    } else if (ly <= 30) { // arriba
      hi1.setAttribute("x1",lx1); hi1.setAttribute("x2",lx2);
      hi1.setAttribute("y1",ly);  hi1.setAttribute("y2",ly);
      hi1.setAttribute("display","block");
    }
  });

  // Animación
  head.classList.remove("note-appear");
  void head.getBoundingClientRect();
  head.classList.add("note-appear");
}

function hideNoteLabel() {
  const label = document.getElementById("svg-note-label");
  label.textContent = "";
  label.setAttribute("display","none");
}

function clearNote() {
  document.getElementById("svg-note-head").setAttribute("display","none");
  document.getElementById("svg-stem").setAttribute("display","none");
  document.getElementById("svg-note-label").setAttribute("display","none");
  document.getElementById("svg-ledger-lo1").setAttribute("display","none");
  document.getElementById("svg-ledger-lo2").setAttribute("display","none");
  document.getElementById("svg-ledger-hi1").setAttribute("display","none");
}

// ── NOTAS Y NIVELES ──────────────────────────────────────────

// Todas las notas disponibles (13 total)
const ALL_NOTES = ["DO","RE","MI","FA","SOL","LA","SI","DO'","RE'","MI'","FA'","SOL'"];

// Niveles: al menos 3 notas activas para que nunca sea trivial
// Dificultad FÁCIL:    solo notas del pentagrama principal (MI a SI)
// Dificultad NORMAL:   añade DO central y notas agudas básicas
// Dificultad DIFÍCIL:  todas las notas incluye DO y agudas completas

const LEVEL_DEFS = {
  facil: [
    ["MI","FA","SOL"],                        // Nv1: 3
    ["MI","FA","SOL","LA"],                   // Nv2: 4
    ["MI","FA","SOL","LA","SI"],              // Nv3: 5
    ["RE","MI","FA","SOL","LA","SI"],         // Nv4: 6
    ["DO","RE","MI","FA","SOL","LA","SI"],    // Nv5: 7
    ["DO","RE","MI","FA","SOL","LA","SI","DO'"],  // Nv6: 8
    ALL_NOTES.slice(0,9),                     // Nv7: hasta RE'
  ],
  normal: [
    ["DO","MI","SOL"],                        // Nv1
    ["DO","RE","MI","SOL"],                   // Nv2
    ["DO","RE","MI","FA","SOL"],              // Nv3
    ["DO","RE","MI","FA","SOL","LA"],         // Nv4
    ["DO","RE","MI","FA","SOL","LA","SI"],    // Nv5
    ["DO","MI","SOL","LA","SI","DO'","RE'"],  // Nv6
    ALL_NOTES,                               // Nv7
  ],
  dificil: [
    ["DO","SOL","DO'"],                            // Nv1: saltos
    ["DO","MI","SOL","SI","DO'"],                  // Nv2
    ["DO","RE","MI","SOL","LA","SI","DO'"],        // Nv3
    ["DO","RE","MI","FA","SOL","LA","SI","DO'","RE'"], // Nv4
    ALL_NOTES.slice(0,10),                         // Nv5
    ALL_NOTES.slice(0,11),                         // Nv6
    ALL_NOTES,                                     // Nv7
  ]
};

// ── STATE ────────────────────────────────────────────────────
let currentUser  = null;
let selectedMode = "clasico";
let selectedDiff = "normal";
let trainNotes   = [...ALL_NOTES];
let gameState    = {};

// ── PARTICLES ────────────────────────────────────────────────
(function() {
  const canvas = document.getElementById("particles");
  const ctx    = canvas.getContext("2d");
  const dots   = [];
  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  function spawn() { return { x:Math.random()*canvas.width, y:Math.random()*canvas.height,
    r:Math.random()*1.4+0.3, vx:(Math.random()-.5)*.25, vy:-Math.random()*.35-.1,
    alpha:Math.random()*.45+.1 }; }
  resize(); addEventListener("resize", resize);
  for (let i=0;i<55;i++) dots.push(spawn());
  (function tick() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    dots.forEach((d,i) => {
      d.x+=d.vx; d.y+=d.vy;
      if (d.y<-4||d.x<-4||d.x>canvas.width+4) { dots[i]=spawn(); dots[i].y=canvas.height+4; }
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(240,180,41,${d.alpha})`; ctx.fill();
    });
    requestAnimationFrame(tick);
  })();
})();

// ── SCREENS ──────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + id).classList.add("active");
}

// ── AUTH ─────────────────────────────────────────────────────
window.switchTab = function(tab) {
  document.getElementById("form-login").classList.toggle("hidden", tab!=="login");
  document.getElementById("form-register").classList.toggle("hidden", tab!=="register");
  document.getElementById("tab-login").classList.toggle("active", tab==="login");
  document.getElementById("tab-register").classList.toggle("active", tab==="register");
};

window.handleRegister = async function() {
  const user = document.getElementById("reg-user").value.trim();
  const pass = document.getElementById("reg-pass").value.trim();
  const msg  = document.getElementById("reg-msg");
  msg.className = "auth-msg";
  if (!user||!pass) { msg.textContent="Completa todos los campos."; msg.className="auth-msg error"; return; }
  if (user.length<3) { msg.textContent="Usuario mínimo 3 caracteres."; msg.className="auth-msg error"; return; }
  if (pass.length<4) { msg.textContent="Contraseña mínimo 4 caracteres."; msg.className="auth-msg error"; return; }
  msg.textContent="Registrando...";
  try {
    const data = await registrarUsuario(user, pass);
    currentUser = data;
    localStorage.setItem("memorix_user", JSON.stringify(data));
    msg.textContent="¡Registro exitoso!"; msg.className="auth-msg success";
    setTimeout(loadMenu, 600);
  } catch(e) { msg.textContent=e.message; msg.className="auth-msg error"; }
};

window.handleLogin = async function() {
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const msg  = document.getElementById("login-msg");
  msg.className="auth-msg";
  if (!user||!pass) { msg.textContent="Completa todos los campos."; msg.className="auth-msg error"; return; }
  msg.textContent="Ingresando...";
  try {
    const data = await loginUsuario(user, pass);
    currentUser = data;
    localStorage.setItem("memorix_user", JSON.stringify(data));
    loadMenu();
  } catch(e) { msg.textContent=e.message; msg.className="auth-msg error"; }
};

window.logout = function() {
  currentUser=null; localStorage.removeItem("memorix_user"); showScreen("auth");
};

function loadMenu() {
  document.getElementById("menu-username").textContent = currentUser.usuario;
  showScreen("menu");
}
window.showMenu = loadMenu;

// ── MODE SELECT ───────────────────────────────────────────────
window.showModeSelect = function() {
  buildTrainPicker();
  updateDiffDesc();
  // restore UI selections
  document.querySelectorAll(".mode-card").forEach(c => {
    c.classList.toggle("selected", c.dataset.mode === selectedMode);
  });
  document.querySelectorAll(".diff-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.diff === selectedDiff);
  });
  updateModeUI();
  showScreen("modeselect");
};

window.selectMode = function(mode) {
  selectedMode = mode;
  document.querySelectorAll(".mode-card").forEach(c => c.classList.toggle("selected", c.dataset.mode===mode));
  updateModeUI();
};

function updateModeUI() {
  const isTrain = selectedMode === "entrenamiento";
  document.getElementById("diff-section").classList.toggle("hidden", isTrain);
  document.getElementById("train-section").classList.toggle("hidden", !isTrain);
}

window.selectDiff = function(diff) {
  selectedDiff = diff;
  document.querySelectorAll(".diff-btn").forEach(b => b.classList.toggle("active", b.dataset.diff===diff));
  updateDiffDesc();
};

function updateDiffDesc() {
  const descs = {
    facil:   "Notas del pentagrama principal. Ideal para empezar.",
    normal:  "Notas graves y agudas básicas. Equilibrado.",
    dificil: "Todas las notas incluyendo saltos de octava. Para expertos.",
  };
  document.getElementById("diff-desc").textContent = descs[selectedDiff] || "";
}

function buildTrainPicker() {
  const wrap = document.getElementById("train-note-picker");
  wrap.innerHTML = "";
  ALL_NOTES.forEach(n => {
    const btn = document.createElement("button");
    btn.className = "train-toggle" + (trainNotes.includes(n) ? " on" : "");
    btn.textContent = n;
    btn.onclick = () => {
      if (trainNotes.includes(n)) {
        if (trainNotes.length <= 2) return; // mínimo 2
        trainNotes = trainNotes.filter(x=>x!==n);
        btn.classList.remove("on");
      } else {
        trainNotes.push(n);
        btn.classList.add("on");
      }
    };
    wrap.appendChild(btn);
  });
}

// ── LAUNCH GAME ───────────────────────────────────────────────
window.launchGame = function() {
  const mode = selectedMode;
  const diff = selectedDiff;

  const diffLabel = { facil:"FÁCIL", normal:"NORMAL", dificil:"DIFÍCIL" };
  const modeLabel = { clasico:"CLÁSICO", entrenamiento:"ENTRENAMIENTO", contrareloj:"CONTRARRELOJ", superviviente:"SUPERVIVIENTE" };

  document.getElementById("mode-badge").textContent = modeLabel[mode] || mode.toUpperCase();
  document.getElementById("diff-badge").textContent = diffLabel[diff] || diff.toUpperCase();

  // HUD visibility
  const timerWrap = document.getElementById("hud-timer-wrap");
  const livesWrap = document.getElementById("hud-lives-wrap");
  timerWrap.style.display = mode === "contrareloj" ? "flex" : "none";
  livesWrap.style.display = mode === "entrenamiento" ? "none" : "flex";

  const roundInfo = document.querySelector(".round-info");
  roundInfo.style.display = (mode==="contrareloj"||mode==="entrenamiento") ? "none" : "";

  // Init state
  gameState = {
    mode,
    diff,
    score:   0,
    level:   1,
    round:   1,
    lives:   mode==="superviviente" ? 1 : 3,
    waiting: false,
    timerSec: 60,
    timerInterval: null,
    totalCorrect: 0,
    totalAnswered: 0,
  };

  // Notes pool for entrenamiento
  gameState.trainPool = mode==="entrenamiento" ? [...trainNotes] : null;

  clearNote();
  showScreen("game");
  updateHUD();
  buildAnswerButtons(getAvailableNotes());
  nextRound();

  if (mode === "contrareloj") startTimer();
};

function getAvailableNotes() {
  const { mode, diff, level, trainPool } = gameState;
  if (mode === "entrenamiento") return trainPool;
  if (mode === "superviviente") return ALL_NOTES; // todas desde el inicio
  const levels = LEVEL_DEFS[diff] || LEVEL_DEFS.normal;
  return levels[Math.min(level-1, levels.length-1)];
}

// ── TIMER ────────────────────────────────────────────────────
function startTimer() {
  gameState.timerSec = 60;
  updateTimerUI();
  gameState.timerInterval = setInterval(() => {
    gameState.timerSec--;
    updateTimerUI();
    if (gameState.timerSec <= 0) {
      clearInterval(gameState.timerInterval);
      endGame("timeout");
    }
  }, 1000);
}

function updateTimerUI() {
  const el = document.getElementById("hud-timer");
  el.textContent = gameState.timerSec;
  el.classList.toggle("urgent", gameState.timerSec <= 10);
}

// ── HUD ──────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById("hud-level").textContent = gameState.level;
  document.getElementById("hud-score").textContent = gameState.score;
  document.getElementById("hud-round").textContent = gameState.round;
  const hearts = ["💔","❤️","❤️❤️","❤️❤️❤️"][Math.min(gameState.lives,3)];
  document.getElementById("hud-lives").textContent = hearts;
}

// ── ROUND LOGIC ──────────────────────────────────────────────
let pendingNoteTimer = null;

function nextRound() {
  if (gameState.waiting) return;

  const available = getAvailableNotes();
  // Evitar misma nota consecutiva si hay más de 1
  let noteName;
  if (available.length === 1) {
    noteName = available[0];
  } else {
    do { noteName = available[Math.floor(Math.random() * available.length)]; }
    while (noteName === gameState.currentNote);
  }
  gameState.currentNote = noteName;

  // Mostrar nota en pentagrama CON nombre por 2 seg, luego ocultar nombre
  placeNote(noteName, true);
  playNote(noteName, 1.6);

  // Bloquear botones durante presentación (sin ocultarlos)
  lockButtons(true);

  if (pendingNoteTimer) clearTimeout(pendingNoteTimer);
  pendingNoteTimer = setTimeout(() => {
    hideNoteLabel();
    lockButtons(false);
    resetButtonStyles();
  }, 2000);
}

function lockButtons(locked) {
  document.querySelectorAll(".note-btn").forEach(b => {
    if (b.classList.contains("dim")) return;
    b.disabled = locked;
  });
}

function resetButtonStyles() {
  document.querySelectorAll(".note-btn").forEach(b => {
    b.classList.remove("correct-btn","wrong-btn");
    if (!b.classList.contains("dim")) b.disabled = false;
  });
}

// ── ANSWER BUTTONS ────────────────────────────────────────────
function buildAnswerButtons(activeNotes) {
  const area = document.getElementById("answer-buttons");
  area.innerHTML = "";
  ALL_NOTES.forEach((note, idx) => {
    const btn = document.createElement("button");
    btn.className = "note-btn";
    btn.dataset.note = note;
    // Label: nota con marca de octava si tiene apóstrofe
    if (note.includes("'")) {
      btn.innerHTML = note.replace("'","") + '<span class="octave-mark">▲</span>';
    } else {
      btn.textContent = note;
    }
    if (!activeNotes.includes(note)) {
      btn.classList.add("dim");
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => handleAnswer(note, btn));
    }
    area.appendChild(btn);
  });
}

function refreshDimButtons() {
  const available = getAvailableNotes();
  document.querySelectorAll(".note-btn").forEach(btn => {
    const note = btn.dataset.note;
    const active = available.includes(note);
    btn.classList.toggle("dim", !active);
    if (!active) btn.disabled = true;
  });
}

// ── ANSWER HANDLER ────────────────────────────────────────────
function handleAnswer(selected, btn) {
  if (gameState.waiting) return;
  gameState.waiting = true;
  if (pendingNoteTimer) { clearTimeout(pendingNoteTimer); pendingNoteTimer=null; }

  lockButtons(true);

  const correct = selected === gameState.currentNote;
  gameState.totalAnswered++;

  // Mostrar la nota correcta en el pentagrama
  placeNote(gameState.currentNote, true);

  if (correct) {
    btn.classList.add("correct-btn");
    gameState.totalCorrect++;
    const pts = calcPoints(correct);
    gameState.score += pts;
    playSFX("correct");
    flashFeedback("correct");
    showScorePopup(btn, "+" + pts);
  } else {
    btn.classList.add("wrong-btn");
    document.querySelectorAll(".note-btn").forEach(b => {
      if (b.dataset.note === gameState.currentNote) b.classList.add("correct-btn");
    });
    if (gameState.mode !== "entrenamiento") gameState.lives--;
    playSFX("wrong");
    flashFeedback("wrong");
  }

  updateHUD();

  setTimeout(() => {
    gameState.waiting = false;
    resetButtonStyles();

    // Verificar game over
    if (gameState.mode !== "entrenamiento" && gameState.lives <= 0) {
      endGame("lives"); return;
    }

    // Avanzar progresión (solo modos con niveles)
    if (gameState.mode === "clasico" && correct) {
      if (gameState.round >= 5) {
        gameState.round = 1;
        if (gameState.level < 7) {
          gameState.level++;
          playSFX("levelup");
          // Rebuild buttons con nuevas notas
          buildAnswerButtons(getAvailableNotes());
        }
      } else {
        gameState.round++;
      }
    }
    updateHUD();
    nextRound();
  }, 1300);
}

function calcPoints(correct) {
  if (!correct) return 0;
  const { mode, diff, timerSec } = gameState;
  const diffMult = { facil:0.7, normal:1, dificil:1.4 }[diff] || 1;
  if (mode === "contrareloj") {
    // Bonus por velocidad: cuánto tiempo queda no importa, sino la rapidez de respuesta
    const base = 10;
    return Math.round(base * diffMult);
  }
  if (mode === "superviviente") return Math.round(15 * diffMult);
  if (mode === "entrenamiento") return 0;
  return Math.round(10 * diffMult); // clasico
}

function showScorePopup(btn, text) {
  const pop = document.createElement("div");
  pop.textContent = text;
  pop.style.cssText = `position:absolute;font-family:var(--font-head);font-size:1.1rem;
    color:#ffd166;font-weight:700;pointer-events:none;z-index:99;
    text-shadow:0 0 8px rgba(240,180,41,0.8);animation:scoreFloat .8s ease forwards`;
  const rect = btn.getBoundingClientRect();
  pop.style.left = (rect.left + rect.width/2) + "px";
  pop.style.top  = (rect.top - 10) + "px";
  if (!document.getElementById("score-float-style")) {
    const s = document.createElement("style");
    s.id = "score-float-style";
    s.textContent = "@keyframes scoreFloat{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-40px)}}";
    document.head.appendChild(s);
  }
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 850);
}

// ── FLASH ─────────────────────────────────────────────────────
function flashFeedback(type) {
  const el = document.getElementById("feedback-flash");
  el.className = "feedback-flash " + type;
  setTimeout(() => el.className = "feedback-flash", 480);
}

// ── GAME OVER ─────────────────────────────────────────────────
async function endGame(reason) {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  if (pendingNoteTimer) clearTimeout(pendingNoteTimer);

  const modeLabel = { clasico:"CLÁSICO", entrenamiento:"ENTRENAMIENTO", contrareloj:"CONTRARRELOJ", superviviente:"SUPERVIVIENTE" };
  const isTimeout = reason === "timeout";
  const accuracy  = gameState.totalAnswered > 0
    ? Math.round((gameState.totalCorrect / gameState.totalAnswered) * 100) : 0;

  document.getElementById("go-icon").textContent   = isTimeout ? "⏱️" : "💀";
  document.getElementById("go-title").textContent  = isTimeout ? "¡TIEMPO!" : "GAME OVER";
  document.getElementById("go-title").className    = isTimeout ? "gameover-title win" : "gameover-title";
  document.getElementById("go-mode").textContent   = `${modeLabel[gameState.mode]} · ${(gameState.diff||"").toUpperCase()}`;
  document.getElementById("final-score").textContent = gameState.score;
  document.getElementById("go-detail").textContent  =
    `Precisión ${accuracy}% · Nivel ${gameState.level} · ${gameState.totalCorrect}/${gameState.totalAnswered} correctas`;

  showScreen("gameover");

  if (gameState.mode !== "entrenamiento") {
    try {
      await guardarPuntaje(currentUser.usuario, gameState.score, gameState.mode);
      currentUser.mejorPuntaje = Math.max(currentUser.mejorPuntaje||0, gameState.score);
      localStorage.setItem("memorix_user", JSON.stringify(currentUser));
    } catch(e) { /* offline */ }
  }
}

window.confirmExit = function() {
  if (confirm("¿Salir del juego? Se perderá el progreso.")) {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    if (pendingNoteTimer) clearTimeout(pendingNoteTimer);
    loadMenu();
  }
};

// ── RANKING ──────────────────────────────────────────────────
let currentRankMode = "clasico";

window.showRanking = async function() {
  showScreen("ranking");
  loadRankingTab("clasico", document.querySelector(".rank-tab.active"));
};

window.loadRankingTab = async function(mode, tabEl) {
  currentRankMode = mode;
  document.querySelectorAll(".rank-tab").forEach(t => t.classList.remove("active"));
  if (tabEl) tabEl.classList.add("active");
  const list = document.getElementById("ranking-list");
  list.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    const rows = await obtenerRanking(mode);
    if (!rows.length) { list.innerHTML='<div class="loading">Sin datos aún.</div>'; return; }
    const medals = ["🥇","🥈","🥉"];
    list.innerHTML = rows.map((r,i) => `
      <div class="ranking-row">
        <span class="rank-pos">${medals[i]||r.pos}</span>
        <span class="rank-user">${r.usuario}</span>
        <span class="rank-score">${r.puntajes?.[mode]||r.mejorPuntaje||0} pts</span>
      </div>`).join("");
  } catch(e) { list.innerHTML='<div class="loading">Error al cargar.</div>'; }
};

// ── SESSION ───────────────────────────────────────────────────
function init() {
  const saved = localStorage.getItem("memorix_user");
  if (saved) { try { currentUser=JSON.parse(saved); loadMenu(); } catch { showScreen("auth"); } }
  else showScreen("auth");
}

document.addEventListener("keydown", e => {
  if (e.key!=="Enter") return;
  if (!document.getElementById("screen-auth").classList.contains("active")) return;
  const loginVisible = !document.getElementById("form-login").classList.contains("hidden");
  loginVisible ? window.handleLogin() : window.handleRegister();
});

init();
