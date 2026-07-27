import { useNeapsConfig, useUpdateConfig } from "../provider.js";
import type { Station, Units } from "../types.js";

export interface TideSettingsProps {
  station: Pick<Station, "datums" | "defaultDatum" | "timezone">;
  className?: string;
}

function UnitSelect({ value, onChange }: { value: Units; onChange: (v: Units) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-(--neaps-text-muted)">
      <span>Units</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Units)}
        className="neaps-select"
      >
        <option value="meters">Metric (m)</option>
        <option value="feet">Imperial (ft)</option>
      </select>
    </label>
  );
}

function DatumSelect({
  options,
  defaultDatum,
  value,
  onChange,
}: {
  options: string[];
  defaultDatum?: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-(--neaps-text-muted)">
      <span>Datum</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="neaps-select"
      >
        {defaultDatum && <option value="">SD ({defaultDatum})</option>}
        {options.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}

interface TimezoneOption {
  value: string | undefined;
  label: string;
}

function buildTimezoneOptions(stationTimezone: string): TimezoneOption[] {
  const browserTimezone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  const options: TimezoneOption[] = [{ value: undefined, label: `Station (${stationTimezone})` }];

  if (browserTimezone && browserTimezone !== stationTimezone) {
    options.push({ value: browserTimezone, label: `Local (${browserTimezone})` });
  }

  if (stationTimezone !== "UTC" && browserTimezone !== "UTC") {
    options.push({ value: "UTC", label: "UTC" });
  }

  return options;
}

function TimezoneSelect({
  options,
  value,
  onChange,
}: {
  options: TimezoneOption[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  if (options.length <= 1) return null;

  return (
    <label className="flex flex-col gap-1.5 text-xs text-(--neaps-text-muted)">
      <span>Timezone</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="neaps-select"
      >
        {options.map((opt) => (
          <option key={opt.value ?? "__station__"} value={opt.value ?? ""}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TideSettings({ station, className }: TideSettingsProps) {
  const config = useNeapsConfig();
  const updateConfig = useUpdateConfig();

  const datumOptions = Object.keys(station.datums);
  const timezoneOptions = buildTimezoneOptions(station.timezone);

  return (
    <div
      className={`flex flex-wrap gap-3 *:flex-1 ${className ?? ""}`}
      role="group"
      aria-label="Tide display settings"
    >
      <UnitSelect value={config.units} onChange={(units) => updateConfig({ units })} />

      {datumOptions.length > 1 && (
        <DatumSelect
          options={datumOptions}
          defaultDatum={station.defaultDatum}
          value={config.datum}
          onChange={(datum) => updateConfig({ datum })}
        />
      )}

      <TimezoneSelect
        options={timezoneOptions}
        value={config.timezone}
        onChange={(timezone) => updateConfig({ timezone })}
      />
    </div>
  );
}
