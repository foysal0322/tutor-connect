'use client';

/**
 * Bar chart comparing course demand (student requests) vs supply (tutor
 * expertises). Extracted so the recharts bundle is dynamically imported.
 * See FRONTEND_AUDIT.md F2.
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface TopCourseRow {
  displayName: string;
  fullName: string;
  requests: number;
  expertises: number;
}

export default function CoursesBarChart({ data }: { data: TopCourseRow[] }) {
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted text-sm">
        No course data available yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 45 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis
          dataKey="displayName"
          axisLine={false}
          tickLine={false}
          angle={-25}
          textAnchor="end"
          height={60}
          tick={{ fontSize: 11, fill: '#64748B' }}
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
        <RechartsTooltip
          cursor={{ fill: '#F8FAFC' }}
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            background: '#FFFFFF',
          }}
          formatter={(value: any, name: any) => [value, name]}
          labelFormatter={(label, payload) => {
            if (payload && payload.length > 0) {
              return (payload[0].payload as any).fullName;
            }
            return label;
          }}
        />
        <Bar dataKey="requests" name="Student Requests" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={24} />
        <Bar dataKey="expertises" name="Tutor Offerings" fill="#10B981" radius={[6, 6, 0, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
