'use client';

import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface Props {
  color: string;
  value: number;
}

function generateSparkData(value: number) {
  const points = 8;
  const base = Math.max(value * 0.6, 1);
  return Array.from({ length: points }, (_, i) => ({
    v: Math.round(base + Math.random() * value * 0.5 * (0.5 + i / points)),
  }));
}

export default function StatCardSparkline({ color, value }: Props) {
  const data = generateSparkData(value);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${color.replace('#', '')})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
