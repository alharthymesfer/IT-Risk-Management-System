import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { permissions } from '../auth/permissions';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { type Column, DataTable } from '../components/ui/DataTable';
import { Field, Select, TextArea, TextInput } from '../components/ui/form';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import {
  useAssets,
  useCreateVulnerability,
  useDeleteVulnerability,
  useUpdateVulnerability,
  useVulnerabilities,
} from '../hooks/resources';
import { useLocale } from '../i18n/LocaleContext';
import { criticalityStyles } from '../lib/colors';
import { CRITICALITY_LEVELS, type CreateVulnerabilityInput, type Vulnerability } from '../types';

function emptyForm(defaultAssetId: string): CreateVulnerabilityInput {
  return { name: '', description: '', severity: 'MEDIUM', assetId: defaultAssetId };
}

export function VulnerabilitiesPage() {
  const { user } = useAuth();
  const { t, enumLabel } = useLocale();
  const canManage = user ? permissions.canManageCatalog(user.role) : false;

  const vulnsQuery = useVulnerabilities();
  const assetsQuery = useAssets();
  const createVuln = useCreateVulnerability();
  const updateVuln = useUpdateVulnerability();
  const deleteVuln = useDeleteVulnerability();

  const assetNameById = useMemo(
    () => new Map((assetsQuery.data ?? []).map((a) => [a.id, a.name])),
    [assetsQuery.data],
  );

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Vulnerability | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateVulnerabilityInput>(emptyForm(''));
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vulnerability | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = vulnsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (assetNameById.get(v.assetId) ?? '').toLowerCase().includes(q),
    );
  }, [vulnsQuery.data, search, assetNameById]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(assetsQuery.data?.[0]?.id ?? ''));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (vuln: Vulnerability) => {
    setEditing(vuln);
    setForm({
      name: vuln.name,
      description: vuln.description ?? '',
      severity: vuln.severity,
      assetId: vuln.assetId,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    try {
      if (editing) {
        await updateVuln.mutateAsync({ id: editing.id, input: form });
      } else {
        await createVuln.mutateAsync(form);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('common.genericError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteVuln.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t('common.genericDeleteError'));
    }
  };

  const columns: Column<Vulnerability>[] = [
    {
      key: 'name',
      header: t('vulnerabilities.columnName'),
      render: (v) => <span className="font-medium text-slate-900">{v.name}</span>,
    },
    {
      key: 'asset',
      header: t('vulnerabilities.columnAsset'),
      render: (v) =>
        assetNameById.get(v.assetId) ?? (
          <span className="text-slate-400">{t('vulnerabilities.unknownAsset')}</span>
        ),
    },
    {
      key: 'severity',
      header: t('vulnerabilities.columnSeverity'),
      render: (v) => (
        <Badge className={criticalityStyles[v.severity]}>{enumLabel('severity', v.severity)}</Badge>
      ),
    },
    {
      key: 'description',
      header: t('vulnerabilities.columnDescription'),
      render: (v) => (
        <span className="line-clamp-1 max-w-md text-slate-500">{v.description || '—'}</span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            render: (v: Vulnerability) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(v);
                  }}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(v);
                    setDeleteError(null);
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            ),
          } satisfies Column<Vulnerability>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('vulnerabilities.pageTitle')}
        subtitle={t('vulnerabilities.pageSubtitle')}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('vulnerabilities.searchPlaceholder')}
            />
            {canManage && (
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={openCreate}
                disabled={!assetsQuery.data?.length}
              >
                {t('vulnerabilities.addVulnerability')}
              </Button>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(v) => v.id}
          isLoading={vulnsQuery.isLoading}
          isError={vulnsQuery.isError}
          emptyMessage={
            search ? t('vulnerabilities.emptySearch') : t('vulnerabilities.emptyDefault')
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? t('vulnerabilities.editVulnerabilityModalTitle')
            : t('vulnerabilities.addVulnerabilityModalTitle')
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={createVuln.isPending || updateVuln.isPending}
            >
              {editing ? t('common.saveChanges') : t('vulnerabilities.createVulnerability')}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}
          <Field label={t('vulnerabilities.fieldName')} htmlFor="vuln-name" required>
            <TextInput
              id="vuln-name"
              value={form.name}
              maxLength={200}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label={t('vulnerabilities.fieldAsset')} htmlFor="vuln-asset" required>
            <Select
              id="vuln-asset"
              value={form.assetId}
              onChange={(e) => setForm({ ...form, assetId: e.target.value })}
              required
            >
              <option value="" disabled>
                {t('vulnerabilities.selectAsset')}
              </option>
              {(assetsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('vulnerabilities.fieldSeverity')} htmlFor="vuln-severity" required>
            <Select
              id="vuln-severity"
              value={form.severity}
              onChange={(e) =>
                setForm({
                  ...form,
                  severity: e.target.value as CreateVulnerabilityInput['severity'],
                })
              }
            >
              {CRITICALITY_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {enumLabel('severity', c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('vulnerabilities.fieldDescription')} htmlFor="vuln-description">
            <TextArea
              id="vuln-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('vulnerabilities.deleteTitle')}
        description={
          deleteError ?? t('vulnerabilities.deleteConfirm', { name: deleteTarget?.name ?? '' })
        }
        confirmLabel={t('common.delete')}
        isLoading={deleteVuln.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
