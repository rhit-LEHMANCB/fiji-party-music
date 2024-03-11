<script lang="ts">
    import { user } from "$lib/firebase";
	import { Button } from "../ui/button";
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