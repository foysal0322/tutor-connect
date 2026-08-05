"use client";

/**
 * Client view for the Teaching panel. Extracted from DashboardContent so the
 * data-fetching can live in a server component (TeachingPanel.tsx) while the
 * recharts dynamic imports stay client-side.
 *
 * Uses the shared <KPI> primitive (Phase 3 of the member redesign) instead of
 * the previous bespoke Kpi card.
 */

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Sparkles,
  Wallet,
  Users,
  CheckCircle2,
  Star,
  DollarSign,
  BookOpenCheck,
  Layers,
  AlertCircle,
  EyeOff,
  UserCircle2,
  Clock,
  GraduationCap,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { KPI } from "@/components/ui/KPI";
import ActionCenter, { type ActionItem } from "./ActionCenter";
import PerformanceSummary from "./PerformanceSummary";
import RecentActivity, { type ActivityEntry } from "./RecentActivity";
import AssignedStudentsTable, {
  type AssignedStudent,
} from "./AssignedStudentsTable";
import styles from "../dashboard.module.css";

// ---- Recharts dynamic imports (client-only, code-split) ----
const chartLoading = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--text-muted)",
      fontSize: "0.875rem",
    }}
  >
    Loading chart…
  </div>
);
const ExpertiseDonut = dynamic(() => import("../charts/ExpertiseDonut"), {
  ssr: false,
  loading: chartLoading,
});
const CoursePopularityChart = dynamic(
  () => import("../charts/CoursePopularityChart"),
  { ssr: false, loading: chartLoading }
);
const ProfileGauge = dynamic(() => import("../charts/ProfileGauge"), {
  ssr: false,
  loading: chartLoading,
});

// ---- Icon resolver for action items (server sends icon key as string) ----
const ACTION_ICONS: Record<string, LucideIcon> = {
  awaiting: Clock,
  inactive: EyeOff,
  profile: UserCircle2,
  withdraw: Wallet,
};

export type ActionItemDTO = {
  id: string;
  text: string;
  count?: number;
  href: string;
  icon: "awaiting" | "inactive" | "profile" | "withdraw";
  iconTone: "primary" | "accent" | "info" | "success";
};

export interface CoursePopularityRow {
  name: string;
  shortName: string;
  requests: number;
}

/** Serializable teaching payload — produced by the server TeachingPanel. */
export interface TeachingData {
  activeStudents: number;
  awaitingAction: number;
  completedSessions: number;
  avgRating: number | null;
  ratingCount: number;
  uniqueStudents: number;
  totalEarnings: number;
  activeExpertise: number;
  inactiveExpertise: number;
  completionRate: number | null;
  profilePercent: number;
  coursePopularity: CoursePopularityRow[];
  activity: ActivityEntry[];
  actionItems: ActionItemDTO[];
  assignedStudents: AssignedStudent[];
  totalAssigned: number;
}

/** Non-tutor CTA — shown when the member has no expertise yet. */
export function TeachCTA() {
  return (
    <section className={styles.tutorCta}>
      <div className={styles.tutorCtaLead}>
        <span className={styles.tutorCtaIcon}>
          <GraduationCap size={28} />
        </span>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
            Teach what you know
          </h3>
          <p className="text-muted" style={{ margin: "4px 0 0" }}>
            Offer a course you aced and earn from peers who need help. You can
            teach and learn at the same time on nsuOne.
          </p>
        </div>
      </div>
      <Link
        href="/tutor/expertise"
        className="btn-primary"
        style={{ textDecoration: "none", whiteSpace: "nowrap" }}
      >
        Add an Expertise
        <ArrowRight size={14} style={{ marginLeft: 6 }} />
      </Link>
    </section>
  );
}

export default function TeachingPanelView({ data }: { data: TeachingData }) {
  const t = data;

  // Resolve action items (server sends string icon keys — map to components).
  const actionItems: ActionItem[] = t.actionItems.map((a) => ({
    ...a,
    icon: ACTION_ICONS[a.icon] ?? AlertCircle,
  }));

  const expertiseDonutData = [
    { name: "Active", value: t.activeExpertise, color: "#4F46E5" },
    { name: "Inactive", value: t.inactiveExpertise, color: "#CBD5E1" },
  ];

  const bannerCount = actionItems.length;
  const showBanner = bannerCount > 0;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="teaching-heading">
      <div className="flex items-center justify-between">
        <h2 id="teaching-heading" className="mb-0">
          Teaching
        </h2>
        <Link
          href="/tutor/expertise"
          className="btn-primary"
          style={{ textDecoration: "none" }}
        >
          Manage Expertise
        </Link>
      </div>

      {/* -------- Action banner -------- */}
      {showBanner && (
        <div className={styles.actionBanner} role="status">
          <div className={styles.bannerLead}>
            <span className={styles.bannerIcon}>
              <AlertCircle size={18} />
            </span>
            <div>
              <h3 className={styles.bannerTitle}>
                {bannerCount} {bannerCount === 1 ? "item" : "items"} need your
                attention
              </h3>
              <p className={styles.bannerDesc}>
                Quick wins to keep your teaching pipeline healthy.
              </p>
            </div>
          </div>
          <div className={styles.bannerChips}>
            {actionItems.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className={`${styles.chip} ${a.id === "awaiting" ? styles.chipStrong : ""}`}
              >
                {typeof a.count === "number" && (
                  <span className={styles.chipCount}>{a.count}</span>
                )}
                <span>{shortActionText(a.text)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* -------- KPI Row 1 -------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Active Students"
          value={t.activeStudents}
          icon={<Users size={14} />}
          tone="primary"
          hint="Currently in ACCEPTED status"
        />
        <KPI
          label="Awaiting Action"
          value={t.awaitingAction}
          icon={<Clock size={14} />}
          tone="accent"
          hint="Matched requests to review"
        />
        <KPI
          label="Completed"
          value={t.completedSessions}
          icon={<CheckCircle2 size={14} />}
          tone="success"
          hint="Sessions delivered"
        />
        <KPI
          label="Avg Rating"
          value={t.avgRating === null ? "—" : `${t.avgRating}★`}
          icon={<Star size={14} />}
          tone="info"
          hint={
            t.ratingCount > 0
              ? `From ${t.ratingCount} review${t.ratingCount === 1 ? "" : "s"}`
              : "No reviews yet"
          }
        />
      </div>

      {/* -------- KPI Row 2 -------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Unique Students"
          value={t.uniqueStudents}
          icon={<Users size={14} />}
          tone="neutral"
          hint="Distinct learners taught"
        />
        <KPI
          label="Total Earnings"
          value={`৳${t.totalEarnings.toLocaleString()}`}
          icon={<DollarSign size={14} />}
          tone="success"
          hint="From completed sessions"
        />
        <KPI
          label="Active Expertise"
          value={t.activeExpertise}
          icon={<BookOpenCheck size={14} />}
          tone="primary"
          hint="Visible to students"
        />
        <KPI
          label="Inactive"
          value={t.inactiveExpertise}
          icon={<Layers size={14} />}
          tone="neutral"
          hint="Hidden from search"
        />
      </div>

      {/* -------- Action Center + Performance Summary -------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ActionCenter items={actionItems} />
        <PerformanceSummary
          data={{
            completionRate: t.completionRate,
            averageRating: t.avgRating,
            ratingCount: t.ratingCount,
            uniqueStudents: t.uniqueStudents,
            activeStudents: t.activeStudents,
          }}
        />
      </div>

      {/* -------- Charts row -------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={`${styles.section} lg:col-span-1`}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>
              <BookOpenCheck size={16} className="text-primary" />
              Course Popularity
            </h3>
            <p className={styles.sectionSubtitle}>
              Where you receive the most demand.
            </p>
          </div>
          <div className={`${styles.chartWrap} ${styles.chartHeightMd}`}>
            <CoursePopularityChart data={t.coursePopularity} />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>
              <Layers size={16} className="text-primary" />
              Expertise Mix
            </h3>
            <p className={styles.sectionSubtitle}>
              Active vs inactive listings.
            </p>
          </div>
          <div className={`${styles.chartWrap} ${styles.chartHeightMd}`}>
            <ExpertiseDonut data={expertiseDonutData} />
          </div>
          <div className={styles.chartLegend}>
            {expertiseDonutData.map((d) => (
              <div key={d.name} className={styles.legendItem}>
                <span className={styles.legendLabel}>
                  <span
                    className={styles.legendDot}
                    style={{ background: d.color }}
                  />
                  {d.name}
                </span>
                <span className={styles.legendValue}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>
              <Sparkles size={16} className="text-primary" />
              Profile Completion
            </h3>
            <p className={styles.sectionSubtitle}>
              {t.profilePercent >= 80
                ? "Looking good — students trust complete profiles."
                : "Boost visibility by completing your profile."}
            </p>
          </div>
          <div className={`${styles.chartWrap} ${styles.chartHeightMd}`}>
            <ProfileGauge percent={t.profilePercent} />
          </div>
        </div>
      </div>

      {/* -------- Activity + Assigned students -------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RecentActivity entries={t.activity} />
        <section className={styles.section} aria-labelledby="assigned-title">
          <div className={styles.sectionHead}>
            <h3 id="assigned-title" className={styles.sectionTitle}>
              <Users size={16} className="text-primary" />
              Assigned Students
            </h3>
            <p className={styles.sectionSubtitle}>
              {t.totalAssigned > 0
                ? `Showing ${Math.min(t.assignedStudents.length, 10)} of ${t.totalAssigned} total.`
                : "No students assigned yet."}
            </p>
          </div>
          <AssignedStudentsTable rows={t.assignedStudents} />
        </section>
      </div>
    </section>
  );
}

function shortActionText(text: string): string {
  // Compress verbose action text for chip display.
  const m = text.match(/^(\d+)\s+(.*)/);
  if (m) return m[2].replace(/\bcan be\b/g, "").trim();
  return text.length > 40 ? `${text.slice(0, 39)}…` : text;
}
