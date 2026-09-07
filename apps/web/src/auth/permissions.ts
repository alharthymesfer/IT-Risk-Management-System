// Mirrors the @Roles() decorators and service-level ownership checks in apps/api/src.
// See docs/api-reference.md and docs/security.md for the authoritative per-endpoint matrix.
import type { Asset, Role, SafeUser } from '../types';

const MANAGERS: Role[] = ['ADMIN', 'RISK_MANAGER'];

export const permissions = {
  // Threats, Vulnerabilities, Risks, Controls, Treatment Plans: create/update/delete.
  canManageCatalog: (role: Role) => MANAGERS.includes(role),

  // Assets: create/delete.
  canCreateOrDeleteAsset: (role: Role) => MANAGERS.includes(role),

  // Assets: update. ADMIN/RISK_MANAGER may update any asset; ASSET_OWNER only their own
  // (AssetsService.assertCanManage enforces this server-side too).
  canUpdateAsset: (user: SafeUser, asset: Asset) =>
    MANAGERS.includes(user.role) || (user.role === 'ASSET_OWNER' && asset.ownerId === user.id),

  canManageUsers: (role: Role) => role === 'ADMIN',
  canViewUsers: (role: Role) => role === 'ADMIN',
  canViewAuditLogs: (role: Role) => role === 'ADMIN' || role === 'AUDITOR',
};
