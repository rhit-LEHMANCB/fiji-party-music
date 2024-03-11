<script lang="ts">
	import { Toaster } from "$lib/components/ui/sonner";
    import "../app.pcss";
    import { ModeWatcher } from 'mode-watcher'
</script>

<Toaster />
<ModeWatcher />
<slot></slot>