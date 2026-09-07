import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { permissions } from '../auth/permissions';
import { UserPicker } from '../components/UserPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { type Column, DataTable } from '../components/ui/DataTable';
import { Field, Select, TextArea } from '../components/ui/form';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import {
  useCreateTreatmentPlan,
  useDeleteTreatmentPlan,
  useRisks,
  useTreatmentPlans,
  useUpdateTreatmentPlan,
} from '../hooks/resources';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { useLocale } from '../i18n/LocaleContext';
import { treatmentStatusStyles } from '../lib/colors';
import { formatDate, isOverdue } from '../lib/format';
import { TREATMENT_STATUSES, type CreateTreatmentPlanInput, type TreatmentPlan } from '../types';

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function emptyForm(riskId: string, ownerId: string): CreateTreatmentPlanInput {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  return { action: '', riskId, ownerId, dueDate: dueDate.toISOString(), status: 'OPEN' };
}

export function TreatmentPlansPage() {
  const { user } = useAuth();
  const { t, enumLabel, locale } = useLocale();
  const canManage = user ? permissions.canManageCatalog(user.role) : false;
  const { options: userOptions, resolveName } = useUserDirectory();

  const plansQuery = useTreatmentPlans();
  const risksQuery = useRisks();
  const createPlan = useCreateTreatmentPlan();
  const updatePlan = useUpdateTreatmentPlan();
  const deletePlan = useDeleteTreatmentPlan();

  const riskTitleById = useMemo(
    () => new Map((risksQuery.data ?? []).map((r) => [r.id, r.title])),
    [risksQuery.data],
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<TreatmentPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateTreatmentPlanInput>(emptyForm('', ''));
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreatmentPlan | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = plansQuery.data ?? [];
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.action.toLowerCase().includes(q) ||
          (riskTitleById.get(p.riskId) ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [plansQuery.data, search, statusFilter, riskTitleById]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(risksQuery.data?.[0]?.id ?? '', user?.id ?? ''));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (plan: TreatmentPlan) => {
    setEditing(plan);
    setForm({
      action: plan.action,
      riskId: plan.riskId,
      ownerId: plan.ownerId,
      dueDate: plan.dueDate,
      status: plan.status,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    try {
      const payload = { ...form, dueDate: new Date(form.dueDate).toISOString() };
      if (editing) {
        await updatePlan.mutateAsync({ id: editing.id, input: payload });
      } else {
        await createPlan.mutateAsync(payload);
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
      await deletePlan.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t('common.genericDeleteError'));
    }
  };

  const columns: Column<TreatmentPlan>[] = [
    {
      key: 'action',
      header: t('treatmentPlans.columnAction'),
      render: (p) => (
        <div>
          <p className="line-clamp-1 max-w-xs font-medium text-slate-900">{p.action}</p>
          <p className="text-xs text-slate-400">
            {riskTitleById.get(p.riskId) ?? t('treatmentPlans.unknownRisk')}
          </p>
        </div>
      ),
    },
    {
      key: 'owner',
      header: t('treatmentPlans.columnOwner'),
      render: (p) =>
        resolveName(p.ownerId) ?? (
          <span className="font-mono text-xs text-slate-400">{p.ownerId.slice(0, 8)}…</span>
        ),
    },
    {
      key: 'dueDate',
      header: t('treatmentPlans.columnDueDate'),
      render: (p) => (
        <span
          className={
            isOverdue(p.dueDate, p.status) ? 'flex items-center gap-1 font-medium text-red-600' : ''
          }
        >
          {isOverdue(p.dueDate, p.status) && <AlertTriangle className="h-3.5 w-3.5" />}
          {formatDate(p.dueDate, locale)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('treatmentPlans.columnStatus'),
      render: (p) => (
        <Badge className={treatmentStatusStyles[p.status]}>
          {enumLabel('treatmentStatus', p.status)}
        </Badge>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            render: (p: TreatmentPlan) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(p);
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
                    setDeleteTarget(p);
                    setDeleteError(null);
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            ),
          } satisfies Column<TreatmentPlan>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('treatmentPlans.pageTitle')}
        subtitle={t('treatmentPlans.pageSubtitle')}
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="">{t('treatmentPlans.allStatuses')}</option>
              {TREATMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {enumLabel('treatmentStatus', s)}
                </option>
              ))}
            </Select>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('treatmentPlans.searchPlaceholder')}
            />
            {canManage && (
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={openCreate}
                disabled={!risksQuery.data?.length}
              >
                {t('treatmentPlans.addPlan')}
              </Button>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(p) => p.id}
          isLoading={plansQuery.isLoading}
          isError={plansQuery.isError}
          emptyMessage={
            search || statusFilter
              ? t('treatmentPlans.emptyFiltered')
              : t('treatmentPlans.emptyDefault')
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing ? t('treatmentPlans.editPlanModalTitle') : t('treatmentPlans.addPlanModalTitle')
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={createPlan.isPending || updatePlan.isPending}
            >
              {editing ? t('common.saveChanges') : t('treatmentPlans.createPlan')}
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
          <Field label={t('treatmentPlans.fieldRisk')} htmlFor="plan-risk" required>
            <Select
              id="plan-risk"
              value={form.riskId}
              onChange={(e) => setForm({ ...form, riskId: e.target.value })}
              required
            >
              <option value="" disabled>
                {t('treatmentPlans.selectRisk')}
              </option>
              {(risksQuery.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('treatmentPlans.fieldAction')} htmlFor="plan-action" required>
            <TextArea
              id="plan-action"
              value={form.action}
              maxLength={500}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              required
              placeholder={t('treatmentPlans.fieldActionPlaceholder')}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('treatmentPlans.fieldDueDate')} htmlFor="plan-due-date" required>
              <input
                id="plan-due-date"
                type="date"
                className="block w-full rounded-md border-0 py-1.5 px-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                value={toDateInputValue(form.dueDate)}
                onChange={(e) =>
                  setForm({ ...form, dueDate: new Date(e.target.value).toISOString() })
                }
                required
              />
            </Field>
            <Field label={t('treatmentPlans.fieldStatus')} htmlFor="plan-status" required>
              <Select
                id="plan-status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CreateTreatmentPlanInput['status'] })
                }
              >
                {TREATMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {enumLabel('treatmentStatus', s)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t('treatmentPlans.fieldOwner')} htmlFor="plan-owner" required>
            <UserPicker
              id="plan-owner"
              value={form.ownerId}
              onChange={(v) => setForm({ ...form, ownerId: v })}
              options={userOptions}
              required
            />
          </Field>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('treatmentPlans.deleteTitle')}
        description={deleteError ?? t('treatmentPlans.deleteConfirm')}
        confirmLabel={t('common.delete')}
        isLoading={deletePlan.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
