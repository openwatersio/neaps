import { AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";

import type { TideYScale } from "../../hooks/use-tide-scales.js";
import { HEIGHT, MARGIN } from "./constants.js";

export function YAxisOverlay({
  yScale,
  narrowRange,
  unitSuffix,
}: {
  yScale: TideYScale;
  narrowRange: boolean;
  unitSuffix: string;
}) {
  return (
    <div
      className="absolute top-0 left-0 bottom-0 pointer-events-none"
      style={{
        width: 60,
        background: `linear-gradient(to right, var(--neaps-bg) 15px, transparent)`,
      }}
    >
      <svg width="60" height={HEIGHT}>
        <Group left={45} top={MARGIN.top}>
          <AxisLeft
            scale={yScale}
            stroke="none"
            tickStroke="none"
            numTicks={narrowRange ? 6 : 4}
            tickFormat={(v) =>
              `${narrowRange ? Number(v).toFixed(1) : Math.round(Number(v))} ${unitSuffix}`
            }
            tickLabelProps={{
              fill: "var(--neaps-text-muted)",
              fontSize: 12,
              textAnchor: "end",
              dy: 4,
              style: { fontVariantNumeric: "tabular-nums" },
            }}
          />
        </Group>
      </svg>
    </div>
  );
}
