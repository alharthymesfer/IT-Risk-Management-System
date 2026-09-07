// Common placeholder values that show up in .env.example / tutorials / seed configs.
// Never acceptable as a real JWT signing secret — anyone who has ever seen this
// repo (or any repo using the same convention) knows them.
const KNOWN_WEAK_SECRETS = new Set([
  'changeme',
  'change_me',
  'secret',
  'jwt_secret',
  'jwtsecret',
  'password',
  'test',
  '123456',
]);

const MIN_JWT_SECRET_LENGTH = 16;

/**
 * Fails application startup (rather than silently signing/verifying JWTs with a
 * missing or trivially-guessable secret) when JWT_SECRET is absent, too short,
 * or a known placeholder value. This is the single most impactful control
 * against forged-token authentication bypass — a weak secret is otherwise
 * invisible at runtime since every other auth check still "works".
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const jwtSecret = config.JWT_SECRET;

  if (typeof jwtSecret !== 'string' || jwtSecret.length === 0) {
    throw new Error(
      'JWT_SECRET is not set. Set it in your .env file to a long, random value ' +
        '(e.g. `openssl rand -base64 48`) before starting the API.',
    );
  }

  if (KNOWN_WEAK_SECRETS.has(jwtSecret.toLowerCase())) {
    throw new Error(
      `JWT_SECRET is set to the well-known placeholder value "${jwtSecret}". ` +
        'Anyone who has seen .env.example (or this file) could forge valid auth tokens. ' +
        'Set JWT_SECRET to a long, random value (e.g. `openssl rand -base64 48`).',
    );
  }

  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET is too short (${jwtSecret.length} characters, minimum ${MIN_JWT_SECRET_LENGTH}). ` +
        'Set it to a long, random value (e.g. `openssl rand -base64 48`).',
    );
  }

  return config;
}
