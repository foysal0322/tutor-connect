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

export default function DashboardContent({ data }: { data: DashboardData }) {
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
    <div className="flex flex-col gap-8 pb-12 animate-fade-in w-full max-w-full overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-color shadow-sm w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center justify-center p-2 rounded-xl bg-primary-light text-primary flex-shrink-0">
              <Sparkles size={22} />
            </span>
            <h1 className="text-2xl font-bold text-main m-0 leading-tight">Executive Admin Dashboard</h1>
          </div>
          <p className="text-muted text-sm m-0 leading-relaxed">
            Real-time marketplace analytics, financial telemetry, and user governance for NSUone.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end flex-shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-success-light text-success-hover text-xs font-semibold border border-success/20 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse flex-shrink-0" />
            System Operational • Live Sync
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 border border-color text-muted text-xs font-medium whitespace-nowrap">
            <Calendar size={14} className="text-primary flex-shrink-0" />
            {format(new Date(), 'MMMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* ACTIONABLE ALERT BANNER */}
      {totalActionsNeeded > 0 && (
        <div 
          className="p-5 rounded-2xl border flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shadow-sm w-full"
          style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)', borderColor: '#FDE68A' }}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm mt-0.5 flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-amber-950 m-0 flex flex-wrap items-center gap-2 leading-snug">
                Attention Required: Operational Tasks Pending
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-bold whitespace-nowrap">
                  {totalActionsNeeded} items
                </span>
              </h3>
              <p className="text-sm text-amber-800 m-0 mt-1 leading-relaxed">
                You have pending marketplace requests that require administrative resolution or financial payout approval.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end flex-shrink-0">
            {stats.pendingWithdrawalsCount > 0 && (
              <Link 
                href="/admin/withdrawals" 
                className="btn btn-action bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <CreditCard size={14} className="text-amber-600 flex-shrink-0" />
                {stats.pendingWithdrawalsCount} Withdrawals (৳{stats.pendingWithdrawalsAmount.toLocaleString()})
              </Link>
            )}
            {stats.pendingRefunds > 0 && (
              <Link 
                href="/admin/requests" 
                className="btn btn-action bg-white hover:bg-rose-50 text-rose-900 border border-rose-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <RefreshCw size={14} className="text-rose-600 flex-shrink-0" />
                {stats.pendingRefunds} Refund Requests
              </Link>
            )}
            {stats.pendingSupportTickets > 0 && (
              <Link 
                href="/admin/support" 
                className="btn btn-action bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <LifeBuoy size={14} className="text-blue-600 flex-shrink-0" />
                {stats.pendingSupportTickets} Support Tickets
              </Link>
            )}
          </div>
        </div>
      )}

      {/* PRIMARY KPI STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        
        {/* Card 1: Students */}
        <div className="card card-hover p-5 flex flex-col justify-between border-l-4 border-l-primary relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1 truncate">Student Community</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-main truncate">{stats.totalStudents.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-2xl bg-primary-light text-primary shadow-sm flex-shrink-0">
              <GraduationCap size={24} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-color text-xs gap-2 flex-wrap">
            <span className="text-muted flex items-center gap-1 truncate min-w-0">
              <UserCheck size={14} className="text-success flex-shrink-0" /> <span className="truncate">Active Learners</span>
            </span>
            <Link href="/admin/users" className="text-primary font-semibold hover:underline flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap">
              View <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Card 2: Tutors */}
        <div className="card card-hover p-5 flex flex-col justify-between border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <div className="flex justify-between items-start mb-4 gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1 truncate">Verified Tutors</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-main truncate">{stats.totalTutors.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-2xl bg-success-light text-success-hover shadow-sm flex-shrink-0">
              <Users size={24} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-color text-xs gap-2 flex-wrap">
            <span className="text-muted flex items-center gap-1 truncate min-w-0">
              <Briefcase size={14} className="text-success-hover flex-shrink-0" /> <span className="truncate">{stats.totalExpertises} Offerings</span>
            </span>
            <Link href="/admin/users" className="text-success-hover font-semibold hover:underline flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap">
              View <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Card 3: Marketplace Volume */}
        <div className="card card-hover p-5 flex flex-col justify-between border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <div className="flex justify-between items-start mb-4 gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1 truncate">Tuition Volume</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-main truncate">৳{stats.totalBudget.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-2xl bg-accent-light text-accent-hover shadow-sm flex-shrink-0">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-color text-xs gap-2 flex-wrap">
            <span className="text-muted flex items-center gap-1 truncate min-w-0">
              <TrendingUp size={14} className="text-accent-hover flex-shrink-0" /> <span className="truncate">Total Budget Sum</span>
            </span>
            <Link href="/admin/withdrawals" className="text-accent-hover font-semibold hover:underline flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap">
              Payouts <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Card 4: Requests */}
        <div className="card card-hover p-5 flex flex-col justify-between border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <div className="flex justify-between items-start mb-4 gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1 truncate">Tuition Requests</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-main truncate">{stats.totalRequests.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-2xl bg-info-light text-info-hover shadow-sm flex-shrink-0">
              <BookOpen size={24} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-color text-xs gap-2 flex-wrap">
            <span className="text-muted flex items-center gap-1 truncate min-w-0">
              <Clock size={14} className="text-warning flex-shrink-0" /> <span className="truncate">{stats.pendingRequests} Pending</span>
            </span>
            <Link href="/admin/requests" className="text-info-hover font-semibold hover:underline flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap">
              Manage <ArrowRight size={12} />
            </Link>
          </div>
        </div>

      </div>

      {/* SECONDARY OPERATIONAL METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <Link href="/admin/withdrawals" className="card card-hover p-4 flex items-center justify-between bg-white border border-color transition-all hover:border-amber-400 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 flex-shrink-0">
              <CreditCard size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-muted truncate">Tutor Withdrawals</div>
              <div className="text-sm sm:text-base font-bold text-main mt-0.5 truncate">
                {stats.pendingWithdrawalsCount} Pending <span className="text-xs font-normal text-muted">(৳{stats.pendingWithdrawalsAmount.toLocaleString()})</span>
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-muted flex-shrink-0" />
        </Link>

        <Link href="/admin/requests" className="card card-hover p-4 flex items-center justify-between bg-white border border-color transition-all hover:border-rose-400 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 flex-shrink-0">
              <RefreshCw size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-muted truncate">Refund Requests</div>
              <div className="text-sm sm:text-base font-bold text-main mt-0.5 truncate">
                {stats.pendingRefunds} Pending Resolution
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-muted flex-shrink-0" />
        </Link>

        <Link href="/admin/support" className="card card-hover p-4 flex items-center justify-between bg-white border border-color transition-all hover:border-blue-400 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
              <LifeBuoy size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-muted truncate">Support Tickets</div>
              <div className="text-sm sm:text-base font-bold text-main mt-0.5 truncate">
                {stats.pendingSupportTickets} Open Tickets
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-muted flex-shrink-0" />
        </Link>

        <Link href="/admin/courses" className="card card-hover p-4 flex items-center justify-between bg-white border border-color transition-all hover:border-indigo-400 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
              <Building size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-muted truncate">Academic Catalog</div>
              <div className="text-sm sm:text-base font-bold text-main mt-0.5 truncate">
                {stats.totalDepartments} Depts • {stats.totalCourses} Courses
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-muted flex-shrink-0" />
        </Link>
      </div>

      {/* ANALYTICAL VISUALIZATIONS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* Left Chart: Course Demand vs Supply */}
        <div className="card lg:col-span-2 p-6 flex flex-col justify-between bg-white border border-color shadow-sm min-h-[460px] min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-main m-0 flex items-center gap-2">
                <Activity size={18} className="text-primary flex-shrink-0" />
                <span className="truncate">Course Demand vs. Tutor Supply</span>
              </h3>
              <p className="text-xs text-muted m-0 mt-0.5 leading-relaxed">
                Comparison of student tuition requests (demand) against available tutor course expertises (supply).
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium flex-shrink-0">
              <span className="flex items-center gap-1.5 text-main whitespace-nowrap">
                <span className="w-3 h-3 rounded-full bg-primary inline-block flex-shrink-0" /> Student Requests
              </span>
              <span className="flex items-center gap-1.5 text-main whitespace-nowrap">
                <span className="w-3 h-3 rounded-full bg-success inline-block flex-shrink-0" /> Tutor Offerings
              </span>
            </div>
          </div>

          <div className="w-full h-[340px] pt-2">
            <CoursesBarChart data={formattedTopCourses} />
          </div>
        </div>

        {/* Right Chart: Request Status Donut */}
        <div className="card p-6 flex flex-col justify-between bg-white border border-color shadow-sm min-h-[460px] min-w-0">
          <div>
            <h3 className="text-lg font-bold text-main m-0 flex items-center gap-2">
              <Clock size={18} className="text-amber-500 flex-shrink-0" />
              <span className="truncate">Tuition Request Lifecycle</span>
            </h3>
            <p className="text-xs text-muted m-0 mt-0.5 leading-relaxed">
              Current breakdown of all requests across their fulfillment status.
            </p>
          </div>

          <div className="w-full h-[240px] my-4">
            <StatusDonut data={statusData} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 border-t border-color text-xs mt-auto">
            {statusData.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-color gap-2 min-w-0">
                <span className="flex items-center gap-1.5 font-medium text-main min-w-0 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="font-bold text-main ml-1 flex-shrink-0">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
