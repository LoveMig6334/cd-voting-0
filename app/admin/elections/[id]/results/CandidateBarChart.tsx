"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CandidateData {
  name: string;
  votes: number;
}

interface CandidateBarChartProps {
  data: CandidateData[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string } }>;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-3 border border-slate-200">
        <p className="font-medium text-slate-900">{payload[0].payload.name}</p>
        <p className="text-sm text-slate-600">
          {payload[0].value.toLocaleString()} คะแนน
        </p>
      </div>
    );
  }
  return null;
}

export default function CandidateBarChart({ data }: CandidateBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="votes" radius={[0, 4, 4, 0]} fill="#137fec" barSize={24}>
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={index === 0 ? "#ffb800" : "#137fec"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
