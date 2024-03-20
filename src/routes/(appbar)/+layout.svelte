<script lang="ts">
	import Header from '$lib/components/layout/Header.svelte';
</script>

<div>
	<Header />
	<div class="mt-16">
		<slot />
	</div>
</div>
