<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { auth, db } from '$lib/firebase';
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
		where,
		writeBatch,
		arrayRemove
	} from 'firebase/firestore';
	import { docStore } from '$lib/components/stores/firestore';
	import { page } from '$app/stores';
	import { PUBLIC_CLIENT_ID, PUBLIC_CLIENT_SECRET } from '$env/static/public';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import { Check, ArrowUpRight, Plus, CalendarClock, Music, Loader2 } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { ThumbsUp } from 'lucide-svelte';
	import { ThumbsDown } from 'lucide-svelte';
	import Collection from '$lib/components/Firebase/Collection.svelte';
	import { userData, user } from '$lib/components/stores/userStore';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toast } from 'svelte-sonner';
	import * as binary from 'bops';
	import { signInAnonymously } from 'firebase/auth';

	let partyStore = docStore<DocumentData>(db, `/parties/${$page.params.partyID}`);
	let songSearch = '';
	let songResults: Song[] = [];
	let dialogOpen = false;
	let sortByLiked = false;
	let songsLoading = false;
	let filterText = '';

	async function checkAuthStatus() {
		if (!$user) {
			const user = await signInAnonymously(auth);

			return user.user.uid;
		} else {
			return $user.uid;
		}
	}

	async function getAccessToken() {
		const localStorageToken = localStorage.getItem('token');
		const token: { access_token: string; expires: Date } | null = localStorageToken
			? JSON.parse(localStorageToken)
			: null;
		if (token && token.expires > new Date()) {
			return token.access_token;
		} else {
			const response = await fetch('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization:
						'Basic ' +
						binary.to(binary.from(PUBLIC_CLIENT_ID + ':' + PUBLIC_CLIENT_SECRET), 'base64')
				},
				body: new URLSearchParams({
					grant_type: 'client_credentials'
				})
			});
			const data = await response.json();
			const dateNow = new Date();
			dateNow.setSeconds(dateNow.getSeconds() + data.expires_in);
			localStorage.setItem(
				'token',
				JSON.stringify({ access_token: data.access_token, expires: dateNow })
			);
			return data.access_token;
		}
	}

	async function addSuggestion(song: Song) {
		const userID = await checkAuthStatus();
		if (!partyStore.ref || !userID) {
			return;
		}
		const q = query(collection(partyStore.ref, 'suggestions'), where('url', '==', song.url));
		const querySnapshot = await getDocs(q);
		const existingSong = querySnapshot.docs[0];
		if (querySnapshot.size > 0 && notVoted(existingSong.data(), userID)) {
			toast("That song has already been suggested. I'll add a vote to it for you.");
			updateDoc(existingSong.ref, {
				votes: arrayUnion({ userID: userID, upvoted: true }),
				rating: existingSong.data().rating + 1
			});
		} else if (querySnapshot.size > 0) {
			toast('You already voted for this song!');
		} else {
			song.rating = 1;
			song.votes = [{ userID: userID, upvoted: true }];
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

	function notVoted(song: DocumentData, userID?: string) {
		return !(song as Song).votes.some((vote) => vote.userID == userID);
	}

	function getVoted(song: DocumentData, userID?: string): boolean | undefined {
		return (song as Song).votes.find((vote) => vote.userID == userID)?.upvoted;
	}

	async function addVote(song: DocumentData, upvoted: boolean) {
		if (getVoted(song, $user?.uid) === upvoted) {
			const userID = await checkAuthStatus();
			if (!userID) {
				return;
			}
			updateDoc(song.ref, {
				votes: arrayRemove({ userID, upvoted }),
				rating: upvoted ? song.rating - 1 : song.rating + 1
			});
		} else if (getVoted(song, $user?.uid) === undefined) {
			const userID = await checkAuthStatus();
			if (!userID) {
				return;
			}
			updateDoc(song.ref, {
				votes: arrayUnion({ userID: userID, upvoted }),
				rating: upvoted ? song.rating + 1 : song.rating - 1
			});
		} else {
			const userID = await checkAuthStatus();
			if (!userID) {
				return;
			}
			const batch = writeBatch(db);
			batch.update(song.ref, {
				votes: arrayRemove({ userID, upvoted: !upvoted }),
				rating: upvoted ? song.rating + 2 : song.rating - 2
			});
			batch.update(song.ref, {
				votes: arrayUnion({ userID, upvoted })
			});
			batch.commit();
		}
	}

	async function searchSongs() {
		songsLoading = true;
		const response = await fetch(`https://api.spotify.com/v1/search?q=${songSearch}&type=track`, {
			headers: {
				Authorization: 'Bearer ' + (await getAccessToken())
			}
		});
		if (response.ok) {
			const data = await response.json();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			songResults = data.tracks.items.map((track: { [key: string]: any }) => {
				return {
					name: track.name,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					artist: track.artists.map((artist: { [key: string]: any }) => artist.name).join(', '),
					url: `https://open.spotify.com/track/${track.id}`,
					image: track.album.images[2].url
				};
			});
			songsLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{$partyStore?.name ?? 'Party Songs'}</title>
</svelte:head>

<div class="mx-auto h-[calc(100dvh-4rem)] max-w-5xl">
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
				<Dialog.Root bind:open={dialogOpen}>
					<Dialog.Trigger class={buttonVariants({ variant: 'default' })}
						><Music class="mr-2 h-5 w-5" />Request Song</Dialog.Trigger
					>
					<Dialog.Content>
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
								{#if songsLoading}
									<div class="flex h-72 w-full items-center justify-center">
										<Loader2 class="h-16 w-16 animate-spin" />
									</div>
								{:else}
									<div class="p-4">
										<h4 class="mb-4 text-sm font-medium leading-none">Results</h4>
										{#each songResults as songResult}
											<div class="grid grid-cols-6 items-center justify-center gap-2 text-sm">
												<img src={songResult.image} alt={songResult.name} />
												<div class="col-span-4 grid grid-cols-1 items-center">
													<div class="overflow-hidden">
														<Button
															href={songResult.url}
															class="h-full px-0 pb-2 pt-0"
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
								{/if}
							</ScrollArea>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</div>
		<div class="flex flex-row flex-wrap gap-5">
			<Tabs.Root value="mostRecent">
				<Tabs.List>
					<Tabs.Trigger value="mostRecent" on:click={() => (sortByLiked = false)}>
						<CalendarClock class="mr-2 h-5 w-5" />
						Most Recent
					</Tabs.Trigger>
					<Tabs.Trigger value="mostLiked" on:click={() => (sortByLiked = true)}>
						<ThumbsUp class="mr-2 h-5 w-5" />
						Most Liked
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
			<div class="grow"><Input bind:value={filterText} placeholder="Filter..." /></div>
		</div>
		<ScrollArea class="h-full w-full grow rounded-md border p-5 {!sortByLiked ? 'hidden' : ''}">
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
										<div
											class="grid grid-cols-1 items-center justify-between gap-y-2 sm:grid-cols-2"
										>
											<div class="flex flex-row items-center gap-2">
												<img src={song.image} alt={song.name} />
												<p>{song.artist}</p>
											</div>
											<div class="flex flex-row justify-center gap-2 sm:justify-end">
												<div class="flex items-center justify-center px-3">
													<p class="text-2xl font-bold">{song.rating.toLocaleString()}</p>
												</div>
												<Button
													size="icon"
													variant={getVoted(song, $user?.uid) === true ? 'default' : 'outline'}
													on:click={() => addVote(song, true)}><ThumbsUp /></Button
												>
												<Button
													size="icon"
													variant={getVoted(song, $user?.uid) === false ? 'destructive' : 'outline'}
													on:click={() => addVote(song, false)}><ThumbsDown /></Button
												>
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
		<ScrollArea class="h-full w-full grow rounded-md border p-5 {sortByLiked ? 'hidden' : ''}">
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
										<div
											class="grid grid-cols-1 items-center justify-between gap-y-2 sm:grid-cols-2"
										>
											<div class="flex flex-row items-center gap-2">
												<img src={song.image} alt={song.name} />
												<p>{song.artist}</p>
											</div>
											<div class="flex flex-row justify-center gap-2 sm:justify-end">
												<div class="flex items-center justify-center px-3">
													<p class="text-2xl font-bold">{song.rating.toLocaleString()}</p>
												</div>
												<Button
													size="icon"
													variant={getVoted(song, $user?.uid) === true ? 'default' : 'outline'}
													on:click={() => addVote(song, true)}><ThumbsUp /></Button
												>
												<Button
													size="icon"
													variant={getVoted(song, $user?.uid) === false ? 'destructive' : 'outline'}
													on:click={() => addVote(song, false)}><ThumbsDown /></Button
												>
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
</div>
