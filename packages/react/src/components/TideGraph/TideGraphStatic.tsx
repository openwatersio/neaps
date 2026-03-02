import { useCallback } from "react";
import { useTooltip } from "@visx/tooltip";

import { useContainerWidth } from "../../hooks/use-container-width.js";
import { useCurrentLevel } from "../../hooks/use-current-level.js";
import { TideGraphChart } from "./TideGraphChart.js";
import type { TideGraphDataProps } from "./TideGraph.js";
import type { TimelineEntry } from "../../types.js";

export function TideGraphStatic({
  timeline,
  extremes = [],
  timezone = "UTC",
  units = "feet",
  locale,
  className,
}: TideGraphDataProps & { locale: string; className?: string }) {
  const { ref: containerRef, width: containerWidth } = useContainerWidth();
  const currentLevel = useCurrentLevel(timeline);
  const { tooltipData, showTooltip, hideTooltip } = useTooltip<TimelineEntry>();

  const activeEntry = tooltipData ?? currentLevel;

  const handleSelect = useCallback(
    (entry: TimelineEntry | null) => {
      if (entry) showTooltip({ tooltipData: entry });
      else hideTooltip();
    },
    [showTooltip, hideTooltip],
  );

  return (
    <div ref={containerRef} className={`relative min-h-50 ${className ?? ""}`}>
      {containerWidth > 0 && (
        <TideGraphChart
          timeline={timeline}
          extremes={extremes}
          timezone={timezone}
          units={units}
          locale={locale}
          svgWidth={containerWidth}
          activeEntry={activeEntry}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
