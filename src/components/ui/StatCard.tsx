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
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-muted">{title}</h3>
        <div className="p-2 rounded-full" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-main mb-1">{value}</div>
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
