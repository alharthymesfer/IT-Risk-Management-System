import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/constants';
import { UsersController } from './users.controller';

// RolesGuard reads this metadata at request time; there is no way to exercise it end-to-end
// without a live server + DB, so this pins the metadata contract directly to guard against
// someone removing @Roles(Role.ADMIN) from the controller without noticing.
describe('UsersController RBAC wiring', () => {
  it('is restricted to ADMIN via @Roles metadata', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, UsersController) as Role[];

    expect(roles).toEqual([Role.ADMIN]);
  });
});
