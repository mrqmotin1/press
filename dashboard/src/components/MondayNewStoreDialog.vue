<template>
	<!-- MondaySys: New online store (staff). Online Stores → New store, or Site → Online Store → Set up. mondaypos_press stores.create -->
	<Dialog v-model="open" :options="{ title: 'New online store', size: 'lg' }">
		<template #body-content>
			<p class="mb-4 text-p-base text-ink-gray-7">
				The store opens in <strong>Preview</strong>: shoppers need a password until you go live. Setting it up installs the
				Online Store app on the site (fields only; the POS is not affected) and takes a few minutes.
			</p>
			<p v-if="$resources.options.loading" class="text-ink-gray-5">Loading…</p>
			<div v-else class="space-y-4">
				<div v-if="!site">
					<FormControl type="select" label="ERPNext site" v-model="form.site" :options="siteOptions" />
					<p v-if="chosen?.blocker" class="mt-1.5 text-sm text-ink-amber-3">{{ chosen.blocker }}</p>
				</div>
				<p v-else-if="blocker" class="text-p-sm text-ink-amber-3">{{ blocker }}</p>
				<FormControl label="Store name" v-model="form.title" placeholder="e.g. Fresh Haat" />
				<div>
					<FormControl label="Address" v-model="form.slug" placeholder="freshhaat" @update:modelValue="slugTouched = true" />
					<p class="mt-1.5 text-sm text-ink-gray-5">
						The shop opens at <span class="font-mono text-ink-gray-8">{{ address }}</span>
					</p>
				</div>
				<div>
					<div class="mb-1.5 text-xs text-ink-gray-5">Template</div>
					<div class="grid gap-2 sm:grid-cols-2">
						<button
							v-for="t in templates"
							:key="t.value"
							type="button"
							class="rounded border p-3 text-left transition-colors"
							:class="form.template === t.value ? 'border-outline-gray-5 bg-surface-gray-2' : 'border-outline-gray-1 hover:border-outline-gray-3'"
							@click="form.template = t.value"
						>
							<div class="font-medium text-ink-gray-9">{{ t.label }}</div>
							<div class="text-sm text-ink-gray-5">{{ t.description }}</div>
						</button>
					</div>
				</div>
				<FormControl v-if="servers.length > 1" type="select" label="Storefront server" v-model="form.server" :options="serverOptions" />
			</div>
		</template>
		<template #actions>
			<Button variant="solid" class="w-full" :disabled="!canCreate" :loading="$resources.create.loading" @click="create">
				Create store
			</Button>
		</template>
	</Dialog>
</template>

<script>
import { Button, Dialog, FormControl } from 'frappe-ui';
import { toast } from 'vue-sonner';
import { getToastErrorMessage } from '../utils/toast';

export default {
	name: 'MondayNewStoreDialog',
	components: { Button, Dialog, FormControl },
	props: {
		modelValue: { type: Boolean, default: false },
		// preset from a Site page (the site picker is then hidden)
		site: { type: String, default: '' },
		blocker: { type: String, default: '' },
	},
	emits: ['update:modelValue', 'created'],
	data() {
		return { form: { site: this.site, title: '', slug: '', template: 'bazaar', server: '' }, slugTouched: false };
	},
	resources: {
		options() {
			return {
				url: 'press.api.mondaypos_storefront.new_store_options',
				auto: true,
				onSuccess: (d) => {
					const preferred = d.servers.find((s) => s.use_for_new_stores) || d.servers[0];
					if (!this.form.server && preferred) this.form.server = preferred.name;
					if (this.site) this.suggest(this.site);
				},
			};
		},
		create() {
			return {
				url: 'press.api.mondaypos_storefront.new_store',
				onSuccess: (name) => {
					toast.success('Setting up the store…');
					this.open = false;
					this.$emit('created', name);
				},
				onError: (e) => toast.error(getToastErrorMessage(e)),
			};
		},
	},
	computed: {
		open: {
			get() {
				return this.modelValue;
			},
			set(v) {
				this.$emit('update:modelValue', v);
			},
		},
		opts() {
			return this.$resources.options.data || { sites: [], servers: [], templates: [], root_domain: 'mondaypos.com' };
		},
		templates() {
			return this.opts.templates;
		},
		servers() {
			return this.opts.servers;
		},
		siteOptions() {
			return [
				{ label: 'Choose a site', value: '' },
				...this.opts.sites.map((s) => ({ label: `${s.name}${s.blocker ? ' (not ready)' : ''}`, value: s.name })),
			];
		},
		serverOptions() {
			return this.servers.map((s) => ({ label: `${s.title} (${s.name})`, value: s.name }));
		},
		chosen() {
			return this.opts.sites.find((s) => s.name === this.form.site);
		},
		address() {
			return `${this.form.slug || '…'}-shop.${this.opts.root_domain}`;
		},
		canCreate() {
			const siteOk = this.site ? !this.blocker : this.form.site && !this.chosen?.blocker;
			return Boolean(siteOk && this.form.title.trim() && /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(this.form.slug) && this.form.template);
		},
	},
	watch: {
		'form.site'(site) {
			if (site) this.suggest(site);
		},
	},
	methods: {
		suggest(site) {
			if (!this.slugTouched) this.form.slug = site.split('.')[0].toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
		},
		create() {
			this.$resources.create.submit({ ...this.form, site: this.site || this.form.site });
		},
	},
};
</script>
