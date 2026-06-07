#!/usr/bin/env bash
set -euo pipefail

: "${PUBLIC_SEED_BASE:?missing PUBLIC_SEED_BASE, example: http://1.2.3.4:8080}"

echo "=== VOID VPS public seed internet proof v2 ==="
echo "base=$PUBLIC_SEED_BASE"

void_curl_retry_v1() {
  local url="$1"
  local out="$2"
  local n=1
  while [ "$n" -le 4 ]; do
    if curl -fsS --connect-timeout 10 --max-time 30 "$url" -o "$out"; then
      return 0
    fi
    echo "[retry] curl failed attempt=$n url=$url"
    sleep 3
    n=$((n+1))
  done
  echo "[fail] curl failed after retries url=$url"
  return 1
}

void_curl_retry_v1 "$PUBLIC_SEED_BASE/__void/adapter.json" /tmp/void-vps-public-adapter.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/void-vps-public-adapter.json"))
assert j.get("adapter") == "void_public_seed_adapter", j
assert j.get("private_rpc_public") is False, j
assert "/__void/public-seed-adapter/status.json" in (j.get("exact_allow") or []), j
print("[ok] adapter manifest public and safe")
PY

void_curl_retry_v1 "$PUBLIC_SEED_BASE/__void/ready.json" /tmp/void-vps-public-ready.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/void-vps-public-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("head")) == 1856587, j
assert int(j.get("gap")) == 0, j
assert int(j.get("txroot_live")) == 1, j
print("[ok] ready true")
PY

void_curl_retry_v1 "$PUBLIC_SEED_BASE/__void/public-bootstrap.json" /tmp/void-vps-public-bootstrap.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/void-vps-public-bootstrap.json"))
assert j.get("schema") == "void_public_bootstrap_v1", j
assert j.get("private_rpc_public") is False, j
print("[ok] public bootstrap reachable")
PY

void_curl_retry_v1 "$PUBLIC_SEED_BASE/__void/public-seed-adapter/status.json" /tmp/void-vps-public-seed-status.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/void-vps-public-seed-status.json"))
assert j.get("schema") == "void_public_seed_adapter_status_v1", j
assert j.get("ok") is True, j
checks=j.get("checks") or {}
assert checks.get("private_rpc_blocked") is True, j
assert checks.get("public_bootstrap_reachable") is True, j
print("[ok] seed adapter status reachable")
PY

void_curl_retry_v1 "$PUBLIC_SEED_BASE/participant?account=tester" /tmp/void-vps-public-participant.html
grep -Fq "VOID_PARTICIPANT_PUBLIC_SEED_ADAPTER_STATUS_V1" /tmp/void-vps-public-participant.html
grep -Fq "homeSeedAdapterSummary" /tmp/void-vps-public-participant.html
echo "[ok] participant card reachable"

RPC_CODE="$(curl -sS -o /tmp/void-vps-public-rpc.out -w "%{http_code}" --max-time 10 "$PUBLIC_SEED_BASE/rpc")"
test "$RPC_CODE" = "404"
grep -Fq "not_public" /tmp/void-vps-public-rpc.out
echo "[ok] /rpc blocked"

for p in /wallet /admin /operator /validator/admin /.env /keys /secrets; do
  CODE="$(curl -sS -o /tmp/void-vps-blocked.out -w "%{http_code}" --max-time 10 "$PUBLIC_SEED_BASE$p")"
  test "$CODE" = "404"
done
echo "[ok] sensitive surfaces blocked"

echo "[ok] VPS public seed internet proof v2 green"
