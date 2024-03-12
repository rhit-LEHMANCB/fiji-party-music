<script lang="ts">
	import { Toaster } from "$lib/components/ui/sonner";
    import "../app.pcss";
    import { ModeWatcher } from 'mode-watcher'

    import { user, userData } from '$lib/components/stores/userStore';

    $user;
    $userData;
</script>

<Toaster />
<ModeWatcher />
<slot></slot>