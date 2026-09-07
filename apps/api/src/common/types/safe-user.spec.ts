import { Role, User } from '@prisma/client';
import { toSafeUser } from './safe-user';

describe('toSafeUser', () => {
  const user: User = {
    id: 'user-1',
    email: 'admin@acme.test',
    passwordHash: 'super-secret-hash',
    firstName: 'Ada',
    lastName: 'Admin',
    role: Role.ADMIN,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  it('strips passwordHash from the returned object', () => {
    const result = toSafeUser(user);

    expect(result).not.toHaveProperty('passwordHash');
  });

  it('preserves every other field unchanged', () => {
    const result = toSafeUser(user);

    expect(result).toEqual({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('does not mutate the original user object', () => {
    toSafeUser(user);

    expect(user).toHaveProperty('passwordHash', 'super-secret-hash');
  });
});
