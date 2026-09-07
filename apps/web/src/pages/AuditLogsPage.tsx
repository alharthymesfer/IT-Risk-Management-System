import { Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { type Column, DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/form';
import { SearchInput } from '../components/ui/SearchInput';
import { useAuditLogs } from '../hooks/resources';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { useLocale } from '../i18n/LocaleContext';
import { formatDateTime } from '../lib/format';
import type { AuditLog } from '../types';

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  UPDATE: 'bg-sky-50 text-sky-700 ring-sky-200',
  DELETE: 'bg-red-50 text-red-700 ring-red-200',
  LINK_RISK: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  UNLINK_RISK: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export function AuditLogsPage() {
  const logsQuery = useAuditLogs();
  const { resolveName } = useUserDirectory();
  const { t, enumLabel, locale } = useLocale();

  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const entityTypes = useMemo(
    () => Array.from(new Set((logsQuery.data ?? []).map((l) => l.entityType))).sort(),
    [logsQuery.data],
  );

  const rows = useMemo(() => {
    let list = logsQuery.data ?? [];
    if (entityFilter) list = list.filter((l) => l.entityType === entityFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.entityType.toLowerCase().includes(q) ||
          l.entityId.toLowerCase().includes(q),
      );
    }
    return list;
  }, [logsQuery.data, search, entityFilter]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt',
      header: t('auditLogs.columnTimestamp'),
      render: (l) => (
        <span className="whitespace-nowrap text-slate-500">
          {formatDateTime(l.createdAt, locale)}
        </span>
      ),
    },
    {
      key: 'actor',
      header: t('auditLogs.columnActor'),
      render: (l) =>
        resolveName(l.userId) ??
        (l.userId ? (
          <span className="font-mono text-xs text-slate-400">{l.userId.slice(0, 8)}…</span>
        ) : (
          <span className="text-slate-400">{t('common.system')}</span>
        )),
    },
    {
      key: 'action',
      header: t('auditLogs.columnAction'),
      render: (l) => (
        <Badge className={ACTION_STYLES[l.action] ?? 'bg-slate-100 text-slate-700 ring-slate-200'}>
          {enumLabel('auditAction', l.action)}
        </Badge>
      ),
    },
    { key: 'entityType', header: t('auditLogs.columnEntity'), render: (l) => l.entityType },
    {
      key: 'entityId',
      header: t('auditLogs.columnEntityId'),
      render: (l) => (
        <span className="font-mono text-xs text-slate-400">{l.entityId.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'view',
      header: '',
      className: 'text-end',
      render: (l) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Eye className="h-3.5 w-3.5" />}
          onClick={(e) => {
            e.stopPropagation();
            setDetail(l);
          }}
        >
          {t('auditLogs.details')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('auditLogs.pageTitle')}
        subtitle={t('auditLogs.pageSubtitle')}
        actions={
          <>
            <Select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-40"
            >
              <option value="">{t('auditLogs.allEntities')}</option>
              {entityTypes.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {entityType}
                </option>
              ))}
            </Select>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('auditLogs.searchPlaceholder')}
            />
          </>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(l) => l.id}
          isLoading={logsQuery.isLoading}
          isError={logsQuery.isError}
          onRowClick={(l) => setDetail(l)}
          emptyMessage={
            search || entityFilter ? t('auditLogs.emptyFiltered') : t('auditLogs.emptyDefault')
          }
        />
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          detail ? `${enumLabel('auditAction', detail.action)} — ${detail.entityType}` : ''
        }
        description={detail ? formatDateTime(detail.createdAt, locale) : undefined}
        size="lg"
      >
        {detail && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('auditLogs.before')}
              </p>
              <pre className="max-h-96 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                {detail.oldValue ? JSON.stringify(detail.oldValue, null, 2) : '—'}
              </pre>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('auditLogs.after')}
              </p>
              <pre className="max-h-96 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                {detail.newValue ? JSON.stringify(detail.newValue, null, 2) : '—'}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
