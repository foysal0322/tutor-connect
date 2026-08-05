// Notification system types — see NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md §VII.
//
// These enums are intentionally string unions (not TS `enum`) so they map 1:1
// onto the String columns added in Phase 2 and stay decoupled from Prisma.

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "CRITICAL"
  | "REMINDER"
  | "ACTION_REQUIRED"
  | "APPROVAL"
  | "REJECTION"
  | "SYSTEM"
  | "ANNOUNCEMENT";

export type NotificationCategory =
  | "SYSTEM"
  | "AUTH"
  | "SECURITY"
  | "TUTOR_REQUEST"
  | "BOOKING"
  | "PAYMENT"
  | "WALLET"
  | "WITHDRAWAL"
  | "REFUND"
  | "CONSULTANCY"
  | "SUPPORT"
  | "COURSE"
  | "REVIEW"
  | "MESSAGE"
  | "ADMIN"
  | "ANNOUNCEMENT";

export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type NotificationChannel =
  | "IN_APP"
  | "EMAIL"
  | "PUSH"
  | "DISCORD"
  | "SMS"
  | "WEBHOOK";

export type RecipientRoleHint = "STUDENT" | "TUTOR" | "ADMIN";

// Free-form metadata bag. Typed shapes per event are co-located with the
// event definitions in src/lib/notifications/events/*.ts (Phases 5-7).
export interface NotificationMetadata {
  readonly [key: string]: unknown;
}

// Canonical event envelope. Every business trigger produces exactly one of
// these and hands it to NotificationService.dispatch().
//
// Resolution precedence for the visible fields:
//   - if `title` / `message` are supplied (legacy raw path), they win
//   - otherwise the template registry resolves them from `event` + `metadata`
//
// `type`, `category`, `priority` default to "SYSTEM"/"SYSTEM"/"MEDIUM" when
// omitted — matching the Phase 2 schema defaults so legacy rows are
// indistinguishable from new ones.
export interface NotificationEvent {
  // Logical event id, e.g. "refund.approved", "tutor_request.submitted".
  // Used for template lookup, dedup, analytics.
  event: string;
  userId: string;
  title?: string;
  message?: string;
  actionUrl?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  actorUserId?: string;
  recipientRoleHint?: RecipientRoleHint;
  metadata?: NotificationMetadata;
  dedupKey?: string;
  expiresAt?: Date;
  // Phase 4: which channels to dispatch on. When omitted, the service uses
  // DEFAULT_DISPATCH_CHANNELS (currently [IN_APP, PUSH]) — preserving the
  // pre-Phase-4 behavior of createNotification.
  channels?: NotificationChannel[];
}

// Result of resolving an event into the fields that actually get persisted.
export interface ResolvedNotification {
  title: string;
  message: string;
  actionUrl: string | null;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
}
