#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-materialized-provenance-status-view-proof-$(date +%Y%m%d-%H%M%S)}"
BACKSTOP_TIMEOUT_SEC="${BACKSTOP_TIMEOUT_SEC:-900}"
REMOTE_TIMEOUT_SEC="${REMOTE_TIMEOUT_SEC:-60}"
mkdir -p "$OUT"

echo "=== two-box materialized provenance status view proof ==="
echo "mutation=false"
echo "out=$OUT"

echo
echo "=== materialized provenance backstop ==="
set +e
timeout "${BACKSTOP_TIMEOUT_SEC}s" make participant-share-open-materialized-provenance-proof > "$OUT/materialized-provenance.log" 2>&1
BACKSTOP_RC=$?
set -e

echo "backstop_rc=$BACKSTOP_RC"
if [ "$BACKSTOP_RC" != "0" ]; then
  echo "materialized_provenance_backstop_failed_or_timed_out=true"
  tail -n 200 "$OUT/materialized-provenance.log" || true
  exit "$BACKSTOP_RC"
fi

echo "[ok] materialized provenance backstop passed"

A2P_ACCOUNT="$(grep -o 'a2p_account=ui-share-a2p-[0-9-]*' "$OUT/materialized-provenance.log" | tail -n1 | cut -d= -f2)"
P2A_ACCOUNT="$(grep -o 'p2a_account=ui-share-p2a-[0-9-]*' "$OUT/materialized-provenance.log" | tail -n1 | cut -d= -f2)"
A2P_DATASET="$(grep -o 'a2p_dataset=ds_[A-Za-z0-9_-]*' "$OUT/materialized-provenance.log" | tail -n1 | cut -d= -f2)"
P2A_DATASET="$(grep -o 'p2a_dataset=ds_[A-Za-z0-9_-]*' "$OUT/materialized-provenance.log" | tail -n1 | cut -d= -f2)"

test -n "$A2P_ACCOUNT"
test -n "$P2A_ACCOUNT"
test -n "$A2P_DATASET"
test -n "$P2A_DATASET"

echo "a2p_account=$A2P_ACCOUNT"
echo "a2p_dataset=$A2P_DATASET"
echo "p2a_account=$P2A_ACCOUNT"
echo "p2a_dataset=$P2A_DATASET"

echo
echo "=== Precision viewer provenance status card ==="
PRECISION_HTML="$OUT/precision-a2p-view.html"

timeout "${REMOTE_TIMEOUT_SEC}s" curl -fsS --max-time 20 \
  "http://127.0.0.1:4100/datanet/view/$A2P_DATASET?who=$A2P_ACCOUNT" > "$PRECISION_HTML"

grep -q 'DataNet Viewer' "$PRECISION_HTML"
grep -q 'data-void-materialized-provenance-status' "$PRECISION_HTML"
grep -q 'Provenance verified' "$PRECISION_HTML"
grep -q 'void_datanet_materialized_provenance_status_v1' "$PRECISION_HTML"
grep -q "$A2P_DATASET" "$PRECISION_HTML"
grep -q "$A2P_ACCOUNT" "$PRECISION_HTML"

echo "[ok] Precision viewer provenance status card verified"

echo
echo "=== Alienware viewer provenance status card ==="
ssh -o BatchMode=yes -o ConnectTimeout=8 -o ServerAliveInterval=5 -o ServerAliveCountMax=2 "$ALIEN" "set -euo pipefail
  OUT='/tmp/two-box-materialized-provenance-status-view-proof-remote-$(date +%Y%m%d-%H%M%S)'
  mkdir -p \"\$OUT\"
  HTML=\"\$OUT/alienware-p2a-view.html\"
  timeout '${REMOTE_TIMEOUT_SEC}s' curl -fsS --max-time 20 'http://127.0.0.1:4100/datanet/view/$P2A_DATASET?who=$P2A_ACCOUNT' > \"\$HTML\"
  grep -q 'DataNet Viewer' \"\$HTML\"
  grep -q 'data-void-materialized-provenance-status' \"\$HTML\"
  grep -q 'Provenance verified' \"\$HTML\"
  grep -q 'void_datanet_materialized_provenance_status_v1' \"\$HTML\"
  grep -q '$P2A_DATASET' \"\$HTML\"
  grep -q '$P2A_ACCOUNT' \"\$HTML\"
  echo \"[ok] Alienware viewer provenance status card verified\"
"

make mainnet0-status-smoke

echo
echo "[ok] two-box materialized provenance status view proof green"
echo "out=$OUT"
