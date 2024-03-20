<script lang="ts">
	import { Button } from '../ui/button';
	import { user } from '../stores/userStore';
	import verne from '$lib/assets/Verne.webp';
</script>

{#if $user}
	<slot />
{:else}
	<div class="container grid h-screen flex-col items-center justify-center">
		<div class="flex flex-col items-center gap-5">
			<img alt="verne baby" src={verne} />
			You must be signed in to view this page.
			<div><Button href="/signin">Sign in</Button></div>
		</div>
	</div>
{/if}
