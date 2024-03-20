import { auth, db } from '$lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Readable } from 'svelte/motion';
import { writable, derived } from 'svelte/store';
import { docStore } from './firestore';

function userStore() {
	let unsubscribe: () => void;

	if (!auth || !globalThis.window) {
		console.warn('Auth is not initialized or not in browser');
		const { subscribe } = writable<User | null>(null);
		return {
			subscribe
		};
	}

	const { subscribe } = writable(auth?.currentUser ?? null, (set) => {
		unsubscribe = onAuthStateChanged(auth, (user) => {
			set(user);
		});

		return () => unsubscribe();
	});

	return {
		subscribe
	};
}
export const user = userStore();

interface UserData {
	isAdmin: boolean;
}

export const userData: Readable<UserData | null> = derived(user, ($user, set) => {
	if ($user) {
		return docStore<UserData>(db, `users/${$user.uid}`).subscribe(set);
	} else {
		set(null);
	}
});
