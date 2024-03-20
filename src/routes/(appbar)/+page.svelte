<script lang="ts">
	import Collection from '$lib/components/Firebase/Collection.svelte';
	import { userData } from '$lib/components/stores/userStore';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import * as Card from '$lib/components/ui/card';
	import { db } from '$lib/firebase';
	import { cn } from '$lib/utils';
	import {
		getLocalTimeZone,
		type DateValue,
		today,
		DateFormatter,
		CalendarDate
	} from '@internationalized/date';
	import { DocumentReference, addDoc, collection, deleteDoc, getDocs } from 'firebase/firestore';
	import { CalendarIcon, PartyPopper, Trash } from 'lucide-svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	const df = new DateFormatter('en-US', {
		dateStyle: 'long',
		timeZone: 'UTC'
	});

	let partyName = '';
	let partyDate: DateValue | undefined;
	let dialogOpen = false;

	let placeholder: DateValue = today(getLocalTimeZone());

	function addParty() {
		addDoc(collection(db, 'parties'), {
			name: partyName,
			date: partyDate?.toString()
		});
		dialogOpen = false;
		partyName = '';
		partyDate = undefined;
	}

	async function deleteParty(ref: DocumentReference) {
		const collectionSnapshot = await getDocs(collection(ref, 'suggestions'));
		collectionSnapshot.forEach((doc) => {
			deleteDoc(doc.ref);
		});
		deleteDoc(ref);
	}
</script>

<div class="flex flex-col gap-5 p-5">
	<div class="flex flex-row items-center gap-5">
		<h1 class="text-xl">Parties</h1>
		{#if $userData?.isAdmin}
			<Dialog.Root bind:open={dialogOpen}>
				<Dialog.Trigger class={buttonVariants({ variant: 'default' })}
					><PartyPopper class="mr-2 h-5 w-5" />Add Party</Dialog.Trigger
				>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Add Party</Dialog.Title>
						<Dialog.Description>Please provide information for a new party.</Dialog.Description>
					</Dialog.Header>
					<div class="grid gap-4 py-4">
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="name" class="text-right">Name</Label>
							<Input id="name" bind:value={partyName} class="col-span-3" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="username" class="text-right">Date</Label>
							<Popover.Root>
								<Popover.Trigger
									class={cn(
										buttonVariants({ variant: 'outline' }),
										'w-[280px] justify-start pl-4 text-left font-normal',
										!partyDate && 'text-muted-foreground'
									)}
								>
									{partyDate ? df.format(partyDate.toDate(getLocalTimeZone())) : 'Pick a date'}
									<CalendarIcon class="ml-auto h-4 w-4 opacity-50" />
								</Popover.Trigger>
								<Popover.Content class="w-auto p-0" side="top">
									<Calendar
										value={partyDate}
										bind:placeholder
										minValue={new CalendarDate(1900, 1, 1)}
										calendarLabel="Party date"
										initialFocus
										onValueChange={(v) => {
											if (v) {
												partyDate = v;
											} else {
												partyDate = undefined;
											}
										}}
									/>
								</Popover.Content>
							</Popover.Root>
						</div>
					</div>
					<Dialog.Footer>
						<Button type="submit" on:click={addParty}>Add</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		{/if}
	</div>
	<Collection ref={'parties'} let:data let:count>
		{#if count === 0}
			<p>No parties</p>
		{:else}
			{#each data as party}
				<a href={`/party/${party.id}`}>
					<Card.Root class="hover:bg-accent hover:text-accent-foreground">
						<Card.Header>
							<Card.Title>{party.name}</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="flex flex-row items-center justify-between">
								<p>{df.format(new Date(party.date))}</p>
								{#if $userData?.isAdmin}
									<AlertDialog.Root>
										<AlertDialog.Trigger asChild let:builder>
											<Button
												builders={[builder]}
												size="icon"
												on:click={(e) => e.preventDefault()}
												variant="destructive"><Trash class="h-5 w-5" /></Button
											>
										</AlertDialog.Trigger>
										<AlertDialog.Content>
											<AlertDialog.Header>
												<AlertDialog.Title>Please Confirm</AlertDialog.Title>
												<AlertDialog.Description>
													This action cannot be undone. This will remove the party from the system
													permanently.
												</AlertDialog.Description>
											</AlertDialog.Header>
											<AlertDialog.Footer>
												<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
												<AlertDialog.Action on:click={() => deleteParty(party.ref)}
													>Confirm</AlertDialog.Action
												>
											</AlertDialog.Footer>
										</AlertDialog.Content>
									</AlertDialog.Root>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		{/if}
	</Collection>
</div>
