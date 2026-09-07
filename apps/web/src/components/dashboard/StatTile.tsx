import type { ComponentType } from 'react';
import { formatNumber } from '../../lib/format';
import { Card } from '../ui/Card';

export function StatTile({
  label,
  value,
  icon: Icon,
  accent = 'text-indigo-600 bg-indigo-50',
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums text-slate-900">
          {formatNumber(value)}
        </p>
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      </div>
    </Card>
  );
}
