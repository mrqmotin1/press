<template>
	<!-- MondaySys: Online Stores (staff). Data: mondaypos_press storefront/api.py via press.api.mondaypos_storefront.* -->
	<div class="flex flex-col">
		<Header class="bg-surface-white">
			<Breadcrumbs :items="[{ label: 'Online Stores', route: { name: 'Online Stores' } }]" />
			<Button variant="subtle" :loading="$resources.overview.loading" @click="$resources.overview.reload()">
				<template #prefix><LucideRefreshCw class="h-4 w-4" /></template>
				Refresh
			</Button>
		</Header>

		<div class="mx-auto w-full max-w-6xl space-y-6 p-5">
			<p v-if="$resources.overview.error" class="text-p-base text-ink-red-4">
				{{ $resources.overview.error.messages?.[0] || 'Could not load online stores.' }}
			</p>

			<div class="flex gap-1 border-b border-outline-gray-1">
				<button
					v-for="t in ['Stores', 'Servers']"
					:key="t"
					class="-mb-px border-b-2 px-3 py-2 text-base"
					:class="tab === t ? 'border-ink-gray-9 font-medium text-ink-gray-9' : 'border-transparent text-ink-gray-5 hover:text-ink-gray-8'"
					@click="tab = t"
				>
					{{ t }} <span class="text-ink-gray-4">{{ t === 'Stores' ? stores.length : servers.length }}</span>
				</button>
			</div>

			<!-- stores -->
			<div v-if="tab === 'Stores'" class="overflow-x-auto rounded border border-outline-gray-1">
				<table class="w-full text-left text-base">
					<thead class="bg-surface-gray-1 text-sm text-ink-gray-5">
						<tr>
							<th class="px-4 py-2 font-medium">Store</th>
							<th class="px-4 py-2 font-medium">State</th>
							<th class="px-4 py-2 font-medium">Template</th>
							<th class="px-4 py-2 font-medium">ERPNext site</th>
							<th class="px-4 py-2 font-medium">Server</th>
							<th class="px-4 py-2 font-medium text-right">Open</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="s in stores" :key="s.name" class="border-t border-outline-gray-1 hover:bg-surface-gray-1">
							<td class="px-4 py-2.5">
								<router-link :to="{ name: 'Online Store', params: { name: s.name } }" class="font-medium text-ink-gray-9 hover:underline">
									{{ s.title }}
								</router-link>
								<div class="text-sm text-ink-gray-5">{{ s.address }}</div>
							</td>
							<td class="px-4 py-2.5"><Badge :label="s.state" :theme="stateTheme(s.state)" /></td>
							<td class="px-4 py-2.5 capitalize text-ink-gray-7">{{ s.template || '—' }}</td>
							<td class="px-4 py-2.5 text-ink-gray-7">
								<router-link v-if="s.site" :to="`/sites/${s.site}`" class="hover:underline">{{ s.site }}</router-link>
								<span v-else>—</span>
							</td>
							<td class="px-4 py-2.5 text-ink-gray-7">{{ s.server }}</td>
							<td class="px-4 py-2.5">
								<StoreLinks :store="s" />
							</td>
						</tr>
						<tr v-if="!stores.length && !$resources.overview.loading">
							<td colspan="6" class="px-4 py-6 text-center text-ink-gray-5">No online stores yet.</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- servers -->
			<div v-else class="grid gap-4 md:grid-cols-2">
				<router-link
					v-for="s in servers"
					:key="s.name"
					:to="{ name: 'Online Store Server', params: { name: s.name } }"
					class="block rounded border border-outline-gray-1 p-4 hover:border-outline-gray-3"
				>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-lg font-semibold text-ink-gray-9">{{ s.title }}</div>
							<div class="text-sm text-ink-gray-5">{{ s.name }} · {{ s.ip }} · {{ s.region }}</div>
						</div>
						<Badge :label="s.status" :theme="{ Active: 'green', Broken: 'red', Retired: 'gray' }[s.status]" />
					</div>
					<p v-if="s.health && s.health !== 'OK'" class="mt-2 text-sm text-ink-red-4">{{ s.health }}</p>
					<dl class="mt-3 grid grid-cols-3 gap-2 text-sm">
						<div><dt class="text-ink-gray-5">Stores</dt><dd class="text-ink-gray-9">{{ s.stores }}</dd></div>
						<div><dt class="text-ink-gray-5">Disk</dt><dd class="text-ink-gray-9">{{ s.disk_used ?? '—' }}%</dd></div>
						<div><dt class="text-ink-gray-5">Memory</dt><dd class="text-ink-gray-9">{{ s.memory_used ?? '—' }}%</dd></div>
						<div><dt class="text-ink-gray-5">Release</dt><dd class="font-mono text-ink-gray-9">{{ s.deployed_commit || '—' }}</dd></div>
						<div class="col-span-2">
							<dt class="text-ink-gray-5">Last backup</dt>
							<dd class="text-ink-gray-9">{{ s.last_backup ? ago(s.last_backup) : 'never' }} · {{ s.last_backup_status || '' }}</dd>
						</div>
					</dl>
				</router-link>
			</div>
		</div>
	</div>
</template>

<script>
import { Badge, Breadcrumbs, Button } from 'frappe-ui';
import Header from '../components/Header.vue';
import StoreLinks from '../components/MondayStoreLinks.vue';

export default {
	name: 'MondayOnlineStores',
	components: { Badge, Breadcrumbs, Button, Header, StoreLinks },
	data() {
		return { tab: 'Stores' };
	},
	resources: {
		overview() {
			return { url: 'press.api.mondaypos_storefront.overview', auto: true };
		},
	},
	computed: {
		stores() {
			return this.$resources.overview.data?.stores || [];
		},
		servers() {
			return this.$resources.overview.data?.servers || [];
		},
	},
	methods: {
		stateTheme(state) {
			return { On: 'green', Preview: 'blue', Paused: 'orange', Disabled: 'gray' }[state] || 'gray';
		},
		ago(ts) {
			return this.$dayjs(ts).fromNow();
		},
	},
};
</script>
