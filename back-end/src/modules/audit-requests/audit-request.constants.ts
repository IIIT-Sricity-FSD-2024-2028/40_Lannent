/**
 * The lifecycle of an audit engagement.
 *
 * An audit used to be a boolean flag with a Pending/Completed status and no
 * expert, no price and no payment. It is now a negotiated engagement:
 *
 *   preview-sent → negotiating → agreed → escrow-funded
 *                → in-progress → report-submitted → paid
 *                ↘ declined | cancelled
 */
export const AUDIT_STATUS = {
  PREVIEW_SENT: 'preview-sent',
  NEGOTIATING: 'negotiating',
  AGREED: 'agreed',
  ESCROW_FUNDED: 'escrow-funded',
  IN_PROGRESS: 'in-progress',
  REPORT_SUBMITTED: 'report-submitted',
  PAID: 'paid',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
} as const;

export type AuditStatus = (typeof AUDIT_STATUS)[keyof typeof AUDIT_STATUS];

/** Statuses in which a client and expert may still exchange offers. */
export const NEGOTIABLE: string[] = [AUDIT_STATUS.PREVIEW_SENT, AUDIT_STATUS.NEGOTIATING];

/** Terminal states — nothing further happens to the engagement. */
export const TERMINAL: string[] = [AUDIT_STATUS.PAID, AUDIT_STATUS.DECLINED, AUDIT_STATUS.CANCELLED];

export const AUDIT_KIND = {
  /** Chosen by the client while creating the project; gates the project going live. */
  PROJECT: 'project-audit',
  /** Raised against an existing project when a dispute is opened. */
  DISPUTE: 'dispute-audit',
} as const;
