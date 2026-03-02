import { useNeapsConfig } from "../../provider.js";
import { TideGraphScroll } from "./TideGraphScroll.js";
import { PX_PER_DAY_DEFAULT } from "./constants.js";

export interface TideGraphProps {
  id: string;
  pxPerDay?: number;
  className?: string;
}

export function TideGraph(props: TideGraphProps) {
  const config = useNeapsConfig();

  return (
    <TideGraphScroll
      id={props.id}
      pxPerDay={props.pxPerDay ?? PX_PER_DAY_DEFAULT}
      locale={config.locale}
      className={props.className}
    />
  );
}
