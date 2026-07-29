'use client';

/**
 * Donut chart showing a tutor's expertise split: active vs inactive listings.
 * Extracted so recharts is dynamically imported (admin pattern, F2).
 */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface ExpertiseDonutProps {
  data: { name: string; value: number; color: string }[];
}

export default function ExpertiseDonut({ data }: ExpertiseDonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
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
        aria-label="No expertise listed yet"
      >
        No expertise listed yet.
      </div>
    );
  }

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      aria-label={`Expertise breakdown: ${data
        .filter((d) => d.value > 0)
        .map((d) => `${d.value} ${d.name.toLowerCase()}`)
        .join(', ')}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={total > 1 ? 4 : 0}
            dataKey="value"
            stroke="none"
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
              background: '#FFFFFF',
              fontSize: '12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
