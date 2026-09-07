import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

// JwtAuthGuard extends the class returned by the AuthGuard('jwt') mixin factory.
// Spy on that exact parent prototype (not a fresh AuthGuard('jwt') call, which
// would return an unrelated class instance) so `super.canActivate()` is intercepted.
const parentPrototype = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
  canActivate: (context: ExecutionContext) => unknown;
};

describe('JwtAuthGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: JwtAuthGuard;

  const buildContext = (): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('bypasses JWT verification for routes marked @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const superCanActivate = jest.spyOn(parentPrototype, 'canActivate');

    const result = guard.canActivate(buildContext());

    expect(result).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('delegates to the passport jwt strategy for non-public routes', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const superCanActivate = jest.spyOn(parentPrototype, 'canActivate').mockReturnValue(true);

    const context = buildContext();
    const result = guard.canActivate(context);

    expect(superCanActivate).toHaveBeenCalledWith(context);
    expect(result).toBe(true);
  });
});
