<template>
	<MondayPlanCards v-model="currentPlan" :plans="plans" />
</template>

<script>
import PlansCards from './PlansCards.vue';
import MondayPlanCards from './MondayPlanCards.vue';
import { getPlans } from '../data/plans';

export default {
	name: 'SitePlansCards',
	props: [
		'modelValue',
		'isPrivateBenchSite',
		'isDedicatedServerSite',
		'serverPlanPrice',
		'serverSupportQuotaAvailable',
		'selectedCluster',
		'selectedApps',
		'selectedVersion',
		'selectedProvider',
		'hideRestrictedPlans',
		'benchType',
	],
	emits: ['update:modelValue'],
	components: {
		PlansCards,
		MondayPlanCards,
	},
	computed: {
		currentPlan: {
			get() {
				return this.modelValue;
			},
			set(value) {
				this.$emit('update:modelValue', value);
			},
		},
		plans() {
			let plans = getPlans();

			if (this.isPrivateBenchSite) {
				plans = plans.filter((plan) => plan.private_benches);
			}
			// MondaySys: New Site "Select Bench" (private = plans that create the site's own bench)
			if (this.benchType === 'private') {
				plans = plans.filter((plan) => plan.private_bench_support);
			} else if (this.benchType === 'shared') {
				plans = plans.filter((plan) => !plan.private_bench_support);
			}
			if (this.isDedicatedServerSite) {
				plans = plans.filter(
					(plan) =>
						plan.dedicated_server_plan &&
						(!plan.restrict_based_on_dedicated_server_plan ||
							this.serverPlanPrice >= plan.minimum_server_price_usd),
				);
			} else {
				plans = plans.filter((plan) => !plan.dedicated_server_plan);
			}
			if (this.selectedCluster) {
				plans = plans.map((plan) => {
					return {
						...plan,
						disabled:
							plan.disabled ||
							(plan.clusters.length == 0
								? false
								: !plan.clusters.includes(this.selectedCluster)),
					};
				});
			}
			if (this.selectedApps) {
				plans = plans.map((plan) => {
					return {
						...plan,
						disabled:
							plan.disabled ||
							(plan.allowed_apps.length == 0
								? false
								: !this.selectedApps.every((app) =>
										plan.allowed_apps.includes(app.app),
									)),
					};
				});
			}
			if (this.selectedVersion) {
				plans = plans.map((plan) => {
					return {
						...plan,
						disabled:
							plan.disabled ||
							(plan.bench_versions.length == 0
								? false
								: !plan.bench_versions.includes(this.selectedVersion)),
					};
				});
			}
			if (this.hideRestrictedPlans) {
				plans = plans.filter((plan) => !plan.restricted_plan);
			}
			if (this.selectedProvider) {
				const provider = ['Generic', 'Scaleway'].includes(this.selectedProvider)
					? 'AWS EC2'
					: this.selectedProvider;

				plans = plans.map((plan) => {
					return {
						...plan,
						disabled:
							plan.disabled ||
							(plan.cloud_providers && plan.cloud_providers.length > 0
								? !plan.cloud_providers.includes(provider)
								: false),
					};
				});
			}

			plans = plans.filter((plan) => !plan.disabled);
			// MondaySys: $0 staff plans would tie on price. Order: Trial, then tiers by CPU allowance
			// (Lite -> Business -> Growth -> Enterprise), internal staff plans last.
			const isInternal = (plan) => /internal/i.test(plan.name);
			plans = [...plans].sort(
				(a, b) =>
					isInternal(a) - isInternal(b) ||
					(b.is_trial_plan || 0) - (a.is_trial_plan || 0) ||
					a.price_usd - b.price_usd ||
					a.cpu_time_per_day - b.cpu_time_per_day,
			);

			return plans.map((plan) => {
				return {
					...plan,
					sublabel: plan.plan_description || null,
					features: [
						{
							label: `${this.$format.plural(
								plan.cpu_time_per_day,
								'compute hour',
								'compute hours',
							)} / day`,
							condition: !plan.name.includes('Unlimited'),
							value: plan.cpu_time_per_day,
						},
						{
							label: 'Database',
							condition: !plan.name.includes('Unlimited'),
							value: this.$format.bytes(plan.max_database_usage, 1, 2),
						},
						{
							label: 'Disk',
							condition: !plan.name.includes('Unlimited'),
							value: this.$format.bytes(plan.max_storage_usage, 1, 2),
						},
						{
							value: plan.name.includes('Unlimited - Low')
								? 'Allocate fewer resources here (more for other benches)'
								: '',
						},
						{
							value: plan.support_included ? 'Product Warranty' : '',
						},
						{
							value: plan.database_access ? 'Database Access' : '',
						},
						{
							value: plan.offsite_backups ? 'Offsite Backups' : '',
						},
						{
							value: plan.monitor_access ? 'Advanced Monitoring' : '',
						},
					].filter((feature) => feature.condition ?? true),
				};
			});
		},
	},
	watch: {
		plans: {
			immediate: true,
			handler: function (plans) {
				if (!this.isDedicatedServerSite) return;

				if (!plans.length) return;

				const bestPlan = this.getBestDedicatedSitePlan();

				if (bestPlan) {
					this.currentPlan = bestPlan;
				}
			},
		},
	},
	methods: {
		// Currently best plan is determined based on warranty and CPU time only (may change later)
		getBestDedicatedSitePlan() {
			let filteredPlans = this.plans;

			if (this.serverSupportQuotaAvailable) {
				filteredPlans = filteredPlans.filter((plan) => plan.support_included);
			}

			const bestPlan = filteredPlans.reduce((best, curr) => {
				return parseFloat(curr.cpu_time_per_day) >
					parseFloat(best.cpu_time_per_day)
					? curr
					: best;
			});

			return bestPlan;
		},
	},
};
</script>
