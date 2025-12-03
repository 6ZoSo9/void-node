#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$HOME/dev/void-node"
cd "$REPO_ROOT"

OUT="${OUT:-$HOME/.cache/node-exporter-textfile/void_mainnet_ai_pillar.prom}"
mkdir -p "$(dirname "$OUT")"

TMP="$(mktemp)"

STATUS=0
if ./ops/void-ai-health-all.sh; then
  STATUS=1
else
  STATUS=0
fi

cat > "$TMP" <<METRICS
# HELP void_mainnet_ai_pillar_health AI readiness pillar (1 ok, 0 bad)
# TYPE void_mainnet_ai_pillar_health gauge
void_mainnet_ai_pillar_health $STATUS
METRICS

mv "$TMP" "$OUT"
