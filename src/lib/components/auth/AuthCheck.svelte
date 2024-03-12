<script lang="ts">
	import { Button } from "../ui/button";
	import { goto } from "$app/navigation";
	import { browser } from "$app/environment";
	import { user } from "../stores/userStore";

    $: if (!$user && browser) {
        console.warn('denied permission');
        goto('/signin');
    }
</script>
  
{#if $user}
  <slot />
{:else}
    <div class="container flex-col grid h-screen justify-center items-center">
        <div class="flex flex-col items-center gap-5">
            You must be signed in to view this page.
            <div><Button href="/signin">Sign in</Button></div>
        </div>
    </div>
{/if}