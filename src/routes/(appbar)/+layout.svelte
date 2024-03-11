<script lang="ts">
	import AuthCheck from '$lib/components/auth/AuthCheck.svelte';
	import Header from '$lib/components/layout/Header.svelte';
</script>

<AuthCheck>
    <Header />
    <div class="mt-16">
        <slot/>
    </div>
</AuthCheck>
