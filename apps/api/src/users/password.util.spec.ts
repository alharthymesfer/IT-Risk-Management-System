import * as bcrypt from 'bcryptjs';
import { hashPassword } from './password.util';

describe('hashPassword', () => {
  it('never returns the plaintext password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    expect(hash).not.toBe('correct-horse-battery-staple');
  });

  it('produces a hash that verifies against the original password via bcrypt.compare', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    await expect(bcrypt.compare('correct-horse-battery-staple', hash)).resolves.toBe(true);
    await expect(bcrypt.compare('wrong-password', hash)).resolves.toBe(false);
  });

  it('salts each hash independently, so the same password hashes differently each time', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same-password'),
      hashPassword('same-password'),
    ]);

    expect(first).not.toBe(second);
  });
});
