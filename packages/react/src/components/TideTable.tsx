import { useMemo } from "react";

import { useExtremes, type UseExtremesParams } from "../hooks/use-extremes.js";
import { useNeapsConfig } from "../provider.js";
import { formatLevel, formatTime, formatDate, getDateKey } from "../utils/format.js";
import type { Extreme, Units } from "../types.js";

export interface TideTableDataProps {
  extremes: Extreme[];
  timezone?: string;
  units?: Units;
  datum?: string;
}

export interface TideTableFetchProps {
  id: string;
  days?: number;
  start?: Date;
  end?: Date;
  extremes?: undefined;
}

export type TideTableProps = (TideTableDataProps | TideTableFetchProps) & {
  className?: string;
};

function TideTableView({
  extremes,
  timezone,
  units,
  datum,
  className,
}: {
  extremes: Extreme[];
  timezone: string;
  units: Units;
  datum?: string;
  className?: string;
}) {
  const grouped = useMemo(() => {
    const groups: Map<string, { label: string; extremes: Extreme[] }> = new Map();
    for (const extreme of extremes) {
      const key = getDateKey(extreme.time, timezone);
      if (!groups.has(key)) {
        groups.set(key, { label: formatDate(extreme.time, timezone), extremes: [] });
      }
      groups.get(key)!.extremes.push(extreme);
    }
    return Array.from(groups.values());
  }, [extremes, timezone]);

  const now = new Date();
  let foundNext = false;

  return (
    <div className={`@container ${className ?? ""}`}>
      <table className="w-full border-collapse text-sm text-(--neaps-text)" role="table">
        <thead>
          <tr>
            <th className="hidden @sm:table-cell text-left px-3 py-2 border-b-2 border-(--neaps-border) text-(--neaps-text-muted) font-semibold text-xs uppercase tracking-wide">
              Date
            </th>
            <th className="text-left px-3 py-2 border-b-2 border-(--neaps-border) text-(--neaps-text-muted) font-semibold text-xs uppercase tracking-wide">
              Time
            </th>
            <th className="text-left px-3 py-2 border-b-2 border-(--neaps-border) text-(--neaps-text-muted) font-semibold text-xs uppercase tracking-wide">
              Level
            </th>
            <th className="text-left px-3 py-2 border-b-2 border-(--neaps-border) text-(--neaps-text-muted) font-semibold text-xs uppercase tracking-wide">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((group) =>
            group.extremes.map((extreme, i) => {
              const isNext = !foundNext && new Date(extreme.time) > now;
              if (isNext) foundNext = true;

              return (
                <tr
                  key={extreme.time}
                  className={isNext ? "bg-(--neaps-bg-subtle)" : ""}
                  aria-current={isNext ? "true" : undefined}
                >
                  {i === 0 ? (
                    <td
                      rowSpan={group.extremes.length}
                      className="hidden @sm:table-cell px-3 py-2 border-b border-(--neaps-border) font-semibold align-top"
                    >
                      {group.label}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 border-b border-(--neaps-border)">
                    {formatTime(extreme.time, timezone)}
                  </td>
                  <td className="px-3 py-2 border-b border-(--neaps-border)">
                    {formatLevel(extreme.level, units)}
                  </td>
                  <td className="px-3 py-2 border-b border-(--neaps-border)">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        extreme.high
                          ? "bg-(--neaps-high)/15 text-(--neaps-high)"
                          : "bg-(--neaps-low)/15 text-(--neaps-low)"
                      }`}
                    >
                      {extreme.label}
                    </span>
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
      {(datum || (timezone && timezone !== "UTC")) && (
        <div className="px-3 py-2 text-xs text-(--neaps-text-muted)">
          {datum && <span>Datum: {datum}</span>}
          {datum && timezone && <span> &middot; </span>}
          {timezone && <span>{timezone}</span>}
        </div>
      )}
    </div>
  );
}

export function TideTable(props: TideTableProps) {
  const config = useNeapsConfig();

  if (props.extremes) {
    return (
      <TideTableView
        extremes={props.extremes}
        timezone={props.timezone ?? "UTC"}
        units={props.units ?? config.units}
        datum={props.datum}
        className={props.className}
      />
    );
  }

  return <TideTableFetcher {...props} />;
}

function TideTableFetcher({
  id,
  days = 1,
  start,
  end,
  className,
}: TideTableFetchProps & { className?: string }) {
  const config = useNeapsConfig();

  const effectiveStart = start ?? new Date();
  const effectiveEnd = end ?? new Date(effectiveStart.getTime() + days * 24 * 60 * 60 * 1000);

  const params: UseExtremesParams = {
    id,
    start: effectiveStart.toISOString(),
    end: effectiveEnd.toISOString(),
  };

  const { data, isLoading, error } = useExtremes(params);

  if (isLoading)
    return (
      <div className="p-4 text-center text-sm text-(--neaps-text-muted)">Loading tide data...</div>
    );
  if (error) return <div className="p-4 text-center text-sm text-red-500">{error.message}</div>;

  return (
    <TideTableView
      extremes={data?.extremes ?? []}
      timezone={data?.station?.timezone ?? "UTC"}
      units={data?.units ?? config.units}
      datum={data?.datum}
      className={className}
    />
  );
}
