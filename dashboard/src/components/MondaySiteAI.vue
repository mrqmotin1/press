<template>
	<!-- MondaySys: Site → Mona AI tab (mondaypos_press.ai.site_dashboard via press.api.mondaysys_ai.*). -->
	<div class="mx-auto max-w-4xl space-y-4">
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
				<p v-if="status.blocker" class="mt-4 text-p-base text-ink-gray-7">{{ status.blocker }}</p>
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
					This period's budget is used up, so Mona is paused until the next period.
					The rest of the site works as usual.
				</p>

				<div
					v-if="status.can_manage"
					class="mt-5 flex flex-wrap items-end gap-4 border-t border-outline-gray-1 pt-4"
				>
					<label class="flex items-center gap-3">
						<Switch v-model="enabled" size="md" :disabled="busy" />
						<span class="text-base text-ink-gray-8">{{ enabled ? 'On' : 'Off' }}</span>
					</label>
					<div class="w-40">
						<FormControl type="number" label="Monthly budget (USD)" v-model="budget" :min="1" :disabled="busy" />
					</div>
					<Button variant="solid" :loading="busy" :disabled="!changed" @click="save">Save</Button>
					<p class="w-full text-p-sm text-ink-gray-5">
						Staff only. Switching on installs Mona on the site if needed and gives it
						its own budget-capped key; switching off removes the key.
					</p>
				</div>

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

		<template v-if="status && (status.enabled || status.daily.length)">
			<!-- headline figures -->
			<div class="flex flex-wrap items-center justify-between gap-2 pt-2">
				<h3 class="text-base font-semibold text-ink-gray-9">Usage</h3>
				<div class="flex rounded bg-surface-gray-2 p-0.5" role="group" aria-label="Period">
					<button
						v-for="d in [7, 30]"
						:key="d"
						class="rounded px-3 py-1 text-sm"
						:class="days === d ? 'bg-surface-white text-ink-gray-9 shadow-sm' : 'text-ink-gray-6'"
						@click="setDays(d)"
					>
						Last {{ d }} days
					</button>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded border border-outline-gray-1 p-4 sm:col-span-2">
					<div class="text-p-sm text-ink-gray-5">This 30-day budget period</div>
					<div class="mt-1 flex flex-wrap items-baseline gap-x-2">
						<span class="text-2xl font-semibold tabular-nums text-ink-gray-9">{{ usd(status.spend) }}</span>
						<span class="text-base text-ink-gray-6">of {{ usd(status.budget) }}</span>
					</div>
					<div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-gray-2">
						<div class="h-full rounded-full" :class="usedPct >= 90 ? 'bg-surface-red-5' : 'bg-surface-gray-7'" :style="{ width: usedPct + '%' }" />
					</div>
					<div class="mt-2 text-p-sm text-ink-gray-5">{{ usedPct }}% used</div>
				</div>
				<div class="rounded border border-outline-gray-1 p-4">
					<div class="text-p-sm text-ink-gray-5">Estimated month</div>
					<div class="mt-1 text-2xl font-semibold tabular-nums text-ink-gray-9">{{ usd(status.estimate_month) }}</div>
					<div class="mt-2 text-p-sm text-ink-gray-5">At the last 7 days' rate</div>
				</div>
				<div class="rounded border border-outline-gray-1 p-4">
					<div class="text-p-sm text-ink-gray-5">AI calls</div>
					<div class="mt-1 text-2xl font-semibold tabular-nums text-ink-gray-9">{{ status.calls.toLocaleString() }}</div>
					<div class="mt-2 text-p-sm text-ink-gray-5">
						{{ status.calls ? usd(windowCost / status.calls, 4) + ' a call' : 'None yet' }}
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<!-- spend by task -->
				<div class="rounded border border-outline-gray-1 p-5">
					<h3 class="text-base font-semibold text-ink-gray-9">Spend by task</h3>
					<p class="mt-1 text-p-sm text-ink-gray-5">Last {{ days }} days{{ status.can_manage ? ', split by model' : '' }}.</p>
					<div v-if="status.has_tasks" class="mt-4 space-y-3">
						<div v-for="t in status.tasks" :key="t.task">
							<div class="flex items-baseline justify-between gap-2 text-sm">
								<span class="truncate text-ink-gray-8">{{ t.task }}</span>
								<span class="shrink-0 tabular-nums text-ink-gray-6">{{ usd(t.cost, t.cost < 0.1 ? 4 : 2) }}</span>
							</div>
							<Tooltip :text="taskTip(t)">
								<div class="mt-1 flex h-2.5 overflow-hidden rounded-full bg-surface-gray-2">
									<template v-if="status.can_manage && t.tiers">
										<div
											v-for="tier in tierOrder.filter((x) => t.tiers[x])"
											:key="tier"
											class="h-full"
											:style="{ width: (t.tiers[tier] / maxTask) * 100 + '%', background: tierColor[tier] }"
										/>
									</template>
									<div v-else class="h-full bg-surface-gray-7" :style="{ width: (t.cost / maxTask) * 100 + '%' }" />
								</div>
							</Tooltip>
						</div>
					</div>
					<p v-else class="mt-4 text-p-base text-ink-gray-5">
						The breakdown by task appears after the site's next Mona update.
					</p>
					<div v-if="status.can_manage && status.has_tasks" class="mt-4 flex gap-4 text-p-xs text-ink-gray-6">
						<span v-for="tier in usedTiers" :key="tier" class="flex items-center gap-1.5">
							<span class="h-2 w-2 rounded-sm" :style="{ background: tierColor[tier] }" />{{ tierName[tier] }}
						</span>
					</div>
				</div>

				<!-- daily cost -->
				<div class="rounded border border-outline-gray-1 p-5">
					<h3 class="text-base font-semibold text-ink-gray-9">Daily cost</h3>
					<p class="mt-1 text-p-sm text-ink-gray-5">USD per day. Updated every hour.</p>
					<div class="mt-4 flex h-40 items-end gap-1" role="img" :aria-label="`Daily AI cost, last ${days} days`">
						<Tooltip v-for="d in dayBars" :key="d.date" :text="dayTip(d)">
							<div class="flex h-full flex-1 flex-col justify-end">
								<template v-if="status.can_manage && d.cost">
									<div
										v-for="tier in tierOrder.filter((x) => (d.tiers || {})[x])"
										:key="tier"
										class="w-full first:rounded-t"
										:style="{ height: (d.tiers[tier] / maxCost) * 100 + '%', background: tierColor[tier], minHeight: '2px' }"
									/>
								</template>
								<div
									v-else
									class="w-full rounded-t bg-surface-gray-7"
									:class="d.cost ? '' : 'opacity-20'"
									:style="{ height: Math.max(d.cost ? 3 : 1.5, (d.cost / maxCost) * 100) + '%' }"
								/>
							</div>
						</Tooltip>
					</div>
					<div class="mt-2 flex justify-between text-p-xs text-ink-gray-5">
						<span>{{ formatDay(dayBars[0]?.date) }}</span>
						<span>{{ formatDay(dayBars[dayBars.length - 1]?.date) }}</span>
					</div>
				</div>
			</div>

			<!-- cost per use -->
			<div v-if="status.has_tasks" class="rounded border border-outline-gray-1 p-5">
				<h3 class="text-base font-semibold text-ink-gray-9">Cost per use</h3>
				<p class="mt-1 text-p-sm text-ink-gray-5">Last {{ days }} days. A chat question takes one to three calls.</p>
				<div class="mt-3 overflow-x-auto">
					<table class="w-full text-sm tabular-nums">
						<thead>
							<tr class="border-b border-outline-gray-1 text-left text-p-xs text-ink-gray-5">
								<th class="py-2 pr-3 font-medium">Task</th>
								<th class="py-2 pr-3 text-right font-medium">Calls</th>
								<th class="py-2 pr-3 text-right font-medium">Total</th>
								<th class="py-2 pr-3 text-right font-medium">Per call</th>
								<th class="py-2 pr-3 text-right font-medium">Seconds</th>
								<th v-if="status.can_manage" class="py-2 pr-3 text-right font-medium">Tokens in / out</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="t in status.tasks" :key="t.task" class="border-b border-outline-gray-1 last:border-0">
								<td class="py-2 pr-3 text-ink-gray-8">{{ t.task }}</td>
								<td class="py-2 pr-3 text-right">{{ t.calls.toLocaleString() }}</td>
								<td class="py-2 pr-3 text-right">{{ usd(t.cost, 4) }}</td>
								<td class="py-2 pr-3 text-right">{{ usd(t.per_call, 5) }}</td>
								<td class="py-2 pr-3 text-right">{{ t.seconds.toFixed(1) }}</td>
								<td v-if="status.can_manage" class="py-2 pr-3 text-right">
									{{ (t.tokens_in || 0).toLocaleString() }} / {{ (t.tokens_out || 0).toLocaleString() }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</template>
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
		return {
			enabled: false,
			budget: null,
			days: 30,
			tierOrder: ['Smart', 'Fast', 'Reasoning', 'Other'],
			tierColor: { Smart: '#7c3aed', Fast: '#60a5fa', Reasoning: '#f59e0b', Other: '#9ca3af' },
			tierName: { Smart: 'Smart (Sonnet)', Fast: 'Fast (Haiku)', Reasoning: 'Reasoning (Opus)', Other: 'Other' },
		};
	},
	resources: {
		status() {
			return {
				url: 'press.api.mondaysys_ai.site_status',
				params: { name: this.site, days: this.days },
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
				makeParams: () => ({ name: this.site, enabled: this.enabled ? 1 : 0, monthly_budget_usd: this.budget }),
				onSuccess: () => {
					this.$resources.status.reload();
					toast.success(this.enabled ? 'Mona is on for this site' : 'Mona is off for this site');
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
		windowCost() {
			return (this.status?.daily || []).reduce((s, d) => s + d.cost, 0);
		},
		dayBars() {
			const byDate = Object.fromEntries((this.status?.daily || []).map((d) => [d.date, d]));
			const out = [];
			const end = new Date();
			for (let i = this.days - 1; i >= 0; i--) {
				const d = new Date(end);
				d.setDate(end.getDate() - i);
				const key = d.toISOString().slice(0, 10);
				out.push(byDate[key] || { date: key, calls: 0, cost: 0, tiers: {} });
			}
			return out;
		},
		maxCost() {
			return Math.max(...this.dayBars.map((d) => d.cost), 0.0001);
		},
		maxTask() {
			return Math.max(...(this.status?.tasks || []).map((t) => t.cost), 0.0001);
		},
		usedTiers() {
			const seen = new Set();
			(this.status?.tasks || []).forEach((t) => Object.keys(t.tiers || {}).forEach((k) => seen.add(k)));
			return this.tierOrder.filter((t) => seen.has(t));
		},
	},
	methods: {
		save() {
			this.$resources.save.submit();
		},
		setDays(d) {
			this.days = d; // the status resource's params change, so it fetches again
		},
		usd(v, digits = 2) {
			return '$' + Number(v || 0).toFixed(digits);
		},
		formatDay(date) {
			if (!date) return '';
			return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
		},
		taskTip(t) {
			const parts = [`${t.calls} calls`, `${this.usd(t.per_call, 5)} a call`];
			if (this.status?.can_manage && t.tiers) {
				for (const k of this.tierOrder) if (t.tiers[k]) parts.push(`${this.tierName[k]} ${this.usd(t.tiers[k], 4)}`);
			}
			return parts.join(' · ');
		},
		dayTip(d) {
			const parts = [`${this.formatDay(d.date)}: ${this.usd(d.cost, 4)}`, `${d.calls} calls`];
			if (this.status?.can_manage && d.tiers) {
				for (const k of this.tierOrder) if (d.tiers[k]) parts.push(`${this.tierName[k]} ${this.usd(d.tiers[k], 4)}`);
			}
			return parts.join(' · ');
		},
	},
};
</script>
