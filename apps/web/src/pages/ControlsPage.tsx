import { Link2, Pencil, Plus, Trash2, Unlink } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode, useMemo, useState } from 'react';
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
import { Spinner } from '../components/ui/Spinner';
import {
  useControlRisks,
  useControls,
  useCreateControl,
  useDeleteControl,
  useLinkControlRisk,
  useRisks,
  useUnlinkControlRisk,
  useUpdateControl,
} from '../hooks/resources';
import { useLocale } from '../i18n/LocaleContext';
import { effectivenessStyles, riskLevelStyles } from '../lib/colors';
import {
  CONTROL_TYPES,
  EFFECTIVENESS_LEVELS,
  type Control,
  type CreateControlInput,
  type Risk,
  type RiskLevel,
} from '../types';

const emptyForm: CreateControlInput = {
  name: '',
  description: '',
  type: 'PREVENTIVE',
  effectiveness: 'MEDIUM',
};

const RISK_LEVELS_BY_SCORE: [threshold: number, level: RiskLevel][] = [
  [17, 'CRITICAL'],
  [10, 'HIGH'],
  [5, 'MEDIUM'],
];

/**
 * `GET /controls/:id/risks` returns raw risk rows without the computed
 * score/level the `/risks` list endpoint adds, so derive them here from
 * likelihood/impact (same formula and bands as the backend's assessRisk).
 * Falls back safely if the fields are ever missing or non-numeric.
 */
function assessLinkedRisk(risk: Risk): { score: number; level: RiskLevel } {
  if (typeof risk.score === 'number' && risk.level) {
    return { score: risk.score, level: risk.level };
  }
  const { likelihood, impact } = risk;
  if (
    typeof likelihood !== 'number' ||
    typeof impact !== 'number' ||
    !Number.isFinite(likelihood) ||
    !Number.isFinite(impact)
  ) {
    return { score: 0, level: 'LOW' };
  }
  const score = likelihood * impact;
  const level = RISK_LEVELS_BY_SCORE.find(([threshold]) => score >= threshold)?.[1] ?? 'LOW';
  return { score, level };
}

/** Contains a render crash to the Linked Risks modal instead of blanking the whole app. */
class LinkedRisksErrorBoundary extends Component<
  { children: ReactNode; message: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Linked Risks failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{this.props.message}</p>
      );
    }
    return this.props.children;
  }
}

export function ControlsPage() {
  const { user } = useAuth();
  const { t, enumLabel } = useLocale();
  const canManage = user ? permissions.canManageCatalog(user.role) : false;

  const controlsQuery = useControls();
  const createControl = useCreateControl();
  const updateControl = useUpdateControl();
  const deleteControl = useDeleteControl();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Control | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateControlInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Control | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [linksTarget, setLinksTarget] = useState<Control | null>(null);

  const rows = useMemo(() => {
    const list = controlsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q),
    );
  }, [controlsQuery.data, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (control: Control) => {
    setEditing(control);
    setForm({
      name: control.name,
      description: control.description ?? '',
      type: control.type,
      effectiveness: control.effectiveness,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    try {
      if (editing) {
        await updateControl.mutateAsync({ id: editing.id, input: form });
      } else {
        await createControl.mutateAsync(form);
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
      await deleteControl.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t('common.genericDeleteError'));
    }
  };

  const columns: Column<Control>[] = [
    {
      key: 'name',
      header: t('controls.columnName'),
      render: (c) => <span className="font-medium text-slate-900">{c.name}</span>,
    },
    {
      key: 'type',
      header: t('controls.columnType'),
      render: (c) => (
        <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
          {enumLabel('controlType', c.type)}
        </Badge>
      ),
    },
    {
      key: 'effectiveness',
      header: t('controls.columnEffectiveness'),
      render: (c) => (
        <Badge className={effectivenessStyles[c.effectiveness]}>
          {enumLabel('severity', c.effectiveness)}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: t('controls.columnDescription'),
      render: (c) => (
        <span className="line-clamp-1 max-w-md text-slate-500">{c.description || '—'}</span>
      ),
    },
    {
      key: 'links',
      header: t('controls.columnMitigates'),
      render: (c) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Link2 className="h-3.5 w-3.5" />}
          onClick={(e) => {
            e.stopPropagation();
            setLinksTarget(c);
          }}
        >
          {t('controls.linkedRisks')}
        </Button>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            render: (c: Control) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(c);
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
                    setDeleteTarget(c);
                    setDeleteError(null);
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            ),
          } satisfies Column<Control>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('controls.pageTitle')}
        subtitle={t('controls.pageSubtitle')}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('controls.searchPlaceholder')}
            />
            {canManage && (
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                {t('controls.addControl')}
              </Button>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(c) => c.id}
          isLoading={controlsQuery.isLoading}
          isError={controlsQuery.isError}
          emptyMessage={search ? t('controls.emptySearch') : t('controls.emptyDefault')}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('controls.editControlModalTitle') : t('controls.addControlModalTitle')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={createControl.isPending || updateControl.isPending}
            >
              {editing ? t('common.saveChanges') : t('controls.createControl')}
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
          <Field label={t('controls.fieldName')} htmlFor="control-name" required>
            <TextInput
              id="control-name"
              value={form.name}
              maxLength={200}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label={t('controls.fieldType')} htmlFor="control-type" required>
            <Select
              id="control-type"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as CreateControlInput['type'] })
              }
            >
              {CONTROL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {enumLabel('controlType', type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('controls.fieldEffectiveness')} htmlFor="control-effectiveness" required>
            <Select
              id="control-effectiveness"
              value={form.effectiveness}
              onChange={(e) =>
                setForm({
                  ...form,
                  effectiveness: e.target.value as CreateControlInput['effectiveness'],
                })
              }
            >
              {EFFECTIVENESS_LEVELS.map((eff) => (
                <option key={eff} value={eff}>
                  {enumLabel('severity', eff)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('controls.fieldDescription')} htmlFor="control-description">
            <TextArea
              id="control-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('controls.deleteTitle')}
        description={
          deleteError ?? t('controls.deleteConfirm', { name: deleteTarget?.name ?? '' })
        }
        confirmLabel={t('common.delete')}
        isLoading={deleteControl.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {linksTarget && (
        <LinkedRisksErrorBoundary message={t('controls.boundaryError')}>
          <LinkedRisksModal
            control={linksTarget}
            canManage={canManage}
            onClose={() => setLinksTarget(null)}
          />
        </LinkedRisksErrorBoundary>
      )}
    </div>
  );
}

function LinkedRisksModal({
  control,
  canManage,
  onClose,
}: {
  control: Control;
  canManage: boolean;
  onClose: () => void;
}) {
  const { t, enumLabel } = useLocale();
  const linkedQuery = useControlRisks(control.id);
  const allRisksQuery = useRisks();
  const linkRisk = useLinkControlRisk();
  const unlinkRisk = useUnlinkControlRisk();
  const [selectedRiskId, setSelectedRiskId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set((linkedQuery.data ?? []).map((r) => r.id));
  const linkableRisks = (allRisksQuery.data ?? []).filter((r) => !linkedIds.has(r.id));

  const handleLink = async () => {
    if (!selectedRiskId) return;
    setError(null);
    try {
      await linkRisk.mutateAsync({ controlId: control.id, riskId: selectedRiskId });
      setSelectedRiskId('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('controls.linkError'));
    }
  };

  const handleUnlink = async (riskId: string) => {
    setError(null);
    try {
      await unlinkRisk.mutateAsync({ controlId: control.id, riskId });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('controls.unlinkError'));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('controls.linkedRisksModalTitle', { name: control.name })}
      description={t('controls.linkedRisksModalDescription')}
    >
      <div className="space-y-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {canManage && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={t('controls.linkAdditionalRisk')} htmlFor="link-risk-select">
                <Select
                  id="link-risk-select"
                  value={selectedRiskId}
                  onChange={(e) => setSelectedRiskId(e.target.value)}
                >
                  <option value="">{t('controls.selectRisk')}</option>
                  {linkableRisks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedRiskId}
              isLoading={linkRisk.isPending}
              onClick={handleLink}
            >
              {t('controls.link')}
            </Button>
          </div>
        )}

        {linkedQuery.isLoading && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        {!linkedQuery.isLoading && (linkedQuery.data?.length ?? 0) === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">{t('controls.noLinkedRisks')}</p>
        )}

        <ul className="divide-y divide-slate-100">
          {(linkedQuery.data ?? []).map((risk) => {
            const { score, level } = assessLinkedRisk(risk);
            return (
              <li key={risk.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{risk.title}</p>
                  <Badge className={`mt-1 ${riskLevelStyles[level]}`}>
                    {enumLabel('severity', level)} · {t('controls.scoreLabel')} {score}
                  </Badge>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Unlink className="h-3.5 w-3.5 text-red-500" />}
                    isLoading={unlinkRisk.isPending}
                    onClick={() => handleUnlink(risk.id)}
                  >
                    {t('controls.unlink')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
