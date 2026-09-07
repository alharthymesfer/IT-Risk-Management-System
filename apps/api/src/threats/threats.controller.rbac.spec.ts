import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/constants';
import { ThreatsController } from './threats.controller';

describe('ThreatsController RBAC wiring', () => {
  const rolesOn = (handler: unknown): Role[] | undefined =>
    Reflect.getMetadata(ROLES_KEY, handler as object) as Role[] | undefined;

  it('restricts create to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(ThreatsController.prototype.create)).toEqual([Role.ADMIN, Role.RISK_MANAGER]);
  });

  it('leaves findAll/findOne unrestricted (any authenticated role)', () => {
    expect(rolesOn(ThreatsController.prototype.findAll)).toBeUndefined();
    expect(rolesOn(ThreatsController.prototype.findOne)).toBeUndefined();
  });

  it('restricts update to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(ThreatsController.prototype.update)).toEqual([Role.ADMIN, Role.RISK_MANAGER]);
  });

  it('restricts remove to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(ThreatsController.prototype.remove)).toEqual([Role.ADMIN, Role.RISK_MANAGER]);
  });
});
