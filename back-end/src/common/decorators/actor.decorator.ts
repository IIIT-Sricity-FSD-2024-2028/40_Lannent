import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Who is making the request, as AuthMiddleware resolved it from the token. */
export interface Actor {
  id: string;
  role: string;
}

/**
 * The verified caller.
 *
 * Handlers used to read `@Headers('user-id')` and trust ids in the request
 * body (`clientId`, `workerId`, `raisedBy`, `offeredBy`…). Ownership checks
 * compare against this instead, so the body can no longer say who you are.
 */
export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest();
  return { id: req.user?.id || '', role: req.user?.role || '' };
});
