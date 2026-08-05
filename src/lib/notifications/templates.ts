// Notification template registry — see NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md §III.
//
// In Phase 3 this registry exists as scaffolding. It is queried by the
// service when an event does NOT carry its own title/message (i.e. the new
// typed-event path). Legacy callers and the createNotification façade pass
// title/message directly and bypass the registry entirely.
//
// Per-event templates are populated in Phases 5-7 (admin / teacher / student
// notifications). Adding one is purely additive: define a TemplateEntry and
// register it.

import type {
  NotificationCategory,
  NotificationMetadata,
  NotificationPriority,
  NotificationType,
  ResolvedNotification,
} from "./types";

// A template takes event metadata and produces the visible notification text.
// Templates never touch the DB and never fan out — that is the service's job.
export interface NotificationTemplate<TMetadata extends NotificationMetadata = NotificationMetadata> {
  event: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  // Default actionUrl; a resolver may override with a more specific link.
  actionUrl?: string;
  resolve: (metadata: TMetadata) => { title: string; message: string; actionUrl?: string };
}

const registry = new Map<string, NotificationTemplate>();

export function registerTemplate<TMetadata extends NotificationMetadata = NotificationMetadata>(
  template: NotificationTemplate<TMetadata>,
): void {
  if (registry.has(template.event)) {
    // Defensive: a duplicate registration almost always means two engineers
    // claimed the same event id. Fail loudly at boot rather than silently
    // shadowing one of them.
    throw new Error(`Notification template already registered for event "${template.event}"`);
  }
  registry.set(template.event, template as NotificationTemplate);
}

export function lookupTemplate(event: string): NotificationTemplate | undefined {
  return registry.get(event);
}

// Resolve an event into its persisted shape. Returns null when no template
// matches — the caller (the service) decides whether that is an error.
export function resolveFromTemplate(
  event: string,
  metadata: NotificationMetadata | undefined,
): ResolvedNotification | null {
  const template = lookupTemplate(event);
  if (!template) return null;
  const resolved = template.resolve(metadata ?? {});
  return {
    title: resolved.title,
    message: resolved.message,
    actionUrl: resolved.actionUrl ?? template.actionUrl ?? null,
    type: template.type,
    category: template.category,
    priority: template.priority,
  };
}
