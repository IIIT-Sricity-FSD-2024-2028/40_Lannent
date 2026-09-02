/**
 * The platform's roles, in one place.
 *
 * These were previously bare strings duplicated across `@IsIn(...)` on the user
 * DTO, every `@Roles(...)` decorator, and the SQL ENUM — so adding a role meant
 * finding every copy. Validation now reads from here.
 *
 * **Staff are four separate jobs, not one.**
 *   SUPERUSER        — day-to-day operations: users, tasks, escrow, disputes.
 *   REVENUE_ADMIN    — the revenue model and fee configuration.
 *   INTAKE_ADMIN     — Expert Reviewer applications.
 *   COMPLIANCE_ADMIN — the audit trail. Reads everything, changes nothing.
 *
 * The single `admin` role that used to hold both the revenue model and reviewer
 * intake is gone: one account controlling what the platform charges *and* who is
 * allowed to review work is exactly the concentration this split removes.
 * Staff accounts are created by seeding, never in the application.
 */
export const ROLES = {
  CLIENT: 'client',
  WORKER: 'worker',
  EXPERT: 'expert',
  SUPERUSER: 'superuser',
  REVENUE_ADMIN: 'revenue-admin',
  INTAKE_ADMIN: 'intake-admin',
  COMPLIANCE_ADMIN: 'compliance-admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);

/** Roles that can sign up through the public form. */
export const SELF_SERVICE_ROLES: Role[] = [ROLES.CLIENT, ROLES.WORKER];

/** Staff roles — created by seeding, never self-service. */
export const STAFF_ROLES: Role[] = [
  ROLES.SUPERUSER,
  ROLES.REVENUE_ADMIN,
  ROLES.INTAKE_ADMIN,
  ROLES.COMPLIANCE_ADMIN,
];

/** The three admin desks, for anywhere that needs "is this an admin of some kind". */
export const ADMIN_ROLES: Role[] = [
  ROLES.REVENUE_ADMIN,
  ROLES.INTAKE_ADMIN,
  ROLES.COMPLIANCE_ADMIN,
];
