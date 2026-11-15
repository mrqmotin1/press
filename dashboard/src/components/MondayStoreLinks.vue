<template>
	<!-- MondaySys: Visit shop · Store admin (one-click, signed link) · ERPNext (Login as Administrator). Staff only. -->
	<div class="flex flex-wrap justify-end gap-1.5">
		<Button size="sm" variant="subtle" :link="`https://${shopHost}`">
			<template #prefix><LucideExternalLink class="h-3.5 w-3.5" /></template>
			Shop
		</Button>
		<Button size="sm" variant="subtle" :loading="$resources.admin.loading" @click="openAdmin">
			<template #prefix><LucideLayoutDashboard class="h-3.5 w-3.5" /></template>
			Store admin
		</Button>
		<Button v-if="store.site" size="sm" variant="subtle" :loading="$resources.erp.loading" @click="openErp">
			<template #prefix><LucideDatabase class="h-3.5 w-3.5" /></template>
			ERPNext
		</Button>
	</div>
</template>

<script>
import { Button } from 'frappe-ui';
import { toast } from 'vue-sonner';
import { getToastErrorMessage } from '../utils/toast';

export default {
	name: 'MondayStoreLinks',
	components: { Button },
	props: { store: { type: Object, required: true } },
	computed: {
		// a live custom domain is the shop's main address (the store admin stays on <slug>-shop)
		shopHost() {
			return this.store.custom_domain_status === 'Active' ? this.store.custom_domain : this.store.address;
		},
	},
	resources: {
		admin() {
			return { url: 'press.api.mondaypos_storefront.open_admin', onError: (e) => toast.error(getToastErrorMessage(e)) };
		},
		erp() {
			return { url: 'press.api.mondaypos_storefront.open_erp', onError: (e) => toast.error(getToastErrorMessage(e)) };
		},
	},
	methods: {
		// the tab is opened before the request, so pop-up blockers allow it
		openAdmin() {
			const w = window.open('about:blank', '_blank');
			this.$resources.admin.submit({ name: this.store.name }).then((url) => (url ? (w.location = url) : w.close())).catch(() => w.close());
		},
		openErp() {
			const w = window.open('about:blank', '_blank');
			this.$resources.erp.submit({ name: this.store.name }).then((url) => (url ? (w.location = url) : w.close())).catch(() => w.close());
		},
	},
};
</script>
