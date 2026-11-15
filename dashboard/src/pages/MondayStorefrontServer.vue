<template>
	<!-- MondaySys: one storefront server (staff): health, actions, backups (restore), jobs (live log), stores. -->
	<div class="flex flex-col">
		<Header class="bg-surface-white">
			<Breadcrumbs
				:items="[
					{ label: 'Online Stores', route: { name: 'Online Stores' } },
					{ label: name, route: { name: 'Online Store Server', params: { name } } },
				]"
			/>
			<div class="flex gap-2">
				<Button variant="subtle" :loading="busy === 'backup'" @click="act('backup')">Backup now</Button>
				<Button variant="subtle" @click="deployDialog = true">Deploy</Button>
				<Button variant="subtle" :loading="busy === 'restart'" @click="confirmRestart = true">Restart</Button>
				<Button variant="subtle" :loading="$resources.logs.loading" @click="showLogs">Logs</Button>
			</div>
		</Header>

		<div v-if="d" class="mx-auto w-full max-w-6xl space-y-6 p-5">
			<div class="rounded border border-outline-gray-1 p-4">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold text-ink-gray-9">{{ d.server.title }}</h2>
						<p class="text-sm text-ink-gray-5">{{ d.server.ip }} · {{ d.server.region }}</p>
					</div>
					<Badge :label="d.server.status" :theme="{ Active: 'green', Broken: 'red', Retired: 'gray' }[d.server.status]" />
				</div>
				<p class="mt-2 text-sm" :class="d.server.health === 'OK' ? 'text-ink-green-3' : 'text-ink-red-4'">
					Health: {{ d.server.health || 'not checked yet' }}
					<span class="text-ink-gray-5">· checked {{ ago(d.server.last_health) }}</span>
				</p>
				<dl class="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
					<div><dt class="text-ink-gray-5">Disk</dt><dd>{{ d.server.disk_used ?? '—' }}%</dd></div>
					<div><dt class="text-ink-gray-5">Memory</dt><dd>{{ d.server.memory_used ?? '—' }}%</dd></div>
					<div><dt class="text-ink-gray-5">Node</dt><dd>{{ d.server.node_version || '—' }}</dd></div>
					<div><dt class="text-ink-gray-5">Release</dt><dd class="font-mono">{{ d.server.deployed_commit || '—' }}</dd></div>
					<div><dt class="text-ink-gray-5">Last backup</dt><dd>{{ ago(d.server.last_backup) }}</dd></div>
					<div><dt class="text-ink-gray-5">Config copy</dt><dd>{{ ago(d.server.config_saved_on) }}</dd></div>
				</dl>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<section>
					<h3 class="mb-2 text-base font-semibold text-ink-gray-9">Jobs</h3>
					<div class="rounded border border-outline-gray-1">
						<button
							v-for="j in d.jobs"
							:key="j.name"
							class="flex w-full items-center justify-between border-b border-outline-gray-1 px-3 py-2 text-left text-sm last:border-0 hover:bg-surface-gray-1"
							@click="openJob(j.name)"
						>
							<span>
								<span class="font-medium text-ink-gray-9">{{ j.action }}</span>
								<span class="text-ink-gray-5"> · {{ ago(j.creation) }} · {{ j.owner }}</span>
							</span>
							<Badge :label="j.status" :theme="jobTheme(j.status)" />
						</button>
						<p v-if="!d.jobs.length" class="px-3 py-4 text-sm text-ink-gray-5">No jobs yet.</p>
					</div>
				</section>

				<section>
					<h3 class="mb-2 text-base font-semibold text-ink-gray-9">Backups <span class="font-normal text-ink-gray-5">(nightly 02:30 + before each deploy, restore and move)</span></h3>
					<div class="rounded border border-outline-gray-1">
						<div
							v-for="b in d.backups"
							:key="b.name"
							class="flex items-center justify-between border-b border-outline-gray-1 px-3 py-2 text-sm last:border-0"
						>
							<span>
								<span class="font-medium text-ink-gray-9">{{ time(b.started).format('D MMM, HH:mm') }}</span>
								<span class="text-ink-gray-5"> · {{ b.kind }} · {{ size(b.size_bytes) }}</span>
								<span v-if="b.error" class="block text-ink-red-4">{{ b.error }}</span>
							</span>
							<span class="flex items-center gap-2">
								<Badge :label="b.status" :theme="jobTheme(b.status)" />
								<Button v-if="b.status === 'Success'" size="sm" variant="subtle" @click="restoreTarget = b">Restore</Button>
							</span>
						</div>
						<p v-if="!d.backups.length" class="px-3 py-4 text-sm text-ink-gray-5">No backups yet.</p>
					</div>
				</section>
			</div>

			<section>
				<h3 class="mb-2 text-base font-semibold text-ink-gray-9">Stores on this server</h3>
				<div class="rounded border border-outline-gray-1">
					<div v-for="s in d.stores" :key="s.name" class="flex items-center justify-between border-b border-outline-gray-1 px-3 py-2 text-sm last:border-0">
						<router-link :to="{ name: 'Online Store', params: { name: s.name } }" class="font-medium text-ink-gray-9 hover:underline">
							{{ s.title }} <span class="font-normal text-ink-gray-5">· {{ s.address }}</span>
						</router-link>
						<Badge :label="s.state" />
					</div>
				</div>
			</section>
		</div>
		<p v-else class="p-5 text-ink-gray-5">{{ $resources.server.error ? 'Could not load this server.' : 'Loading…' }}</p>

		<!-- deploy -->
		<Dialog v-model="deployDialog" :options="{ title: 'Deploy the storefront' }">
			<template #body-content>
				<p class="mb-3 text-p-base text-ink-gray-7">
					A backup is taken first. If the build or the health check fails, the current release keeps running.
				</p>
				<FormControl label="Branch or commit" v-model="ref" />
			</template>
			<template #actions>
				<Button variant="solid" class="w-full" :loading="busy === 'deploy'" @click="act('deploy', { ref }); deployDialog = false">Deploy {{ ref }}</Button>
			</template>
		</Dialog>

		<!-- restart -->
		<Dialog v-model="confirmRestart" :options="{ title: 'Restart the storefront?' }">
			<template #body-content>
				<p class="text-p-base text-ink-gray-7">Every shop on {{ name }} pauses for a few seconds.</p>
			</template>
			<template #actions>
				<Button variant="solid" class="w-full" @click="act('restart'); confirmRestart = false">Restart</Button>
			</template>
		</Dialog>

		<!-- restore -->
		<Dialog :modelValue="Boolean(restoreTarget)" @update:modelValue="restoreTarget = null" :options="{ title: 'Restore this backup?' }">
			<template #body-content>
				<p v-if="restoreTarget" class="text-p-base text-ink-gray-7">
					Every store on {{ name }} goes back to {{ time(restoreTarget.started).format('D MMM YYYY, HH:mm') }}.
					Design, pages and menus changed since then are lost; orders are safe in each shop's ERPNext.
					A backup of the current state is taken first, and the shops pause for a few seconds.
				</p>
			</template>
			<template #actions>
				<Button variant="solid" theme="red" class="w-full" :loading="$resources.restore.loading" @click="restore">Restore</Button>
			</template>
		</Dialog>

		<!-- job log / server log -->
		<Dialog v-model="logDialog" :options="{ title: logTitle, size: '4xl' }">
			<template #body-content>
				<pre class="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded bg-surface-gray-1 p-3 font-mono text-xs text-ink-gray-8">{{ logText }}</pre>
				<div v-if="jobOpen && jobOpen.status === 'Failed'" class="mt-3">
					<Button variant="solid" @click="resume(jobOpen.name)">Resume this job</Button>
				</div>
			</template>
		</Dialog>
	</div>
</template>

<script>
import { Badge, Breadcrumbs, Button, Dialog, FormControl } from 'frappe-ui';
import { toast } from 'vue-sonner';
import Header from '../components/Header.vue';
import { serverTime } from '../utils/mondayTime';
import { getToastErrorMessage } from '../utils/toast';

export default {
	name: 'MondayStorefrontServer',
	components: { Badge, Breadcrumbs, Button, Dialog, FormControl, Header },
	props: { name: { type: String, required: true } },
	data() {
		return { busy: null, ref: 'develop', deployDialog: false, confirmRestart: false, restoreTarget: null, logDialog: false,
			logTitle: '', logText: '', jobOpen: null, timer: null };
	},
	resources: {
		server() {
			return { url: 'press.api.mondaypos_storefront.server', params: { name: this.name }, auto: true };
		},
		action() {
			return { url: 'press.api.mondaypos_storefront.server_action', onError: (e) => toast.error(getToastErrorMessage(e)) };
		},
		restore() {
			return { url: 'press.api.mondaypos_storefront.restore', onError: (e) => toast.error(getToastErrorMessage(e)) };
		},
		job() {
			return { url: 'press.api.mondaypos_storefront.job' };
		},
		resumeJob() {
			return { url: 'press.api.mondaypos_storefront.resume_job', onError: (e) => toast.error(getToastErrorMessage(e)) };
		},
		logs() {
			return { url: 'press.api.mondaypos_storefront.server_logs', onError: (e) => toast.error(getToastErrorMessage(e)) };
		},
	},
	computed: {
		d() {
			return this.$resources.server.data;
		},
		running() {
			return (this.d?.jobs || []).some((j) => ['Queued', 'Running'].includes(j.status));
		},
	},
	// watched from mounted: a `watch:` option runs before frappe-ui sets up $resources (in created), and its
	// $resources computed would then stay cached as undefined
	mounted() {
		this.$watch(
			'running',
			(on) => {
				clearInterval(this.timer);
				if (on) this.timer = setInterval(() => this.$resources.server.reload(), 5000);
			},
			{ immediate: true },
		);
	},
	unmounted() {
		clearInterval(this.timer);
	},
	methods: {
		act(action, extra = {}) {
			this.busy = action;
			this.$resources.action
				.submit({ name: this.name, action, ...extra })
				.then((job) => {
					toast.success(`${action[0].toUpperCase() + action.slice(1)} started`);
					this.$resources.server.reload();
					if (job) this.openJob(job);
				})
				.finally(() => (this.busy = null));
		},
		restore() {
			this.$resources.restore.submit({ backup: this.restoreTarget.name }).then((job) => {
				this.restoreTarget = null;
				this.$resources.server.reload();
				if (job) this.openJob(job);
			});
		},
		openJob(name) {
			this.jobOpen = null;
			this.logTitle = `Job ${name}`;
			this.logText = 'Loading…';
			this.logDialog = true;
			const load = () =>
				this.$resources.job.submit({ name }).then((j) => {
					this.jobOpen = j;
					this.logTitle = `${j.action} · ${j.status}${j.current_step ? ' · ' + j.current_step : ''}`;
					this.logText = j.log || '(waiting to start)';
					if (this.logDialog && ['Queued', 'Running'].includes(j.status)) setTimeout(load, 3000);
					else this.$resources.server.reload();
				});
			load();
		},
		resume(name) {
			this.$resources.resumeJob.submit({ name }).then(() => this.openJob(name));
		},
		showLogs() {
			this.$resources.logs.submit({ name: this.name, lines: 300 }).then((text) => {
				this.jobOpen = null;
				this.logTitle = `Storefront log · ${this.name}`;
				this.logText = text || '(empty)';
				this.logDialog = true;
			});
		},
		jobTheme(s) {
			return { Success: 'green', Failed: 'red', Running: 'blue', Queued: 'blue', Expired: 'gray' }[s] || 'gray';
		},
		ago(ts) {
			return ts ? serverTime(ts).fromNow() : 'never';
		},
		time(ts) {
			return serverTime(ts);
		},
		size(b) {
			if (!b) return '—';
			return b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
		},
	},
};
</script>
