<template>
	<!-- MondaySys: Site → Mona AI tab (mondaypos_press.ai.site_dashboard via press.api.mondaysys_ai.*). -->
	<div class="mx-auto max-w-3xl space-y-4">
		<div class="rounded border border-outline-gray-1 p-5">
			<div class="flex items-start gap-3">
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
					style="background: linear-gradient(135deg, #7c3aed, #2563eb)"
				>
					M
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<h2 class="text-lg font-semibold text-ink-gray-9">Mona AI</h2>
						<Badge v-if="status" :label="stateLabel" :theme="stateTheme" />
					</div>
					<p class="mt-1 text-p-base text-ink-gray-6">
						Mona is the AI assistant inside Monday CRM: lead summaries, notes and
						follow-up drafts, a chat that looks up leads and prepares tasks for
						approval, automatic lead rating and lost-reason reports.
					</p>
				</div>
			</div>

			<div v-if="!status" class="mt-4 text-p-base text-ink-gray-5">
				{{ $resources.status.error ? 'Could not load Mona for this site.' : 'Loading…' }}
			</div>

			<template v-else>
				<p v-if="status.blocker" class="mt-4 text-p-base text-ink-gray-7">
					{{ status.blocker }}
				</p>
				<p
					v-else-if="status.install_job && status.install_job.status !== 'Failure'"
					class="mt-4 text-p-base text-ink-gray-7"
				>
					Installing Mona on this site. This takes a few minutes.
				</p>
				<p
					v-else-if="status.install_job && status.install_job.status === 'Failure'"
					class="mt-4 text-p-base text-ink-red-4"
				>
					Installing Mona failed. Check the site's Jobs tab, then switch it on again.
				</p>
				<p v-else-if="status.state === 'budget_used'" class="mt-4 text-p-base text-ink-gray-7">
					This period's budget is used up, so Mona is paused until the next
					period. The rest of the site works as usual.
				</p>

				<!-- staff: switch and budget -->
				<div
					v-if="status.can_manage"
					class="mt-5 flex flex-wrap items-end gap-4 border-t border-outline-gray-1 pt-4"
				>
					<label class="flex items-center gap-3">
						<Switch v-model="enabled" size="md" :disabled="busy" />
						<span class="text-base text-ink-gray-8">{{ enabled ? 'On' : 'Off' }}</span>
					</label>
					<div class="w-40">
						<FormControl
							type="number"
							label="Monthly budget (USD)"
							v-model="budget"
							:min="1"
							:disabled="busy"
						/>
					</div>
					<Button
						variant="solid"
						:loading="busy"
						:disabled="!changed"
						@click="save"
						>Save</Button
					>
					<p class="w-full text-p-sm text-ink-gray-5">
						Staff only. Switching on installs Mona on the site if needed and
						gives it its own budget-capped key; switching off removes the key.
					</p>
				</div>

				<!-- customers: ask for it -->
				<div
					v-else-if="!status.enabled"
					class="mt-5 flex flex-wrap items-center gap-3 border-t border-outline-gray-1 pt-4"
				>
					<Button
						variant="solid"
						:loading="$resources.request.loading"
						:disabled="requested || Boolean(status.blocker)"
						@click="$resources.request.submit()"
						>{{ requested ? 'Requested' : 'Request Mona' }}</Button
					>
					<p class="text-p-sm text-ink-gray-5">
						{{
							requested
								? 'Thanks. Our team will get in touch to switch Mona on.'
								: 'Mona is switched on by our team. Ask for it and we will get in touch.'
						}}
					</p>
				</div>
			</template>
		</div>

		<div v-if="status && (status.enabled || status.daily.length)" class="rounded border border-outline-gray-1 p-5">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h3 class="text-base font-semibold text-ink-gray-9">This period</h3>
				<span class="text-p-sm text-ink-gray-5">30-day budget period</span>
			</div>
			<div class="mt-3 flex flex-wrap items-baseline gap-x-2">
				<span class="text-2xl font-semibold tabular-nums text-ink-gray-9">{{ usd(status.spend) }}</span>
				<span class="text-base text-ink-gray-6">of {{ usd(status.budget) }} budget</span>
			</div>
			<div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-gray-2">
				<div class="h-full rounded-full" :class="usedPct >= 90 ? 'bg-surface-red-5' : 'bg-surface-gray-7'" :style="{ width: usedPct + '%' }" />
			</div>
			<p class="mt-2 text-p-sm text-ink-gray-5">
				{{ usedPct }}% used · {{ status.calls.toLocaleString() }} AI calls in the last
				{{ status.days }} days
			</p>
		</div>

		<div v-if="status && status.daily.length" class="rounded border border-outline-gray-1 p-5">
			<h3 class="text-base font-semibold text-ink-gray-9">Daily cost</h3>
			<p class="mt-1 text-p-sm text-ink-gray-5">Last {{ status.days }} days, USD. Updated every hour.</p>
			<div class="mt-4 flex h-32 items-end gap-1" role="img" :aria-label="`Daily AI cost for the last ${status.days} days`">
				<Tooltip v-for="d in days" :key="d.date" :text="`${formatDay(d.date)}: ${usd(d.cost)} · ${d.calls} calls`">
					<div class="flex h-full flex-1 items-end">
						<div
							class="w-full rounded-t bg-surface-gray-7"
							:class="d.cost ? '' : 'opacity-20'"
							:style="{ height: Math.max(d.cost ? 4 : 2, (d.cost / maxCost) * 100) + '%' }"
						/>
					</div>
				</Tooltip>
			</div>
			<div class="mt-2 flex justify-between text-p-xs text-ink-gray-5">
				<span>{{ formatDay(days[0]?.date) }}</span>
				<span>{{ formatDay(days[days.length - 1]?.date) }}</span>
			</div>
		</div>
	</div>
</template>

<script>
import { Badge, Button, FormControl, Switch, Tooltip } from 'frappe-ui';
import { toast } from 'vue-sonner';
import { getToastErrorMessage } from '../utils/toast';

export default {
	name: 'MondaySiteAI',
	components: { Badge, Button, FormControl, Switch, Tooltip },
	props: { site: { type: String, required: true } },
	data() {
		return { enabled: false, budget: null };
	},
	resources: {
		status() {
			return {
				url: 'press.api.mondaysys_ai.site_status',
				params: { name: this.site },
				auto: true,
				onSuccess: (data) => {
					this.enabled = Boolean(data.enabled);
					this.budget = data.budget || data.default_budget;
				},
			};
		},
		save() {
			return {
				url: 'press.api.mondaysys_ai.set_site',
				makeParams: () => ({
					name: this.site,
					enabled: this.enabled ? 1 : 0,
					monthly_budget_usd: this.budget,
				}),
				onSuccess: (data) => {
					this.$resources.status.setData(data);
					this.enabled = Boolean(data.enabled);
					this.budget = data.budget;
					toast.success(data.enabled ? 'Mona is on for this site' : 'Mona is off for this site');
				},
				onError: (e) => toast.error(getToastErrorMessage(e)),
			};
		},
		request() {
			return {
				url: 'press.api.mondaysys_ai.request_access',
				makeParams: () => ({ name: this.site }),
				onSuccess: () => {
					this.$resources.status.reload();
					toast.success('Request sent');
				},
				onError: (e) => toast.error(getToastErrorMessage(e)),
			};
		},
	},
	computed: {
		status() {
			return this.$resources.status.data;
		},
		busy() {
			return this.$resources.save.loading;
		},
		changed() {
			if (!this.status) return false;
			return Boolean(this.enabled) !== Boolean(this.status.enabled) || Number(this.budget) !== Number(this.status.budget);
		},
		requested() {
			return Boolean(this.status?.requested) || Boolean(this.$resources.request.data?.requested);
		},
		usedPct() {
			if (!this.status?.budget) return 0;
			return Math.min(100, Math.round((this.status.spend / this.status.budget) * 100));
		},
		stateLabel() {
			return { on: 'On', off: 'Off', installing: 'Installing', budget_used: 'Budget used up', error: 'Needs attention' }[this.status.state] || this.status.state;
		},
		stateTheme() {
			return { on: 'green', off: 'gray', installing: 'blue', budget_used: 'orange', error: 'red' }[this.status.state] || 'gray';
		},
		// one bar per day of the window, including days without use
		days() {
			const byDate = Object.fromEntries((this.status?.daily || []).map((d) => [d.date, d]));
			const out = [];
			const end = new Date();
			for (let i = (this.status?.days || 30) - 1; i >= 0; i--) {
				const d = new Date(end);
				d.setDate(end.getDate() - i);
				const key = d.toISOString().slice(0, 10);
				out.push(byDate[key] || { date: key, calls: 0, cost: 0 });
			}
			return out;
		},
		maxCost() {
			return Math.max(...this.days.map((d) => d.cost), 0.0001);
		},
	},
	methods: {
		save() {
			this.$resources.save.submit();
		},
		usd(v) {
			const n = Number(v || 0);
			return '$' + n.toFixed(2);
		},
		formatDay(date) {
			if (!date) return '';
			return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
		},
	},
};
</script>
