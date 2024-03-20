<script lang="ts" generics="Data extends DocumentData">
	import { collectionStore } from '../stores/firestore';

	import { db } from '$lib/firebase';

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	import type { CollectionReference, DocumentData, Firestore, Query } from 'firebase/firestore';
	// eslint-disable-next-line no-undef
	export let ref: string | CollectionReference<Data> | Query<Data>;
	// eslint-disable-next-line no-undef
	export let startWith: Data[] | undefined = undefined;

	// eslint-disable-next-line no-undef
	let store = collectionStore<Data>(db, ref, startWith);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface $$Slots {
		default: {
			// eslint-disable-next-line no-undef
			data: Data[];
			// eslint-disable-next-line no-undef
			ref: CollectionReference<Data[]> | Query<Data[]> | null;
			count: number;
			firestore?: Firestore;
		};
		loading: object;
	}
</script>

{#if $store !== undefined}
	<slot data={$store} ref={store.ref} count={$store?.length ?? 0} />
{:else}
	<slot name="loading" />
{/if}
