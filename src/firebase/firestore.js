import {
  collection, addDoc, getDocs, query,
  orderBy, limit, serverTimestamp, doc, updateDoc, getDoc
} from "firebase/firestore";
import { db } from "./config";

export async function saveScore(username, score) {
  await addDoc(collection(db, "scores"), {
    username,
    score,
    date: serverTimestamp(),
  });
}

export async function updateBestScore(uid, score) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists() && (snap.data().bestScore || 0) < score) {
    await updateDoc(ref, { bestScore: score });
  }
}

export async function getTopScores() {
  const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
