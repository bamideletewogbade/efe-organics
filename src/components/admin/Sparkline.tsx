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
 * Horizontal ranked bars. For "what sells most" and "what the range is made of".
 *
 * A bar chart rather than a pie, always. Comparing angles is measurably harder
 * than comparing lengths, product names need somewhere to sit, and a pie with
 * six near-equal slices communicates nothing at all. Sorted, because a ranked
 * list is the answer to the question being asked.
 */
export function RankedBars({
  rows,
  formatValue,
  emptyLabel,
}: {
  rows: Array<{ label: string; value: number; sub?: string }>;
  formatValue?: (value: number) => string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-xs/5 text-muted">
        {emptyLabel}
      </p>
    );
  }

  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className="mt-4 grid gap-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-strong">
              {row.label}
              {row.sub && <span className="text-muted"> · {row.sub}</span>}
            </span>
            <span className="stat shrink-0 text-strong">
              {formatValue ? formatValue(row.value) : row.value}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-[var(--color-saffron)] transition-all duration-500 ease-out"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The order pipeline, as counts at each stage.
 *
 * Deliberately NOT drawn as a narrowing funnel. A funnel shape implies each
 * stage is a subset of the one before, and these are current states: an order
 * sitting in "packed" is not also counted in "paid". Drawing it as a funnel
 * would suggest a drop-off that has not happened.
 */
export function Pipeline({
  stages,
}: {
  stages: Array<{ label: string; count: number; tone: "warn" | "info" | "good" }>;
}) {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);

  if (total === 0) {
    return (
      <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-xs/5 text-muted">
        No orders in progress. Stages fill as orders move from confirmed through
        to delivered.
      </p>
    );
  }

  const colour = {
    warn: "bg-[var(--progress)]",
    info: "bg-[var(--color-saffron)]",
    good: "bg-[var(--live)]",
  };

  return (
    <ol className="mt-4 grid gap-2.5">
      {stages.map((stage) => (
        <li key={stage.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-muted">{stage.label}</span>
          <span className="h-6 flex-1 overflow-hidden rounded-md bg-surface-sunken">
            <span
              className={`flex h-full items-center justify-end rounded-md px-2 ${colour[stage.tone]}`}
              style={{
                width: stage.count === 0 ? "0%" : `${Math.max(8, (stage.count / total) * 100)}%`,
              }}
            >
              {stage.count > 0 && (
                <span className="stat text-xs font-semibold text-white">
                  {stage.count}
                </span>
              )}
            </span>
          </span>
        </li>
      ))}
    </ol>
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
