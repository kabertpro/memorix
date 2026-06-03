import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

const toEmail = (username) => `${username.toLowerCase().trim()}@memorix.app`;

export async function register(username, password) {
  const email = toEmail(username);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", cred.user.uid), {
    username: username.trim(),
    bestScore: 0,
    createdAt: serverTimestamp(),
  });
  return { uid: cred.user.uid, username: username.trim() };
}

export async function login(username, password) {
  const email = toEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return { uid: cred.user.uid, username: username.trim() };
}

export async function logout() {
  await signOut(auth);
}
