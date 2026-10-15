<template>
	<Dialog
		v-model="show"
		:options="{
			title: 'Install app on your site',
			size: '4xl',
		}"
	>
		<template #body-content>
			<!-- MondaySys: one app install at a time per site; buttons stay locked until it finishes -->
			<div
				v-if="appJob"
				class="mb-4 flex items-center gap-2 rounded bg-surface-gray-2 p-3 text-sm text-ink-gray-8"
			>
				<lucide-loader class="h-4 w-4 animate-spin" />
				<span>
					{{ appJob.app }} is being {{ appJob.uninstall ? 'removed' : 'installed' }} on this site.
					You can install another app when it finishes.
				</span>
			</div>
			<BranchAppsSection
				:site="site"
				:locked="!!appJob"
				@started="(app) => lock(app)"
				@installed="$emit('installed')"
			/>
			<ObjectList :options="listOptions" />
		</template>
	</Dialog>
</template>

<script>
import { call, getCachedDocumentResource } from 'frappe-ui';
import { defineAsyncComponent, h } from 'vue';
import { toast } from 'vue-sonner';
import { renderDialog } from '../../utils/components';
import router from '../../router';
import ObjectList from '../ObjectList.vue';
import BranchAppsSection from './BranchAppsSection.vue';
import { getToastErrorMessage } from '../../utils/toast';

export default {
	props: {
		site: {
			type: String,
			required: true,
		},
	},
	emits: ['installed'],
	components: {
		ObjectList,
		BranchAppsSection,
	},
	data() {
		return {
			show: true,
			appJob: null,
			appJobTimer: null,
		};
	},
	mounted() {
		this.refreshAppJob();
		this.appJobTimer = setInterval(this.refreshAppJob, 5000);
	},
	beforeUnmount() {
		clearInterval(this.appJobTimer);
	},
	methods: {
		lock(app) {
			this.appJob = { app: app || 'An app', uninstall: false };
			this.lockedAt = Date.now();
		},
		async refreshAppJob() {
			try {
				const job = await call('mondaypos_press.conflicts.get_running_app_job', { site: this.site });
				// keep a click's lock until the server has registered the job (or 10 s pass)
				if (!job && this.appJob && Date.now() - (this.lockedAt || 0) < 10000) return;
				if (JSON.stringify(job || null) !== JSON.stringify(this.appJob)) this.appJob = job || null;
			} catch (e) {
				// keep the current state; the server-side guard still refuses a second install
			}
		},
	},
	computed: {
		$site() {
			return getCachedDocumentResource('Site', this.site);
		},
		listOptions() {
			const handleInstall = (row) => {
				if (this.$site.installApp.loading || this.appJob) return;
				this.lock(row.title || row.app_title || row.app);

				if (
					row.plans &&
					row.plans.some((plan) => plan.price_inr > 0) &&
					row.team !== this.$site.doc?.team
				) {
					this.show = false;

					let SiteAppPlanSelectDialog = defineAsyncComponent(
						() => import('./SiteAppPlanSelectDialog.vue'),
					);

					renderDialog(
						h(SiteAppPlanSelectDialog, {
							app: row,
							currentPlan: null,
							onPlanSelected: (plan) => {
								toast.promise(
									this.$site.installApp.submit({
										app: row.app,
										plan: plan.name,
									}),
									{
										loading: 'Installing app...',
										success: (jobId) => {
											router.push({
												name: 'Site Job',
												params: {
													name: this.site,
													id: jobId,
												},
											});
											this.$emit('installed');
											this.show = false;
											return 'App will be installed shortly';
										},
										error: (e) => {
								this.appJob = null;
								return getToastErrorMessage(e);
							},
									},
								);
							},
						}),
					);
				} else {
					toast.promise(
						this.$site.installApp.submit({
							app: row.app,
						}),
						{
							loading: 'Installing app...',
							success: (jobId) => {
								router.push({
									name: 'Site Job',
									params: {
										name: this.site,
										id: jobId,
									},
								});
								this.$emit('installed');
								this.show = false;
								return 'App will be installed shortly';
							},
							error: (e) => {
								this.appJob = null;
								return getToastErrorMessage(e);
							},
						},
					);
				}
			};
			return {
				label: 'App',
				fieldname: 'app',
				fieldtype: 'ListSelection',
				// MondaySys: apps the plan or installed apps rule out are hidden (mondaypos_press.install_filter)
				emptyStateMessage:
					'No more apps can be installed on this site. Other apps need a different plan, or conflict with an installed app' +
					(!this.$site.doc?.group_public
						? '. Apps not on this bench can be added from the bench.'
						: '.'),
				columns: [
					{
						label: 'Title',
						fieldname: 'title',
						class: 'font-medium',
						width: 2,
						format: (value, row) => value || row.app_title,
					},
					{
						label: 'Repo',
						fieldname: 'repository_owner',
						class: 'text-ink-gray-6',
						width: '10rem',
					},
					{
						label: 'Branch',
						fieldname: 'branch',
						class: 'text-ink-gray-6',
						width: '10rem',
					},
					{
						label: '',
						fieldname: '',
						align: 'right',
						type: 'Button',
						width: '5rem',
						Button({ row }) {
							return {
								label: 'Install',
								disabled: !!this.appJob,
								onClick: () => {
									handleInstall(row);
								},
							};
						},
					},
				],
				resource: () => {
					return {
						url: 'press.api.site.available_apps',
						params: {
							name: this.site,
						},
						auto: true,
					};
				},
			};
		},
	},
};
</script>
