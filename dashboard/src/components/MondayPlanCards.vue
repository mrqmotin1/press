<template>
	<!-- MondaySys: site plan cards. The plan description "৳3,500/mo per outlet · 3 terminals · 3,000 products"
	     is shown as a price line plus details, so long text wraps instead of overlapping. -->
	<div class="@container" v-if="plans.length">
		<div class="grid grid-cols-1 gap-3 @sm:grid-cols-2 @xl:grid-cols-3">
			<button
				v-for="plan in cards"
				:key="plan.name"
				type="button"
				class="group relative flex flex-col rounded-lg border bg-surface-white p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
				:class="[
					isSelected(plan)
						? 'border-outline-gray-5 ring-1 ring-gray-900'
						: 'border-outline-gray-2 hover:border-outline-gray-3 hover:bg-surface-gray-1',
					{ 'pointer-events-none opacity-50': plan.disabled },
				]"
				:aria-pressed="isSelected(plan)"
				@click="$emit('update:modelValue', plan)"
			>
				<div class="flex items-start justify-between gap-2">
					<span class="text-base font-semibold leading-snug text-ink-gray-9">
						{{ plan.plan_title || plan.name }}
					</span>
					<span
						class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
						:class="
							isSelected(plan)
								? 'border-gray-900 bg-gray-900 text-white'
								: 'border-outline-gray-3'
						"
						aria-hidden="true"
					>
						<lucide-check v-if="isSelected(plan)" class="h-3 w-3" />
					</span>
				</div>

				<Badge
					v-if="plan.badge"
					class="mt-2 w-fit"
					:label="plan.badge.label"
					:theme="plan.badge.theme"
				/>

				<div class="mt-3">
					<div v-if="plan.priceMain" class="flex flex-wrap items-baseline gap-x-1">
						<span class="text-xl font-semibold tracking-tight text-ink-gray-9">
							{{ plan.priceMain }}
						</span>
						<span v-if="plan.priceUnit" class="text-sm text-ink-gray-6">
							{{ plan.priceUnit }}
						</span>
					</div>
					<p v-if="plan.meta" class="mt-1 text-sm leading-snug text-ink-gray-6">
						{{ plan.meta }}
					</p>
				</div>

				<ul class="mt-4 space-y-1.5 border-t border-outline-gray-1 pt-3">
					<li
						v-for="feature in plan.featureList"
						:key="feature"
						class="flex items-start gap-2 text-sm text-ink-gray-8"
					>
						<lucide-check class="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-gray-5" />
						<span>{{ feature }}</span>
					</li>
				</ul>
			</button>
		</div>
	</div>
	<div v-else class="flex h-6 items-center">
		<div class="text-base text-ink-gray-6">No plans available</div>
	</div>
</template>

<script>
import { Badge } from 'frappe-ui';

const UNLIMITED_HOURS = 1000;

export default {
	name: 'MondayPlanCards',
	components: { Badge },
	props: {
		modelValue: { type: [String, Object, Number, Boolean], default: null },
		plans: { type: Array, default: () => [] },
	},
	emits: ['update:modelValue'],
	computed: {
		cards() {
			return this.plans.map((plan) => ({
				...plan,
				...this.price(plan),
				badge: this.badge(plan),
				featureList: this.features(plan),
			}));
		},
	},
	methods: {
		isSelected(plan) {
			return this.modelValue?.name === plan.name;
		},
		price(plan) {
			// "৳3,500/mo per outlet · 3 terminals · 3,000 products"
			const parts = (plan.plan_description || '').split('·').map((p) => p.trim()).filter(Boolean);
			const first = parts[0] || '';
			const money = first.match(/^([^\s/]*\d[\d,.]*)\s*(\/.*)?$/);
			if (money) {
				return {
					priceMain: money[1],
					priceUnit: (money[2] || '').trim(),
					meta: parts.slice(1).join(' · '),
				};
			}
			if (parts.length > 1) {
				return { priceMain: first, priceUnit: '', meta: parts.slice(1).join(' · ') };
			}
			if (plan.price_usd) return { priceMain: `$${plan.price_usd}`, priceUnit: '/mo', meta: first };
			return { priceMain: '', priceUnit: '', meta: first };
		},
		badge(plan) {
			if (/internal/i.test(plan.name)) return { label: 'Staff only', theme: 'gray' };
			if (plan.is_trial_plan) return { label: 'Free trial', theme: 'blue' };
			if (plan.private_bench_support) return { label: 'Own private bench', theme: 'green' };
			if (plan.bench_versions?.length) return { label: 'Priority bench', theme: 'orange' };
			if (/business/i.test(plan.name)) return { label: 'Most popular', theme: 'red' };
			return null;
		},
		features(plan) {
			const hours = Number(plan.cpu_time_per_day || 0);
			const list = [
				hours >= UNLIMITED_HOURS
					? 'Unlimited compute'
					: `${hours} ${hours === 1 ? 'hour' : 'hours'} compute / day`,
				`${this.$format.bytes(plan.max_database_usage, 1, 2)} database`,
				`${this.$format.bytes(plan.max_storage_usage, 1, 2)} file storage`,
			];
			if (plan.offsite_backups) list.push('Off-site backups');
			if (plan.database_access) list.push('Database access');
			if (plan.monitor_access) list.push('Advanced monitoring');
			if (plan.support_included) list.push('Product warranty');
			return list;
		},
	},
};
</script>
