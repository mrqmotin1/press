<template>
	<!-- MondayPOS: choose an app's git branch at install time (mondaypos_press.branch_install) -->
	<div v-if="rows.length" class="mb-6 rounded-lg border border-outline-gray-2 p-4">
		<div class="mb-1 text-base font-medium text-ink-gray-8">Choose a branch</div>
		<div class="mb-3 text-sm text-ink-gray-6">
			The default branch installs right away. Another branch moves the site to a bench
			with that branch (backup first); the first install of a new branch also builds it
			(20–60 min).
		</div>
		<div
			v-for="row in rows"
			:key="row.app"
			class="flex flex-wrap items-center gap-3 border-b border-outline-gray-1 py-2 last:border-0"
		>
			<div class="w-40 text-base font-medium text-ink-gray-8">{{ row.title }}</div>
			<div class="w-56 text-sm text-ink-gray-6">
				{{ row.installed ? 'Installed' : 'Not installed' }}
				<span v-if="row.current_branch"> · bench: {{ row.current_branch }}</span>
			</div>
			<select
				v-model="choice[row.app]"
				:disabled="!row.can_choose || !!busy"
				class="form-select min-w-48 flex-1 rounded border-outline-gray-2 bg-surface-white text-sm text-ink-gray-8"
			>
				<option v-for="b in branches[row.app] || [row.default_branch]" :key="b" :value="b">
					{{ b }}{{ b === row.default_branch ? ' (default)' : '' }}
				</option>
			</select>
			<Button
				variant="solid"
				:loading="busy === row.app"
				:disabled="isCurrent(row) || !!pending || locked || !!busy"
				@click="install(row)"
			>
				{{ actionLabel(row) }}
			</Button>
		</div>
		<div v-if="status" class="mt-3 rounded bg-surface-gray-2 p-3 text-sm text-ink-gray-7">
			<div class="font-medium">
				{{ status.app }} → {{ status.branch }}: {{ status.status }}
				<span v-if="status.current_step"> ({{ status.current_step }})</span>
			</div>
			<div v-if="status.target_group" class="text-ink-gray-6">Bench group: {{ status.target_group }}</div>
			<pre class="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{{ status.log }}</pre>
		</div>
	</div>
</template>

<script>
import { Button, call } from 'frappe-ui';
import { toast } from 'vue-sonner';
import { getToastErrorMessage } from '../../utils/toast';

const API = 'mondaypos_press.branch_install.';

export default {
	name: 'BranchAppsSection',
	props: { site: { type: String, required: true }, locked: { type: Boolean, default: false } },
	emits: ['installed', 'started'],
	components: { Button },
	data() {
		return { rows: [], branches: {}, choice: {}, busy: null, pending: null, status: null, timer: null };
	},
	mounted() {
		this.load();
	},
	beforeUnmount() {
		clearInterval(this.timer);
	},
	methods: {
		async load() {
			try {
				this.rows = await call(API + 'get_branch_apps', { site: this.site });
			} catch (e) {
				this.rows = []; // mondaypos_press not available: keep the stock dialog
				return;
			}
			for (const row of this.rows) {
				this.choice[row.app] = row.current_branch || row.default_branch;
				if (row.can_choose) {
					call(API + 'get_app_branches', { site: this.site, app: row.app })
						.then((r) => (this.branches[row.app] = r.branches))
						.catch(() => {});
				}
				if (row.pending_request) this.watch(row.pending_request);
			}
		},
		isCurrent(row) {
			return row.installed && this.choice[row.app] === row.current_branch;
		},
		actionLabel(row) {
			if (!row.installed) return 'Install';
			return this.isCurrent(row) ? 'Installed' : 'Switch branch';
		},
		async install(row) {
			if (this.busy || this.locked) return;
			this.busy = row.app;
			this.$emit('started', row.title);
			try {
				const res = await call(API + 'install_app_branch', {
					site: this.site,
					app: row.app,
					branch: this.choice[row.app],
				});
				if (res.job) {
					toast.success('App will be installed shortly');
					this.$emit('installed');
				} else if (res.request) {
					toast.success('Branch install started - you can close this dialog');
					this.watch(res.request);
				}
			} catch (e) {
				toast.error(getToastErrorMessage(e));
			} finally {
				this.busy = null;
			}
		},
		watch(name) {
			this.pending = name;
			clearInterval(this.timer);
			const tick = async () => {
				try {
					this.status = await call(API + 'get_branch_install_status', { name });
				} catch (e) {
					return;
				}
				if (['Completed', 'Failed'].includes(this.status.status)) {
					clearInterval(this.timer);
					this.pending = null;
					if (this.status.status === 'Completed') {
						toast.success(`${this.status.app} is on ${this.status.branch}`);
						this.$emit('installed');
					}
				}
			};
			tick();
			this.timer = setInterval(tick, 10000);
		},
	},
};
</script>
