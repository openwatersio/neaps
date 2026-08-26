#!/usr/bin/env bash
# Vendor the NOAA current-station bundle into Resources/.
#
# The extractor, the schema, and the NOAA API's undocumented behaviour all live in
# sailingnaturali/current-stations now — one place, shared with the SignalK plugin,
# so the currbin/per-bin/type-S traps stay solved once. This engine just consumes
# the released artifact and stays pure-Swift and offline.
#
# Usage: tools/vendor-currents.sh [version]   (default: latest release)
set -euo pipefail

VERSION="${1:-}"
DEST="Sources/TideEngineCatalog/Resources/currents.json"
REPO="sailingnaturali/current-stations"

cd "$(dirname "$0")/.."

if [[ -n "$VERSION" ]]; then
  gh release download "$VERSION" --repo "$REPO" --pattern currents.json --output "$DEST" --clobber
else
  gh release download --repo "$REPO" --pattern currents.json --output "$DEST" --clobber
fi

python3 - "$DEST" <<'PY'
import json, sys
b = json.load(open(sys.argv[1]))
n = lambda t: sum(1 for s in b["stations"] if s["type"] == t)
print(f'{sys.argv[1]}: {n("harmonic")} harmonic, {n("subordinate")} subordinate')
refs = {s["id"] for s in b["stations"] if s["type"] == "harmonic"}
orphans = [s["id"] for s in b["stations"]
           if s["type"] == "subordinate" and s["reference"] not in refs]
if orphans:
    sys.exit(f"UNRESOLVED references in bundle: {orphans[:5]}")
PY

echo "Vendored. Run 'swift test' to confirm the catalog still loads."
