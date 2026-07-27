'use client';

/**
 * Donut chart of tuition-request lifecycle status. Extracted so the recharts
 * bundle is dynamically imported. See FRONTEND_AUDIT.md F2.
 */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface StatusRow {
  name: string;
  value: number;
  color: string;
}

export default function StatusDonut({ data }: { data: StatusRow[] }) {
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted text-sm">
        No request status data yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={6}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
