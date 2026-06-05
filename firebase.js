// firebase.js — Memorix v2 · Kabert Studio - LMKE

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, setDoc, getDocs,
  updateDoc, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAFjwRN9lqlpm1vWDn7tyKLFIBlzFXfRwA",
  authDomain: "memorix-8d3eb.firebaseapp.com",
  projectId: "memorix-8d3eb",
  storageBucket: "memorix-8d3eb.firebasestorage.app",
  messagingSenderId: "849772004195",
  appId: "1:849772004195:web:b89992764438b6ff5a8956"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── AUTH ──────────────────────────────────────────────────────
export async function registrarUsuario(usuario, password) {
  const ref  = doc(db, "usuarios", usuario);
  const snap = await getDoc(ref);
  if (snap.exists()) throw new Error("El usuario ya existe.");
  const data = { usuario, password, mejorPuntaje: 0,
    puntajes: { clasico:0, contrareloj:0, superviviente:0 } };
  await setDoc(ref, data);
  return data;
}

export async function loginUsuario(usuario, password) {
  const ref  = doc(db, "usuarios", usuario);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Usuario no encontrado.");
  const data = snap.data();
  if (data.password !== password) throw new Error("Contraseña incorrecta.");
  return data;
}

// ── PUNTAJES ──────────────────────────────────────────────────
export async function guardarPuntaje(usuario, puntaje, mode = "clasico") {
  const ref  = doc(db, "usuarios", usuario);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data    = snap.data();
  const current = data.puntajes?.[mode] || 0;
  const overall = data.mejorPuntaje || 0;
  if (puntaje > current || puntaje > overall) {
    const update = { mejorPuntaje: Math.max(overall, puntaje) };
    if (puntaje > current) update[`puntajes.${mode}`] = puntaje;
    await updateDoc(ref, update);
  }
}

// ── RANKING ───────────────────────────────────────────────────
export async function obtenerRanking(mode = "clasico") {
  // Ordenar por el puntaje del modo si existe, si no por mejorPuntaje
  const q = query(collection(db, "usuarios"),
    orderBy("mejorPuntaje", "desc"), limit(20));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d, i) => ({ pos: i+1, ...d.data() }));
  // Re-ordenar por puntaje del modo específico
  rows.sort((a,b) => (b.puntajes?.[mode]||0) - (a.puntajes?.[mode]||0));
  rows.forEach((r,i) => r.pos = i+1);
  return rows;
}
