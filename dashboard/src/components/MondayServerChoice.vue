<template>
	<!-- MondaySys: staff choose the server explicitly (mondaypos_press.server_choice). Hidden for others. -->
	<div v-if="servers.length" class="flex flex-col">
		<h2 class="text-base font-medium leading-6 text-ink-gray-9">Select Server</h2>
		<div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
			<button
				type="button"
				:class="cardClass(!modelValue)"
				@click="$emit('update:modelValue', null)"
			>
				<span class="text-sm font-medium text-ink-gray-9">Automatic</span>
				<span class="mt-1 text-p-sm text-ink-gray-6">
					Mondaysys Cloud picks the server marked for new
					{{ group ? 'sites' : 'benches' }}.
				</span>
			</button>
			<button
				v-for="s in servers"
				:key="s.name"
				type="button"
				:class="cardClass(modelValue === s.name)"
				@click="$emit('update:modelValue', s.name)"
			>
				<span class="flex items-center gap-2 text-sm font-medium text-ink-gray-9">
					{{ s.title }}
					<Badge v-if="s.default" label="Default" theme="gray" />
				</span>
				<span class="mt-1 text-p-sm text-ink-gray-6">
					{{ details(s) }}
				</span>
			</button>
		</div>
	</div>
</template>

<script>
import { Badge } from 'frappe-ui';

export default {
	name: 'MondayServerChoice',
	components: { Badge },
	props: {
		modelValue: { type: String, default: null },
		cluster: { type: String, default: null },
		group: { type: String, default: null },
	},
	emits: ['update:modelValue'],
	resources: {
		servers() {
			return {
				url: 'mondaypos_press.server_choice.get_servers',
				params: { cluster: this.cluster, group: this.group },
				auto: Boolean(this.cluster),
			};
		},
	},
	computed: {
		servers() {
			return this.$resources.servers.data || [];
		},
	},
	watch: {
		cluster() {
			this.refresh();
		},
		group() {
			this.refresh();
		},
	},
	methods: {
		refresh() {
			this.$emit('update:modelValue', null);
			if (this.cluster) {
				this.$resources.servers.submit({ cluster: this.cluster, group: this.group });
			}
		},
		cardClass(selected) {
			return [
				selected
					? 'border-outline-gray-5 ring-1 ring-gray-900 hover:bg-surface-gray-2'
					: 'bg-surface-white text-ink-gray-9 hover:bg-surface-gray-1',
				'flex w-full flex-col items-start rounded border p-3 text-left',
			];
		},
		details(s) {
			const parts = [];
			if (s.ip) parts.push(s.ip);
			if (s.vcpu) parts.push(`${s.vcpu} vCPU`);
			if (s.memory_gb) parts.push(`${s.memory_gb} GB RAM`);
			parts.push(`${s.sites} ${s.sites === 1 ? 'site' : 'sites'}`);
			return parts.join(' · ');
		},
	},
};
</script>
