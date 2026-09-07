import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/constants';
import { VulnerabilitiesController } from './vulnerabilities.controller';

describe('VulnerabilitiesController RBAC wiring', () => {
  const rolesOn = (handler: unknown): Role[] | undefined =>
    Reflect.getMetadata(ROLES_KEY, handler as object) as Role[] | undefined;

  it('restricts create to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(VulnerabilitiesController.prototype.create)).toEqual([
      Role.ADMIN,
      Role.RISK_MANAGER,
    ]);
  });

  it('leaves findAll/findOne unrestricted (any authenticated role)', () => {
    expect(rolesOn(VulnerabilitiesController.prototype.findAll)).toBeUndefined();
    expect(rolesOn(VulnerabilitiesController.prototype.findOne)).toBeUndefined();
  });

  it('restricts update to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(VulnerabilitiesController.prototype.update)).toEqual([
      Role.ADMIN,
      Role.RISK_MANAGER,
    ]);
  });

  it('restricts remove to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(VulnerabilitiesController.prototype.remove)).toEqual([
      Role.ADMIN,
      Role.RISK_MANAGER,
    ]);
  });
});
