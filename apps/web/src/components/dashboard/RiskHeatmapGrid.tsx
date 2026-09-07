import { useLocale } from '../../i18n/LocaleContext';
import { riskLevelFill } from '../../lib/colors';
import type { RiskHeatmapCell } from '../../types';

const AXIS_VALUES = [1, 2, 3, 4, 5];

/**
 * 5x5 likelihood x impact matrix. Impact runs top (5) to bottom (1) so the most severe
 * cell (5,5) reads top-right — the standard risk-heatmap convention.
 */
export function RiskHeatmapGrid({ cells }: { cells: RiskHeatmapCell[] }) {
  const { t } = useLocale();
  const byKey = new Map(cells.map((cell) => [`${cell.likelihood}-${cell.impact}`, cell]));

  return (
    <div className="flex gap-2">
      <p className="flex w-4 flex-none items-center justify-center text-center text-xs font-medium text-slate-500 [writing-mode:vertical-rl]">
        <span className="rotate-180">{t('dashboard.impactAxis')}</span>
      </p>
      <div className="flex flex-col-reverse justify-between py-1 pe-1 text-end text-[11px] font-medium text-slate-400">
        {AXIS_VALUES.map((v) => (
          <div key={v} className="flex h-14 items-center justify-end">
            {v}
          </div>
        ))}
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-5 gap-1">
          {[...AXIS_VALUES].reverse().map((impact) =>
            AXIS_VALUES.map((likelihood) => {
              const cell = byKey.get(`${likelihood}-${impact}`);
              return (
                <div
                  key={`${likelihood}-${impact}`}
                  title={t('dashboard.cellTooltip', {
                    likelihood,
                    impact,
                    score: cell?.score ?? likelihood * impact,
                    count: cell?.count ?? 0,
                  })}
                  className={`flex h-14 flex-col items-center justify-center rounded-md text-sm font-semibold ${
                    cell ? riskLevelFill[cell.level] : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span>{cell?.count ?? 0}</span>
                </div>
              );
            }),
          )}
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-400">
          {AXIS_VALUES.map((v) => (
            <div key={v} className="w-14 text-center">
              {v}
            </div>
          ))}
        </div>
        <p className="mt-1 text-center text-xs font-medium text-slate-500">
          {t('dashboard.likelihoodAxis')}
        </p>
      </div>
    </div>
  );
}
