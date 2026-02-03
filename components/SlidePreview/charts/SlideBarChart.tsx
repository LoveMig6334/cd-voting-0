"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarChartData } from "../types";

interface SlideBarChartProps {
  data: BarChartData[];
  showPercentage?: boolean;
  maxHeight?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: BarChartData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white shadow-lg rounded-lg p-3 border border-slate-200">
        <p className="font-medium text-slate-900">{data.name}</p>
        <p className="text-sm text-slate-600">
          {data.votes.toLocaleString()} คะแนน ({data.percentage.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
}

export default function SlideBarChart({
  data,
  showPercentage = true,
  maxHeight = 300,
}: SlideBarChartProps) {
  // Calculate bar height based on number of candidates
  const barSize = Math.min(40, Math.max(24, 280 / data.length));
  const chartHeight = Math.min(maxHeight, data.length * (barSize + 16) + 40);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fill: "#475569", fontSize: 14 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar
          dataKey="votes"
          radius={[0, 6, 6, 0]}
          barSize={barSize}
          animationBegin={300}
          animationDuration={800}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isWinner ? "#ffb800" : "#137fec"}
            />
          ))}
          {showPercentage && (
            <LabelList
              dataKey="votes"
              position="right"
              fill="#64748b"
              fontSize={12}
              formatter={(value) => {
                if (value === undefined || value === null) return "";
                const numValue = Number(value);
                const item = data.find((d) => d.votes === numValue);
                return item
                  ? `${numValue.toLocaleString()} (${item.percentage.toFixed(1)}%)`
                  : numValue.toLocaleString();
              }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
