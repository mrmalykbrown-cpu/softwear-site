"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CumulativePoint } from "@/lib/stats";

/**
 * Cumulative profit in units.
 *
 * No gridlines and no area fill — a single stroke against a zero line, because
 * the only question the chart answers is which side of zero the account is on
 * and how it got there.
 */
export function UnitsChart({ data }: { data: CumulativePoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        Mark a few bets and your curve will appear here.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#94A3B8", fontSize: 12, fontFamily: "var(--font-plex-mono)" }}
            axisLine={{ stroke: "#1F3050" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#94A3B8", fontSize: 12, fontFamily: "var(--font-plex-mono)" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <ReferenceLine y={0} stroke="#1F3050" strokeWidth={1} />
          <Tooltip
            cursor={{ stroke: "#1F3050" }}
            contentStyle={{
              background: "#16233A",
              border: "1px solid #1F3050",
              borderRadius: 12,
              fontSize: 12,
              fontFamily: "var(--font-plex-mono)",
              color: "#F1F5F9",
            }}
            labelStyle={{ color: "#94A3B8" }}
            formatter={(value) => {
              const units = Number(value);
              return [`${units > 0 ? "+" : ""}${units} units`, "Cumulative"];
            }}
          />
          <Line
            type="monotone"
            dataKey="units"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#3B82F6" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
