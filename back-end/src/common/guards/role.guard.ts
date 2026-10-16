import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles() decorator is set, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // Only the identity AuthMiddleware resolved counts. Reading the raw `role`
    // header as a fallback let an unauthenticated request satisfy @Roles on
    // any route that was not also behind RequireAuthMiddleware.
    const role = request.user?.role;

    if (!role) {
      throw new ForbiddenException({
        success: false,
        message: 'This endpoint requires you to be signed in.',
        data: null,
      });
    }

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException({
        success: false,
        message: `Access denied. Required role(s): ${requiredRoles.join(', ')}. Your role: ${role}`,
        data: null,
      });
    }

    return true;
  }
}
