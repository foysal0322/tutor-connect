"use client";

/**
 * Client orchestrator for the unified dashboard. Mirrors the admin pattern:
 * dynamic-imports recharts (ssr:false) so the heavy chart bundle loads after
 * first paint. Server page handles all data fetching; this component is
 * presentational + owns the Tabs state.
 */

import React, { useMemo } from "react";
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
import Tabs from "@/components/ui/Tabs";
import ActionCenter, { type ActionItem } from "./sections/ActionCenter";
import PerformanceSummary from "./sections/PerformanceSummary";
import RecentActivity, { type ActivityEntry } from "./sections/RecentActivity";
import AssignedStudentsTable, {
  type AssignedStudent,
} from "./sections/AssignedStudentsTable";
import styles from "./dashboard.module.css";

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
const ExpertiseDonut = dynamic(() => import("./charts/ExpertiseDonut"), {
  ssr: false,
  loading: chartLoading,
});
const CoursePopularityChart = dynamic(
  () => import("./charts/CoursePopularityChart"),
  { ssr: false, loading: chartLoading }
);
const ProfileGauge = dynamic(() => import("./charts/ProfileGauge"), {
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

// ---- Types ----
export interface CoursePopularityRow {
  name: string;
  shortName: string;
  requests: number;
}

export type ActionItemDTO = {
  id: string;
  text: string;
  count?: number;
  href: string;
  /** String icon key resolved to a LucideIcon on the client. */
  icon: "awaiting" | "inactive" | "profile" | "withdraw";
  iconTone: "primary" | "accent" | "info" | "success";
};

export interface DashboardData {
  firstName: string;
  todayLong: string;
  userBalance: number;
  isTutor: boolean;
  teachingBadge: string;
  /** Active learning requests — steers default tab in <Tabs>. */
  learningCount: number;
  teaching: {
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
  };
}

interface DashboardContentProps {
  data: DashboardData;
  learningPanel: React.ReactNode;
}

// ---- KPI card primitive (calm evolution — no border-l stripe) ----
type KpiTone = "primary" | "success" | "accent" | "info" | "neutral";

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  foot,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: KpiTone;
  foot?: string;
}) {
  const toneIconClass = {
    primary: styles.kpiIconPrimary,
    success: styles.kpiIconSuccess,
    accent: styles.kpiIconAccent,
    info: styles.kpiIconInfo,
    neutral: styles.kpiIconNeutral,
  }[tone];

  return (
    <div className={styles.kpi}>
      <div className={styles.kpiHead}>
        <p className={styles.kpiLabel}>{label}</p>
        <span className={`${styles.kpiIcon} ${toneIconClass}`}>
          <Icon size={18} />
        </span>
      </div>
      <div>
        <p className={styles.kpiValue}>{value}</p>
        {foot && <div className={styles.kpiFoot}>{foot}</div>}
      </div>
    </div>
  );
}

export default function DashboardContent({
  data,
  learningPanel,
}: DashboardContentProps) {
  const {
    firstName,
    todayLong,
    userBalance,
    teaching,
  } = data;

  // Resolve action items (server sends string icon keys — map to components).
  const actionItems: ActionItem[] = teaching.actionItems.map((a) => ({
    ...a,
    icon: ACTION_ICONS[a.icon] ?? AlertCircle,
  }));

  // Donut data for expertise distribution
  const expertiseDonutData = useMemo(
    () => [
      { name: "Active", value: teaching.activeExpertise, color: "#4F46E5" },
      { name: "Inactive", value: teaching.inactiveExpertise, color: "#CBD5E1" },
    ],
    [teaching.activeExpertise, teaching.inactiveExpertise]
  );

  // Teaching tab count drives the default-active tab (Tabs picks highest).
  const teachingCount =
    teaching.activeStudents +
    teaching.awaitingAction +
    teaching.activeExpertise;
  const learningCount = data.learningCount;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* -------- Header (role-neutral — tabs own role-specific CTAs) -------- */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div style={{ minWidth: 0 }}>
            <h1 className={styles.greeting}>Welcome back, {firstName}.</h1>
            <p className={styles.subtext}>{todayLong}</p>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.pill}>
              <Wallet size={12} />৳{userBalance.toLocaleString()} balance
            </span>
            <Link
              href="/profile"
              className={`btn-secondary ${styles.pill}`}
              style={{ textDecoration: "none" }}
            >
              <UserCircle2 size={14} />
              Profile
            </Link>
          </div>
        </div>
      </header>

      <Tabs
        tabs={[
          { id: "learning", label: "Learning", count: learningCount },
          { id: "teaching", label: "Teaching", count: teachingCount },
        ]}
        panels={{
          learning: learningPanel,
          teaching: (
            <TeachingPanel
              data={data}
              actionItems={actionItems}
              expertiseDonutData={expertiseDonutData}
            />
          ),
        }}
      />
    </div>
  );
}

// -------- Teaching panel (only meaningful when isTutor) --------
function TeachingPanel({
  data,
  actionItems,
  expertiseDonutData,
}: {
  data: DashboardData;
  actionItems: ActionItem[];
  expertiseDonutData: { name: string; value: number; color: string }[];
}) {
  const t = data.teaching;

  if (!data.isTutor) {
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

  const bannerCount = actionItems.length;
  const showBanner = bannerCount > 0;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="teaching-heading">
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
        <Kpi
          label="Active Students"
          value={t.activeStudents}
          icon={Users}
          tone="primary"
          foot="Currently in ACCEPTED status"
        />
        <Kpi
          label="Awaiting Action"
          value={t.awaitingAction}
          icon={Clock}
          tone="accent"
          foot="Matched requests to review"
        />
        <Kpi
          label="Completed"
          value={t.completedSessions}
          icon={CheckCircle2}
          tone="success"
          foot="Sessions delivered"
        />
        <Kpi
          label="Avg Rating"
          value={t.avgRating === null ? "—" : `${t.avgRating}★`}
          icon={Star}
          tone="info"
          foot={
            t.ratingCount > 0
              ? `From ${t.ratingCount} review${t.ratingCount === 1 ? "" : "s"}`
              : "No reviews yet"
          }
        />
      </div>

      {/* -------- KPI Row 2 -------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Unique Students"
          value={t.uniqueStudents}
          icon={Users}
          tone="neutral"
          foot="Distinct learners taught"
        />
        <Kpi
          label="Total Earnings"
          value={`৳${t.totalEarnings.toLocaleString()}`}
          icon={DollarSign}
          tone="success"
          foot="From completed sessions"
        />
        <Kpi
          label="Active Expertise"
          value={t.activeExpertise}
          icon={BookOpenCheck}
          tone="primary"
          foot="Visible to students"
        />
        <Kpi
          label="Inactive"
          value={t.inactiveExpertise}
          icon={Layers}
          tone="neutral"
          foot="Hidden from search"
        />
      </div>

      {/* -------- Action Center + Performance Summary -------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
