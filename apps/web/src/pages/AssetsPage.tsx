import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { permissions } from '../auth/permissions';
import { UserPicker } from '../components/UserPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { type Column, DataTable } from '../components/ui/DataTable';
import { Field, Select, TextArea, TextInput } from '../components/ui/form';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { useAssets, useCreateAsset, useDeleteAsset, useUpdateAsset } from '../hooks/resources';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { useLocale } from '../i18n/LocaleContext';
import { criticalityStyles } from '../lib/colors';
import { formatFullName } from '../lib/format';
import { ASSET_CATEGORIES, CRITICALITY_LEVELS, type Asset, type CreateAssetInput } from '../types';

function emptyForm(defaultOwnerId: string): CreateAssetInput {
  return {
    name: '',
    description: '',
    category: 'HARDWARE',
    criticality: 'MEDIUM',
    ownerId: defaultOwnerId,
  };
}

export function AssetsPage() {
  const { user } = useAuth();
  const { t, enumLabel } = useLocale();
  const canCreateOrDelete = user ? permissions.canCreateOrDeleteAsset(user.role) : false;
  const { options: userOptions, resolveName } = useUserDirectory();

  const assetsQuery = useAssets();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Asset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateAssetInput>(emptyForm(user?.id ?? ''));
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = assetsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) => a.name.toLowerCase().includes(q) || formatFullName(a.owner).toLowerCase().includes(q),
    );
  }, [assetsQuery.data, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(user?.id ?? ''));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      description: asset.description ?? '',
      category: asset.category,
      criticality: asset.criticality,
      ownerId: asset.ownerId,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    try {
      if (editing) {
        // ASSET_OWNER may only PATCH their own asset, and can't reassign ownership away from
        // themselves via this form — keep the payload role-appropriate.
        const { ownerId: _ownerId, ...rest } = form;
        const canReassignOwner = user ? permissions.canCreateOrDeleteAsset(user.role) : false;
        await updateAsset.mutateAsync({ id: editing.id, input: canReassignOwner ? form : rest });
      } else {
        await createAsset.mutateAsync(form);
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
      await deleteAsset.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t('common.genericDeleteError'));
    }
  };

  const columns: Column<Asset>[] = [
    {
      key: 'name',
      header: t('assets.columnName'),
      render: (a) => <span className="font-medium text-slate-900">{a.name}</span>,
    },
    {
      key: 'category',
      header: t('assets.columnCategory'),
      render: (a) => (
        <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
          {enumLabel('assetCategory', a.category)}
        </Badge>
      ),
    },
    {
      key: 'criticality',
      header: t('assets.columnCriticality'),
      render: (a) => (
        <Badge className={criticalityStyles[a.criticality]}>
          {enumLabel('severity', a.criticality)}
        </Badge>
      ),
    },
    {
      key: 'owner',
      header: t('assets.columnOwner'),
      render: (a) => resolveName(a.ownerId) ?? formatFullName(a.owner),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (a: Asset) => {
        const canUpdate = user ? permissions.canUpdateAsset(user, a) : false;
        return (
          <div className="flex justify-end gap-1">
            {canUpdate && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil className="h-3.5 w-3.5" />}
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(a);
                }}
              >
                {t('common.edit')}
              </Button>
            )}
            {canCreateOrDelete && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(a);
                  setDeleteError(null);
                }}
              >
                {t('common.delete')}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('assets.pageTitle')}
        subtitle={t('assets.pageSubtitle')}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('assets.searchPlaceholder')}
            />
            {canCreateOrDelete && (
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                {t('assets.addAsset')}
              </Button>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(a) => a.id}
          isLoading={assetsQuery.isLoading}
          isError={assetsQuery.isError}
          emptyMessage={search ? t('assets.emptySearch') : t('assets.emptyDefault')}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('assets.editAssetModalTitle') : t('assets.addAssetModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={createAsset.isPending || updateAsset.isPending}
            >
              {editing ? t('common.saveChanges') : t('assets.createAsset')}
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
          <Field label={t('assets.fieldName')} htmlFor="asset-name" required>
            <TextInput
              id="asset-name"
              value={form.name}
              maxLength={200}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('assets.fieldCategory')} htmlFor="asset-category" required>
              <Select
                id="asset-category"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as CreateAssetInput['category'] })
                }
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {enumLabel('assetCategory', c)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('assets.fieldCriticality')} htmlFor="asset-criticality" required>
              <Select
                id="asset-criticality"
                value={form.criticality}
                onChange={(e) =>
                  setForm({
                    ...form,
                    criticality: e.target.value as CreateAssetInput['criticality'],
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
          </div>
          <Field
            label={t('assets.fieldOwner')}
            htmlFor="asset-owner"
            required
            hint={
              !editing || (user && permissions.canCreateOrDeleteAsset(user.role))
                ? t('assets.fieldOwnerHint')
                : undefined
            }
          >
            {editing && user && !permissions.canCreateOrDeleteAsset(user.role) ? (
              <TextInput
                id="asset-owner"
                value={resolveName(form.ownerId) ?? form.ownerId}
                disabled
              />
            ) : (
              <UserPicker
                id="asset-owner"
                value={form.ownerId}
                onChange={(v) => setForm({ ...form, ownerId: v })}
                options={userOptions}
                required
              />
            )}
          </Field>
          <Field label={t('assets.fieldDescription')} htmlFor="asset-description">
            <TextArea
              id="asset-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('assets.deleteTitle')}
        description={
          deleteError ?? t('assets.deleteConfirm', { name: deleteTarget?.name ?? '' })
        }
        confirmLabel={t('common.delete')}
        isLoading={deleteAsset.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
