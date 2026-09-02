/**
 * The platform's roles, in one place.
 *
 * These were previously bare strings duplicated across `@IsIn(...)` on the user
 * DTO, every `@Roles(...)` decorator, and the SQL ENUM — so adding a role meant
 * finding every copy. Validation now reads from here.
 *
 * ADMIN vs SUPERUSER: both are staff, with different jobs.
 *   SUPERUSER — day-to-day operations: users, tasks, escrow, disputes.
 *   ADMIN     — the revenue model and Expert Reviewer intake.
 * They are deliberately separate so operational access does not imply access to
 * platform finances.
 */
export const ROLES = {
  CLIENT: 'client',
  WORKER: 'worker',
  EXPERT: 'expert',
  SUPERUSER: 'superuser',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);

/** Roles that can sign up through the public form. */
export const SELF_SERVICE_ROLES: Role[] = [ROLES.CLIENT, ROLES.WORKER];

/** Staff roles — created by seeding or by another staff member, never self-service. */
export const STAFF_ROLES: Role[] = [ROLES.SUPERUSER, ROLES.ADMIN];
