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
import {
  useAssets,
  useCreateRisk,
  useDeleteRisk,
  useRisks,
  useThreats,
  useUpdateRisk,
  useVulnerabilities,
} from '../hooks/resources';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { useLocale } from '../i18n/LocaleContext';
import { riskLevelStyles, riskStatusStyles } from '../lib/colors';
import { RISK_CATEGORIES, RISK_LEVELS, RISK_STATUSES, type CreateRiskInput, type Risk } from '../types';

const LIKELIHOOD_IMPACT_OPTIONS = [1, 2, 3, 4, 5];

function emptyForm(assetId: string, threatId: string, ownerId: string): CreateRiskInput {
  return {
    title: '',
    description: '',
    category: 'CYBERSECURITY',
    status: 'IDENTIFIED',
    likelihood: 3,
    impact: 3,
    assetId,
    threatId,
    vulnerabilityId: undefined,
    ownerId,
  };
}

export function RisksPage() {
  const { user } = useAuth();
  const { t, enumLabel } = useLocale();
  const canManage = user ? permissions.canManageCatalog(user.role) : false;
  const { options: userOptions, resolveName } = useUserDirectory();

  const risksQuery = useRisks();
  const assetsQuery = useAssets();
  const threatsQuery = useThreats();
  const vulnsQuery = useVulnerabilities();
  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const deleteRisk = useDeleteRisk();

  const assetNameById = useMemo(
    () => new Map((assetsQuery.data ?? []).map((a) => [a.id, a.name])),
    [assetsQuery.data],
  );
  const threatNameById = useMemo(
    () => new Map((threatsQuery.data ?? []).map((threat) => [threat.id, threat.name])),
    [threatsQuery.data],
  );

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [editing, setEditing] = useState<Risk | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateRiskInput>(emptyForm('', '', ''));
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = risksQuery.data ?? [];
    if (levelFilter) list = list.filter((r) => r.level === levelFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (assetNameById.get(r.assetId) ?? '').toLowerCase().includes(q) ||
          (threatNameById.get(r.threatId) ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [risksQuery.data, search, levelFilter, assetNameById, threatNameById]);

  const availableVulns = useMemo(
    () => (vulnsQuery.data ?? []).filter((v) => v.assetId === form.assetId),
    [vulnsQuery.data, form.assetId],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(
      emptyForm(assetsQuery.data?.[0]?.id ?? '', threatsQuery.data?.[0]?.id ?? '', user?.id ?? ''),
    );
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (risk: Risk) => {
    setEditing(risk);
    setForm({
      title: risk.title,
      description: risk.description ?? '',
      category: risk.category,
      status: risk.status,
      likelihood: risk.likelihood,
      impact: risk.impact,
      assetId: risk.assetId,
      threatId: risk.threatId,
      vulnerabilityId: risk.vulnerabilityId ?? undefined,
      ownerId: risk.ownerId,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleAssetChange = (assetId: string) => {
    const stillValid = (vulnsQuery.data ?? []).some(
      (v) => v.id === form.vulnerabilityId && v.assetId === assetId,
    );
    setForm({ ...form, assetId, vulnerabilityId: stillValid ? form.vulnerabilityId : undefined });
  };

  const handleSubmit = async () => {
    setFormError(null);
    try {
      if (editing) {
        await updateRisk.mutateAsync({
          id: editing.id,
          input: { ...form, vulnerabilityId: form.vulnerabilityId ?? null },
        });
      } else {
        await createRisk.mutateAsync(form);
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
      await deleteRisk.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t('common.genericDeleteError'));
    }
  };

  const columns: Column<Risk>[] = [
    {
      key: 'title',
      header: t('risks.columnRisk'),
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.title}</p>
          <p className="text-xs text-slate-400">
            {assetNameById.get(r.assetId) ?? t('risks.unknownAsset')} ·{' '}
            {threatNameById.get(r.threatId) ?? t('risks.unknownThreat')}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: t('risks.columnCategory'),
      render: (r) => (
        <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
          {enumLabel('riskCategory', r.category)}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: t('risks.columnStatus'),
      render: (r) => (
        <Badge className={riskStatusStyles[r.status]}>{enumLabel('riskStatus', r.status)}</Badge>
      ),
    },
    {
      key: 'level',
      header: t('risks.columnScore'),
      render: (r) => (
        <Badge className={riskLevelStyles[r.level]}>
          {enumLabel('severity', r.level)} · {r.score}
        </Badge>
      ),
    },
    {
      key: 'owner',
      header: t('risks.columnOwner'),
      render: (r) =>
        resolveName(r.ownerId) ?? (
          <span className="font-mono text-xs text-slate-400">{r.ownerId.slice(0, 8)}…</span>
        ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            render: (r: Risk) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(r);
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
                    setDeleteTarget(r);
                    setDeleteError(null);
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            ),
          } satisfies Column<Risk>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('risks.pageTitle')}
        subtitle={t('risks.pageSubtitle')}
        actions={
          <>
            <Select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-40"
            >
              <option value="">{t('risks.allLevels')}</option>
              {RISK_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {enumLabel('severity', lvl)}
                </option>
              ))}
            </Select>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('risks.searchPlaceholder')}
            />
            {canManage && (
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={openCreate}
                disabled={!assetsQuery.data?.length || !threatsQuery.data?.length}
              >
                {t('risks.addRisk')}
              </Button>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          isLoading={risksQuery.isLoading}
          isError={risksQuery.isError}
          emptyMessage={
            search || levelFilter ? t('risks.emptyFiltered') : t('risks.emptyDefault')
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('risks.editRiskModalTitle') : t('risks.addRiskModalTitle')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={createRisk.isPending || updateRisk.isPending}
            >
              {editing ? t('common.saveChanges') : t('risks.createRisk')}
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
          <Field label={t('risks.fieldTitle')} htmlFor="risk-title" required>
            <TextInput
              id="risk-title"
              value={form.title}
              maxLength={200}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('risks.fieldCategory')} htmlFor="risk-category" required>
              <Select
                id="risk-category"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as CreateRiskInput['category'] })
                }
              >
                {RISK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {enumLabel('riskCategory', c)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('risks.fieldStatus')} htmlFor="risk-status" required>
              <Select
                id="risk-status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CreateRiskInput['status'] })
                }
              >
                {RISK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {enumLabel('riskStatus', s)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label={t('risks.fieldLikelihood')}
              htmlFor="risk-likelihood"
              required
              hint={t('risks.fieldLikelihoodHint')}
            >
              <Select
                id="risk-likelihood"
                value={form.likelihood}
                onChange={(e) => setForm({ ...form, likelihood: Number(e.target.value) })}
              >
                {LIKELIHOOD_IMPACT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('risks.fieldImpact')}
              htmlFor="risk-impact"
              required
              hint={t('risks.fieldImpactHint')}
            >
              <Select
                id="risk-impact"
                value={form.impact}
                onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })}
              >
                {LIKELIHOOD_IMPACT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="-mt-2 text-xs text-slate-400">
            {t('risks.scorePreview')}{' '}
            <span className="font-semibold text-slate-600">{form.likelihood * form.impact}</span>
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('risks.fieldAsset')} htmlFor="risk-asset" required>
              <Select
                id="risk-asset"
                value={form.assetId}
                onChange={(e) => handleAssetChange(e.target.value)}
                required
              >
                <option value="" disabled>
                  {t('risks.selectAsset')}
                </option>
                {(assetsQuery.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('risks.fieldThreat')} htmlFor="risk-threat" required>
              <Select
                id="risk-threat"
                value={form.threatId}
                onChange={(e) => setForm({ ...form, threatId: e.target.value })}
                required
              >
                <option value="" disabled>
                  {t('risks.selectThreat')}
                </option>
                {(threatsQuery.data ?? []).map((threat) => (
                  <option key={threat.id} value={threat.id}>
                    {threat.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label={t('risks.fieldVulnerability')}
            htmlFor="risk-vulnerability"
            hint={t('risks.fieldVulnerabilityHint')}
          >
            <Select
              id="risk-vulnerability"
              value={form.vulnerabilityId ?? ''}
              onChange={(e) => setForm({ ...form, vulnerabilityId: e.target.value || undefined })}
            >
              <option value="">{t('common.none')}</option>
              {availableVulns.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('risks.fieldOwner')} htmlFor="risk-owner" required>
            <UserPicker
              id="risk-owner"
              value={form.ownerId}
              onChange={(v) => setForm({ ...form, ownerId: v })}
              options={userOptions}
              required
            />
          </Field>

          <Field label={t('risks.fieldDescription')} htmlFor="risk-description">
            <TextArea
              id="risk-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('risks.deleteTitle')}
        description={
          deleteError ?? t('risks.deleteConfirm', { title: deleteTarget?.title ?? '' })
        }
        confirmLabel={t('common.delete')}
        isLoading={deleteRisk.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
