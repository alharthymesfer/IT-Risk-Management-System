import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/constants';
import { ControlsController } from './controls.controller';

describe('ControlsController RBAC wiring', () => {
  const rolesOn = (handler: unknown): Role[] | undefined =>
    Reflect.getMetadata(ROLES_KEY, handler as object) as Role[] | undefined;

  it('restricts create to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(ControlsController.prototype.create)).toEqual([
      Role.ADMIN,
      Role.RISK_MANAGER,
    ]);
  });

  it('leaves findAll/findOne/findRisksForControl unrestricted (any authenticated role)', () => {
    expect(rolesOn(ControlsController.prototype.findAll)).toBeUndefined();
    expect(rolesOn(ControlsController.prototype.findOne)).toBeUndefined();
    expect(rolesOn(ControlsController.prototype.findRisksForControl)).toBeUndefined();
  });

  it('restricts update to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(ControlsController.prototype.update)).toEqual([
      Role.ADMIN,
      Role.RISK_MANAGER,
    ]);
  });

  it('restricts remove to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(ControlsController.prototype.remove)).toEqual([
      Role.ADMIN,
      Role.RISK_MANAGER,
    ]);
  });

  it('restricts linkToRisk to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(ControlsController.prototype.linkToRisk)).toEqual([
      Role.ADMIN,
      Role.RISK_MANAGER,
    ]);
  });

  it('restricts unlinkFromRisk to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(ControlsController.prototype.unlinkFromRisk)).toEqual([
      Role.ADMIN,
      Role.RISK_MANAGER,
    ]);
  });
});
