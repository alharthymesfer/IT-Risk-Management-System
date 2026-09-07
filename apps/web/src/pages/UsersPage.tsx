import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { type Column, DataTable } from '../components/ui/DataTable';
import { Field, Select, TextInput } from '../components/ui/form';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from '../hooks/resources';
import { useLocale } from '../i18n/LocaleContext';
import { activeStyles, roleStyles } from '../lib/colors';
import { formatDate, formatFullName } from '../lib/format';
import { ROLES, type CreateUserInput, type SafeUser, type UpdateUserInput } from '../types';

const emptyForm: CreateUserInput = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'VIEWER',
  isActive: true,
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { t, enumLabel, locale } = useLocale();
  const usersQuery = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SafeUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateUserInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SafeUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = usersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) => formatFullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [usersQuery.data, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (user: SafeUser) => {
    setEditing(user);
    setForm({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const isSelf = editing?.id === currentUser?.id;

  const handleSubmit = async () => {
    setFormError(null);
    try {
      if (editing) {
        const input: UpdateUserInput = {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          isActive: form.isActive,
        };
        if (form.password) input.password = form.password;
        await updateUser.mutateAsync({ id: editing.id, input });
      } else {
        await createUser.mutateAsync(form);
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
      await deleteUser.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t('common.genericDeleteError'));
    }
  };

  const columns: Column<SafeUser>[] = [
    {
      key: 'name',
      header: t('users.columnName'),
      render: (u) => (
        <div>
          <p className="font-medium text-slate-900">
            {formatFullName(u)}
            {u.id === currentUser?.id && (
              <span className="ms-1.5 text-xs font-normal text-slate-400">{t('common.you')}</span>
            )}
          </p>
          <p className="text-xs text-slate-400">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('users.columnRole'),
      render: (u) => <Badge className={roleStyles[u.role]}>{enumLabel('role', u.role)}</Badge>,
    },
    {
      key: 'status',
      header: t('users.columnStatus'),
      render: (u) => (
        <Badge className={activeStyles[String(u.isActive) as 'true' | 'false']}>
          {u.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: t('users.columnJoined'),
      render: (u) => formatDate(u.createdAt, locale),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (u: SafeUser) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<Pencil className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(u);
            }}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
            disabled={u.id === currentUser?.id}
            title={u.id === currentUser?.id ? t('users.cantDeleteSelf') : undefined}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(u);
              setDeleteError(null);
            }}
          >
            {t('common.delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('users.pageTitle')}
        subtitle={t('users.pageSubtitle')}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('users.searchPlaceholder')}
            />
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              {t('users.addUser')}
            </Button>
          </>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(u) => u.id}
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          emptyMessage={search ? t('users.emptySearch') : t('users.emptyDefault')}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('users.editUserModalTitle') : t('users.addUserModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={createUser.isPending || updateUser.isPending}
            >
              {editing ? t('common.saveChanges') : t('users.createUser')}
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
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('users.fieldFirstName')} htmlFor="user-first-name" required>
              <TextInput
                id="user-first-name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </Field>
            <Field label={t('users.fieldLastName')} htmlFor="user-last-name" required>
              <TextInput
                id="user-last-name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label={t('users.fieldEmail')} htmlFor="user-email" required>
            <TextInput
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field
            label={editing ? t('users.fieldNewPassword') : t('users.fieldPassword')}
            htmlFor="user-password"
            required={!editing}
            hint={
              editing ? t('users.fieldPasswordHintEdit') : t('users.fieldPasswordHintNew')
            }
          >
            <TextInput
              id="user-password"
              type="password"
              value={form.password}
              minLength={8}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label={t('users.fieldRole')}
              htmlFor="user-role"
              required
              hint={isSelf ? t('users.fieldRoleHintSelf') : undefined}
            >
              <Select
                id="user-role"
                value={form.role}
                disabled={isSelf}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as CreateUserInput['role'] })
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {enumLabel('role', r)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('users.fieldStatus')}
              htmlFor="user-active"
              hint={isSelf ? t('users.fieldStatusHintSelf') : undefined}
            >
              <Select
                id="user-active"
                value={form.isActive ? 'true' : 'false'}
                disabled={isSelf}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
              >
                <option value="true">{t('common.active')}</option>
                <option value="false">{t('common.inactive')}</option>
              </Select>
            </Field>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('users.deleteTitle')}
        description={
          deleteError ??
          t('users.deleteConfirm', {
            name: deleteTarget ? formatFullName(deleteTarget) : t('users.deleteConfirmFallbackName'),
          })
        }
        confirmLabel={t('common.delete')}
        isLoading={deleteUser.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
