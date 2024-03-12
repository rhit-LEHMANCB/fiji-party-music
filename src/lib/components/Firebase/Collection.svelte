<script lang="ts" generics="Data extends DocumentData">
	import { collectionStore } from "../stores/firestore";

	import { db } from "$lib/firebase";

    import type {
      CollectionReference,
      DocumentData,
      Firestore,
      Query,
    } from "firebase/firestore";
    export let ref: string | CollectionReference<Data> | Query<Data>;
    export let startWith: Data[] | undefined = undefined;
  
    let store = collectionStore<Data>(db, ref, startWith);
  
    interface $$Slots {
      default: {
        data: Data[];
        ref: CollectionReference<Data[]> | Query<Data[]> | null;
        count: number;
        firestore?: Firestore;
      };
      loading: {};
    }
  </script>
  
  {#if $store !== undefined}
    <slot data={$store} ref={store.ref} count={$store?.length ?? 0}/>
  {:else}
    <slot name="loading" />
  {/if}