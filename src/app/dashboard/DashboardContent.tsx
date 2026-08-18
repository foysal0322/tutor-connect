"use client";

/**
 * Client orchestrator for the unified dashboard (Phase 3 redesign).
 *
 * Owns the shell header (greeting + balance pill + profile link) and the
 * Learning/Teaching tab strip. Panel content is produced by async server
 * components (LearningPanel / TeachingPanel) and streamed in via React nodes,
 * each wrapped in its own <Suspense> boundary by the server page.
 *
 * Tabs owns the focus-hint side-effect (Phase 2): the active tab is persisted
 * to localStorage so the sidebar can emphasize the matching nav group.
 */

import React from "react";
import Link from "next/link";
import { Wallet, UserCircle2, BookOpen, GraduationCap } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import { writeMemberFocus } from "@/components/layout/member-focus";
import styles from "./dashboard.module.css";

/** Shell-level data — just what the header + tab strip need. */
export interface DashboardShellData {
  firstName: string;
  todayLong: string;
  userBalance: number;
  isTutor: boolean;
  /** Active learning requests — steers default tab in <Tabs>. */
  learningCount: number;
  /** Derived from teaching activity — steers default tab in <Tabs>. */
  teachingCount: number;
}

interface DashboardContentProps {
  data: DashboardShellData;
  learningPanel: React.ReactNode;
  teachingPanel: React.ReactNode;
  /**
   * When provided (fresh member with no learning/teaching activity), renders a
   * guided onboarding panel instead of the Learning/Teaching tabs.
   */
  onboarding?: React.ReactNode;
}

export default function DashboardContent({
  data,
  learningPanel,
  teachingPanel,
  onboarding,
}: DashboardContentProps) {
  const { firstName, todayLong, userBalance, learningCount, teachingCount } = data;

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* -------- Header (role-neutral — tabs own role-specific CTAs) -------- */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div style={{ minWidth: 0 }}>
            <h1 className={styles.greeting}>Welcome back, {firstName}.</h1>
            <p className={styles.subtext}>{todayLong}</p>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.balancePill}>
              <span className={styles.balanceIcon}>
                <Wallet size={12} />
              </span>
              <span className={styles.balanceLabel}>Balance:</span>
              <span className={styles.balanceAmount}>
                {userBalance.toLocaleString()} TK
              </span>
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

      {onboarding ?? (
        <Tabs
          tabs={[
            {
              id: "learning",
              label: (
                <>
                  <BookOpen size={16} aria-hidden='true' />
                  Learning
                </>
              ),
              count: learningCount,
            },
            {
              id: "teaching",
              label: (
                <>
                  <GraduationCap size={16} aria-hidden='true' />
                  Teaching
                </>
              ),
              count: teachingCount,
            },
          ]}
          onSelect={(id) => {
            // Persist the active workflow as the member shell's focus hint.
            // Sidebar reads this to emphasize the matching nav group. Pure
            // presentation; no session or role change. See member-focus.ts.
            if (id === "learning" || id === "teaching") writeMemberFocus(id);
          }}
          panels={{
            learning: learningPanel,
            teaching: teachingPanel,
          }}
        />
      )}
    </div>
  );
}
