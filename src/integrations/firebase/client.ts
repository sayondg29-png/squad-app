import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZ81iqa8ub_l5OA3ae9JheRoPNgu55pb0",
  authDomain: "squad-app-4488f.firebaseapp.com",
  projectId: "squad-app-4488f",
  storageBucket: "squad-app-4488f.firebasestorage.app",
  messagingSenderId: "539655178064",
  appId: "1:539655178064:web:201ed751d1256dc9f2ce55",
  measurementId: "G-HQFVSDGGS4",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseStorage = getStorage(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const signInWithGoogle = () => signInWithPopup(firebaseAuth, googleProvider);
export const firebaseSignOut = () => signOut(firebaseAuth);

let signInPromise: Promise<unknown> | null = null;
export function ensureFirebaseAuth() {
  if (firebaseAuth.currentUser) return Promise.resolve(firebaseAuth.currentUser);
  if (!signInPromise) signInPromise = signInAnonymously(firebaseAuth);
  return signInPromise;
}