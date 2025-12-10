#!/usr/bin/env bash
set -euo pipefail

# Simple textfile exporter for "validators pillar":
# - Checks that docs/VOID-MAINNET-VALIDATOR-BOOTSTRAP.md exists and is non-empty.
# - Writes a gauge for Prometheus at /var/lib/node_exporter/textfile_collector/void_mainnet_validators.prom

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_mainnet_validators.prom}"
DOC="$REPO_ROOT/docs/VOID-MAINNET-VALIDATOR-BOOTSTRAP.md"

mkdir -p "$(dirname "$OUT")"

present=0
nonempty=0

if [ -f "$DOC" ]; then
  present=1
  if [ -s "$DOC" ]; then
    nonempty=1
  fi
fi

tmp="$(mktemp "${OUT}.XXXXXX")"

cat > "$tmp" <<EOF
# HELP void_mainnet_validators_spec_present Validator bootstrap spec file exists (0/1)
# TYPE void_mainnet_validators_spec_present gauge
void_mainnet_validators_spec_present $present

# HELP void_mainnet_validators_spec_nonempty Validator bootstrap spec file is non-empty (0/1)
# TYPE void_mainnet_validators_spec_nonempty gauge
void_mainnet_validators_spec_nonempty $nonempty
EOF

mv "$tmp" "$OUT"
echo "[validators-exporter] wrote $OUT (present=$present, nonempty=$nonempty)"
