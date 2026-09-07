import { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { formatFullName } from '../lib/format';
import type { SafeUser } from '../types';
import { useAssets, useUsers } from './resources';

export interface UserOption {
  value: string;
  label: string;
}

/**
 * Builds an id -> user directory for populating "owner" pickers across the app.
 *
 * GET /users is ADMIN-only (see docs/api-reference.md), so non-admin roles can't fetch the full
 * user list. We opportunistically build a partial directory instead, from the current user plus
 * every owner embedded in GET /assets (open to any authenticated role) — enough to cover the
 * common case. Forms fall back to manual UUID entry for ids outside this partial directory.
 */
export function useUserDirectory() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';
  const usersQuery = useUsers(isAdmin);
  const assetsQuery = useAssets();

  const directory = useMemo(() => {
    const map = new Map<string, SafeUser>();
    if (currentUser) map.set(currentUser.id, currentUser);
    for (const asset of assetsQuery.data ?? []) {
      map.set(asset.owner.id, asset.owner);
    }
    for (const user of usersQuery.data ?? []) {
      map.set(user.id, user);
    }
    return map;
  }, [currentUser, assetsQuery.data, usersQuery.data]);

  const options: UserOption[] = useMemo(
    () =>
      Array.from(directory.values())
        .sort((a, b) => formatFullName(a).localeCompare(formatFullName(b)))
        .map((user) => ({ value: user.id, label: `${formatFullName(user)} (${user.email})` })),
    [directory],
  );

  const resolveName = (id: string | null | undefined): string | null => {
    if (!id) return null;
    const user = directory.get(id);
    return user ? formatFullName(user) : null;
  };

  return {
    options,
    resolveName,
    /** Whether the directory is guaranteed complete (true only for ADMIN). */
    isComplete: isAdmin,
    isLoading: assetsQuery.isLoading || (isAdmin && usersQuery.isLoading),
  };
}
