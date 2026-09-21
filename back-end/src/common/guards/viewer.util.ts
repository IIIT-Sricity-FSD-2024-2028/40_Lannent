import { ForbiddenException } from '@nestjs/common';
import { ROLES, STAFF_ROLES } from '../constants/roles';

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

/**
 * `isStaff` used to answer every one of these questions at once, and that was
 * safe only while "staff" meant two roles doing two jobs. With the admin role
 * split into three desks, one blanket check would have handed a revenue admin
 * the right to move money out of any user's wallet — reopening, through the
 * back door, the hole the wallet ownership check closed.
 *
 * So the question is asked precisely, at each call site.
 */

/** Any staff role. Use for presentation — which settings page, which nav — not for authorisation. */
export function isStaff(role?: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role ?? '');
}

/**
 * May this role read any record on the platform, regardless of involvement?
 *
 * Operations needs it to do its job, and compliance *is* the job. A revenue
 * admin reading every deliverable, or an intake admin reading every dispute,
 * is not something either role needs.
 */
export function canViewAnyRecord(role?: string): boolean {
  return role === ROLES.SUPERUSER || role === ROLES.COMPLIANCE_ADMIN;
}

/**
 * May this role move money in or out of a wallet that is not theirs?
 *
 * Operations only. No admin desk has any reason to, and compliance least of
 * all — it exists to watch value move, not to move it.
 */
export function canMoveAnyWallet(role?: string): boolean {
  return role === ROLES.SUPERUSER;
}

/**
 * May this role delete another person's uploaded file?
 *
 * Operations only, for the same reason: it is destructive, and reading a file
 * for oversight never requires removing it.
 */
export function canDeleteAnyFile(role?: string): boolean {
  return role === ROLES.SUPERUSER;
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
  if (canViewAnyRecord(role)) return true;
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
