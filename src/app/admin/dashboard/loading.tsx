import React from 'react';

export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col gap-8 pb-12 animate-fade-in">
      {/* Header Skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-color shadow-sm flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-7 w-64 rounded-lg" />
          <div className="skeleton h-4 w-96 rounded-md" />
        </div>
        <div className="skeleton h-9 w-40 rounded-full" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-8 w-16 rounded" />
              </div>
              <div className="skeleton h-12 w-12 rounded-2xl" />
            </div>
            <div className="skeleton h-3 w-full rounded mt-4" />
          </div>
        ))}
      </div>

      {/* Secondary Metrics Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 h-16 skeleton rounded-xl" />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 p-6 h-[420px] skeleton rounded-2xl" />
        <div className="card p-6 h-[420px] skeleton rounded-2xl" />
      </div>
    </div>
  );
}
