import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { Spinner } from './Spinner';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading,
  isError,
  errorMessage,
  emptyMessage,
  onRowClick,
}: DataTableProps<T>) {
  const { t } = useLocale();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {isLoading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14">
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Spinner />
                  <span className="text-sm">{t('common.loading')}</span>
                </div>
              </td>
            </tr>
          )}
          {!isLoading && isError && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14">
                <div className="flex flex-col items-center justify-center gap-2 text-red-500">
                  <AlertCircle className="h-6 w-6" aria-hidden="true" />
                  <span className="text-sm font-medium">{errorMessage ?? t('common.loadError')}</span>
                </div>
              </td>
            </tr>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14">
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Inbox className="h-6 w-6" aria-hidden="true" />
                  <span className="text-sm">{emptyMessage ?? t('common.noRecords')}</span>
                </div>
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            rows.map((row) => (
              <tr
                key={getRowId(row)}
                className={onRowClick ? 'cursor-pointer transition-colors hover:bg-slate-50' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-slate-700 ${col.className ?? ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
