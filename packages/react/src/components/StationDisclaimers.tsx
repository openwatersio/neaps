export interface StationDisclaimersProps {
  disclaimers?: string;
  className?: string;
}

export function StationDisclaimers({ disclaimers, className }: StationDisclaimersProps) {
  if (!disclaimers) return null;

  return <p className={`text-xs text-(--neaps-text-muted) ${className ?? ""}`}>{disclaimers}</p>;
}
