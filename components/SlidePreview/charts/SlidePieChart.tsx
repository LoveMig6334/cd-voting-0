"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PieChartData } from "../types";

interface SlidePieChartProps {
  data: PieChartData[];
  percentage: number;
  centerLabel?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { width: 180, height: 180, innerRadius: 50, outerRadius: 70 },
  md: { width: 250, height: 250, innerRadius: 70, outerRadius: 100 },
  lg: { width: 320, height: 320, innerRadius: 90, outerRadius: 130 },
};

export default function SlidePieChart({
  data,
  percentage,
  centerLabel = "Turnout",
  size = "md",
}: SlidePieChartProps) {
  const { width, height, innerRadius, outerRadius } = sizes[size];

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <ResponsiveContainer width={width} height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              animationBegin={200}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              formatter={(value) => [
                `${Number(value).toLocaleString()} คน`,
                "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className={`font-bold text-slate-900 ${
              size === "lg"
                ? "text-5xl"
                : size === "md"
                  ? "text-4xl"
                  : "text-3xl"
            }`}
          >
            {percentage}%
          </span>
          <span
            className={`text-slate-500 ${
              size === "lg" ? "text-base" : "text-sm"
            }`}
          >
            {centerLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
