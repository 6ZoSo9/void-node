#!/usr/bin/env bash
set -euo pipefail
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

prom_q(){
  local q="$1"
  curl -fsS --get "$PROM_URL/api/v1/query" --data-urlencode "query=$q" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

# numeric compare helpers (avoid bash float weirdness)
num_ge(){
  python3 - "$1" "$2" <<'PY'
import sys, math
a=sys.argv[1]; b=sys.argv[2]
try:
  fa=float(a); fb=float(b)
  if math.isnan(fa) or math.isnan(fb): raise ValueError()
  sys.exit(0 if fa>=fb else 1)
except Exception:
  sys.exit(2)
PY
}

num_eq1(){
  python3 - "$1" <<'PY'
import sys, math
a=sys.argv[1]
try:
  fa=float(a)
  if math.isnan(fa): raise ValueError()
  sys.exit(0 if abs(fa-1.0) < 1e-9 else 1)
except Exception:
  sys.exit(2)
PY
}
