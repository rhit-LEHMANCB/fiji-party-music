<script lang="ts">
	import { Button } from '../ui/button';
	import { auth } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { user } from '../stores/userStore';
	import { page } from '$app/stores';
	import { Github } from 'lucide-svelte';
</script>

<div
	class="supports-backdrop-blur:bg-background/60 fixed left-0 right-0 top-0 z-20 border-b bg-background/95 backdrop-blur"
>
	<nav class="flex h-16 items-center justify-between px-4">
		<a href="/" class="text-lg font-semibold">Fiji Party Music</a>

		<div class="flex items-center gap-2">
			<Button
				href="https://github.com/rhit-LEHMANCB/fiji-party-music"
				target="_blank"
				variant="outline"><Github /></Button
			>
			{#if $user}
				<Button size="sm" on:click={() => signOut(auth)}>Sign Out</Button>
			{:else}
				<Button href={`/signin?return=${$page.url.pathname}`} size="sm">Sign In</Button>
			{/if}
		</div>
	</nav>
</div>
