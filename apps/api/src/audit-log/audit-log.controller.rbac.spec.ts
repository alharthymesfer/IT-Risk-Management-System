import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/constants';
import { AuditLogController } from './audit-log.controller';

describe('AuditLogController RBAC wiring', () => {
  const rolesOn = (target: unknown): Role[] | undefined =>
    Reflect.getMetadata(ROLES_KEY, target as object) as Role[] | undefined;

  it('restricts the whole controller to ADMIN and AUDITOR', () => {
    expect(rolesOn(AuditLogController)).toEqual([Role.ADMIN, Role.AUDITOR]);
  });

  it('exposes only read endpoints (no create/update/delete handlers)', () => {
    const controller = AuditLogController.prototype as unknown as Record<string, unknown>;
    expect(typeof controller.findAll).toBe('function');
    expect(typeof controller.findOne).toBe('function');
    expect(controller.create).toBeUndefined();
    expect(controller.update).toBeUndefined();
    expect(controller.remove).toBeUndefined();
  });
});
