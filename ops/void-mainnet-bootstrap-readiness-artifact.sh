#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="${1:-$REPO/ops/mainnet/void-mainnet.live.json}"
OUTDIR="/root/void-mainnet-bootstrap-readiness"
PROM_DIR="/var/lib/node_exporter/textfile_collector"
TS="$(date +%Y%m%d-%H%M%S)"
EPOCH="$(date +%s)"

mkdir -p "$OUTDIR" "$PROM_DIR"

JSON_OUT="$OUTDIR/readiness.${TS}.json"
JSON_LATEST="$OUTDIR/readiness.latest.json"
TXT_OUT="$OUTDIR/readiness.${TS}.txt"
TXT_LATEST="$OUTDIR/readiness.latest.txt"
PROM_OUT="$PROM_DIR/void_mainnet_bootstrap_readiness.prom"
PROM_TMP="$(mktemp)"

HEAD_SHA="$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo unknown)"
BRANCH="$(git -C "$REPO" branch --show-current 2>/dev/null || echo unknown)"
TAG="$(git -C "$REPO" describe --tags --exact-match 2>/dev/null || echo "")"

RC=0
LOG="$(
  cd "$REPO"
  bash ops/void-mainnet-bootstrap-readiness.sh "$PIN" 2>&1
)" || RC=$?

printf '%s\n' "$LOG" > "$TXT_OUT"
cp -a "$TXT_OUT" "$TXT_LATEST"

export PIN TXT_OUT JSON_OUT TS EPOCH HEAD_SHA BRANCH TAG RC

python3 - "$JSON_OUT" <<'PY'
import json, os, re, hashlib, sys
from pathlib import Path

txt_path = Path(os.environ["TXT_OUT"])
text = txt_path.read_text()

m = re.search(r'=== \[bootstrap-readiness\] summary ===\n(\{.*?\})', text, re.S)
summary = {}
if m:
    summary = json.loads(m.group(1))

payload = {
    "ok": 1 if int(os.environ["RC"]) == 0 else 0,
    "rc": int(os.environ["RC"]),
    "pin": os.environ["PIN"],
    "ts_epoch": int(os.environ["EPOCH"]),
    "ts_label": os.environ["TS"],
    "head": os.environ["HEAD_SHA"],
    "branch": os.environ["BRANCH"],
    "tag": os.environ["TAG"],
    "text_artifact_path": str(txt_path),
    "text_artifact_sha256": hashlib.sha256(text.encode()).hexdigest(),
    "summary": summary,
}
Path(sys.argv[1]).write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
PY

cp -a "$JSON_OUT" "$JSON_LATEST"

SHAPE_READY="$(python3 - "$JSON_OUT" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["summary"].get("shape_ready", 0))
PY
)"
IDENTITY_READY="$(python3 - "$JSON_OUT" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["summary"].get("identity_ready", 0))
PY
)"
DEPLOYMENT_READY="$(python3 - "$JSON_OUT" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["summary"].get("deployment_ready", 0))
PY
)"
NONSTUB_READY="$(python3 - "$JSON_OUT" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["summary"].get("nonstub_ready", 0))
PY
)"

JSON_HASH="$(sha256sum "$JSON_OUT" | awk '{print $1}')"
TXT_HASH="$(sha256sum "$TXT_OUT" | awk '{print $1}')"

cat > "$PROM_TMP" <<PROM
# HELP void_mainnet_bootstrap_shape_ready 1 if bootstrap shape is ready.
# TYPE void_mainnet_bootstrap_shape_ready gauge
void_mainnet_bootstrap_shape_ready ${SHAPE_READY}

# HELP void_mainnet_bootstrap_identity_ready 1 if bootstrap identity truth is ready.
# TYPE void_mainnet_bootstrap_identity_ready gauge
void_mainnet_bootstrap_identity_ready ${IDENTITY_READY}

# HELP void_mainnet_bootstrap_deployment_ready 1 if bootstrap deployment truth is ready.
# TYPE void_mainnet_bootstrap_deployment_ready gauge
void_mainnet_bootstrap_deployment_ready ${DEPLOYMENT_READY}

# HELP void_mainnet_bootstrap_nonstub_ready 1 if bootstrap truth is fully ready to leave stub mode.
# TYPE void_mainnet_bootstrap_nonstub_ready gauge
void_mainnet_bootstrap_nonstub_ready ${NONSTUB_READY}

# HELP void_mainnet_bootstrap_readiness_last_run_ts_seconds Unix timestamp of last readiness run.
# TYPE void_mainnet_bootstrap_readiness_last_run_ts_seconds gauge
void_mainnet_bootstrap_readiness_last_run_ts_seconds ${EPOCH}

# HELP void_mainnet_bootstrap_readiness_info Build/info labels for latest readiness artifact.
# TYPE void_mainnet_bootstrap_readiness_info gauge
void_mainnet_bootstrap_readiness_info{head="${HEAD_SHA}",branch="${BRANCH}",tag="${TAG}",json_hash="${JSON_HASH}",txt_hash="${TXT_HASH}"} 1
PROM

mv -f "$PROM_TMP" "$PROM_OUT"
chmod 0644 "$PROM_OUT"

echo "[ok] txt   = $TXT_OUT"
echo "[ok] json  = $JSON_OUT"
echo "[ok] prom  = $PROM_OUT"
echo "[ok] rc    = $RC"
echo "[ok] shape = $SHAPE_READY"
echo "[ok] ident = $IDENTITY_READY"
echo "[ok] deploy= $DEPLOYMENT_READY"
echo "[ok] nonstub=$NONSTUB_READY"
