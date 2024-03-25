<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { db } from '$lib/firebase';
	import { type Song } from '$lib/utils';
	import {
		type DocumentData,
		addDoc,
		collection,
		query,
		orderBy,
		deleteDoc,
		DocumentReference,
		arrayUnion,
		updateDoc,
		serverTimestamp,
		getDocs,
		where
	} from 'firebase/firestore';
	import { docStore } from '$lib/components/stores/firestore';
	import { page } from '$app/stores';
	import { PUBLIC_LAST_API_KEY } from '$env/static/public';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import { Check, ArrowUpRight, Plus, CalendarClock, Music } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { ThumbsUp } from 'lucide-svelte';
	import { ThumbsDown } from 'lucide-svelte';
	import Collection from '$lib/components/Firebase/Collection.svelte';
	import { userData, user } from '$lib/components/stores/userStore';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { toast } from 'svelte-sonner';

	let partyStore = docStore<DocumentData>(db, `/parties/${$page.params.partyID}`);
	let songSearch = '';
	let songResults: Song[] = [];
	let dialogOpen = false;
	let sortByLiked = true;
	let filterText = '';

	$: console.log(filterText);

	async function addSuggestion(song: Song) {
		if (!partyStore.ref || !$user?.uid) {
			return;
		}
		const q = query(collection(partyStore.ref, 'suggestions'), where('url', '==', song.url));
		const querySnapshot = await getDocs(q);
		const existingSong = querySnapshot.docs[0];
		if (querySnapshot.size > 0 && notVoted(existingSong.data())) {
			toast("That song has already been suggested. I'll add a vote to it for you.");
			updateDoc(existingSong.ref, {
				votes: arrayUnion({ userID: $user.uid, upvoted: true }),
				rating: existingSong.data().rating + 1
			});
		} else if (querySnapshot.size > 0) {
			toast('You already voted for this song!');
		} else {
			song.rating = 1;
			song.votes = [{ userID: $user.uid, upvoted: true }];
			song.dateAdded = serverTimestamp();
			addDoc(collection(partyStore.ref, 'suggestions'), song);
		}
		songSearch = '';
		songResults = [];
		dialogOpen = false;
	}

	function deleteSuggestion(ref: DocumentReference) {
		if (!ref) {
			return;
		}
		deleteDoc(ref);
	}

	function notVoted(song: DocumentData) {
		return !(song as Song).votes.some((vote) => vote.userID == $user?.uid);
	}

	function addVote(song: DocumentData, upvoted: boolean) {
		console.log(song);
		if (!$user?.uid) {
			return;
		}
		updateDoc(song.ref, {
			votes: arrayUnion({ userID: $user.uid, upvoted }),
			rating: upvoted ? song.rating + 1 : song.rating - 1
		});
	}

	async function searchSongs() {
		const response = await fetch(
			`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${songSearch}&api_key=${PUBLIC_LAST_API_KEY}&format=json`
		);
		if (response.ok) {
			const data = await response.json();
			songResults = await Promise.all(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				data.results.trackmatches.track.map(async (track: { [key: string]: any }) => {
					const moreInfoResponse = await fetch(
						`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${PUBLIC_LAST_API_KEY}&artist=${track.artist}&track=${track.name}&format=json`
					);
					const moreInfo = await moreInfoResponse.json();
					if (response.ok && moreInfo.track?.album?.image) {
						return {
							name: track.name,
							artist: track.artist,
							url: track.url,
							image: moreInfo.track.album.image[1]['#text']
						};
					} else {
						return {
							name: track.name,
							artist: track.artist,
							url: track.url,
							image: track.image[1]['#text']
						};
					}
				})
			);
		}
	}
</script>

<svelte:head>
	<title>{$partyStore?.name ?? 'Party Songs'}</title>
</svelte:head>

<div class="flex h-[calc(100dvh-4rem)] flex-col gap-5 p-5">
	<div class="flex flex-col gap-5">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{$partyStore?.name}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
		<div class="flex flex-row items-center gap-5">
			<h1 class="text-xl">{$partyStore?.name}</h1>
			<Tooltip.Root openDelay={0}>
				<Tooltip.Trigger>
					<Dialog.Root bind:open={dialogOpen}>
						<Dialog.Trigger class={buttonVariants({ variant: 'default' })} disabled={!$user}
							><Music class="mr-2 h-5 w-5" />Request Song</Dialog.Trigger
						>
						<Dialog.Content class="md:max-w-[80%]">
							<Dialog.Header>
								<Dialog.Title>Song Search</Dialog.Title>
								<Dialog.Description>Please search for a song to suggest.</Dialog.Description>
							</Dialog.Header>
							<div class="grid gap-4 py-4">
								<form class="grid grid-cols-6 items-center gap-4">
									<Label for="name" class="text-right">Search</Label>
									<Input id="name" bind:value={songSearch} class="col-span-4" />
									<Button type="submit" on:click={searchSongs}>Search</Button>
								</form>
								<ScrollArea class="h-72 rounded-md border">
									<div class="p-4">
										<h4 class="mb-4 text-sm font-medium leading-none">Results</h4>
										{#each songResults as songResult}
											<div class="grid grid-cols-6 items-center justify-center gap-2 text-sm">
												<img src={songResult.image} alt={songResult.name} />
												<div class="col-span-4 grid grid-cols-1 items-center lg:grid-cols-2">
													<div class="overflow-hidden">
														<Button
															href={songResult.url}
															class="h-full px-0 pb-2 pt-0 lg:pt-2"
															target="_blank"
															variant="link">{songResult.name}</Button
														>
													</div>
													<div>{songResult.artist}</div>
												</div>
												<div class="inline-flex justify-end">
													<Button
														variant="secondary"
														size="icon"
														on:click={() => addSuggestion(songResult)}><Plus /></Button
													>
												</div>
											</div>
											<Separator class="my-2" />
										{/each}
									</div>
								</ScrollArea>
							</div>
						</Dialog.Content>
					</Dialog.Root>
				</Tooltip.Trigger>
				{#if !$user}
					<Tooltip.Content>Please sign in to request a song.</Tooltip.Content>
				{/if}
			</Tooltip.Root>
		</div>
	</div>
	<div class="flex flex-row flex-wrap gap-5">
		<Tabs.Root value="mostLiked">
			<Tabs.List>
				<Tabs.Trigger value="mostLiked" on:click={() => (sortByLiked = true)}>
					<ThumbsUp class="mr-2 h-5 w-5" />
					Most Liked
				</Tabs.Trigger>
				<Tabs.Trigger value="mostRecent" on:click={() => (sortByLiked = false)}>
					<CalendarClock class="mr-2 h-5 w-5" />
					Most Recent
				</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>
		<div class="grow"><Input bind:value={filterText} placeholder="Filter..." /></div>
	</div>
	<ScrollArea
		class="row-span-10 h-full w-full grow rounded-md border p-5 {!sortByLiked ? 'hidden' : ''}"
	>
		{#if !partyStore.ref}
			<div></div>
		{:else}
			<Collection
				ref={query(collection(partyStore.ref, 'suggestions'), orderBy('rating', 'desc'))}
				let:data
				let:count
			>
				{#if count === 0}
					<p>No suggestions</p>
				{:else}
					<div class="grid grid-cols-1 gap-2">
						{#each data.filter((song) => song.name
									.toLowerCase()
									.includes(filterText.toLowerCase()) || song.artist
									.toLowerCase()
									.includes(filterText.toLowerCase())) as song}
							<Card.Root>
								<Card.Header>
									<Card.Title class="flex flex-row items-center justify-start gap-2"
										><Button
											href={song.url}
											class="text-wrap pl-0 text-lg font-semibold"
											target="_blank"
											variant="link">{song.name}<ArrowUpRight class="ml-1" /></Button
										></Card.Title
									>
								</Card.Header>
								<Card.Content>
									<div class="grid grid-cols-1 items-center justify-between gap-y-2 sm:grid-cols-2">
										<div class="flex flex-row items-center gap-2">
											<img src={song.image} alt={song.name} />
											<p>{song.artist}</p>
										</div>
										<div class="flex flex-row justify-center gap-2 sm:justify-end">
											<div class="flex items-center justify-center px-3">
												<p class="text-2xl font-bold">{song.rating.toLocaleString()}</p>
											</div>
											<Tooltip.Root openDelay={0}>
												<Tooltip.Trigger>
													<Button
														size="icon"
														on:click={() => addVote(song, true)}
														disabled={!$user || !notVoted(song)}><ThumbsUp /></Button
													>
												</Tooltip.Trigger>
												{#if !$user}
													<Tooltip.Content>Please login to vote.</Tooltip.Content>
												{:else if !notVoted(song)}
													<Tooltip.Content>You already voted on this song.</Tooltip.Content>
												{/if}
											</Tooltip.Root>
											<Tooltip.Root openDelay={0}>
												<Tooltip.Trigger>
													<Button
														size="icon"
														variant="destructive"
														on:click={() => addVote(song, false)}
														disabled={!$user || !notVoted(song)}><ThumbsDown /></Button
													>
												</Tooltip.Trigger>
												{#if !$user}
													<Tooltip.Content>Please login to vote.</Tooltip.Content>
												{:else if !notVoted(song)}
													<Tooltip.Content>You already voted on this song.</Tooltip.Content>
												{/if}
											</Tooltip.Root>
											{#if $userData?.isAdmin}
												<AlertDialog.Root>
													<AlertDialog.Trigger asChild let:builder>
														<Button
															builders={[builder]}
															size="icon"
															class="bg-green-600 hover:bg-green-700"><Check /></Button
														>
													</AlertDialog.Trigger>
													<AlertDialog.Content>
														<AlertDialog.Header>
															<AlertDialog.Title>Please Confirm</AlertDialog.Title>
															<AlertDialog.Description>
																This action cannot be undone. This will remove the song from the
																requests permanently.
															</AlertDialog.Description>
														</AlertDialog.Header>
														<AlertDialog.Footer>
															<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
															<AlertDialog.Action on:click={() => deleteSuggestion(song.ref)}
																>Confirm</AlertDialog.Action
															>
														</AlertDialog.Footer>
													</AlertDialog.Content>
												</AlertDialog.Root>
											{/if}
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				{/if}
			</Collection>
		{/if}
	</ScrollArea>
	<ScrollArea
		class="row-span-10 h-full w-full grow rounded-md border p-5 {sortByLiked ? 'hidden' : ''}"
	>
		{#if !partyStore.ref}
			<div></div>
		{:else}
			<Collection
				ref={query(collection(partyStore.ref, 'suggestions'), orderBy('dateAdded', 'desc'))}
				let:data
				let:count
			>
				{#if count === 0}
					<p>No suggestions</p>
				{:else}
					<div class="grid grid-cols-1 gap-2">
						{#each data.filter((song) => song.name
									.toLowerCase()
									.includes(filterText.toLowerCase()) || song.artist
									.toLowerCase()
									.includes(filterText.toLowerCase())) as song}
							<Card.Root>
								<Card.Header>
									<Card.Title class="flex flex-row items-center justify-start gap-2"
										><Button
											href={song.url}
											class="text-wrap pl-0 text-lg font-semibold"
											target="_blank"
											variant="link">{song.name}<ArrowUpRight class="ml-1" /></Button
										></Card.Title
									>
								</Card.Header>
								<Card.Content>
									<div class="grid grid-cols-1 items-center justify-between gap-y-2 sm:grid-cols-2">
										<div class="flex flex-row items-center gap-2">
											<img src={song.image} alt={song.name} />
											<p>{song.artist}</p>
										</div>
										<div class="flex flex-row justify-center gap-2 sm:justify-end">
											<div class="flex items-center justify-center px-3">
												<p class="text-2xl font-bold">{song.rating.toLocaleString()}</p>
											</div>
											<Tooltip.Root openDelay={0}>
												<Tooltip.Trigger>
													<Button
														size="icon"
														on:click={() => addVote(song, true)}
														disabled={!$user || !notVoted(song)}><ThumbsUp /></Button
													>
												</Tooltip.Trigger>
												{#if !$user}
													<Tooltip.Content>Please login to vote.</Tooltip.Content>
												{:else if !notVoted(song)}
													<Tooltip.Content>You already voted on this song.</Tooltip.Content>
												{/if}
											</Tooltip.Root>
											<Tooltip.Root openDelay={0}>
												<Tooltip.Trigger>
													<Button
														size="icon"
														variant="destructive"
														on:click={() => addVote(song, false)}
														disabled={!$user || !notVoted(song)}><ThumbsDown /></Button
													>
												</Tooltip.Trigger>
												{#if !$user}
													<Tooltip.Content>Please login to vote.</Tooltip.Content>
												{:else if !notVoted(song)}
													<Tooltip.Content>You already voted on this song.</Tooltip.Content>
												{/if}
											</Tooltip.Root>
											{#if $userData?.isAdmin}
												<AlertDialog.Root>
													<AlertDialog.Trigger asChild let:builder>
														<Button
															builders={[builder]}
															size="icon"
															class="bg-green-600 hover:bg-green-700"><Check /></Button
														>
													</AlertDialog.Trigger>
													<AlertDialog.Content>
														<AlertDialog.Header>
															<AlertDialog.Title>Please Confirm</AlertDialog.Title>
															<AlertDialog.Description>
																This action cannot be undone. This will remove the song from the
																requests permanently.
															</AlertDialog.Description>
														</AlertDialog.Header>
														<AlertDialog.Footer>
															<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
															<AlertDialog.Action on:click={() => deleteSuggestion(song.ref)}
																>Confirm</AlertDialog.Action
															>
														</AlertDialog.Footer>
													</AlertDialog.Content>
												</AlertDialog.Root>
											{/if}
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				{/if}
			</Collection>
		{/if}
	</ScrollArea>
</div>
