import { formatPrice } from "@/lib/money";

/**
 * Fourteen days of trade, as one inline SVG.
 *
 * NO CHART LIBRARY. Recharts is roughly 100KB for what is, at this size, a
 * polyline and some rectangles. A back office that loads a charting runtime to
 * draw fourteen bars is paying for a dependency it will spend years updating.
 *
 * BARS, NOT A LINE. Fourteen daily counts are discrete events, and a line
 * between them implies a continuous quantity that was measured in between.
 * Bars also survive the common case here, which is a lot of zero days, without
 * looking like a broken graph.
 *
 * It renders on the server. There is no interaction beyond a native `<title>`
 * tooltip, so making this a client component would ship JavaScript to animate
 * something nobody clicks.
 */
export function Sparkline({
  data,
  height = 92,
}: {
  data: Array<{ day: string; orders: number; revenueMinor: number }>;
  height?: number;
}) {
  if (data.length === 0) return null;

  const max = Math.max(1, ...data.map((d) => d.orders));
  const gap = 3;
  const width = 100;
  const barWidth = (width - gap * (data.length - 1)) / data.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Orders per day for the last ${data.length} days`}
      className="h-[92px] w-full"
    >
      {data.map((point, index) => {
        // Every day gets a visible footing, so a zero day reads as "nothing
        // happened" rather than as a rendering failure.
        const barHeight = point.orders === 0 ? 2 : (point.orders / max) * height;
        const x = index * (barWidth + gap);
        const label = new Date(point.day).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });

        return (
          <rect
            key={point.day}
            x={x}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={1}
            className={
              point.orders === 0
                ? "fill-[var(--line)]"
                : "fill-[var(--color-saffron)]"
            }
          >
            <title>
              {label}: {point.orders}{" "}
              {point.orders === 1 ? "order" : "orders"}
              {point.revenueMinor > 0
                ? `, ${formatPrice(point.revenueMinor)} paid`
                : ""}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}

/**
 * Proportional bar for stock health.
 *
 * Three states in one 100-unit row rather than three separate numbers, because
 * the useful question is not "how many are low" but "how much of the shelf is
 * in trouble", and that is a proportion.
 */
export function HealthBar({
  healthy,
  low,
  out,
}: {
  healthy: number;
  low: number;
  out: number;
}) {
  const total = healthy + low + out;
  if (total === 0) return null;

  const segments = [
    { value: healthy, className: "bg-[var(--live)]", label: "In stock" },
    { value: low, className: "bg-[var(--progress)]", label: "Running low" },
    { value: out, className: "bg-[var(--blocked)]", label: "Out of stock" },
  ].filter((segment) => segment.value > 0);

  return (
    <div>
      <div
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`${healthy} in stock, ${low} running low, ${out} out of stock`}
      >
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={segment.className}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className="flex items-center gap-2 text-xs text-muted"
          >
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${segment.className}`}
            />
            {segment.label}
            <span className="stat text-strong">{segment.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
