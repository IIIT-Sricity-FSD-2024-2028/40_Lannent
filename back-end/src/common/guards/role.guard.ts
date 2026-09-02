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
    // A verified token wins over the header. AuthMiddleware has already put
    // `req.user` in place when either was usable; the header read below stays
    // for requests that reach a guard without passing that middleware.
    const role = request.user?.role || request.headers['role'];

    if (!role) {
      throw new ForbiddenException({
        success: false,
        message: 'Missing "role" header. Please provide your role.',
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
