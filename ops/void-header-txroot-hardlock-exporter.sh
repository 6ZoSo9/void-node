#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_header_txroot_hardlock.prom}"

json="$(curl -fsS --max-time 1 "$BASE/__void/diag/header-txroot-hardlock.v11" || echo '{}')"
ok="$(echo "$json" | jq -r '.ok // false' 2>/dev/null || echo false)"
mounted="$(echo "$json" | jq -r '.mounted // false' 2>/dev/null || echo false)"
v="$(echo "$json" | jq -r '.v // 0' 2>/dev/null || echo 0)"
hits="$(echo "$json" | jq -r '.hits // 0' 2>/dev/null || echo 0)"
matched="$(echo "$json" | jq -r '.matched // 0' 2>/dev/null || echo 0)"

# coerce bool -> 0/1
b(){ [ "$1" = "true" ] && echo 1 || echo 0; }

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

cat > "$tmp" <<EOF
# HELP void_header_txroot_hardlock_ok header txRoot hardlock hook responding (1=ok,0=bad)
# TYPE void_header_txroot_hardlock_ok gauge
void_header_txroot_hardlock_ok $(b "$ok")
# HELP void_header_txroot_hardlock_mounted hardlock hook mounted (1=mounted,0=not)
# TYPE void_header_txroot_hardlock_mounted gauge
void_header_txroot_hardlock_mounted $(b "$mounted")
# HELP void_header_txroot_hardlock_version hardlock version
# TYPE void_header_txroot_hardlock_version gauge
void_header_txroot_hardlock_version $v
# HELP void_header_txroot_hardlock_hits total requests seen by the hook
# TYPE void_header_txroot_hardlock_hits counter
void_header_txroot_hardlock_hits $hits
# HELP void_header_txroot_hardlock_matched total header/full requests matched by the hook
# TYPE void_header_txroot_hardlock_matched counter
void_header_txroot_hardlock_matched $matched
EOF

# install (prefer sudo if needed)
if [ -w "$(dirname "$OUT")" ]; then
  install -m 0644 "$tmp" "$OUT"
else
  sudo install -m 0644 "$tmp" "$OUT"
fi

echo "[ok] wrote $OUT"
