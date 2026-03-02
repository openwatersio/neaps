import { useNeapsConfig } from "../../provider.js";
import { TideGraphScroll } from "./TideGraphScroll.js";
import { TideGraphStatic } from "./TideGraphStatic.js";
import { PX_PER_DAY_DEFAULT } from "./constants.js";
import type { TimelineEntry, Extreme, Units } from "../../types.js";

export interface TideGraphDataProps {
  timeline: TimelineEntry[];
  extremes?: Extreme[];
  timezone?: string;
  units?: Units;
}

export interface TideGraphFetchProps {
  id: string;
  timeline?: undefined;
}

export type TideGraphProps = (TideGraphDataProps | TideGraphFetchProps) & {
  pxPerDay?: number;
  className?: string;
};

export function TideGraph(props: TideGraphProps) {
  const config = useNeapsConfig();

  if (props.timeline) {
    return (
      <TideGraphStatic
        timeline={props.timeline}
        extremes={props.extremes}
        timezone={props.timezone}
        units={props.units ?? config.units}
        locale={config.locale}
        className={props.className}
      />
    );
  }

  return (
    <TideGraphScroll
      id={props.id}
      pxPerDay={props.pxPerDay ?? PX_PER_DAY_DEFAULT}
      locale={config.locale}
      className={props.className}
    />
  );
}
