#!/usr/bin/env bash
set -euo pipefail

HOST="${VOID_LIVE_HOST:-100.122.79.39}"
SSH_USER="${VOID_SSH_USER:-zoso}"
BASE="http://${HOST}:4100"
ADAPTER_BASE="http://${HOST}:4111"
EXPECTED_TAG="${EXPECTED_TAG:-ckpt-live-node-user-service-prestart-cleaner-green-20260606-120700}"

echo "=== VOID live public seed stack closeout v1 ==="
echo "host=$HOST"
echo "base=$BASE"
echo "adapter_base=$ADAPTER_BASE"
echo "expected_tag=$EXPECTED_TAG"

echo
echo "=== git/tag on remote ==="
ssh -o BatchMode=yes -o ConnectTimeout=8 "$SSH_USER@$HOST" "
set -euo pipefail
cd \"\$HOME/dev/void-node\" || exit 2
git status --short --branch
git describe --tags --always --dirty
test \"\$(git describe --tags --always --dirty)\" = \"$EXPECTED_TAG\"
"

echo
echo "=== remote service ownership ==="
ssh -o BatchMode=yes -o ConnectTimeout=8 "$SSH_USER@$HOST" '
set -euo pipefail
systemctl --user show void-node-live.service -p MainPID -p ActiveState -p SubState -p UnitFileState
MAIN="$(systemctl --user show void-node-live.service -p MainPID --value)"
ACTIVE="$(systemctl --user show void-node-live.service -p ActiveState --value)"
SUB="$(systemctl --user show void-node-live.service -p SubState --value)"
UNIT="$(systemctl --user show void-node-live.service -p UnitFileState --value)"
LISTENER="$(ss -ltnp 2>/dev/null | grep -E ":4100[[:space:]]" | sed -n "s/.*pid=\([0-9][0-9]*\).*/\1/p" | head -1)"

echo "MainPID=$MAIN ListenerPID=$LISTENER ActiveState=$ACTIVE SubState=$SUB UnitFileState=$UNIT"

test "$ACTIVE" = "active"
test "$SUB" = "running"
test "$UNIT" = "enabled"
test -n "$MAIN"
test "$MAIN" != "0"
test "$MAIN" = "$LISTENER"
'

echo
echo "=== readiness ==="
curl -fsS --max-time 8 "$BASE/__void/ready.json" -o /tmp/void-live-ready.json
python3 - <<'PY'
import json
j = json.load(open("/tmp/void-live-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("head")) == 1856587, j
assert int(j.get("gap")) == 0, j
assert int(j.get("txroot_live")) == 1, j
print("[ok] ready true head=1856587 gap=0 txroot_live=1")
PY

echo
echo "=== adapter status route ==="
curl -fsS --max-time 8 "$BASE/__void/public-seed-adapter/status.json" -o /tmp/void-live-seed-adapter-status.json
python3 - <<'PY'
import json
j = json.load(open("/tmp/void-live-seed-adapter-status.json"))
assert j.get("schema") == "void_public_seed_adapter_status_v1", j
assert j.get("ok") is True, j
checks = j.get("checks") or {}
assert checks.get("adapter_manifest_reachable") is True, j
assert checks.get("private_rpc_blocked") is True, j
assert checks.get("public_bootstrap_reachable") is True, j
print("[ok] seed adapter status route ok")
PY

echo
echo "=== adapter direct checks ==="
curl -fsS --max-time 8 "$ADAPTER_BASE/__void/adapter.json" -o /tmp/void-live-adapter.json
python3 - <<'PY'
import json
j = json.load(open("/tmp/void-live-adapter.json"))
assert j.get("adapter") == "void_public_seed_adapter", j
assert j.get("private_rpc_public") is False, j
print("[ok] adapter manifest ok")
PY

RPC_CODE="$(curl -sS -o /tmp/void-live-rpc.out -w "%{http_code}" --max-time 8 "$ADAPTER_BASE/rpc")"
test "$RPC_CODE" = "404"
grep -Fq "not_public" /tmp/void-live-rpc.out
echo "[ok] adapter blocks /rpc"

echo
echo "=== participant seed card ==="
curl -fsS --max-time 8 "$BASE/participant?account=tester" -o /tmp/void-live-participant.html
grep -Fq "VOID_PARTICIPANT_PUBLIC_SEED_ADAPTER_STATUS_V1" /tmp/void-live-participant.html
grep -Fq "homeSeedAdapterSummary" /tmp/void-live-participant.html
grep -Fq "VOID_PARTICIPANT_PUBLIC_SEED_ADAPTER_STATUS_JS_V1" /tmp/void-live-participant.html
echo "[ok] participant seed adapter card present"

echo
echo "=== listener safety ==="
ssh -o BatchMode=yes -o ConnectTimeout=8 "$SSH_USER@$HOST" '
set -euo pipefail
ss -ltnp 2>/dev/null | grep -E ":(4100|4700|8545|4111)[[:space:]]" || true
ss -ltnp 2>/dev/null | grep -F "127.0.0.1:8545" >/dev/null
! ss -ltnp 2>/dev/null | grep -E "(0.0.0.0|100.122.79.39):8545" >/dev/null
'
echo "[ok] 8545 private"

echo
echo "[ok] live public seed stack closeout v1 green"
