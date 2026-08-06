"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatPrice } from "@/lib/money";

export type DailyDataPoint = {
  day: string;
  orders: number;
  revenueMinor: number;
};

export function InteractiveChart({
  data,
  height = 140,
}: {
  data: DailyDataPoint[];
  height?: number;
}) {
  const [mode, setMode] = useState<"orders" | "revenue">("orders");
  const [hoveredPoint, setHoveredPoint] = useState<DailyDataPoint | null>(null);
  const reduce = useReducedMotion();

  if (data.length === 0) return null;

  const maxOrders = Math.max(1, ...data.map((d) => d.orders));
  const maxRevenue = Math.max(1, ...data.map((d) => d.revenueMinor));
  const peakDay = [...data].sort((a, b) => b.revenueMinor - a.revenueMinor)[0];

  const gap = 4;
  const width = 320;
  const barWidth = (width - gap * (data.length - 1)) / data.length;

  // Generate SVG path points for line chart
  const points = data.map((d, i) => {
    const val = mode === "orders" ? d.orders : d.revenueMinor;
    const maxVal = mode === "orders" ? maxOrders : maxRevenue;
    const x = i * (barWidth + gap) + barWidth / 2;
    const y = height - (val === 0 ? 4 : (val / maxVal) * (height - 20));
    return { x, y, data: d };
  });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    "",
  );

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="space-y-4">
      {/* Header controls & toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface-sunken p-1 border border-line">
          <button
            type="button"
            onClick={() => setMode("orders")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              mode === "orders"
                ? "bg-forest text-paper shadow-sm"
                : "text-muted hover:text-strong"
            }`}
          >
            Orders Velocity
          </button>
          <button
            type="button"
            onClick={() => setMode("revenue")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              mode === "revenue"
                ? "bg-forest text-paper shadow-sm"
                : "text-muted hover:text-strong"
            }`}
          >
            Revenue Curve
          </button>
        </div>

        {peakDay && peakDay.revenueMinor > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            <span>
              Peak:{" "}
              <strong className="text-strong font-medium">
                {formatPrice(peakDay.revenueMinor)}
              </strong>{" "}
              (
              {new Date(peakDay.day).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
              )
            </span>
          </div>
        )}
      </div>

      {/* Chart Canvas & Hover Tooltip */}
      <div className="relative rounded-2xl border border-line/70 bg-surface-raised p-4 transition-all">
        {/* Tooltip Float */}
        {hoveredPoint && (
          <div className="pointer-events-none absolute top-3 right-4 z-20 rounded-xl border border-line bg-surface-raised/95 px-3 py-2 text-xs backdrop-blur shadow-lg transition-all">
            <p className="font-semibold text-strong">
              {new Date(hoveredPoint.day).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
            <div className="mt-1 flex items-center gap-3 text-muted">
              <span>
                <strong className="text-strong">{hoveredPoint.orders}</strong>{" "}
                {hoveredPoint.orders === 1 ? "order" : "orders"}
              </span>
              <span>•</span>
              <span className="text-[var(--live)] font-semibold">
                {formatPrice(hoveredPoint.revenueMinor)}
              </span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[140px] w-full overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Mode 2: Area Curve */}
          {mode === "revenue" && (
            <>
              <motion.path
                d={areaD}
                fill="url(#chartGradient)"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
              <motion.path
                d={pathD}
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </>
          )}

          {/* Mode 1 & Hover Bars */}
          {data.map((point, index) => {
            const val = mode === "orders" ? point.orders : point.revenueMinor;
            const maxVal = mode === "orders" ? maxOrders : maxRevenue;
            const barHeight = val === 0 ? 3 : (val / maxVal) * (height - 24);
            const x = index * (barWidth + gap);
            const isHovered = hoveredPoint?.day === point.day;

            return (
              <g
                key={point.day}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                {mode === "orders" && (
                  <motion.rect
                    x={x}
                    y={height - barHeight}
                    width={barWidth}
                    height={barHeight}
                    rx={2}
                    className={`transition-colors duration-200 ${
                      isHovered
                        ? "fill-[var(--color-forest)]"
                        : point.orders === 0
                          ? "fill-[var(--line)]"
                          : "fill-[var(--color-saffron)]"
                    }`}
                    initial={reduce ? false : { height: 0, y: height }}
                    animate={{ height: barHeight, y: height - barHeight }}
                    transition={{
                      duration: 0.4,
                      delay: reduce ? 0 : index * 0.02,
                    }}
                  />
                )}

                {/* Point indicators on line chart */}
                {mode === "revenue" && (
                  <motion.circle
                    cx={x + barWidth / 2}
                    cy={height - barHeight}
                    r={isHovered ? 5 : 3}
                    className={`${
                      isHovered
                        ? "fill-[var(--color-forest)] stroke-paper"
                        : "fill-[var(--color-gold)]"
                    } transition-all`}
                    strokeWidth={isHovered ? 2 : 0}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Date Labels below chart */}
        <div className="mt-2 flex justify-between text-[0.65rem] text-muted font-medium px-1">
          <span>
            {new Date(data[0].day).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
          <span>
            {new Date(data[Math.floor(data.length / 2)].day).toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short" },
            )}
          </span>
          <span>
            {new Date(data[data.length - 1].day).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
