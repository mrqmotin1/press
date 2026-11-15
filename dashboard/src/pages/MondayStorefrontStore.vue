<template>
	<!-- MondaySys: one online store (staff): overview, status (go live, pause, disable, enable), preview password,
	     go-live checklist, set-up job, open links, payment methods (COD, SSLCommerz). -->
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
					<Badge :label="d.state" :theme="stateTheme" />
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

			<!-- status -->
			<section class="rounded border border-outline-gray-1 p-4">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="max-w-xl">
						<h3 class="text-base font-semibold text-ink-gray-9">Status: {{ d.state }}</h3>
						<p class="mt-1 text-p-sm text-ink-gray-7">{{ stateText }}</p>
						<p v-if="d.state_changed_on" class="mt-1 text-sm text-ink-gray-5">
							Changed {{ ago(d.state_changed_on) }} by {{ d.state_changed_by }}
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<template v-if="!jobRunning">
							<Tooltip v-if="d.state === 'Preview'" :text="missing.length ? 'Finish the checklist first' : ''" :disabled="!missing.length">
								<Button variant="solid" :disabled="Boolean(missing.length)" @click="goLive">Go live</Button>
							</Tooltip>
							<Button v-if="d.state === 'On'" variant="subtle" @click="pause">Pause</Button>
							<Button v-if="d.state === 'Paused'" variant="solid" @click="resume">Resume</Button>
							<Button v-if="['Preview', 'On', 'Paused'].includes(d.state)" variant="subtle" theme="red" @click="disable">Disable</Button>
							<Button v-if="d.state === 'Disabled'" variant="solid" @click="enable">Enable again</Button>
						</template>
					</div>
				</div>

				<!-- set-up / disable / enable job -->
				<div v-if="d.job && (jobRunning || d.job.status === 'Failed' || d.state === 'Creating')" class="mt-4 rounded bg-surface-gray-1 p-3">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2 text-base text-ink-gray-8">
							<LoadingIndicator v-if="jobRunning" class="h-4 w-4" />
							<span>{{ d.job.action }}: {{ d.job.status }}<span v-if="d.job.current_step"> · {{ d.job.current_step }}</span></span>
						</div>
						<Button v-if="d.job.status === 'Failed'" size="sm" variant="solid" :loading="$resources.resumeJob.loading" @click="$resources.resumeJob.submit({ name: d.job.name })">
							Resume
						</Button>
					</div>
					<pre class="mt-2 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-xs text-ink-gray-7">{{ jobTail }}</pre>
				</div>

				<!-- preview password -->
				<div v-if="['Creating', 'Preview'].includes(d.state) && d.preview_password" class="mt-4 flex flex-wrap items-center gap-3 border-t border-outline-gray-1 pt-4">
					<div class="text-sm text-ink-gray-7">Preview password</div>
					<code class="rounded bg-surface-gray-2 px-2 py-1 font-mono text-base text-ink-gray-9">{{ showPassword ? d.preview_password : '••••••••••' }}</code>
					<Button size="sm" variant="ghost" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</Button>
					<Button size="sm" variant="ghost" @click="copyPassword">Copy</Button>
					<Button size="sm" variant="ghost" :loading="$resources.newPassword.loading" @click="newPassword">New password</Button>
					<span class="text-sm text-ink-gray-5">Give it to the shop owner to look around before going live.</span>
				</div>

				<!-- go-live checklist -->
				<p v-if="d.state === 'Preview' && !r" class="mt-4 border-t border-outline-gray-1 pt-4 text-sm text-ink-gray-5">Checking the shop's ERPNext…</p>
				<div v-if="d.state === 'Preview' && r" class="mt-4 border-t border-outline-gray-1 pt-4">
					<div class="text-sm font-medium text-ink-gray-8">Before going live (in the shop's ERPNext)</div>
					<ul class="mt-2 space-y-1.5 text-base">
						<li v-for="c in checklist" :key="c.label" class="flex items-center gap-2" :class="c.ok ? 'text-ink-gray-7' : 'text-ink-gray-9'">
							<LucideCircleCheck v-if="c.ok" class="h-4 w-4 text-ink-green-3" />
							<LucideCircle v-else class="h-4 w-4 text-ink-gray-4" />
							{{ c.label }}
						</li>
					</ul>
				</div>
			</section>

			<!-- payments -->
			<section v-if="d.state !== 'Creating'" class="rounded border border-outline-gray-1 p-4">
				<h3 class="text-base font-semibold text-ink-gray-9">Payments</h3>
				<p class="mt-1 text-p-sm text-ink-gray-5">
					What shoppers can pay with at checkout. Saved in the shop's own ERPNext (Storefront Settings).
				</p>
				<p v-if="$resources.erp.data?.error" class="mt-3 text-p-base text-ink-red-4">Could not read the shop's settings: {{ $resources.erp.data.error }}</p>
				<p v-else-if="!$resources.erp.data" class="mt-3 text-p-base text-ink-gray-5">Reading the shop's ERPNext…</p>
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
							<span v-if="d.sslcommerz_tested_on">Keys tested {{ testedAgo }} by {{ d.sslcommerz_saved_by }}</span>
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
import { Badge, Breadcrumbs, Button, Dialog, FormControl, LoadingIndicator, Switch, Tooltip } from 'frappe-ui';
import { toast } from 'vue-sonner';
import Header from '../components/Header.vue';
import StoreLinks from '../components/MondayStoreLinks.vue';
import { confirmDialog } from '../utils/components';
import { escapeHtml } from '../utils/format';
import { getToastErrorMessage } from '../utils/toast';

export default {
	name: 'MondayStorefrontStore',
	components: { Badge, Breadcrumbs, Button, Dialog, FormControl, Header, LoadingIndicator, StoreLinks, Switch, Tooltip },
	props: { name: { type: String, required: true } },
	data() {
		return { keysDialog: false, keys: { mode: 'Sandbox', store_id: '', password: '' }, showPassword: false, timer: null };
	},
	mounted() {
		// a running job (set-up, disable, enable) is watched from mounted: a watch option would run before $resources exists
		this.$watch('jobRunning', (on) => {
			clearInterval(this.timer);
			if (on) this.timer = setInterval(() => this.$resources.store.reload(), 4000);
		}, { immediate: true });
		// e.g. Creating → Preview when the set-up job finishes: the ERPNext part is there now
		this.$watch('d.state', (state, before) => {
			if (before && state !== before) this.$resources.erp.reload();
		});
	},
	beforeUnmount() {
		clearInterval(this.timer);
	},
	resources: {
		store() {
			return { url: 'press.api.mondaypos_storefront.store', params: { name: this.name }, auto: true };
		},
		// the shop's ERPNext part (payments, checklist) loads after the page itself: one call to the site
		erp() {
			return { url: 'press.api.mondaypos_storefront.store_erp', params: { name: this.name }, auto: true };
		},
		setPayments() {
			return {
				url: 'press.api.mondaypos_storefront.set_payments',
				onSuccess: (data) => {
					toast.success('Payment methods updated');
					this.$resources.erp.setData(data);
				},
				onError: (e) => toast.error(getToastErrorMessage(e)),
			};
		},
		setState() {
			return {
				url: 'press.api.mondaypos_storefront.set_state',
				onSuccess: (data) => this.$resources.store.setData(data),
			};
		},
		action() {
			return {
				url: 'press.api.mondaypos_storefront.store_action',
				onSuccess: () => this.$resources.store.reload(),
			};
		},
		resumeJob() {
			return {
				url: 'press.api.mondaypos_storefront.resume_job',
				onSuccess: () => this.$resources.store.reload(),
				onError: (e) => toast.error(getToastErrorMessage(e)),
			};
		},
		newPassword() {
			return {
				url: 'press.api.mondaypos_storefront.new_preview_password',
				onSuccess: () => {
					toast.success('New preview password saved. The old one no longer opens the shop.');
					this.showPassword = true;
					this.$resources.store.reload();
				},
				onError: (e) => toast.error(getToastErrorMessage(e)),
			};
		},
		saveKeys() {
			return {
				url: 'press.api.mondaypos_storefront.save_sslcommerz',
				onSuccess: (data) => {
					this.keysDialog = false;
					this.keys.password = '';
					toast.success('Keys passed the test and are saved');
					this.$resources.erp.setData(data);
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
			return this.$resources.erp.data?.payments;
		},
		saving() {
			return this.$resources.setPayments.loading;
		},
		r() {
			return this.$resources.erp.data?.readiness;
		},
		missing() {
			return this.r?.missing || (this.d?.state === 'Preview' ? ['readiness unknown'] : []);
		},
		checklist() {
			const r = this.r || {};
			return [
				{ ok: r.items_published > 0, label: `Items published: ${r.items_published ?? 0} (Item → Show in online store)` },
				{ ok: (r.groups || []).length > 0, label: `Categories shown: ${(r.groups || []).map((g) => g.name).join(', ') || 'none'}` },
				{ ok: r.delivery_areas > 0, label: `Delivery areas: ${r.delivery_areas ?? 0}` },
				{ ok: r.delivery_slots > 0, label: `Delivery slots: ${r.delivery_slots ?? 0}` },
				{ ok: r.cod || r.online, label: `Payment: ${[r.cod && 'cash on delivery', r.online && 'SSLCommerz'].filter(Boolean).join(', ') || 'none on'}` },
			];
		},
		jobRunning() {
			return ['Queued', 'Running'].includes(this.d?.job?.status);
		},
		jobTail() {
			return (this.d?.job?.log || '').trim().split('\n').slice(-12).join('\n');
		},
		stateTheme() {
			return { Creating: 'blue', On: 'green', Preview: 'blue', Paused: 'orange', Disabled: 'gray' }[this.d?.state] || 'gray';
		},
		stateText() {
			const closes = this.d?.disabled_on ? this.$dayjs(this.d.disabled_on).add(this.d.closes_in_days, 'day').format('D MMM YYYY') : '';
			return {
				Creating: 'Setting up: installing the app on the site, connecting ERPNext, creating the store and its address.',
				Preview: 'Shoppers need the preview password. Go live when the checklist below is done.',
				On: 'Open to shoppers. Web orders hold their stock against the till.',
				Paused: "Shoppers see a short-break page and can't order. The POS and ERPNext keep working as usual.",
				Disabled: this.d?.dns_removed_on
					? "The shop's address was removed. Its design and the site's data are kept: Enable again brings it back in Preview."
					: `Shoppers see "This shop is closed". On ${closes} the address is removed; the design and the site's data are kept.`,
			}[this.d?.state] || '';
		},
		testedAgo() {
			return this.d?.sslcommerz_tested_on ? this.$dayjs(this.d.sslcommerz_tested_on).fromNow() : '';
		},
		sslBlocker() {
			if (!this.p) return '';
			if (!this.p.store_id || !this.p.password_saved || !this.d.sslcommerz_tested_on) return 'Add keys that pass the test first.';
			if (this.p.mode === 'Live' && !this.d.ipn_rule_ready) return 'Live payments need the Cloudflare rule for payment notifications first.';
			return '';
		},
	},
	methods: {
		ago(ts) {
			return this.$dayjs(ts).fromNow();
		},
		confirm(title, message, label, theme, run) {
			confirmDialog({
				title,
				message,
				primaryAction: {
					label,
					variant: 'solid',
					theme,
					onClick: ({ hide }) => run().then(hide).catch((e) => toast.error(getToastErrorMessage(e))),
				},
			});
		},
		goLive() {
			this.confirm(
				'Go live',
				`Open <strong>${escapeHtml(this.d.title)}</strong> to shoppers at ${escapeHtml(this.d.address)}?<br><br>Stock reservation is switched on in its ERPNext: web orders then hold their stock against the till. The preview password stops being needed.`,
				'Go live',
				'gray',
				() => this.$resources.setState.submit({ name: this.name, state: 'On' }).then(() => toast.success('The store is live')),
			);
		},
		pause() {
			this.confirm(
				'Pause store',
				`Pause <strong>${escapeHtml(this.d.title)}</strong>? Shoppers see a short-break page and can't place orders. Orders already placed, the POS and ERPNext are not affected.`,
				'Pause',
				'gray',
				() => this.$resources.setState.submit({ name: this.name, state: 'Paused' }).then(() => toast.success('The store is paused')),
			);
		},
		resume() {
			this.$resources.setState.submit({ name: this.name, state: 'On' }).then(() => toast.success('The store is open again'), (e) => toast.error(getToastErrorMessage(e)));
		},
		disable() {
			this.confirm(
				'Disable store',
				`Disable <strong>${escapeHtml(this.d.title)}</strong> (${escapeHtml(this.d.address)})?<br><br>A backup is taken first. Shoppers then see "This shop is closed"; after ${this.d.closes_in_days} days its address is removed. The app, the store's design and the site's data stay, so it can be enabled again later.`,
				'Disable',
				'red',
				() => this.$resources.action.submit({ name: this.name, action: 'disable' }),
			);
		},
		enable() {
			this.confirm(
				'Enable store',
				`Bring <strong>${escapeHtml(this.d.title)}</strong> back? It reopens in Preview (password needed) with its design as it was.`,
				'Enable',
				'gray',
				() => this.$resources.action.submit({ name: this.name, action: 'enable' }),
			);
		},
		newPassword() {
			this.$resources.newPassword.submit({ name: this.name });
		},
		copyPassword() {
			navigator.clipboard.writeText(this.d.preview_password).then(() => toast.success('Copied'));
		},
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
