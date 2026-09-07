import {
  AlertTriangle,
  Boxes,
  Bug,
  ClipboardList,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
} from 'lucide-react';
import { EnumBarChart } from '../components/dashboard/EnumBarChart';
import { RiskHeatmapGrid } from '../components/dashboard/RiskHeatmapGrid';
import { StatTile } from '../components/dashboard/StatTile';
import { Card, CardHeader } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { Spinner } from '../components/ui/Spinner';
import { useDashboardHeatmap, useDashboardSummary } from '../hooks/resources';
import { useLocale } from '../i18n/LocaleContext';
import { riskLevelFill, riskLevelStyles } from '../lib/colors';
import { RISK_CATEGORIES, RISK_LEVELS, RISK_STATUSES } from '../types';
import { riskCategoryChartColor, riskLevelChartColor, riskStatusChartColor } from '../lib/colors';
import { PageHeader } from '../components/ui/PageHeader';

export function DashboardPage() {
  const { t, enumLabel } = useLocale();
  const summaryQuery = useDashboardSummary();
  const heatmapQuery = useDashboardHeatmap();

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />

      {summaryQuery.isLoading && (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {summaryQuery.isError && <ErrorState message={t('dashboard.loadError')} />}

      {summaryQuery.data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile
              label={t('dashboard.statAssets')}
              value={summaryQuery.data.totals.assets}
              icon={Boxes}
              accent="text-teal-600 bg-teal-50"
            />
            <StatTile
              label={t('dashboard.statThreats')}
              value={summaryQuery.data.totals.threats}
              icon={ShieldHalf}
              accent="text-amber-600 bg-amber-50"
            />
            <StatTile
              label={t('dashboard.statVulnerabilities')}
              value={summaryQuery.data.totals.vulnerabilities}
              icon={Bug}
              accent="text-red-600 bg-red-50"
            />
            <StatTile
              label={t('dashboard.statRisks')}
              value={summaryQuery.data.totals.risks}
              icon={ShieldAlert}
              accent="text-orange-600 bg-orange-50"
            />
            <StatTile
              label={t('dashboard.statControls')}
              value={summaryQuery.data.totals.controls}
              icon={ShieldCheck}
              accent="text-indigo-600 bg-indigo-50"
            />
            <StatTile
              label={t('dashboard.statTreatmentPlans')}
              value={summaryQuery.data.totals.treatmentPlans}
              icon={ClipboardList}
              accent="text-violet-600 bg-violet-50"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader
                title={t('dashboard.risksByLevel')}
                subtitle={t('dashboard.risksByLevelSubtitle')}
              />
              <div className="p-4">
                <EnumBarChart
                  data={summaryQuery.data.risksByLevel}
                  order={RISK_LEVELS}
                  colorMap={riskLevelChartColor}
                  labelFor={(level) => enumLabel('severity', level)}
                />
              </div>
            </Card>
            <Card>
              <CardHeader
                title={t('dashboard.risksByStatus')}
                subtitle={t('dashboard.risksByStatusSubtitle')}
              />
              <div className="p-4">
                <EnumBarChart
                  data={summaryQuery.data.risksByStatus}
                  order={RISK_STATUSES}
                  colorMap={riskStatusChartColor}
                  labelFor={(status) => enumLabel('riskStatus', status)}
                />
              </div>
            </Card>
            <Card>
              <CardHeader
                title={t('dashboard.risksByCategory')}
                subtitle={t('dashboard.risksByCategorySubtitle')}
              />
              <div className="p-4">
                <EnumBarChart
                  data={summaryQuery.data.risksByCategory}
                  order={RISK_CATEGORIES}
                  colorMap={riskCategoryChartColor}
                  labelFor={(category) => enumLabel('riskCategory', category)}
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title={t('dashboard.riskHeatMap')}
                subtitle={t('dashboard.riskHeatMapSubtitle', {
                  count: heatmapQuery.data?.totalRisks ?? 0,
                })}
              />
              <div className="p-5">
                {heatmapQuery.isLoading && (
                  <div className="flex justify-center py-10">
                    <Spinner className="h-6 w-6" />
                  </div>
                )}
                {heatmapQuery.isError && <ErrorState message={t('dashboard.heatMapLoadError')} />}
                {heatmapQuery.data && (
                  <>
                    <RiskHeatmapGrid cells={heatmapQuery.data.cells} />
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                      {RISK_LEVELS.map((level) => (
                        <div key={level} className="flex items-center gap-1.5">
                          <span
                            className={`h-3 w-3 rounded-sm ${riskLevelFill[level].split(' ')[0]}`}
                          />
                          {enumLabel('severity', level)}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title={t('dashboard.treatmentPlanHealth')}
                subtitle={t('dashboard.treatmentPlanHealthSubtitle')}
              />
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">{t('dashboard.openInProgress')}</span>
                  <span className="text-2xl font-semibold tabular-nums text-slate-900">
                    {summaryQuery.data.treatmentPlans.open}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">{t('dashboard.overdue')}</span>
                  <span
                    className={`text-2xl font-semibold tabular-nums ${
                      summaryQuery.data.treatmentPlans.overdue > 0
                        ? 'text-red-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {summaryQuery.data.treatmentPlans.overdue}
                  </span>
                </div>
                {summaryQuery.data.treatmentPlans.overdue > 0 && (
                  <div
                    className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ring-1 ring-inset ${riskLevelStyles.CRITICAL}`}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                    <span>
                      {t(
                        summaryQuery.data.treatmentPlans.overdue === 1
                          ? 'dashboard.overdueWarningOne'
                          : 'dashboard.overdueWarningMany',
                        { count: summaryQuery.data.treatmentPlans.overdue },
                      )}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
