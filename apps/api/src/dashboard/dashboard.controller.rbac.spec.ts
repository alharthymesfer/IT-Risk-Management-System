import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/constants';
import { DashboardController } from './dashboard.controller';

describe('DashboardController RBAC wiring', () => {
  const rolesOn = (handler: unknown): Role[] | undefined =>
    Reflect.getMetadata(ROLES_KEY, handler as object) as Role[] | undefined;

  it('leaves summary/heatmap unrestricted (any authenticated role)', () => {
    expect(rolesOn(DashboardController.prototype.getSummary)).toBeUndefined();
    expect(rolesOn(DashboardController.prototype.getHeatmap)).toBeUndefined();
  });
});
