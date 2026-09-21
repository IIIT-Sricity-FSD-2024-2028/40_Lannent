import { ForbiddenException } from '@nestjs/common';
import { ROLES } from '../constants/roles';

/**
 * Who may see a record attached to a task.
 *
 * Audit engagements, audit reports and disputes were readable by anyone — the
 * GET routes carried no guard at all, so an anonymous caller could enumerate
 * every audit report on the platform. These helpers scope a read to the people
 * the record actually concerns.
 *
 * This reads the client-supplied `user-id` header, so it is not a security
 * boundary — a caller can claim any id. It stops the application leaking other
 * people's work on its own. Real identity needs authentication middleware,
 * which is deliberately a separate piece of work.
 */

/** Roles that legitimately see everything. */
export function isStaff(role?: string): boolean {
  return role === ROLES.SUPERUSER || role === ROLES.ADMIN;
}

export interface TaskLike {
  clientId?: string;
  workerId?: string | null;
}

/**
 * True when the viewer is a party to the work: the client who owns it, the
 * worker doing it, the reviewer assigned to it, or staff.
 */
export function canViewTask(
  viewerId: string | undefined,
  role: string | undefined,
  task: TaskLike | null | undefined,
  ...alsoAllowed: (string | null | undefined)[]
): boolean {
  if (isStaff(role)) return true;
  if (!viewerId) return false;
  if (alsoAllowed.some((id) => id && id === viewerId)) return true;
  if (!task) return false;
  return task.clientId === viewerId || task.workerId === viewerId;
}

/** Same rule, but throws — for single-record reads. */
export function assertCanViewTask(
  viewerId: string | undefined,
  role: string | undefined,
  task: TaskLike | null | undefined,
  ...alsoAllowed: (string | null | undefined)[]
): void {
  if (!canViewTask(viewerId, role, task, ...alsoAllowed)) {
    throw new ForbiddenException(
      'You do not have access to this record. Only the people involved in the project can view it.',
    );
  }
}
