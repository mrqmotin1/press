<template>
	<!-- MondaySys: one online store (staff): overview, open links, payment methods (COD, SSLCommerz). -->
	<div class="flex flex-col">
		<Header class="bg-surface-white">
			<Breadcrumbs
				:items="[
					{ label: 'Online Stores', route: { name: 'Online Stores' } },
					{ label: d ? d.title : name, route: { name: 'Online Store', params: { name } } },
				]"
			/>
			<StoreLinks v-if="d" :store="d" />
		</Header>

		<div v-if="d" class="mx-auto w-full max-w-4xl space-y-6 p-5">
			<div class="rounded border border-outline-gray-1 p-4">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold text-ink-gray-9">{{ d.title }}</h2>
						<a :href="`https://${d.address}`" target="_blank" class="text-sm text-ink-gray-5 hover:underline">{{ d.address }}</a>
					</div>
					<Badge :label="d.state" :theme="{ On: 'green', Preview: 'blue', Paused: 'orange', Disabled: 'gray' }[d.state]" />
				</div>
				<dl class="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
					<div><dt class="text-ink-gray-5">Template</dt><dd class="capitalize">{{ d.template || '—' }}</dd></div>
					<div>
						<dt class="text-ink-gray-5">ERPNext site</dt>
						<dd><router-link v-if="d.site" :to="`/sites/${d.site}`" class="hover:underline">{{ d.site }}</router-link><span v-else>—</span></dd>
					</div>
					<div>
						<dt class="text-ink-gray-5">Server</dt>
						<dd><router-link :to="{ name: 'Online Store Server', params: { name: d.server } }" class="hover:underline">{{ d.server }}</router-link></dd>
					</div>
					<div><dt class="text-ink-gray-5">Store ID</dt><dd>{{ d.name }} (#{{ d.tenant_id }})</dd></div>
				</dl>
			</div>

			<!-- payments -->
			<section class="rounded border border-outline-gray-1 p-4">
				<h3 class="text-base font-semibold text-ink-gray-9">Payments</h3>
				<p class="mt-1 text-p-sm text-ink-gray-5">
					What shoppers can pay with at checkout. Saved in the shop's own ERPNext (Storefront Settings).
				</p>
				<p v-if="d.payments_error" class="mt-3 text-p-base text-ink-red-4">Could not read the shop's settings: {{ d.payments_error }}</p>
				<p v-else-if="!p" class="mt-3 text-p-base text-ink-gray-5">This store has no linked ERPNext site.</p>

				<div v-else class="mt-4 divide-y divide-outline-gray-1">
					<!-- COD -->
					<div class="flex items-center justify-between py-3">
						<div>
							<div class="font-medium text-ink-gray-9">Cash on delivery</div>
							<div class="text-sm text-ink-gray-5">The rider collects cash (or bKash) at the door.</div>
						</div>
						<Switch :modelValue="p.cod" :disabled="saving" @update:modelValue="(v) => setPayments(v, p.sslcommerz)" />
					</div>

					<!-- SSLCommerz -->
					<div class="py-3">
						<div class="flex items-center justify-between">
							<div>
								<div class="flex items-center gap-2 font-medium text-ink-gray-9">
									SSLCommerz <Badge :label="p.mode" :theme="p.mode === 'Live' ? 'green' : 'orange'" />
								</div>
								<div class="text-sm text-ink-gray-5">Cards, bKash, Nagad and Rocket on SSLCommerz's secure page.</div>
							</div>
							<Tooltip :text="sslBlocker || ''" :disabled="!sslBlocker || p.sslcommerz">
								<Switch :modelValue="p.sslcommerz" :disabled="saving || (!p.sslcommerz && Boolean(sslBlocker))" @update:modelValue="(v) => setPayments(p.cod, v)" />
							</Tooltip>
						</div>
						<div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink-gray-7">
							<span>Store ID: <span class="font-mono">{{ p.store_id || 'not set' }}</span></span>
							<span>Password: {{ p.password_saved ? 'saved' : 'not set' }}</span>
							<span v-if="d.sslcommerz_tested_on">Keys tested {{ $dayjs(d.sslcommerz_tested_on).fromNow() }} by {{ d.sslcommerz_saved_by }}</span>
						</div>
						<p v-if="sslBlocker && !p.sslcommerz" class="mt-1 text-sm text-ink-amber-3">{{ sslBlocker }}</p>
						<Button class="mt-3" variant="subtle" @click="openKeys">{{ p.store_id ? 'Replace keys' : 'Add keys' }}</Button>
					</div>
				</div>
			</section>
		</div>
		<p v-else class="p-5 text-ink-gray-5">{{ $resources.store.error ? 'Could not load this store.' : 'Loading…' }}</p>

		<Dialog v-model="keysDialog" :options="{ title: 'SSLCommerz keys' }">
			<template #body-content>
				<p class="mb-3 text-p-base text-ink-gray-7">
					The shop's own SSLCommerz merchant keys. They are tested with SSLCommerz before saving, and the password
					is never shown again.
				</p>
				<div class="space-y-3">
					<FormControl type="select" label="Mode" v-model="keys.mode" :options="['Sandbox', 'Live']" />
					<FormControl label="Store ID" v-model="keys.store_id" autocomplete="off" />
					<FormControl type="password" label="Store password" v-model="keys.password" autocomplete="new-password" />
					<p v-if="keys.mode === 'Live'" class="text-sm text-ink-amber-3">
						Live mode takes real payments. Use the shop's live merchant keys only.
					</p>
				</div>
			</template>
			<template #actions>
				<Button variant="solid" class="w-full" :loading="$resources.saveKeys.loading" @click="saveKeys">Test and save</Button>
			</template>
		</Dialog>
	</div>
</template>

<script>
import { Badge, Breadcrumbs, Button, Dialog, FormControl, Switch, Tooltip } from 'frappe-ui';
import { toast } from 'vue-sonner';
import Header from '../components/Header.vue';
import StoreLinks from '../components/MondayStoreLinks.vue';
import { getToastErrorMessage } from '../utils/toast';

export default {
	name: 'MondayStorefrontStore',
	components: { Badge, Breadcrumbs, Button, Dialog, FormControl, Header, StoreLinks, Switch, Tooltip },
	props: { name: { type: String, required: true } },
	data() {
		return { keysDialog: false, keys: { mode: 'Sandbox', store_id: '', password: '' } };
	},
	resources: {
		store() {
			return { url: 'press.api.mondaypos_storefront.store', params: { name: this.name }, auto: true };
		},
		setPayments() {
			return {
				url: 'press.api.mondaypos_storefront.set_payments',
				onSuccess: () => {
					toast.success('Payment methods updated');
					this.$resources.store.reload();
				},
				onError: (e) => toast.error(getToastErrorMessage(e)),
			};
		},
		saveKeys() {
			return {
				url: 'press.api.mondaypos_storefront.save_sslcommerz',
				onSuccess: () => {
					this.keysDialog = false;
					this.keys.password = '';
					toast.success('Keys passed the test and are saved');
					this.$resources.store.reload();
				},
				onError: (e) => toast.error(getToastErrorMessage(e)),
			};
		},
	},
	computed: {
		d() {
			return this.$resources.store.data;
		},
		p() {
			return this.d?.payments;
		},
		saving() {
			return this.$resources.setPayments.loading;
		},
		sslBlocker() {
			if (!this.p) return '';
			if (!this.p.store_id || !this.p.password_saved || !this.d.sslcommerz_tested_on) return 'Add keys that pass the test first.';
			if (this.p.mode === 'Live' && !this.d.ipn_rule_ready) return 'Live payments need the Cloudflare rule for payment notifications first.';
			return '';
		},
	},
	methods: {
		setPayments(cod, sslcommerz) {
			if (!cod && !sslcommerz) {
				toast.error('Keep at least one payment method on. To stop orders, pause the store.');
				return;
			}
			this.$resources.setPayments.submit({ name: this.name, cod: cod ? 1 : 0, sslcommerz: sslcommerz ? 1 : 0 });
		},
		openKeys() {
			this.keys = { mode: this.p?.mode || 'Sandbox', store_id: this.p?.store_id || '', password: '' };
			this.keysDialog = true;
		},
		saveKeys() {
			this.$resources.saveKeys.submit({ name: this.name, ...this.keys });
		},
	},
};
</script>
