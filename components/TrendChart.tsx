import { cn } from "@/lib/utils";

export interface TrendPoint {
  label: string;
  primary: number;
  secondary?: number;
}

/**
 * Compact bar chart drawn as inline SVG.
 *
 * Hand-rolled rather than pulled from a charting library: the dashboard needs
 * two small trend panels, and a dependency-free SVG keeps the Cloud Run image
 * lean and matches the existing flat card styling exactly.
 */
export function TrendChart({
  points,
  primaryLabel,
  secondaryLabel,
  formatValue,
  className,
}: {
  points: TrendPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  formatValue: (value: number) => string;
  className?: string;
}) {
  const hasSecondary = points.some((p) => typeof p.secondary === "number");
  const maxValue = Math.max(
    1,
    ...points.map((p) => Math.max(p.primary, hasSecondary ? p.secondary || 0 : 0))
  );

  const width = 720;
  const height = 200;
  const padTop = 12;
  const padBottom = 28;
  const plotHeight = height - padTop - padBottom;
  const slot = width / Math.max(points.length, 1);
  const barWidth = hasSecondary ? Math.min(14, slot / 3) : Math.min(22, slot * 0.5);
  const gap = hasSecondary ? 3 : 0;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#0F9D58]" />
          {primaryLabel}
        </span>
        {hasSecondary && secondaryLabel && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
            {secondaryLabel}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${primaryLabel} by month`}
        preserveAspectRatio="none"
      >
        {gridLines.map((ratio) => {
          const y = padTop + plotHeight * ratio;
          return (
            <line
              key={ratio}
              x1={0}
              x2={width}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={ratio === 1 ? undefined : "3 4"}
            />
          );
        })}

        {points.map((point, index) => {
          const centre = slot * index + slot / 2;
          const primaryHeight = (point.primary / maxValue) * plotHeight;
          const secondaryHeight = ((point.secondary || 0) / maxValue) * plotHeight;

          const primaryX = hasSecondary ? centre - barWidth - gap / 2 : centre - barWidth / 2;
          const secondaryX = centre + gap / 2;

          return (
            <g key={`${point.label}-${index}`}>
              <rect
                x={primaryX}
                y={padTop + plotHeight - primaryHeight}
                width={barWidth}
                height={Math.max(primaryHeight, point.primary > 0 ? 2 : 0)}
                rx={2}
                fill="#0F9D58"
              >
                <title>{`${point.label} — ${primaryLabel}: ${formatValue(point.primary)}`}</title>
              </rect>

              {hasSecondary && (
                <rect
                  x={secondaryX}
                  y={padTop + plotHeight - secondaryHeight}
                  width={barWidth}
                  height={Math.max(secondaryHeight, (point.secondary || 0) > 0 ? 2 : 0)}
                  rx={2}
                  fill="#cbd5e1"
                >
                  <title>{`${point.label} — ${secondaryLabel}: ${formatValue(point.secondary || 0)}`}</title>
                </rect>
              )}

              <text
                x={centre}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-400"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
