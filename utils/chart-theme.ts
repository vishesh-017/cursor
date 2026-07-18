/** Shared Recharts styling that stays readable in light + dark. */

export const chartColors = {
  brand: "#2bb5ae",
  brandStrong: "#0f766e",
  accent: "#f59e0b",
  danger: "#f43f5e",
  muted: "#94a3b8",
  grid: "var(--border)",
  tick: "#94a3b8",
  tooltipBg: "var(--surface-solid)",
  tooltipBorder: "var(--border)",
};

export const chartAxisTick = {
  fontSize: 12,
  fill: chartColors.tick,
};

export const chartTooltipStyle = {
  backgroundColor: "var(--surface-solid)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
};
