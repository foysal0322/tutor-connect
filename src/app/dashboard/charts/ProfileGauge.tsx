'use client';

/**
 * Radial gauge showing tutor profile completion percentage. The five
 * contributing fields are weighted equally (20% each): gender,
 * departmentId, cgpa, has any expertise, has an active expertise.
 *
 * Implementation note: Recharts' RadialBarChart adds asymmetric internal
 * padding when sized via ResponsiveContainer, which causes the absolute-
 * positioned center label to drift off the ring's true center. We pin the
 * gauge to a square (aspect-ratio 1) that fills the available height, and
 * size the ResponsiveContainer to that square so the label and ring stay
 * aligned. Filling the height (instead of a fixed 180px) keeps the gauge
 * visually aligned with the ExpertiseDonut and CoursePopularity cards it
 * shares a row with.
 */

import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';

interface ProfileGaugeProps {
  /** 0-100 */
  percent: number;
}

function colorFor(p: number) {
  if (p < 40) return '#EF4444'; // red
  if (p < 80) return '#F59E0B'; // amber
  return '#22C55E'; // emerald
}

export default function ProfileGauge({ percent }: ProfileGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const fill = colorFor(clamped);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label={`Profile ${clamped}% complete.`}
    >
      <div
        style={{
          position: 'relative',
          /* Largest square that fits the chart wrapper — keeps the ring and
             the absolute center label perfectly concentric. */
          height: '100%',
          aspectRatio: '1 / 1',
          maxWidth: '100%',
          flexShrink: 0,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={[{ name: 'profile', value: clamped, fill }]}
            startAngle={90}
            endAngle={-270}
            cx="50%"
            cy="50%"
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: '#F1F5F9' }}
              dataKey="value"
              cornerRadius={12}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#0F172A',
              lineHeight: 1,
            }}
          >
            {clamped}%
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#64748B',
              marginTop: 4,
            }}
          >
            complete
          </span>
        </div>
      </div>
    </div>
  );
}
