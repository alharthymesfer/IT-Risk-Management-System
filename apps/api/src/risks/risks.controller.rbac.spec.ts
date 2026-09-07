import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/constants';
import { RisksController } from './risks.controller';

describe('RisksController RBAC wiring', () => {
  const rolesOn = (handler: unknown): Role[] | undefined =>
    Reflect.getMetadata(ROLES_KEY, handler as object) as Role[] | undefined;

  it('restricts create to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(RisksController.prototype.create)).toEqual([Role.ADMIN, Role.RISK_MANAGER]);
  });

  it('leaves findAll/findOne unrestricted (any authenticated role)', () => {
    expect(rolesOn(RisksController.prototype.findAll)).toBeUndefined();
    expect(rolesOn(RisksController.prototype.findOne)).toBeUndefined();
  });

  it('restricts update to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(RisksController.prototype.update)).toEqual([Role.ADMIN, Role.RISK_MANAGER]);
  });

  it('restricts remove to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(RisksController.prototype.remove)).toEqual([Role.ADMIN, Role.RISK_MANAGER]);
  });
});
