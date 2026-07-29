'use client';

/**
 * Horizontal bar chart: top courses assigned to the tutor, ranked by
 * number of student requests received. Demonstrates which subjects the
 * tutor is most in demand for.
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';

interface CourseRow {
  name: string;
  shortName: string;
  requests: number;
}

const BAR_COLORS = ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE'];

export default function CoursePopularityChart({ data }: { data: CourseRow[] }) {
  if (data.length === 0 || data.every((d) => d.requests === 0)) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
        }}
        aria-label="No assigned requests yet"
      >
        No assigned requests yet.
      </div>
    );
  }

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      aria-label={`Top courses by assigned requests: ${data
        .filter((d) => d.requests > 0)
        .map((d) => `${d.name} (${d.requests})`)
        .join(', ')}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          barCategoryGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#64748B' }}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            axisLine={false}
            tickLine={false}
            width={110}
            tick={{ fontSize: 12, fill: '#475569' }}
          />
          <RechartsTooltip
            cursor={{ fill: '#F8FAFC' }}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              background: '#FFFFFF',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value} requests`, 'Assigned']}
            labelFormatter={(_, payload) =>
              payload && payload.length > 0
                ? (payload[0].payload as CourseRow).name
                : ''
            }
          />
          <Bar dataKey="requests" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((_, index) => (
              <Cell key={`bar-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
