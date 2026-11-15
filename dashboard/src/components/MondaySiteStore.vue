<template>
	<!-- MondaySys: Site → Online Store. The team sees the store's state and address; staff set one up and manage it
	     (Online Stores pages). Data: press.api.mondaypos_storefront.site_store -->
	<div class="mx-auto max-w-3xl space-y-4 p-5">
		<p v-if="$resources.info.error" class="text-p-base text-ink-red-4">Could not load the online store.</p>
		<p v-else-if="!info" class="text-ink-gray-5">Loading…</p>

		<div v-else-if="store" class="rounded border border-outline-gray-1 p-4">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div class="flex items-center gap-2">
						<h2 class="text-lg font-semibold text-ink-gray-9">{{ store.title }}</h2>
						<Badge :label="store.state" :theme="theme" />
					</div>
					<a :href="`https://${store.address}`" target="_blank" class="text-sm text-ink-gray-5 hover:underline">{{ store.address }}</a>
					<p class="mt-2 text-p-sm text-ink-gray-7">{{ text }}</p>
				</div>
				<div class="flex gap-2">
					<Button variant="subtle" :link="`https://${store.address}`">
						<template #prefix><LucideExternalLink class="h-3.5 w-3.5" /></template>
						Visit shop
					</Button>
					<Button v-if="info.can_manage" variant="solid" :route="{ name: 'Online Store', params: { name: store.name } }">Manage</Button>
				</div>
			</div>
		</div>

		<div v-else class="rounded border border-outline-gray-1 p-4">
			<h2 class="text-lg font-semibold text-ink-gray-9">No online store</h2>
			<template v-if="info.can_manage">
				<p class="mt-1 text-p-sm text-ink-gray-7">
					Give this site its own online shop at <span class="font-mono">&lt;name&gt;-shop.mondaypos.com</span>, with products,
					prices and stock live from its ERPNext. It opens in Preview, behind a password, until you go live.
				</p>
				<p v-if="info.blocker" class="mt-2 text-p-sm text-ink-amber-3">{{ info.blocker }}</p>
				<Button class="mt-3" variant="solid" :disabled="Boolean(info.blocker)" @click="dialog = true">Set up an online store</Button>
			</template>
			<p v-else class="mt-1 text-p-sm text-ink-gray-7">Ask Mondaysys about an online shop for this site.</p>
		</div>

		<NewStoreDialog
			v-if="dialog"
			v-model="dialog"
			:site="site"
			:blocker="info?.blocker || ''"
			@created="(name) => $router.push({ name: 'Online Store', params: { name } })"
		/>
	</div>
</template>

<script>
import { Badge, Button } from 'frappe-ui';
import NewStoreDialog from './MondayNewStoreDialog.vue';

export default {
	name: 'MondaySiteStore',
	components: { Badge, Button, NewStoreDialog },
	props: { site: { type: String, required: true } },
	data() {
		return { dialog: false };
	},
	resources: {
		info() {
			return { url: 'press.api.mondaypos_storefront.site_store', params: { name: this.site }, auto: true };
		},
	},
	computed: {
		info() {
			return this.$resources.info.data;
		},
		store() {
			return this.info?.store;
		},
		theme() {
			return { Creating: 'blue', On: 'green', Preview: 'blue', Paused: 'orange', Disabled: 'gray' }[this.store?.state] || 'gray';
		},
		text() {
			return {
				Creating: 'Being set up.',
				Preview: 'Being prepared: shoppers need the preview password until it goes live.',
				On: 'Open to shoppers.',
				Paused: 'Taking a short break: shoppers see a notice and cannot order. The POS is not affected.',
				Disabled: 'Closed.',
			}[this.store?.state];
		},
	},
};
</script>
