import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAFjwRN9lqlpm1vWDn7tyKLFIBlzFXfRwA",
  authDomain: "memorix-8d3eb.firebaseapp.com",
  projectId: "memorix-8d3eb",
  storageBucket: "memorix-8d3eb.firebasestorage.app",
  messagingSenderId: "849772004195",
  appId: "1:849772004195:web:b89992764438b6ff5a8956"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
