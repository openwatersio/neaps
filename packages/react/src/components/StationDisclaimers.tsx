export interface StationDisclaimersProps {
  disclaimers?: string;
  className?: string;
}

export function StationDisclaimers({ disclaimers, className }: StationDisclaimersProps) {
  if (!disclaimers) return null;

  return (
    <p className={`text-xs text-(--slackwater-text-muted) ${className ?? ""}`}>{disclaimers}</p>
  );
}
