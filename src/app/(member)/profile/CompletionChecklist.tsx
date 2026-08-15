"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Info } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export type CompletionItem = {
  done: boolean;
  label: string;
  href?: string;
  /** Only relevant for members who teach — shown with a tutor note. */
  tutorOnly?: boolean;
};

/**
 * "What counts?" trigger that sits beside the profile-completion KPI and
 * opens the five-item checklist in a modal. Keeps the profile page compact
 * on mobile while still explaining how the percentage is calculated.
 */
export default function CompletionChecklist({
  items,
  isTutor,
}: {
  items: CompletionItem[];
  isTutor: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="How is profile completion calculated?"
        title="How is profile completion calculated?"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: "50%",
          border:
            "1px solid color-mix(in srgb, var(--danger) 35%, transparent)",
          background: "color-mix(in srgb, var(--danger) 8%, transparent)",
          color: "var(--danger)",
          cursor: "pointer",
        }}
      >
        <Info size={16} aria-hidden="true" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="How your profile completion is calculated"
      >
        <p
          style={{
            margin: "0 0 var(--space-3)",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
          }}
        >
          Your completion score is based on these five steps:
        </p>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {items.map((item) => (
            <li
              key={item.label}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-2)",
                fontSize: "0.9rem",
              }}
            >
              {item.done ? (
                <CheckCircle2
                  size={16}
                  style={{
                    color: "var(--success)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  size={16}
                  style={{
                    color: "var(--text-muted)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                  aria-hidden="true"
                />
              )}
              <span>
                {item.done ? (
                  <s style={{ color: "var(--text-muted)" }}>{item.label}</s>
                ) : item.href ? (
                  <Link href={item.href} onClick={() => setOpen(false)}>
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
                {item.tutorOnly && (
                  <span
                    style={{
                      display: "inline-block",
                      marginLeft: "0.4rem",
                      padding: "0.05rem 0.4rem",
                      borderRadius: 999,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      background: "var(--primary-light)",
                      color: "var(--primary)",
                      verticalAlign: "middle",
                    }}
                  >
                    Tutor
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        {!isTutor && (
          <p
            style={{
              margin: "var(--space-4) 0 0",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-1)",
              border: "1px solid var(--border-color)",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            The two items marked <strong>Tutor </strong> only apply if you
            decide to teach a course. If you&apos;re here just to find tutors,
            you can ignore them — 60% is a complete score for students.
          </p>
        )}
      </Modal>
    </>
  );
}
