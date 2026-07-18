"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  chartAxisTick,
  chartColors,
  chartTooltipStyle,
} from "@/utils/chart-theme";

type Props = {
  stats: DashboardStats;
};

export function StatsCharts({ stats }: Props) {
  const categoryChart = [...stats.byCategory]
    .map((row) => ({
      ...row,
      category:
        row.category.charAt(0).toUpperCase() + row.category.slice(1).toLowerCase(),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Reports by category</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryChart} barCategoryGap="28%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.grid}
                vertical={false}
              />
              <XAxis
                dataKey="category"
                tick={chartAxisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={chartAxisTick}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ fill: "rgba(43, 181, 174, 0.08)" }}
              />
              <Bar
                dataKey="count"
                fill={chartColors.brand}
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly intake trend</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.weeklyTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.grid}
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={chartAxisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={chartAxisTick}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line
                type="monotone"
                dataKey="reports"
                stroke={chartColors.brand}
                strokeWidth={2.5}
                dot={{ r: 4, fill: chartColors.brand, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
