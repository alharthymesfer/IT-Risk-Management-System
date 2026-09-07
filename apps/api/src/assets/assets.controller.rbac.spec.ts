import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/constants';
import { AssetsController } from './assets.controller';

// Pins the per-route RBAC contract directly, since it can't be exercised end-to-end
// without a live server + DB. Guards against silently loosening/tightening access
// on any individual route.
describe('AssetsController RBAC wiring', () => {
  const rolesOn = (handler: unknown): Role[] | undefined =>
    Reflect.getMetadata(ROLES_KEY, handler as object) as Role[] | undefined;

  it('restricts create to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(AssetsController.prototype.create)).toEqual([Role.ADMIN, Role.RISK_MANAGER]);
  });

  it('leaves findAll unrestricted (any authenticated role)', () => {
    expect(rolesOn(AssetsController.prototype.findAll)).toBeUndefined();
  });

  it('leaves findOne unrestricted (any authenticated role)', () => {
    expect(rolesOn(AssetsController.prototype.findOne)).toBeUndefined();
  });

  it('restricts update to ADMIN, RISK_MANAGER, and ASSET_OWNER', () => {
    expect(rolesOn(AssetsController.prototype.update)).toEqual([
      Role.ADMIN,
      Role.RISK_MANAGER,
      Role.ASSET_OWNER,
    ]);
  });

  it('restricts remove to ADMIN and RISK_MANAGER', () => {
    expect(rolesOn(AssetsController.prototype.remove)).toEqual([Role.ADMIN, Role.RISK_MANAGER]);
  });
});
