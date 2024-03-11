import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { writable } from "svelte/store";

const firebaseConfig = {
    apiKey: "AIzaSyCSzI34oTTKXJ4FjiVusSrvDpoBxxoHNjw",
    authDomain: "fiji-party-music.firebaseapp.com",
    projectId: "fiji-party-music",
    storageBucket: "fiji-party-music.appspot.com",
    messagingSenderId: "443646423794",
    appId: "1:443646423794:web:77a751e414cd324d4d966b"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore();
export const auth = getAuth();

function userStore() {
    let unsubscribe: () => void;
  
    if (!auth || !globalThis.window) {
      console.warn('Auth is not initialized or not in browser');
      const { subscribe } = writable<User | null>(null);
      return {
        subscribe,
      }
    }
  
    const { subscribe } = writable(auth?.currentUser ?? null, (set) => {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        set(user);
      });
  
      return () => unsubscribe();
    });
  
    return {
      subscribe,
    };
  }
  
  export const user = userStore();