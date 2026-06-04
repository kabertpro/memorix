// firebase.js — Memorix by Kabert Studio - LMKE

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "memorix-8d3eb.firebaseapp.com",
  projectId: "memorix-8d3eb",
  storageBucket: "memorix-8d3eb.firebasestorage.app",
  messagingSenderId: "849772004195",
  appId: "1:849772004195:web:b89992764438b6ff5a8956"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── AUTH ──────────────────────────────────────────────────────────────────────

export async function registrarUsuario(usuario, password) {
  const ref = doc(db, "usuarios", usuario);
  const snap = await getDoc(ref);
  if (snap.exists()) throw new Error("El usuario ya existe.");
  await setDoc(ref, { usuario, password, mejorPuntaje: 0 });
  return { usuario, mejorPuntaje: 0 };
}

export async function loginUsuario(usuario, password) {
  const ref = doc(db, "usuarios", usuario);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Usuario no encontrado.");
  const data = snap.data();
  if (data.password !== password) throw new Error("Contraseña incorrecta.");
  return data;
}

// ── RANKING ───────────────────────────────────────────────────────────────────

export async function guardarPuntaje(usuario, puntaje) {
  const ref = doc(db, "usuarios", usuario);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const actual = snap.data().mejorPuntaje || 0;
  if (puntaje > actual) {
    await updateDoc(ref, { mejorPuntaje: puntaje });
  }
}

export async function obtenerRanking() {
  const q = query(
    collection(db, "usuarios"),
    orderBy("mejorPuntaje", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ pos: i + 1, ...d.data() }));
}
