import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { ApiError } from '../api/client';
import { useCreateThreat, useDeleteThreat, useThreats, useUpdateThreat } from '../hooks/resources';
import { useLocale } from '../i18n/LocaleContext';
import { THREAT_CATEGORIES, type CreateThreatInput, type Threat } from '../types';

const emptyForm: CreateThreatInput = { name: '', description: '', category: 'MALICIOUS' };

export function ThreatsPage() {
  const { user } = useAuth();
  const { t, enumLabel } = useLocale();
  const canManage = user ? permissions.canManageCatalog(user.role) : false;

  const threatsQuery = useThreats();
  const createThreat = useCreateThreat();
  const updateThreat = useUpdateThreat();
  const deleteThreat = useDeleteThreat();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Threat | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateThreatInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Threat | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = threatsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q),
    );
  }, [threatsQuery.data, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (threat: Threat) => {
    setEditing(threat);
    setForm({
      name: threat.name,
      description: threat.description ?? '',
      category: threat.category,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    try {
      if (editing) {
        await updateThreat.mutateAsync({ id: editing.id, input: form });
      } else {
        await createThreat.mutateAsync(form);
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
      await deleteThreat.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t('threats.deleteError'));
    }
  };

  const columns: Column<Threat>[] = [
    {
      key: 'name',
      header: t('threats.columnName'),
      render: (threat) => <span className="font-medium text-slate-900">{threat.name}</span>,
    },
    {
      key: 'category',
      header: t('threats.columnCategory'),
      render: (threat) => (
        <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
          {enumLabel('threatCategory', threat.category)}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: t('threats.columnDescription'),
      render: (threat) => (
        <span className="line-clamp-1 max-w-md text-slate-500">{threat.description || '—'}</span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            render: (threat: Threat) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(threat);
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
                    setDeleteTarget(threat);
                    setDeleteError(null);
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            ),
          } satisfies Column<Threat>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('threats.pageTitle')}
        subtitle={t('threats.pageSubtitle')}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('threats.searchPlaceholder')}
            />
            {canManage && (
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                {t('threats.addThreat')}
              </Button>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(threat) => threat.id}
          isLoading={threatsQuery.isLoading}
          isError={threatsQuery.isError}
          emptyMessage={search ? t('threats.emptySearch') : t('threats.emptyDefault')}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('threats.editThreatModalTitle') : t('threats.addThreatModalTitle')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={createThreat.isPending || updateThreat.isPending}
            >
              {editing ? t('common.saveChanges') : t('threats.createThreat')}
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
          <Field label={t('threats.fieldName')} htmlFor="threat-name" required>
            <TextInput
              id="threat-name"
              value={form.name}
              maxLength={200}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label={t('threats.fieldCategory')} htmlFor="threat-category" required>
            <Select
              id="threat-category"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as CreateThreatInput['category'] })
              }
            >
              {THREAT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {enumLabel('threatCategory', c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('threats.fieldDescription')} htmlFor="threat-description">
            <TextArea
              id="threat-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('threats.deleteTitle')}
        description={
          deleteError ?? t('threats.deleteConfirm', { name: deleteTarget?.name ?? '' })
        }
        confirmLabel={t('common.delete')}
        isLoading={deleteThreat.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
