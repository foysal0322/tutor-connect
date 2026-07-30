import React from 'react';

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
};

export default function StatCard({ title, value, icon, trend, className = '' }: StatCardProps) {
  return (
    <div className={`card ${className}`}>
      <div className="flex justify-between items-start mb-2 gap-2 min-w-0">
        <h3 className="text-sm font-medium text-muted truncate min-w-0 flex-1">{title}</h3>
        <div className="p-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
          {icon}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-main mb-0 truncate">{value}</div>
        {trend && (
          <div className={`text-xs font-medium flex items-center gap-1 ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
            <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
            <span className="text-muted font-normal ml-1">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
