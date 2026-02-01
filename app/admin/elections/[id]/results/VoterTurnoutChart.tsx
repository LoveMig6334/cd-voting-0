"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface VoterTurnoutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  percentage: number;
}

export default function VoterTurnoutChart({
  data,
  percentage,
}: VoterTurnoutChartProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <ResponsiveContainer width={250} height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-slate-900">{percentage}%</span>
          <span className="text-sm text-slate-500">Turnout</span>
        </div>
      </div>
    </div>
  );
}
