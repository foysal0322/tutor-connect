'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Users, GraduationCap, BookOpen, Clock, DollarSign, Activity,
  Briefcase, Building, CreditCard, LifeBuoy, RefreshCw,
  Calendar, Sparkles, ArrowRight, AlertTriangle,
  TrendingUp, UserCheck
} from 'lucide-react';
import styles from './admin-dashboard.module.css';

// Recharts is the single biggest dependency in the admin bundle (~400KB).
// Dynamic-import with ssr:false splits it into its own chunk that loads
// AFTER the dashboard shell paints. See FRONTEND_AUDIT.md F2.
const chartLoading = () => (
  <div className="w-full h-full flex items-center justify-center text-muted text-sm">
    Loading charts…
  </div>
);
const CoursesBarChart = dynamic(() => import('./CoursesBarChart'), {
  ssr: false,
  loading: chartLoading,
});
const StatusDonut = dynamic(() => import('./StatusDonut'), {
  ssr: false,
  loading: chartLoading,
});

interface DashboardData {
  stats: {
    totalStudents: number;
    totalTutors: number;
    blockedUsers: number;
    totalRequests: number;
    pendingRequests: number;
    matchedRequests: number;
    paymentPendingRequests: number;
    completedRequests: number;
    totalDepartments: number;
    totalCourses: number;
    totalExpertises: number;
    pendingWithdrawalsCount: number;
    pendingWithdrawalsAmount: number;
    pendingSupportTickets: number;
    pendingRefunds: number;
    totalBudget: number;
  };
  topCourses: {
    name: string;
    requests: number;
    expertises: number;
  }[];
}

export default function DashboardContent({ data, refreshedAt }: { data: DashboardData; refreshedAt: string }) {
  const { stats, topCourses } = data;

  // Format courses so labels don't overlap on chart X-axis
  const formattedTopCourses = useMemo(() => {
    return topCourses.map(c => ({
      ...c,
      displayName: c.name.length > 14 ? `${c.name.slice(0, 14)}...` : c.name,
      fullName: c.name
    }));
  }, [topCourses]);

  // Pie chart data for tuition request statuses
  const statusData = useMemo(() => [
    { name: 'Pending', value: stats.pendingRequests, color: '#F59E0B' },
    { name: 'Matched / Accepted', value: stats.matchedRequests, color: '#3B82F6' },
    { name: 'Payment Pending', value: stats.paymentPendingRequests, color: '#8B5CF6' },
    { name: 'Completed', value: stats.completedRequests, color: '#10B981' },
  ].filter(d => d.value > 0), [stats]);

  const totalActionsNeeded = stats.pendingWithdrawalsCount + stats.pendingRefunds + stats.pendingSupportTickets;

  return (
    <div className={`${styles.page} animate-fade-in`}>

      {/* ---------- HEADER ---------- */}
      <header className={styles.header}>
        <div className={styles.headerLead}>
          <span className={styles.headerIcon}>
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>Executive Admin Dashboard</h1>
            <p className={styles.headerSub}>
              Real-time marketplace analytics, financial telemetry, and user governance for NSUone.
            </p>
          </div>
        </div>

        <div className={styles.headerMeta}>
          <span className={styles.statusPill}>
            <span className={styles.liveDot} aria-hidden="true" />
            System Operational • Live Sync
          </span>
          <span className={styles.datePill}>
            <Calendar size={14} aria-hidden="true" />
            {format(new Date(), 'MMMM d, yyyy')}
          </span>
          <span className={styles.datePill} title={refreshedAt}>
            <RefreshCw size={14} aria-hidden="true" />
            Last refreshed {format(new Date(refreshedAt), 'h:mm a')}
          </span>
        </div>
      </header>

      {/* ---------- ACTIONABLE ALERT BANNER ---------- */}
      {totalActionsNeeded > 0 && (
        <div className={styles.banner} role="status">
          <div className={styles.bannerLead}>
            <span className={styles.bannerIcon}>
              <AlertTriangle size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className={styles.bannerTitle}>
                Attention Required: Operational Tasks Pending
                <span className={styles.bannerCount}>{totalActionsNeeded} items</span>
              </h2>
              <p className={styles.bannerDesc}>
                You have pending marketplace requests that require administrative resolution or financial payout approval.
              </p>
            </div>
          </div>

          <div className={styles.bannerActions}>
            {stats.pendingWithdrawalsCount > 0 && (
              <Link href="/admin/withdrawals" className={`${styles.bannerBtn} ${styles.bannerBtnAccent}`}>
                <CreditCard size={14} aria-hidden="true" />
                {stats.pendingWithdrawalsCount} Withdrawals (৳{stats.pendingWithdrawalsAmount.toLocaleString()})
              </Link>
            )}
            {stats.pendingRefunds > 0 && (
              <Link href="/admin/requests" className={`${styles.bannerBtn} ${styles.bannerBtnDanger}`}>
                <RefreshCw size={14} aria-hidden="true" />
                {stats.pendingRefunds} Refund Requests
              </Link>
            )}
            {stats.pendingSupportTickets > 0 && (
              <Link href="/admin/support" className={`${styles.bannerBtn} ${styles.bannerBtnInfo}`}>
                <LifeBuoy size={14} aria-hidden="true" />
                {stats.pendingSupportTickets} Support Tickets
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ---------- PRIMARY KPI GRID ---------- */}
      <div className={styles.kpiGrid}>
        {/* Students */}
        <div className={styles.kpi}>
          <div className={styles.kpiHead}>
            <div className={styles.kpiLabelBlock}>
              <span className={styles.kpiLabel}>Student Community</span>
              <div className={styles.kpiValue}>{stats.totalStudents.toLocaleString()}</div>
            </div>
            <span className={`${styles.kpiIcon} ${styles.kpiIconPrimary}`}>
              <GraduationCap size={20} aria-hidden="true" />
            </span>
          </div>
          <div className={styles.kpiFoot}>
            <span className={styles.kpiFootStat}>
              <UserCheck size={13} className="text-success flex-shrink-0" aria-hidden="true" />
              Registered Students
            </span>
            <Link href="/admin/users" className={`${styles.kpiLink} ${styles.kpiLinkPrimary}`}>
              View <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Tutors */}
        <div className={`${styles.kpi} ${styles.kpiSuccess}`}>
          <div className={styles.kpiHead}>
            <div className={styles.kpiLabelBlock}>
              <span className={styles.kpiLabel}>Verified Tutors</span>
              <div className={styles.kpiValue}>{stats.totalTutors.toLocaleString()}</div>
            </div>
            <span className={`${styles.kpiIcon} ${styles.kpiIconSuccess}`}>
              <Users size={20} aria-hidden="true" />
            </span>
          </div>
          <div className={styles.kpiFoot}>
            <span className={styles.kpiFootStat}>
              <Briefcase size={13} className="text-success-hover flex-shrink-0" aria-hidden="true" />
              {stats.totalExpertises} Offerings
            </span>
            <Link href="/admin/users" className={`${styles.kpiLink} ${styles.kpiLinkSuccess}`}>
              View <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Marketplace Volume */}
        <div className={`${styles.kpi} ${styles.kpiAccent}`}>
          <div className={styles.kpiHead}>
            <div className={styles.kpiLabelBlock}>
              <span className={styles.kpiLabel}>Tuition Volume</span>
              <div className={styles.kpiValue}>৳{stats.totalBudget.toLocaleString()}</div>
            </div>
            <span className={`${styles.kpiIcon} ${styles.kpiIconAccent}`}>
              <DollarSign size={20} aria-hidden="true" />
            </span>
          </div>
          <div className={styles.kpiFoot}>
            <span className={styles.kpiFootStat}>
              <TrendingUp size={13} className="text-accent-hover flex-shrink-0" aria-hidden="true" />
              Total Budget Sum
            </span>
            <Link href="/admin/withdrawals" className={`${styles.kpiLink} ${styles.kpiLinkAccent}`}>
              Payouts <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Requests */}
        <div className={`${styles.kpi} ${styles.kpiInfo}`}>
          <div className={styles.kpiHead}>
            <div className={styles.kpiLabelBlock}>
              <span className={styles.kpiLabel}>Tuition Requests</span>
              <div className={styles.kpiValue}>{stats.totalRequests.toLocaleString()}</div>
            </div>
            <span className={`${styles.kpiIcon} ${styles.kpiIconInfo}`}>
              <BookOpen size={20} aria-hidden="true" />
            </span>
          </div>
          <div className={styles.kpiFoot}>
            <span className={styles.kpiFootStat}>
              <Clock size={13} className="text-accent-hover flex-shrink-0" aria-hidden="true" />
              {stats.pendingRequests} Pending
            </span>
            <Link href="/admin/requests" className={`${styles.kpiLink} ${styles.kpiLinkInfo}`}>
              Manage <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* ---------- SECONDARY OPERATIONAL METRICS ROW ---------- */}
      <div className={styles.metricGrid}>
        <Link href="/admin/withdrawals" className={styles.metricTile}>
          <div className={styles.metricTileLead}>
            <span className={`${styles.metricTileIcon} ${styles.metricTileIconAccent}`}>
              <CreditCard size={20} aria-hidden="true" />
            </span>
            <div className={styles.metricTileBody}>
              <div className={styles.metricTileLabel}>Tutor Withdrawals</div>
              <div className={styles.metricTileValue}>
                {stats.pendingWithdrawalsCount} Pending <span className="text-muted font-medium">(৳{stats.pendingWithdrawalsAmount.toLocaleString()})</span>
              </div>
            </div>
          </div>
          <ArrowRight size={16} className={styles.metricTileArrow} aria-hidden="true" />
        </Link>

        <Link href="/admin/requests" className={styles.metricTile}>
          <div className={styles.metricTileLead}>
            <span className={`${styles.metricTileIcon} ${styles.metricTileIconDanger}`}>
              <RefreshCw size={20} aria-hidden="true" />
            </span>
            <div className={styles.metricTileBody}>
              <div className={styles.metricTileLabel}>Refund Requests</div>
              <div className={styles.metricTileValue}>{stats.pendingRefunds} Pending Resolution</div>
            </div>
          </div>
          <ArrowRight size={16} className={styles.metricTileArrow} aria-hidden="true" />
        </Link>

        <Link href="/admin/support" className={styles.metricTile}>
          <div className={styles.metricTileLead}>
            <span className={`${styles.metricTileIcon} ${styles.metricTileIconInfo}`}>
              <LifeBuoy size={20} aria-hidden="true" />
            </span>
            <div className={styles.metricTileBody}>
              <div className={styles.metricTileLabel}>Support Tickets</div>
              <div className={styles.metricTileValue}>{stats.pendingSupportTickets} Open Tickets</div>
            </div>
          </div>
          <ArrowRight size={16} className={styles.metricTileArrow} aria-hidden="true" />
        </Link>

        <Link href="/admin/courses" className={styles.metricTile}>
          <div className={styles.metricTileLead}>
            <span className={`${styles.metricTileIcon} ${styles.metricTileIconPrimary}`}>
              <Building size={20} aria-hidden="true" />
            </span>
            <div className={styles.metricTileBody}>
              <div className={styles.metricTileLabel}>Academic Catalog</div>
              <div className={styles.metricTileValue}>{stats.totalDepartments} Depts • {stats.totalCourses} Courses</div>
            </div>
          </div>
          <ArrowRight size={16} className={styles.metricTileArrow} aria-hidden="true" />
        </Link>
      </div>

      {/* ---------- ANALYTICAL VISUALIZATIONS ROW ---------- */}
      <div className={styles.chartGrid}>
        {/* Left Chart: Course Demand vs Supply */}
        <div className={styles.chartCard}>
          <div className={styles.chartHead}>
            <div className="min-w-0">
              <h3 className={styles.chartTitle}>
                <Activity size={16} className="text-primary flex-shrink-0" aria-hidden="true" />
                Course Demand vs. Tutor Supply
              </h3>
              <p className={styles.chartSub}>
                Student tuition requests (demand) vs available tutor course expertises (supply).
              </p>
            </div>
            <div className={styles.chartLegendInline}>
              <span className={styles.legendSwatch}>
                <span className={styles.swatch} style={{ background: 'var(--primary)' }} />
                Requests
              </span>
              <span className={styles.legendSwatch}>
                <span className={styles.swatch} style={{ background: 'var(--success)' }} />
                Offerings
              </span>
            </div>
          </div>

          <div className={styles.chartArea}>
            <CoursesBarChart data={formattedTopCourses} />
          </div>
        </div>

        {/* Right Chart: Request Status Donut */}
        <div className={styles.chartCard}>
          <div>
            <h3 className={styles.chartTitle}>
              <Clock size={16} className="text-accent-hover flex-shrink-0" aria-hidden="true" />
              Tuition Request Lifecycle
            </h3>
            <p className={styles.chartSub}>
              Breakdown of all requests across fulfillment status.
            </p>
          </div>

          <div className={styles.chartAreaSm}>
            <StatusDonut data={statusData} />
          </div>

          <div className={styles.statusLegend}>
            {statusData.map((s, idx) => (
              <div key={idx} className={styles.statusLegendItem}>
                <span className={styles.statusLegendLabel}>
                  <span className={styles.statusLegendDot} style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
                <span className={styles.statusLegendValue}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
