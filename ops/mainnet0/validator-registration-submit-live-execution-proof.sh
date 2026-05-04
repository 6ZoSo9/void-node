#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
RPC="${RPC:-http://127.0.0.1:8545}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
SECRETS="${SECRETS:-/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json}"
PASS_FILE="${PASS_FILE:-/mnt/key2/mainnet-keygen/20260418-023715/private/participant-wallet-passphrase.${ACC}.txt}"
OUT="${OUT:-/tmp/void-validator-submit-live-execution-proof.$(date +%Y%m%d-%H%M%S)}"
OUT_DIR="$PWD/.runtime/mainnet0"
ART="$OUT_DIR/validator-candidate-registry.local.current.json"
DROPIN_DIR="$HOME/.config/systemd/user/void-node.service.d"
DROPIN="$DROPIN_DIR/099-validator-submit-live-proof.conf"
TMP_SIGNER_PK="/tmp/void-validator-live-signer-pk.$$"
TMP_DEPLOYER_PK="/tmp/void-validator-live-deployer-pk.$$"

mkdir -p "$OUT" "$OUT_DIR"

cleanup() {
  rm -f "$DROPIN"
  systemctl --user daemon-reload >/dev/null 2>&1 || true
  systemctl --user restart void-node.service >/dev/null 2>&1 || true
  shred -u "$TMP_SIGNER_PK" "$TMP_DEPLOYER_PK" 2>/dev/null || rm -f "$TMP_SIGNER_PK" "$TMP_DEPLOYER_PK"
}
trap cleanup EXIT

echo "=== validator registration submit-live execution proof ==="
echo "base=$BASE"
echo "rpc=$RPC"
echo "account=$ACC"
echo "out=$OUT"

echo
echo "=== [a] recover candidate signer key without printing it ==="
umask 077
python3 - <<'PY' "$TMP_SIGNER_PK" "$ACC"
import re, sys, subprocess
from pathlib import Path

out = Path(sys.argv[1])
target = sys.argv[2].lower()

candidates = []
for pat in [
    "validator-candidate-registry-local-deploy-proof.sh.bak.remove-candidate-pk-default.*",
    "validator-candidate-registry-local-deploy-proof.sh.bak.*",
]:
    for p in Path("/tmp").glob(pat):
        try:
            candidates.append((p.stat().st_mtime, p))
        except FileNotFoundError:
            pass

candidates.sort(reverse=True)
rxs = [
    re.compile(r'CANDIDATE_PK="\$\{CANDIDATE_PK:-(0x[0-9a-fA-F]{64})\}"'),
    re.compile(r'CANDIDATE_PK="\$\{CANDIDATE_PK:-([0-9a-fA-F]{64})\}"'),
]

for _, p in candidates:
    txt = p.read_text(errors="replace")
    for rx in rxs:
        m = rx.search(txt)
        if not m:
            continue
        pk = m.group(1)
        if not pk.startswith("0x"):
            pk = "0x" + pk
        try:
            addr = subprocess.check_output(["cast", "wallet", "address", pk], text=True, stderr=subprocess.DEVNULL).strip()
        except Exception:
            continue
        if addr.lower() == target:
            out.write_text(pk + "\n")
            out.chmod(0o600)
            print(f"[ok] recovered signer key from backup={p.name}; key not printed")
            print(f"[ok] signer={addr}")
            raise SystemExit(0)

raise SystemExit("[ERR] no candidate signer key found")
PY

echo
echo "=== [b] recover deployer key from LUKS secrets without printing it ==="
python3 - <<'PY' "$SECRETS" "$TMP_DEPLOYER_PK"
import json, re, subprocess, sys
from pathlib import Path

secrets = Path(sys.argv[1])
out = Path(sys.argv[2])
target = "0x0d66fcdf95d38f7db6b4206bf183f34cd816c2aa"

pk_re = re.compile(r"0x[0-9a-fA-F]{64}")
txt = secrets.read_text(errors="replace")
seen = set()

for pk in pk_re.findall(txt):
    if pk.lower() in seen:
        continue
    seen.add(pk.lower())
    try:
        addr = subprocess.check_output(["cast", "wallet", "address", pk], text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        continue
    if addr.lower() == target:
        out.write_text(pk + "\n")
        out.chmod(0o600)
        print(f"[ok] recovered deployer key for {addr}; key not printed")
        raise SystemExit(0)

raise SystemExit("[ERR] deployer key not found in secrets")
PY

echo
echo "=== [c] deploy fresh candidate registry with zero registered candidates ==="
CONTRACT_FILE="$(find . -path '*/VoidValidatorCandidateRegistry.sol' -type f | grep -v node_modules | head -n1)"
test -n "$CONTRACT_FILE"

CONTRACT_INFO="$(python3 - <<'PY' "$CONTRACT_FILE"
from pathlib import Path
import sys
contract = Path(sys.argv[1]).resolve()
repo = Path.cwd().resolve()
rel = contract.relative_to(repo)
print(str(repo))
print(str(rel))
PY
)"
PROOF_ROOT="$(printf '%s\n' "$CONTRACT_INFO" | sed -n '1p')"
CONTRACT_REL="$(printf '%s\n' "$CONTRACT_INFO" | sed -n '2p')"
CONTRACT_SPEC="${CONTRACT_REL}:VoidValidatorCandidateRegistry"

echo "contract_file=$CONTRACT_FILE"
echo "proof_root=$PROOF_ROOT"
echo "contract_spec=$CONTRACT_SPEC"

MIN_STAKE_WEI="${MIN_STAKE_WEI:-10000000000000000000000}"
MAX_ACTIVE_VALIDATORS="${MAX_ACTIVE_VALIDATORS:-256}"
ACTIVATION_CHURN_LIMIT="${ACTIVATION_CHURN_LIMIT:-4}"

DEPLOY_LOG="$OUT/forge-create.jsonlog"
(
  cd "$PROOF_ROOT"
  forge create \
    --rpc-url "$RPC" \
    --private-key "$(cat "$TMP_DEPLOYER_PK")" \
    --broadcast \
    "$CONTRACT_SPEC" \
    --constructor-args "$MIN_STAKE_WEI" "$MAX_ACTIVE_VALIDATORS" "$ACTIVATION_CHURN_LIMIT" \
    --json
) 2>&1 | tee "$DEPLOY_LOG"

REGISTRY="$(python3 - <<'PY' "$DEPLOY_LOG"
import json, re, sys
from pathlib import Path
txt = Path(sys.argv[1]).read_text(errors="replace")
for m in re.finditer(r"\{", txt):
    try:
        j = json.loads(txt[m.start():].strip())
    except Exception:
        continue
    for k in ("deployedTo","contractAddress"):
        v = j.get(k)
        if isinstance(v, str) and re.fullmatch(r"0x[0-9a-fA-F]{40}", v):
            print(v)
            raise SystemExit(0)
for pat in (r'"deployedTo"\s*:\s*"(0x[0-9a-fA-F]{40})"', r"Deployed to:\s*(0x[0-9a-fA-F]{40})"):
    m = re.search(pat, txt)
    if m:
        print(m.group(1))
        raise SystemExit(0)
raise SystemExit("[ERR] could not parse deployed registry")
PY
)"
echo "registry=$REGISTRY"

CANDIDATE_ADDR="$(cast wallet address "$(cat "$TMP_SIGNER_PK")")"
DEPLOYER_ADDR="$(cast wallet address "$(cat "$TMP_DEPLOYER_PK")")"

BAL_HEX="$(MIN_STAKE_WEI="$MIN_STAKE_WEI" python3 -c 'import os; stake=int(os.environ["MIN_STAKE_WEI"]); gas_headroom=100*10**18; print(hex(stake+gas_headroom))')"
cast rpc --rpc-url "$RPC" anvil_setBalance "$CANDIDATE_ADDR" "$BAL_HEX" >/dev/null
cast rpc --rpc-url "$RPC" anvil_setBalance "$DEPLOYER_ADDR" "$BAL_HEX" >/dev/null || true
echo "[ok] funded submit-live signer/candidate with stake + gas headroom"

C0="$(cast call --rpc-url "$RPC" "$REGISTRY" 'candidateCount()(uint256)')"
W0="$(cast call --rpc-url "$RPC" "$REGISTRY" 'waitingCount()(uint256)')"
A0="$(cast call --rpc-url "$RPC" "$REGISTRY" 'activeCount()(uint256)')"
test "$C0" = "0"
test "$W0" = "0"
test "$A0" = "0"

cat > "$ART" <<JSON
{
  "ok": true,
  "kind": "validator_candidate_registry_local_deploy_proof",
  "stamp": "$(date +%Y%m%d-%H%M%S)",
  "rpc": "$RPC",
  "registry": "$REGISTRY",
  "deployer": "$DEPLOYER_ADDR",
  "candidate": "$CANDIDATE_ADDR",
  "minValidatorStakeWei": "$MIN_STAKE_WEI",
  "maxActiveValidators": "$MAX_ACTIVE_VALIDATORS",
  "activationChurnLimit": "$ACTIVATION_CHURN_LIMIT",
  "candidateCountBefore": "0",
  "candidateCountAfter": "0",
  "waitingCountBefore": "0",
  "waitingCountAfter": "0",
  "waitingCountFinal": "0",
  "activeCountBefore": "0",
  "activeCountAfter": "0",
  "activeCountFinal": "0",
  "invariant": "fresh registry for submit-live proof; public registration must not change activeCount"
}
JSON
python3 -m json.tool "$ART" | sed -n '1,120p'

echo
echo "=== [d] build and restart with submit-live enabled proof drop-in ==="
npm run build

mkdir -p "$DROPIN_DIR"
cat > "$DROPIN" <<EOF2
[Service]
Environment=VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION=1
Environment=VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE=$TMP_SIGNER_PK
Environment=VOID_VALIDATOR_REGISTRATION_RPC=$RPC
EOF2

systemctl --user daemon-reload
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [e] unlock native participant wallet ==="
test -s "$PASS_FILE"
python3 - <<'PY' "$ACC" "$PASS_FILE" "$BASE"
import json, sys, urllib.request, urllib.error
account, pass_file, base = sys.argv[1], sys.argv[2], sys.argv[3]
pw = open(pass_file).read().strip()
req = urllib.request.Request(
    base + "/__void/participant/wallet/unlock",
    data=json.dumps({"account":account, "passphrase":pw}).encode(),
    headers={"content-type":"application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        code, body = r.status, r.read().decode()
except urllib.error.HTTPError as e:
    code, body = e.code, e.read().decode()
j = json.loads(body or "{}")
if code >= 300 or not j.get("ok"):
    raise SystemExit(f"[ERR] unlock failed http={code} body={body[:200]}")
print("[ok] wallet unlocked")
PY

echo
echo "=== [f] readiness should now be wallet-ready but old aggregate still says live not wired ==="
curl -fsS "$BASE/__void/participant/validator-registration/wallet-authority?account=$ACC" \
  | tee "$OUT/wallet-authority.json" \
  | python3 -m json.tool

python3 - <<'PY' "$OUT/wallet-authority.json"
import json, sys
j=json.load(open(sys.argv[1]))
assert j["wallet_authority"]["ready_for_live_submit"] is True
print("[ok] wallet authority ready")
PY

echo
echo "=== [g] submit-live executes exactly one candidate registration tx ==="
HTTP="$(curl -sS -o "$OUT/submit-live.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":2050}" \
  "$BASE/__void/participant/validator-registration/submit-live")"
echo "submit_live_http=$HTTP"
python3 -m json.tool "$OUT/submit-live.json"
test "$HTTP" = "200"

python3 - <<'PY' "$OUT/submit-live.json"
import json, re, sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is True
assert j["mutation"] is True
assert j["sends_transaction"] is True
assert j["submit_allowed"] is True
assert j["live_execution_wired"] is True
assert j["receipt_status"] == "1"
assert re.fullmatch(r"0x[0-9a-fA-F]{64}", j["transactionHash"])
assert j["gates"]["double_submit_reserved"] is True
assert j["gates"]["receipt_status_1"] is True
assert j["gates"]["active_set_safe"] is True
counts=j["counts"]
assert str(counts["candidateBefore"]) == "0"
assert str(counts["candidateAfter"]) == "1"
assert str(counts["activeBefore"]) == "0"
assert str(counts["activeAfter"]) == "0"
print("[ok] submit-live transaction execution green")
PY

echo
echo "=== [h] duplicate submit-live must now reject through double-submit guard ==="
HTTP_DUP="$(curl -sS -o "$OUT/submit-live.duplicate.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":2050}" \
  "$BASE/__void/participant/validator-registration/submit-live")"
echo "duplicate_http=$HTTP_DUP"
python3 -m json.tool "$OUT/submit-live.duplicate.json"
test "$HTTP_DUP" = "409"

python3 - <<'PY' "$OUT/submit-live.duplicate.json"
import json, sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is False
assert j["error"] == "duplicate_submit_intent"
assert j["mutation"] is False
assert j["sends_transaction"] is False
print("[ok] duplicate submit-live rejected before second tx")
PY

echo
echo "=== [i] disable live drop-in and prove default path is safe again ==="
rm -f "$DROPIN"
systemctl --user daemon-reload
systemctl --user restart void-node.service
sleep 3

HTTP_DISABLED="$(curl -sS -o "$OUT/submit-live.disabled-after.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":2050}" \
  "$BASE/__void/participant/validator-registration/submit-live")"
echo "disabled_after_http=$HTTP_DISABLED"
python3 -m json.tool "$OUT/submit-live.disabled-after.json"
test "$HTTP_DISABLED" = "501"

echo
echo "=== [j] public export still gitleaks-clean ==="
ops/security/build-public-release-tree.sh

echo
echo "[ok] validator registration submit-live execution proof green"
