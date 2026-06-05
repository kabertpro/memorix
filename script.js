// ═══════════════════════════════════════════════════════════════
// MEMORIX — script.js v4  ·  Kabert Studio - LMKE
//
// MECÁNICA:
//   • Niveles crecen en longitud de secuencia: Nivel N = N notas
//   • Nivel 1 = 1 nota, Nivel 2 = 2 notas, etc.
//   • Notas del pool se amplían conforme suben los niveles
//   • Botón Replay para escuchar la secuencia de nuevo
//   • Splash de inicio + splash de nivel completado
// ═══════════════════════════════════════════════════════════════

import { registrarUsuario, loginUsuario, guardarPuntaje, obtenerRanking } from "./firebase.js";

// ── AUDIO ────────────────────────────────────────────────────
let audioCtx = null;
function getACtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

const NOTE_FREQ = {
  "DO" :261.63,"RE" :293.66,"MI" :329.63,"FA" :349.23,
  "SOL":392.00,"LA" :440.00,"SI" :493.88,
  "DO'":523.25,"RE'":587.33,"MI'":659.25,"FA'":698.46,
  "SOL'":783.99,"LA'":880.00,"SI'":987.77,
};

function playNote(name, duration = 1.1) {
  const ctx = getACtx(), freq = NOTE_FREQ[name];
  if (!freq) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine"; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(.4, ctx.currentTime + .03);
  gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
  osc.start(); osc.stop(ctx.currentTime + duration);
}

function playSFX(type) {
  const ctx = getACtx();
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(.22, ctx.currentTime);
  if (type === "correct") {
    osc.type="square"; osc.frequency.setValueAtTime(880,ctx.currentTime);
    osc.frequency.setValueAtTime(1100,ctx.currentTime+.08);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.28);
    osc.start(); osc.stop(ctx.currentTime+.3);
  } else if (type === "wrong") {
    osc.type="sawtooth"; osc.frequency.setValueAtTime(200,ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(90,ctx.currentTime+.3);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.36);
    osc.start(); osc.stop(ctx.currentTime+.38);
  } else if (type === "levelup") {
    [0,.1,.2,.3].forEach((t,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);o.type="square";
      o.frequency.value=[523,659,784,1047][i];
      g.gain.setValueAtTime(.16,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+t+.18);
      o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+.2);
    });
  } else if (type === "splash") {
    // acorde de bienvenida
    [261.63,329.63,392].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);o.type="sine";o.frequency.value=f;
      g.gain.setValueAtTime(0,ctx.currentTime+i*.08);
      g.gain.linearRampToValueAtTime(.12,ctx.currentTime+i*.08+.04);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.08+1.2);
      o.start(ctx.currentTime+i*.08);o.stop(ctx.currentTime+i*.08+1.3);
    });
  }
}

// ── SVG PENTAGRAMA ───────────────────────────────────────────
// viewBox="0 0 340 190"  Líneas: y=40,60,80,100,120  paso=20px
// Clave de Sol → SOL4 en línea 4 (y=100)
// Subiendo 10px/posición, bajando 10px/posición:
//   SI' = y=10  (con ledger y=10)
//   LA' = y=20  (con ledger y=10)
//   SOL'= y=30  (espacio sobre L1)
//   FA' = y=40  L1
//   MI' = y=50  espacio 1-2
//   RE' = y=60  L2
//   DO' = y=70  espacio 2-3
//   SI  = y=80  L3
//   LA  = y=90  espacio 3-4
//   SOL = y=100 L4
//   FA  = y=110 espacio 4-5
//   MI  = y=120 L5
//   RE  = y=130 espacio bajo L5  (ledger y=140)
//   DO  = y=140 EN ledger inferior (ledger y=140)
const NOTE_SVG = {
  "DO" :{cy:140,ledgers:[140]},
  "RE" :{cy:130,ledgers:[140]},
  "MI" :{cy:120,ledgers:[]},
  "FA" :{cy:110,ledgers:[]},
  "SOL":{cy:100,ledgers:[]},
  "LA" :{cy: 90,ledgers:[]},
  "SI" :{cy: 80,ledgers:[]},
  "DO'":{cy: 70,ledgers:[]},
  "RE'":{cy: 60,ledgers:[]},
  "MI'":{cy: 50,ledgers:[]},
  "FA'":{cy: 40,ledgers:[]},
  "SOL'":{cy:30,ledgers:[]},
  "LA'":{cy: 20,ledgers:[10]},
  "SI'":{cy: 10,ledgers:[10]},
};
const ALL_NOTES = Object.keys(NOTE_SVG); // 14 notas

const NOTE_CX = 190;
function placeNote(name, color="#ffd166") {
  const cfg = NOTE_SVG[name]; if (!cfg) return;
  const {cy} = cfg; const cx=NOTE_CX; const rx=13,ry=9.5;
  const head = document.getElementById("svg-note-head");
  head.setAttribute("cx",cx); head.setAttribute("cy",cy);
  head.setAttribute("rx",rx); head.setAttribute("ry",ry);
  head.setAttribute("transform",`rotate(-15 ${cx} ${cy})`);
  head.setAttribute("fill",color);
  head.setAttribute("display","block");
  head.style.animation="none"; void head.getBoundingClientRect();
  head.style.animation="noteIn .2s ease forwards";

  const ids=["svg-ledger-lo1","svg-ledger-lo2","svg-ledger-hi1","svg-ledger-hi2"];
  ids.forEach(id=>document.getElementById(id).setAttribute("display","none"));
  const lx1=cx-rx-8, lx2=cx+rx+8;
  cfg.ledgers.forEach((ly,i)=>{
    const el=document.getElementById(ly>=120?(i===0?"svg-ledger-lo1":"svg-ledger-lo2"):(i===0?"svg-ledger-hi1":"svg-ledger-hi2"));
    el.setAttribute("x1",lx1);el.setAttribute("x2",lx2);
    el.setAttribute("y1",ly);el.setAttribute("y2",ly);
    el.setAttribute("display","block");
  });
}
function clearStaff(){
  document.getElementById("svg-note-head").setAttribute("display","none");
  ["svg-ledger-lo1","svg-ledger-lo2","svg-ledger-hi1","svg-ledger-hi2"]
    .forEach(id=>document.getElementById(id).setAttribute("display","none"));
}

// ── NIVEL → LONGITUD Y POOL ──────────────────────────────────
// Nivel N = secuencia de N notas
// El pool de notas se expande conforme sube el nivel
// Dificultad afecta: qué tan rápido aparecen notas agudas + tempo

// Pool por nivel (acumula notas): empieza con DO,MI,SOL y va añadiendo
const NOTE_PROGRESSION = [
  // Nivel 1-3: notas básicas cómodas
  "SOL","MI","DO",
  // Nivel 4-6: añade más notas del pentagrama
  "LA","RE","FA",
  // Nivel 7-9: pentagrama completo
  "SI","RE'","DO'",
  // Nivel 10-12: notas agudas
  "MI'","FA'","SOL'",
  // Nivel 13-14: notas muy agudas
  "LA'","SI'",
];

function getPoolForLevel(level, diff) {
  // Fácil: añade 1 nota cada 2 niveles (más lento)
  // Normal: añade 1 nota por nivel
  // Difícil: empieza con más notas (saltamos al inicio)
  const diffOffset = {facil:0, normal:0, dificil:3}[diff]||0;
  const step       = {facil:2, normal:1, dificil:1}[diff]||1;
  const idx        = diffOffset + Math.floor((level-1)/step);
  const count      = Math.min(idx+3, NOTE_PROGRESSION.length); // mínimo 3 notas
  return NOTE_PROGRESSION.slice(0, count);
}

// Número de notas en la secuencia = nivel (1→1, 2→2, …)
// Para entrenamiento usamos secuencias de 3 notas fijas
// Para superviviente crece igual pero sin pausa de nivel

// Tempo entre notas (ms)
function tempo(diff) {
  return {facil:950, normal:750, dificil:550}[diff]||750;
}

// ── STATE ────────────────────────────────────────────────────
let currentUser  = null;
let selectedMode = "clasico";
let selectedDiff = "normal";
let gs = {};

// ── PARTICLES ────────────────────────────────────────────────
(function(){
  const c=document.getElementById("particles"),ctx=c.getContext("2d");const dots=[];
  const resize=()=>{c.width=innerWidth;c.height=innerHeight};
  const spawn=()=>({x:Math.random()*c.width,y:Math.random()*c.height,
    r:Math.random()*1.3+.3,vx:(Math.random()-.5)*.2,vy:-Math.random()*.28-.07,a:Math.random()*.4+.1});
  resize();addEventListener("resize",resize);
  for(let i=0;i<50;i++)dots.push(spawn());
  (function tick(){
    ctx.clearRect(0,0,c.width,c.height);
    dots.forEach((d,i)=>{d.x+=d.vx;d.y+=d.vy;
      if(d.y<-4||d.x<-4||d.x>c.width+4){dots[i]=spawn();dots[i].y=c.height+4}
      ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(240,180,41,${d.a})`;ctx.fill();
    });requestAnimationFrame(tick);
  })();
})();

// ── SCREENS ──────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+id).classList.add("active");
}

// ── SPLASH INICIO ────────────────────────────────────────────
function initSplash(){
  // Lluvia de notas musicales
  const rain=document.getElementById("splash-rain");
  const symbols=["♩","♪","♫","♬","𝄞","𝄢","♭","♯"];
  for(let i=0;i<18;i++){
    const el=document.createElement("div");
    el.className="rain-note";
    el.textContent=symbols[Math.floor(Math.random()*symbols.length)];
    el.style.left=Math.random()*100+"vw";
    el.style.animationDuration=(4+Math.random()*5)+"s";
    el.style.animationDelay=(-Math.random()*6)+"s";
    el.style.fontSize=(1.2+Math.random()*2)+"rem";
    el.style.color=`hsl(${40+Math.random()*20},80%,${50+Math.random()*20}%)`;
    rain.appendChild(el);
  }
  // Click/tap para continuar
  document.getElementById("screen-splash").addEventListener("click",()=>{
    playSFX("splash");
    document.getElementById("screen-splash").style.transition="opacity .6s";
    document.getElementById("screen-splash").style.opacity="0";
    setTimeout(()=>{
      document.getElementById("screen-splash").classList.remove("active");
      // Verificar sesión guardada
      const saved=localStorage.getItem("memorix_user");
      if(saved){try{currentUser=JSON.parse(saved);loadMenu();}catch{showScreen("auth")}}
      else showScreen("auth");
    },600);
  },{once:true});
}

// ── AUTH ─────────────────────────────────────────────────────
window.switchTab=t=>{
  document.getElementById("form-login").classList.toggle("hidden",t!=="login");
  document.getElementById("form-register").classList.toggle("hidden",t!=="register");
  document.getElementById("tab-login").classList.toggle("active",t==="login");
  document.getElementById("tab-register").classList.toggle("active",t==="register");
};
window.handleRegister=async function(){
  const u=document.getElementById("reg-user").value.trim();
  const p=document.getElementById("reg-pass").value.trim();
  const m=document.getElementById("reg-msg"); m.className="auth-msg";
  if(!u||!p){m.textContent="Completa todos los campos.";m.className="auth-msg error";return}
  if(u.length<3){m.textContent="Mínimo 3 caracteres.";m.className="auth-msg error";return}
  if(p.length<4){m.textContent="Contraseña mínimo 4 caracteres.";m.className="auth-msg error";return}
  m.textContent="Registrando...";
  try{const d=await registrarUsuario(u,p);currentUser=d;
    localStorage.setItem("memorix_user",JSON.stringify(d));
    m.textContent="¡Registro exitoso!";m.className="auth-msg success";setTimeout(loadMenu,600);
  }catch(e){m.textContent=e.message;m.className="auth-msg error"}
};
window.handleLogin=async function(){
  const u=document.getElementById("login-user").value.trim();
  const p=document.getElementById("login-pass").value.trim();
  const m=document.getElementById("login-msg"); m.className="auth-msg";
  if(!u||!p){m.textContent="Completa todos los campos.";m.className="auth-msg error";return}
  m.textContent="Ingresando...";
  try{const d=await loginUsuario(u,p);currentUser=d;
    localStorage.setItem("memorix_user",JSON.stringify(d));loadMenu();
  }catch(e){m.textContent=e.message;m.className="auth-msg error"}
};
window.logout=()=>{currentUser=null;localStorage.removeItem("memorix_user");showScreen("auth")};
function loadMenu(){document.getElementById("menu-username").textContent=currentUser.usuario;showScreen("menu")}
window.showMenu=loadMenu;

// ── MODE SELECT ───────────────────────────────────────────────
window.showModeSelect=function(){
  updateDiffDesc();
  document.querySelectorAll(".mode-card").forEach(c=>c.classList.toggle("selected",c.dataset.mode===selectedMode));
  document.querySelectorAll(".diff-btn").forEach(b=>b.classList.toggle("active",b.dataset.diff===selectedDiff));
  showScreen("modeselect");
};
window.selectMode=function(mode){
  selectedMode=mode;
  document.querySelectorAll(".mode-card").forEach(c=>c.classList.toggle("selected",c.dataset.mode===mode));
};
window.selectDiff=function(diff){
  selectedDiff=diff;
  document.querySelectorAll(".diff-btn").forEach(b=>b.classList.toggle("active",b.dataset.diff===diff));
  updateDiffDesc();
};
function updateDiffDesc(){
  const d={
    facil:  "Tempo lento. Las notas agudas aparecen más tarde.",
    normal: "Equilibrado. Tempo y progresión estándar.",
    dificil:"Tempo rápido. Notas agudas desde el inicio.",
  };
  document.getElementById("diff-desc").textContent=d[selectedDiff]||"";
}

// ── LAUNCH GAME ───────────────────────────────────────────────
window.launchGame=function(){
  const mL={clasico:"CLÁSICO",entrenamiento:"ENTRENAMIENTO",contrareloj:"CONTRARRELOJ",superviviente:"SUPERVIVIENTE"};
  const dL={facil:"FÁCIL",normal:"NORMAL",dificil:"DIFÍCIL"};
  document.getElementById("mode-badge").textContent=mL[selectedMode]||selectedMode.toUpperCase();
  document.getElementById("diff-badge").textContent=dL[selectedDiff]||selectedDiff.toUpperCase();
  const isCR=selectedMode==="contrareloj";
  document.getElementById("hud-timer-wrap").style.display=isCR?"flex":"none";
  document.getElementById("hud-lives-wrap").style.display=selectedMode==="entrenamiento"?"none":"flex";

  gs={
    mode:selectedMode, diff:selectedDiff,
    score:0, level:1,
    lives:selectedMode==="superviviente"?1:3,
    sequence:[], inputIdx:0,
    phase:"show",  // "show"|"input"|"over"
    waiting:false,
    timerSec:60, timerInterval:null,
    seqDone:0,
    totalCorrect:0, totalWrong:0,
    replayCount:0,  // límite de replays por ronda
  };

  clearStaff();
  buildAnswerButtons();
  updateHUD();
  setReplayBtn(false);
  showScreen("game");
  if(isCR) startTimer();
  setTimeout(startNewSequence,500);
};

// ── TIMER ─────────────────────────────────────────────────────
function startTimer(){
  gs.timerSec=60; updateTimerUI();
  gs.timerInterval=setInterval(()=>{
    gs.timerSec--;updateTimerUI();
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
function setStatus(txt,cls=""){
  const el=document.getElementById("seq-status");
  el.textContent=txt;el.className="seq-status"+(cls?" "+cls:"");
}

// ── SEQ DOTS ─────────────────────────────────────────────────
function renderDots(seq,inputIdx,phase){
  const wrap=document.getElementById("seq-dots");wrap.innerHTML="";
  seq.forEach((_,i)=>{
    const d=document.createElement("div");d.className="seq-dot";
    if(phase==="show"){d.classList.add("show-idle")}
    else{
      if(i<inputIdx) d.classList.add("correct");
      else if(i===inputIdx) d.classList.add("current");
      else d.classList.add("pending");
    }
    wrap.appendChild(d);
  });
}
function highlightDotShow(idx){
  document.querySelectorAll(".seq-dot").forEach((d,i)=>{
    d.className="seq-dot "+(i===idx?"show-active":"show-idle");
  });
}
function markDot(idx,state){
  const dots=document.querySelectorAll(".seq-dot");
  if(dots[idx]) dots[idx].className="seq-dot "+state;
  if(state==="correct"&&dots[idx+1]) dots[idx+1].className="seq-dot current";
}

// ── NUEVA SECUENCIA ───────────────────────────────────────────
function getPool(){
  if(gs.mode==="superviviente") return ALL_NOTES;
  if(gs.mode==="entrenamiento") return ALL_NOTES.slice(0,7); // 7 notas normales
  return getPoolForLevel(gs.level, gs.diff);
}

function seqLen(){
  if(gs.mode==="entrenamiento") return 3; // fijo para entrenamiento
  if(gs.mode==="superviviente") return gs.level; // crece igual
  return gs.level; // nivel = longitud
}

function generateSequence(){
  const pool=getPool();
  const len=seqLen();
  const seq=[];
  for(let i=0;i<len;i++){
    let note;
    do{note=pool[Math.floor(Math.random()*pool.length)]}
    while(seq.length>0&&note===seq[seq.length-1]);
    seq.push(note);
  }
  return seq;
}

// Reproduce la secuencia en el pentagrama
async function playSequence(seq){
  const t=tempo(gs.diff);
  clearStaff();
  for(let i=0;i<seq.length;i++){
    await delay(i===0?300:t);
    if(gs.phase==="over") return; // salida de emergencia
    placeNote(seq[i]);
    playNote(seq[i], t/1000*0.82);
    highlightDotShow(i);
    await delay(t*0.78);
    clearStaff();
  }
  await delay(280);
}

async function startNewSequence(){
  if(gs.phase==="over") return;
  gs.sequence=generateSequence();
  gs.inputIdx=0;
  gs.replayCount=0;
  gs.phase="show";
  setStatus("🎵 Memoriza…");
  renderDots(gs.sequence,0,"show");
  lockButtons(true);
  setReplayBtn(false);
  clearStaff();
  await playSequence(gs.sequence);
  if(gs.phase==="over") return;
  // Fase input
  gs.phase="input";
  gs.inputIdx=0;
  renderDots(gs.sequence,0,"input");
  setStatus("▶ ¡Tu turno!","input-phase");
  lockButtons(false);
  setReplayBtn(true);
}

function delay(ms){return new Promise(r=>setTimeout(r,ms))}

// ── REPLAY ───────────────────────────────────────────────────
const MAX_REPLAYS = 2; // máximo 2 repeticiones por ronda

window.replaySequence = async function(){
  if(gs.phase!=="input"||gs.waiting||gs.replayCount>=MAX_REPLAYS) return;
  gs.replayCount++;
  gs.phase="show";
  lockButtons(true);
  setReplayBtn(false,"playing");
  setStatus("🔁 Repitiendo…");
  renderDots(gs.sequence,0,"show");
  clearStaff();
  await playSequence(gs.sequence);
  if(gs.phase==="over") return;
  gs.phase="input";
  renderDots(gs.sequence,gs.inputIdx,"input");
  setStatus("▶ ¡Tu turno!","input-phase");
  lockButtons(false);
  // Si quedan replays disponibles, mostrar botón; si no, desactivar
  setReplayBtn(gs.replayCount<MAX_REPLAYS);
};

function setReplayBtn(enabled, cls=""){
  const btn=document.getElementById("btn-replay");
  btn.disabled=!enabled;
  btn.className="btn-replay"+(cls?" "+cls:"");
  const left=MAX_REPLAYS-gs.replayCount;
  btn.textContent=`🔁 Repetir${enabled?" ("+left+")":""}`;
}

// ── ANSWER BUTTONS ────────────────────────────────────────────
function buildAnswerButtons(){
  const area=document.getElementById("answer-buttons");area.innerHTML="";
  ALL_NOTES.forEach(note=>{
    const btn=document.createElement("button");
    btn.className="note-btn";btn.dataset.note=note;
    if(note.includes("'")){
      const base=note.replace("'","");
      btn.innerHTML=`${base}<span class="oct">▲</span>`;
    }else{btn.textContent=note}
    btn.addEventListener("click",()=>handleNotePress(note,btn));
    area.appendChild(btn);
  });
}
function lockButtons(locked){
  document.querySelectorAll(".note-btn").forEach(b=>b.classList.toggle("locked",locked));
}

// ── HANDLE INPUT ─────────────────────────────────────────────
async function handleNotePress(note,btn){
  if(gs.phase!=="input"||gs.waiting) return;
  gs.waiting=true;
  lockButtons(true);
  setReplayBtn(false);

  const expected=gs.sequence[gs.inputIdx];
  const correct=note===expected;
  playNote(note,.5);
  placeNote(note, correct?"#ffd166":"#ff3860");
  btn.classList.add("pressed");
  await delay(100); btn.classList.remove("pressed");

  if(correct){
    btn.classList.add("correct-flash");
    markDot(gs.inputIdx,"correct");
    gs.totalCorrect++;gs.inputIdx++;

    if(gs.inputIdx>=gs.sequence.length){
      // ── SECUENCIA COMPLETA ──
      await delay(220); btn.classList.remove("correct-flash");
      clearStaff();gs.seqDone++;
      const pts=calcPoints();gs.score+=pts;
      playSFX("correct");
      setStatus("✓ ¡Correcto!","correct-phase");
      flashFeedback("correct");
      showScorePopup("+"+pts);
      updateHUD();
      await delay(500);
      btn.classList.remove("correct-flash");
      gs.waiting=false;

      if(gs.mode==="entrenamiento"){
        // Entrenamiento: repite sin subir nivel
        await startNewSequence();
      } else {
        // Subir de nivel
        await showLevelUpSplash(gs.level, gs.level+1, pts);
        gs.level++;
        updateHUD();
        await startNewSequence();
      }
    } else {
      // Siguiente nota
      await delay(160);btn.classList.remove("correct-flash");clearStaff();
      renderDots(gs.sequence,gs.inputIdx,"input");
      gs.waiting=false;lockButtons(false);
      setReplayBtn(gs.replayCount<MAX_REPLAYS);
    }

  } else {
    // ── ERROR ──
    btn.classList.add("wrong-flash");
    markDot(gs.inputIdx,"wrong");
    gs.totalWrong++;
    playSFX("wrong");flashFeedback("wrong");
    setStatus("✗ Era: "+expected,"wrong-phase");
    // Mostrar la nota correcta
    await delay(150);clearStaff();placeNote(expected,"#23d160");playNote(expected,.8);
    await delay(700);
    btn.classList.remove("wrong-flash");clearStaff();
    if(gs.mode!=="entrenamiento") gs.lives--;
    updateHUD();
    if(gs.mode!=="entrenamiento"&&gs.lives<=0){await delay(200);endGame("lives");return}
    gs.waiting=false;
    await delay(300);
    // Repite la misma secuencia (sin subir nivel)
    await startNewSequence();
  }
}

function calcPoints(){
  if(gs.mode==="entrenamiento") return 0;
  const diffMult={facil:.8,normal:1,dificil:1.5}[gs.diff]||1;
  const base=gs.mode==="superviviente"?15:10;
  return Math.round(base*gs.sequence.length*diffMult);
}

function showScorePopup(txt){
  const pop=document.createElement("div");
  pop.textContent=txt;
  pop.style.cssText="position:fixed;top:42%;left:50%;transform:translateX(-50%);"+
    "font-family:'Orbitron',monospace;font-size:1.8rem;color:#ffd166;font-weight:900;"+
    "pointer-events:none;z-index:200;text-shadow:0 0 14px rgba(240,180,41,.9);"+
    "animation:scoreFloat 1s ease forwards";
  document.body.appendChild(pop);setTimeout(()=>pop.remove(),1050);
}

function flashFeedback(type){
  const el=document.getElementById("feedback-flash");
  el.className="feedback-flash "+type;
  setTimeout(()=>el.className="feedback-flash",450);
}

// ── SPLASH DE NIVEL ───────────────────────────────────────────
function showLevelUpSplash(completedLevel, nextLevel, ptsGained){
  return new Promise(resolve=>{
    playSFX("levelup");

    const nextLen=nextLevel; // el siguiente nivel tiene nextLevel notas
    document.getElementById("lu-num").textContent="NIVEL "+nextLevel;
    document.getElementById("lu-info").textContent=
      "Ahora la secuencia tiene "+nextLen+" nota"+(nextLen===1?"":"s");
    document.getElementById("lu-score").textContent="+"+ptsGained+" pts";

    // Resetear animación
    const inner=document.querySelector(".levelup-inner");
    inner.style.animation="none";void inner.getBoundingClientRect();
    inner.style.animation="levelupIn .5s cubic-bezier(.34,1.56,.64,1) forwards";

    showScreen("levelup");
    // Click para continuar (o auto después de 2.5s)
    const proceed=()=>{
      showScreen("game");
      resolve();
    };
    const autoTimer=setTimeout(proceed,2500);
    document.getElementById("screen-levelup").addEventListener("click",()=>{
      clearTimeout(autoTimer);proceed();
    },{once:true});
  });
}

// ── GAME OVER ─────────────────────────────────────────────────
async function endGame(reason){
  if(gs.timerInterval) clearInterval(gs.timerInterval);
  gs.phase="over";
  const mL={clasico:"CLÁSICO",entrenamiento:"ENTRENAMIENTO",contrareloj:"CONTRARRELOJ",superviviente:"SUPERVIVIENTE"};
  const isTimeout=reason==="timeout";
  const total=gs.totalCorrect+gs.totalWrong;
  const accuracy=total>0?Math.round(gs.totalCorrect/total*100):0;
  document.getElementById("go-icon").textContent=isTimeout?"⏱️":"💀";
  document.getElementById("go-title").textContent=isTimeout?"¡TIEMPO!":"GAME OVER";
  document.getElementById("go-title").className=isTimeout?"gameover-title win":"gameover-title";
  document.getElementById("go-mode").textContent=`${mL[gs.mode]} · ${(gs.diff||"").toUpperCase()}`;
  document.getElementById("final-score").textContent=gs.score;
  document.getElementById("go-detail").textContent=
    `Precisión ${accuracy}% · Nivel ${gs.level} · ${gs.seqDone} secuencias`;
  showScreen("gameover");
  if(gs.mode!=="entrenamiento"){
    try{await guardarPuntaje(currentUser.usuario,gs.score,gs.mode);
      currentUser.mejorPuntaje=Math.max(currentUser.mejorPuntaje||0,gs.score);
      localStorage.setItem("memorix_user",JSON.stringify(currentUser));
    }catch(e){/*offline*/}
  }
}

window.confirmExit=function(){
  if(confirm("¿Salir? Se perderá el progreso.")){
    if(gs.timerInterval)clearInterval(gs.timerInterval);
    gs.phase="over";loadMenu();
  }
};

// ── RANKING ──────────────────────────────────────────────────
window.showRanking=async function(){
  showScreen("ranking");
  loadRankingTab("clasico",document.querySelector(".rank-tab"));
};
window.loadRankingTab=async function(mode,tabEl){
  document.querySelectorAll(".rank-tab").forEach(t=>t.classList.remove("active"));
  if(tabEl)tabEl.classList.add("active");
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

// ── CSS ANIMATIONS ────────────────────────────────────────────
const style=document.createElement("style");
style.textContent=
  `@keyframes noteIn{from{opacity:0;transform:scale(.55)}to{opacity:1;transform:scale(1)}}
   @keyframes scoreFloat{from{opacity:1;transform:translateX(-50%) translateY(0)}to{opacity:0;transform:translateX(-50%) translateY(-60px)}}`;
document.head.appendChild(style);

// ── AUTH ENTER KEY ────────────────────────────────────────────
document.addEventListener("keydown",e=>{
  if(e.key!=="Enter") return;
  if(!document.getElementById("screen-auth").classList.contains("active")) return;
  const lv=!document.getElementById("form-login").classList.contains("hidden");
  lv?window.handleLogin():window.handleRegister();
});

// ── INIT ─────────────────────────────────────────────────────
initSplash();
