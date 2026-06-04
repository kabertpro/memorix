// ═══════════════════════════════════════════════════════════════
// MEMORIX — script.js v3  ·  Kabert Studio - LMKE
//
// MECÁNICA CENTRAL:
//   1. El juego muestra una secuencia de notas en el pentagrama
//      (una por una, con sonido). SIN mostrar el nombre.
//   2. El jugador reproduce la secuencia tocando los botones
//      en el mismo orden.
//   3. Correcto → siguiente secuencia (más larga).
//      Error     → pierde una vida / game over.
// ═══════════════════════════════════════════════════════════════

import { registrarUsuario, loginUsuario, guardarPuntaje, obtenerRanking } from "./firebase.js";

// ── AUDIO ────────────────────────────────────────────────────
let audioCtx = null;
function getACtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// 14 notas: octava normal + octava aguda completa
const NOTE_FREQ = {
  "DO" :261.63, "RE" :293.66, "MI" :329.63, "FA" :349.23,
  "SOL":392.00, "LA" :440.00, "SI" :493.88,
  "DO'":523.25, "RE'":587.33, "MI'":659.25, "FA'":698.46,
  "SOL'":783.99,"LA'":880.00, "SI'":987.77,
};

function playNote(name, duration = 1.3) {
  const ctx  = getACtx();
  const freq = NOTE_FREQ[name];
  if (!freq) return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(.4, ctx.currentTime + .03);
  gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
  osc.start(); osc.stop(ctx.currentTime + duration);
}

function playSFX(type) {
  const ctx  = getACtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(.25, ctx.currentTime);
  if (type === "correct") {
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + .08);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .3);
    osc.start(); osc.stop(ctx.currentTime + .32);
  } else if (type === "wrong") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + .32);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .38);
    osc.start(); osc.stop(ctx.currentTime + .4);
  } else if (type === "levelup") {
    [0,.11,.22].forEach((t,i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "square";
      o.frequency.value = [660,880,1100][i];
      g.gain.setValueAtTime(.18, ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime+t+.16);
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+.18);
    });
  }
}

// ── SVG PENTAGRAMA ───────────────────────────────────────────
// viewBox="0 0 340 190"
// Líneas del pentagrama: y = 40, 60, 80, 100, 120  (paso=20px)
// Espacios intermedios:       50, 70,  90, 110
//
// Clave de SOL → SOL4 está EN la línea 4 desde abajo = y=100
//
// Desde SOL4 (y=100) subiendo de 10 en 10:
//   LA4 = espacio 4-3 = y=90
//   SI4 = Línea 3     = y=80
//   DO5'= espacio 3-2 = y=70
//   RE5'= Línea 2     = y=60
//   MI5'= espacio 2-1 = y=50
//   FA5'= Línea 1     = y=40
//   SOL5'= espacio sobre L1 = y=30
//   LA5' = y=20  (necesita ledger)
//   SI5' = y=10  (necesita ledger)
//
// Bajando desde SOL4:
//   FA4 = espacio 5-4 = y=110
//   MI4 = Línea 5     = y=120
//   RE4 = espacio bajo L5 = y=130   (necesita ledger y=140)
//   DO4 = EN ledger   = y=140       (ledger adicional y=140)

const NOTE_SVG = {
  // name  →  cy,   ledgers[]
  "DO" : { cy:140, ledgers:[140]       },  // DO central: EN línea adicional inferior
  "RE" : { cy:130, ledgers:[140]       },  // RE4: espacio bajo pentagrama, ledger visible
  "MI" : { cy:120, ledgers:[]          },  // MI4: línea 5 (inferior)
  "FA" : { cy:110, ledgers:[]          },  // FA4: espacio 5-4
  "SOL": { cy:100, ledgers:[]          },  // SOL4: línea 4
  "LA" : { cy: 90, ledgers:[]          },  // LA4: espacio 4-3
  "SI" : { cy: 80, ledgers:[]          },  // SI4: línea 3
  "DO'": { cy: 70, ledgers:[]          },  // DO5: espacio 3-2
  "RE'": { cy: 60, ledgers:[]          },  // RE5: línea 2
  "MI'": { cy: 50, ledgers:[]          },  // MI5: espacio 2-1
  "FA'": { cy: 40, ledgers:[]          },  // FA5: línea 1
  "SOL'":{ cy: 30, ledgers:[]          },  // SOL5: espacio sobre L1
  "LA'": { cy: 20, ledgers:[10]        },  // LA5: sobre pentagrama, ledger y=10
  "SI'": { cy: 10, ledgers:[10]        },  // SI5: encima de ledger y=10
};

const NOTE_CX = 190; // posición horizontal de la nota en el SVG

function placeNote(name) {
  const cfg = NOTE_SVG[name];
  if (!cfg) return;
  const { cy } = cfg;
  const cx     = NOTE_CX;
  const rx = 13, ry = 9.5;

  const head = document.getElementById("svg-note-head");
  head.setAttribute("cx", cx);
  head.setAttribute("cy", cy);
  head.setAttribute("rx", rx);
  head.setAttribute("ry", ry);
  head.setAttribute("transform", `rotate(-15 ${cx} ${cy})`);
  head.setAttribute("display","block");
  // animación
  head.style.animation = "none";
  void head.getBoundingClientRect();
  head.style.animation = "noteIn .22s ease forwards";

  // Ledger lines
  const lo1 = document.getElementById("svg-ledger-lo1");
  const lo2 = document.getElementById("svg-ledger-lo2");
  const hi1 = document.getElementById("svg-ledger-hi1");
  const hi2 = document.getElementById("svg-ledger-hi2");
  [lo1,lo2,hi1,hi2].forEach(l => l.setAttribute("display","none"));

  const lx1 = cx - rx - 7, lx2 = cx + rx + 7;
  cfg.ledgers.forEach((ly, i) => {
    const el = ly >= 120 ? (i===0?lo1:lo2) : (i===0?hi1:hi2);
    el.setAttribute("x1",lx1); el.setAttribute("x2",lx2);
    el.setAttribute("y1",ly);  el.setAttribute("y2",ly);
    el.setAttribute("display","block");
  });
}

function clearStaff() {
  document.getElementById("svg-note-head").setAttribute("display","none");
  ["svg-ledger-lo1","svg-ledger-lo2","svg-ledger-hi1","svg-ledger-hi2"]
    .forEach(id => document.getElementById(id).setAttribute("display","none"));
  setPhaseText("");
}

function setPhaseText(txt) {
  const el = document.getElementById("svg-phase-text");
  el.textContent = txt;
  el.setAttribute("display", txt ? "block" : "none");
}

// ── ALL NOTES LIST ───────────────────────────────────────────
const ALL_NOTES = Object.keys(NOTE_SVG); // 14 notas en orden

// ── LEVEL POOLS (notas disponibles por nivel y dificultad) ──
// Mínimo 3 notas para que no sea trivial
const LEVEL_POOLS = {
  facil: [
    ["MI","FA","SOL"],
    ["MI","FA","SOL","LA"],
    ["RE","MI","FA","SOL","LA"],
    ["RE","MI","FA","SOL","LA","SI"],
    ["DO","RE","MI","FA","SOL","LA","SI"],
  ],
  normal: [
    ["DO","MI","SOL","SI"],
    ["DO","RE","MI","FA","SOL"],
    ["DO","RE","MI","FA","SOL","LA","SI"],
    ["DO","RE","MI","SOL","LA","SI","DO'","RE'"],
    ["DO","MI","SOL","SI","DO'","RE'","MI'","FA'"],
    ["DO","RE","MI","FA","SOL","LA","SI","DO'","RE'","MI'"],
    ALL_NOTES,
  ],
  dificil: [
    ["DO","SOL","DO'","SOL'"],
    ["DO","MI","SOL","SI","DO'","MI'"],
    ["DO","RE","MI","SOL","LA","SI","DO'","RE'","MI'"],
    ["DO","FA","SOL","SI","DO'","FA'","SOL'","LA'"],
    ["DO","RE","MI","FA","SOL","LA","SI","DO'","RE'","MI'","FA'","SOL'","LA'","SI'"],
    ALL_NOTES,
    ALL_NOTES,
  ],
};

// Longitud de la secuencia según nivel y dificultad
function seqLength(level, diff) {
  const base = { facil:2, normal:3, dificil:4 }[diff] || 3;
  return base + (level - 1);
}

// Tempo de reproducción (ms entre notas) según dificultad
function tempo(diff) {
  return { facil:900, normal:700, dificil:500 }[diff] || 700;
}

// ── STATE ────────────────────────────────────────────────────
let currentUser  = null;
let selectedMode = "clasico";
let selectedDiff = "normal";
let trainNotes   = ["DO","MI","SOL","LA","SI","DO'","RE'"];
let gs = {}; // gameState

// ── PARTICLES ────────────────────────────────────────────────
(function(){
  const c = document.getElementById("particles"), ctx = c.getContext("2d");
  const dots = [];
  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  const spawn  = () => ({ x:Math.random()*c.width, y:Math.random()*c.height,
    r:Math.random()*1.3+.3, vx:(Math.random()-.5)*.22, vy:-Math.random()*.3-.08,
    a:Math.random()*.4+.1 });
  resize(); addEventListener("resize", resize);
  for(let i=0;i<50;i++) dots.push(spawn());
  (function tick(){
    ctx.clearRect(0,0,c.width,c.height);
    dots.forEach((d,i)=>{
      d.x+=d.vx; d.y+=d.vy;
      if(d.y<-4||d.x<-4||d.x>c.width+4){dots[i]=spawn();dots[i].y=c.height+4}
      ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(240,180,41,${d.a})`;ctx.fill();
    });
    requestAnimationFrame(tick);
  })();
})();

// ── SCREENS ──────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+id).classList.add("active");
}

// ── AUTH ─────────────────────────────────────────────────────
window.switchTab = t => {
  document.getElementById("form-login").classList.toggle("hidden",    t!=="login");
  document.getElementById("form-register").classList.toggle("hidden", t!=="register");
  document.getElementById("tab-login").classList.toggle("active",    t==="login");
  document.getElementById("tab-register").classList.toggle("active", t==="register");
};

window.handleRegister = async function(){
  const u=document.getElementById("reg-user").value.trim();
  const p=document.getElementById("reg-pass").value.trim();
  const m=document.getElementById("reg-msg");
  m.className="auth-msg";
  if(!u||!p){m.textContent="Completa todos los campos.";m.className="auth-msg error";return}
  if(u.length<3){m.textContent="Mínimo 3 caracteres.";m.className="auth-msg error";return}
  if(p.length<4){m.textContent="Contraseña mínimo 4 caracteres.";m.className="auth-msg error";return}
  m.textContent="Registrando...";
  try{
    const d=await registrarUsuario(u,p); currentUser=d;
    localStorage.setItem("memorix_user",JSON.stringify(d));
    m.textContent="¡Registro exitoso!";m.className="auth-msg success";
    setTimeout(loadMenu,600);
  }catch(e){m.textContent=e.message;m.className="auth-msg error"}
};

window.handleLogin = async function(){
  const u=document.getElementById("login-user").value.trim();
  const p=document.getElementById("login-pass").value.trim();
  const m=document.getElementById("login-msg");
  m.className="auth-msg";
  if(!u||!p){m.textContent="Completa todos los campos.";m.className="auth-msg error";return}
  m.textContent="Ingresando...";
  try{
    const d=await loginUsuario(u,p); currentUser=d;
    localStorage.setItem("memorix_user",JSON.stringify(d));
    loadMenu();
  }catch(e){m.textContent=e.message;m.className="auth-msg error"}
};

window.logout=()=>{currentUser=null;localStorage.removeItem("memorix_user");showScreen("auth")};

function loadMenu(){
  document.getElementById("menu-username").textContent=currentUser.usuario;
  showScreen("menu");
}
window.showMenu=loadMenu;

// ── MODE SELECT ───────────────────────────────────────────────
window.showModeSelect = function(){
  buildTrainPicker();
  updateDiffDesc();
  document.querySelectorAll(".mode-card").forEach(c=>c.classList.toggle("selected",c.dataset.mode===selectedMode));
  document.querySelectorAll(".diff-btn").forEach(b=>b.classList.toggle("active",b.dataset.diff===selectedDiff));
  updateModeUI();
  showScreen("modeselect");
};

window.selectMode = function(mode){
  selectedMode=mode;
  document.querySelectorAll(".mode-card").forEach(c=>c.classList.toggle("selected",c.dataset.mode===mode));
  updateModeUI();
};

function updateModeUI(){
  const isTrain=selectedMode==="entrenamiento";
  document.getElementById("diff-section").classList.toggle("hidden",isTrain);
  document.getElementById("train-section").classList.toggle("hidden",!isTrain);
}

window.selectDiff=function(diff){
  selectedDiff=diff;
  document.querySelectorAll(".diff-btn").forEach(b=>b.classList.toggle("active",b.dataset.diff===diff));
  updateDiffDesc();
};

function updateDiffDesc(){
  const d={
    facil:  "Secuencias cortas (2-4 notas). Notas del pentagrama principal.",
    normal: "Secuencias medias (3-7 notas). Notas graves y agudas.",
    dificil:"Secuencias largas (4-11 notas). Todas las notas. Ritmo rápido.",
  };
  document.getElementById("diff-desc").textContent=d[selectedDiff]||"";
}

function buildTrainPicker(){
  const wrap=document.getElementById("train-note-picker");
  wrap.innerHTML="";
  ALL_NOTES.forEach(n=>{
    const btn=document.createElement("button");
    btn.className="train-toggle"+(trainNotes.includes(n)?" on":"");
    btn.textContent=n;
    btn.onclick=()=>{
      if(trainNotes.includes(n)){
        if(trainNotes.length<=3)return;
        trainNotes=trainNotes.filter(x=>x!==n);btn.classList.remove("on");
      } else {trainNotes.push(n);btn.classList.add("on")}
    };
    wrap.appendChild(btn);
  });
}

// ── LAUNCH GAME ───────────────────────────────────────────────
window.launchGame = function(){
  const modeLabels={clasico:"CLÁSICO",entrenamiento:"ENTRENAMIENTO",contrareloj:"CONTRARRELOJ",superviviente:"SUPERVIVIENTE"};
  const diffLabels={facil:"FÁCIL",normal:"NORMAL",dificil:"DIFÍCIL"};

  document.getElementById("mode-badge").textContent=modeLabels[selectedMode]||selectedMode.toUpperCase();
  document.getElementById("diff-badge").textContent=diffLabels[selectedDiff]||selectedDiff.toUpperCase();

  const isCR=selectedMode==="contrareloj";
  document.getElementById("hud-timer-wrap").style.display=isCR?"flex":"none";
  document.getElementById("hud-lives-wrap").style.display=selectedMode==="entrenamiento"?"none":"flex";

  gs={
    mode:     selectedMode,
    diff:     selectedDiff,
    score:    0,
    level:    1,
    lives:    selectedMode==="superviviente"?1:3,
    sequence: [],       // secuencia actual a memorizar
    inputIdx: 0,        // posición del usuario en la secuencia
    phase:    "show",   // "show" | "input"
    waiting:  false,
    timerSec: 60,
    timerInterval: null,
    seqDone:  0,        // secuencias completadas
    totalCorrect:0,
    totalWrong:0,
  };

  clearStaff();
  buildAnswerButtons();
  updateHUD();
  showScreen("game");
  if(isCR) startTimer();
  setTimeout(startNewSequence, 400);
};

// ── TIMER ─────────────────────────────────────────────────────
function startTimer(){
  gs.timerSec=60; updateTimerUI();
  gs.timerInterval=setInterval(()=>{
    gs.timerSec--; updateTimerUI();
    if(gs.timerSec<=0){clearInterval(gs.timerInterval);endGame("timeout")}
  },1000);
}
function updateTimerUI(){
  const el=document.getElementById("hud-timer");
  el.textContent=gs.timerSec;
  el.classList.toggle("urgent",gs.timerSec<=10);
}

// ── HUD ──────────────────────────────────────────────────────
function updateHUD(){
  document.getElementById("hud-level").textContent=gs.level;
  document.getElementById("hud-score").textContent=gs.score;
  const h=["💔","❤️","❤️❤️","❤️❤️❤️"][Math.min(gs.lives,3)];
  document.getElementById("hud-lives").textContent=h||"💔";
}

function setStatus(txt, cls=""){
  const el=document.getElementById("seq-status");
  el.textContent=txt;
  el.className="seq-status"+(cls?" "+cls:"");
}

// ── SEQ DOTS ─────────────────────────────────────────────────
function renderDots(seq, inputIdx, phase){
  const wrap=document.getElementById("seq-dots");
  wrap.innerHTML="";
  seq.forEach((_,i)=>{
    const d=document.createElement("div");
    d.className="seq-dot";
    if(phase==="show"){
      d.classList.add("active"); // todas grises durante show
    } else {
      // fase input
      if(i<inputIdx) d.classList.add("correct");        // ya respondidas
      else if(i===inputIdx) d.classList.add("active");  // actual
      else d.classList.add("pending");                  // pendientes
    }
    wrap.appendChild(d);
  });
}

function markDot(idx, state){
  const dots=document.querySelectorAll(".seq-dot");
  if(dots[idx]) dots[idx].className="seq-dot "+state;
}

// ── NUEVA SECUENCIA ───────────────────────────────────────────
function getPool(){
  if(gs.mode==="entrenamiento") return trainNotes;
  if(gs.mode==="superviviente") return ALL_NOTES;
  const pools=LEVEL_POOLS[gs.diff]||LEVEL_POOLS.normal;
  return pools[Math.min(gs.level-1, pools.length-1)];
}

function generateSequence(){
  const pool=getPool();
  const len=gs.mode==="entrenamiento" ? 3+Math.floor(Math.random()*3)
           : gs.mode==="superviviente"? 3+gs.seqDone
           : seqLength(gs.level, gs.diff);
  const seq=[];
  for(let i=0;i<len;i++){
    let note;
    do{ note=pool[Math.floor(Math.random()*pool.length)]; }
    while(seq.length>0 && note===seq[seq.length-1]); // evitar dos iguales seguidas
    seq.push(note);
  }
  return seq;
}

async function startNewSequence(){
  gs.sequence=generateSequence();
  gs.inputIdx=0;
  gs.phase="show";
  setStatus("🎵 Memoriza la secuencia…");
  renderDots(gs.sequence, 0, "show");
  lockButtons(true);
  clearStaff();

  // Reproducir la secuencia nota a nota
  const t=tempo(gs.diff);
  for(let i=0;i<gs.sequence.length;i++){
    await delay(i===0 ? 300 : t);
    const note=gs.sequence[i];
    placeNote(note);
    playNote(note, t/1000*0.85);
    // Highlight dot actual
    const dots=document.querySelectorAll(".seq-dot");
    dots.forEach(d=>d.classList.remove("active"));
    if(dots[i]) dots[i].classList.add("active");
    await delay(t * 0.75);
    clearStaff();
  }

  await delay(300);
  // Fase de input
  gs.phase="input";
  gs.inputIdx=0;
  renderDots(gs.sequence, 0, "input");
  setStatus("▶ Tu turno — toca la secuencia", "input-phase");
  lockButtons(false);
}

function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

// ── BUTTONS ──────────────────────────────────────────────────
function buildAnswerButtons(){
  const area=document.getElementById("answer-buttons");
  area.innerHTML="";
  ALL_NOTES.forEach(note=>{
    const btn=document.createElement("button");
    btn.className="note-btn";
    btn.dataset.note=note;
    if(note.includes("'")){
      const base=note.replace("'","");
      btn.innerHTML=`${base}<span class="oct">▲</span>`;
    } else {
      btn.textContent=note;
    }
    btn.addEventListener("click",()=>handleNotePress(note,btn));
    area.appendChild(btn);
  });
}

function lockButtons(locked){
  document.querySelectorAll(".note-btn").forEach(b=>{
    b.classList.toggle("locked",locked);
  });
}

// ── HANDLE INPUT ─────────────────────────────────────────────
async function handleNotePress(note, btn){
  if(gs.phase!=="input"||gs.waiting) return;
  gs.waiting=true;
  lockButtons(true);

  const expected=gs.sequence[gs.inputIdx];
  const correct=note===expected;

  // Sonido de la nota tocada siempre
  playNote(note, 0.5);
  placeNote(note); // mostrar en pentagrama
  btn.classList.add("pressed");

  await delay(120);
  btn.classList.remove("pressed");

  if(correct){
    btn.classList.add("correct-flash");
    markDot(gs.inputIdx,"correct");
    gs.totalCorrect++;
    gs.inputIdx++;

    // ¿Secuencia completa?
    if(gs.inputIdx >= gs.sequence.length){
      // ÉXITO
      await delay(250);
      btn.classList.remove("correct-flash");
      clearStaff();
      gs.seqDone++;
      const pts=calcPoints();
      gs.score+=pts;
      playSFX("correct");
      setStatus("✓ ¡Correcto!", "correct-phase");
      flashFeedback("correct");
      showScorePopup("+"+pts);
      updateHUD();

      await delay(600);
      btn.classList.remove("correct-flash");

      // Subir de nivel (modo clásico: cada 3 secuencias)
      if(gs.mode==="clasico" && gs.seqDone % 3 === 0 && gs.level < 7){
        gs.level++;
        playSFX("levelup");
        setStatus("⬆ ¡Nivel "+gs.level+"!", "correct-phase");
        updateHUD();
        await delay(800);
      }

      gs.waiting=false;
      await startNewSequence();
    } else {
      // Siguiente nota de la secuencia
      await delay(180);
      btn.classList.remove("correct-flash");
      clearStaff();
      renderDots(gs.sequence, gs.inputIdx, "input");
      gs.waiting=false;
      lockButtons(false);
    }

  } else {
    // ERROR
    btn.classList.add("wrong-flash");
    markDot(gs.inputIdx,"wrong");
    gs.totalWrong++;
    playSFX("wrong");
    flashFeedback("wrong");
    setStatus("✗ Error — era: "+expected, "wrong-phase");

    // Mostrar la nota correcta en pentagrama brevemente
    await delay(150);
    clearStaff();
    placeNote(expected);
    playNote(expected, 0.8);
    await delay(600);

    btn.classList.remove("wrong-flash");
    clearStaff();

    if(gs.mode!=="entrenamiento") gs.lives--;
    updateHUD();

    if(gs.mode!=="entrenamiento" && gs.lives<=0){
      await delay(200);
      endGame("lives");
      return;
    }

    gs.waiting=false;
    // Volver a mostrar la misma secuencia
    await delay(300);
    await startNewSequence();
  }
}

function calcPoints(){
  const { mode, diff, sequence } = gs;
  if(mode==="entrenamiento") return 0;
  const diffMult={ facil:.7, normal:1, dificil:1.5 }[diff]||1;
  const base = mode==="superviviente" ? 15 : 10;
  return Math.round(base * sequence.length * diffMult);
}

function showScorePopup(txt){
  const pop=document.createElement("div");
  pop.textContent=txt;
  pop.style.cssText="position:fixed;top:45%;left:50%;transform:translateX(-50%);"+
    "font-family:'Orbitron',monospace;font-size:1.6rem;color:#ffd166;font-weight:900;"+
    "pointer-events:none;z-index:200;text-shadow:0 0 12px rgba(240,180,41,.9);"+
    "animation:scoreFloat .9s ease forwards";
  document.body.appendChild(pop);
  setTimeout(()=>pop.remove(),950);
}

function flashFeedback(type){
  const el=document.getElementById("feedback-flash");
  el.className="feedback-flash "+type;
  setTimeout(()=>el.className="feedback-flash",460);
}

// ── GAME OVER ─────────────────────────────────────────────────
async function endGame(reason){
  if(gs.timerInterval) clearInterval(gs.timerInterval);
  gs.phase="over";

  const modeLabel={clasico:"CLÁSICO",entrenamiento:"ENTRENAMIENTO",contrareloj:"CONTRARRELOJ",superviviente:"SUPERVIVIENTE"};
  const isTimeout=reason==="timeout";
  const accuracy=gs.totalCorrect+gs.totalWrong>0
    ?Math.round(gs.totalCorrect/(gs.totalCorrect+gs.totalWrong)*100):0;

  document.getElementById("go-icon").textContent=isTimeout?"⏱️":"💀";
  document.getElementById("go-title").textContent=isTimeout?"¡TIEMPO!":"GAME OVER";
  document.getElementById("go-title").className=isTimeout?"gameover-title win":"gameover-title";
  document.getElementById("go-mode").textContent=`${modeLabel[gs.mode]} · ${(gs.diff||"").toUpperCase()}`;
  document.getElementById("final-score").textContent=gs.score;
  document.getElementById("go-detail").textContent=
    `Precisión ${accuracy}% · Nivel ${gs.level} · ${gs.seqDone} secuencias`;
  showScreen("gameover");

  if(gs.mode!=="entrenamiento"){
    try{
      await guardarPuntaje(currentUser.usuario, gs.score, gs.mode);
      currentUser.mejorPuntaje=Math.max(currentUser.mejorPuntaje||0,gs.score);
      localStorage.setItem("memorix_user",JSON.stringify(currentUser));
    }catch(e){/*offline*/}
  }
}

window.confirmExit=function(){
  if(confirm("¿Salir? Se perderá el progreso.")){
    if(gs.timerInterval) clearInterval(gs.timerInterval);
    gs.phase="over";
    loadMenu();
  }
};

// ── RANKING ──────────────────────────────────────────────────
window.showRanking=async function(){
  showScreen("ranking");
  loadRankingTab("clasico",document.querySelector(".rank-tab"));
};

window.loadRankingTab=async function(mode,tabEl){
  document.querySelectorAll(".rank-tab").forEach(t=>t.classList.remove("active"));
  if(tabEl) tabEl.classList.add("active");
  const list=document.getElementById("ranking-list");
  list.innerHTML='<div class="loading">Cargando...</div>';
  try{
    const rows=await obtenerRanking(mode);
    if(!rows.length){list.innerHTML='<div class="loading">Sin datos aún.</div>';return}
    const medals=["🥇","🥈","🥉"];
    list.innerHTML=rows.map((r,i)=>`
      <div class="ranking-row">
        <span class="rank-pos">${medals[i]||r.pos}</span>
        <span class="rank-user">${r.usuario}</span>
        <span class="rank-score">${r.puntajes?.[mode]||r.mejorPuntaje||0} pts</span>
      </div>`).join("");
  }catch(e){list.innerHTML='<div class="loading">Error al cargar.</div>'}
};

// ── INIT ─────────────────────────────────────────────────────
function init(){
  const saved=localStorage.getItem("memorix_user");
  if(saved){try{currentUser=JSON.parse(saved);loadMenu()}catch{showScreen("auth")}}
  else showScreen("auth");
}

document.addEventListener("keydown",e=>{
  if(e.key!=="Enter") return;
  if(!document.getElementById("screen-auth").classList.contains("active")) return;
  const loginVisible=!document.getElementById("form-login").classList.contains("hidden");
  loginVisible?window.handleLogin():window.handleRegister();
});

// CSS animation para notas SVG
const style=document.createElement("style");
style.textContent=`@keyframes noteIn{from{opacity:0;transform:scale(.65) rotate(-15deg)}to{opacity:1;transform:scale(1) rotate(-15deg)}}
@keyframes scoreFloat{from{opacity:1;transform:translateX(-50%) translateY(0)}to{opacity:0;transform:translateX(-50%) translateY(-50px)}}`;
document.head.appendChild(style);

init();
