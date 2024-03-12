import { initializeApp } from 'firebase/app';
import {
	getFirestore} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
	apiKey: 'AIzaSyCSzI34oTTKXJ4FjiVusSrvDpoBxxoHNjw',
	authDomain: 'fiji-party-music.firebaseapp.com',
	projectId: 'fiji-party-music',
	storageBucket: 'fiji-party-music.appspot.com',
	messagingSenderId: '443646423794',
	appId: '1:443646423794:web:77a751e414cd324d4d966b'
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore();
export const auth = getAuth();


