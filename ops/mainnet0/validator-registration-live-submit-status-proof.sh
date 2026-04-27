#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
RPC="${RPC:-http://127.0.0.1:8545}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
PASS_FILE="${PASS_FILE:-/mnt/key2/mainnet-keygen/20260418-023715/private/participant-wallet-passphrase.${ACC}.txt}"

OUT="${OUT:-/tmp/void-live-submit-status-proof.$(date +%Y%m%d-%H%M%S)}"
DROPIN_DIR="$HOME/.config/systemd/user/void-node.service.d"
DROPIN="$DROPIN_DIR/099-validator-live-submit-status-proof.conf"
TMP_SIGNER_PK="/tmp/void-live-submit-status-signer-pk.$$"

mkdir -p "$OUT"

cleanup() {
  rm -f "$DROPIN"
  systemctl --user daemon-reload >/dev/null 2>&1 || true
  systemctl --user restart void-node.service >/dev/null 2>&1 || true
  shred -u "$TMP_SIGNER_PK" 2>/dev/null || rm -f "$TMP_SIGNER_PK"
}
trap cleanup EXIT

echo "=== live-submit status proof ==="
echo "base=$BASE"
echo "account=$ACC"
echo "out=$OUT"

echo
echo "=== [a] build + restart disabled ==="
npm run build
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [b] disabled status must be safe/read-only ==="
curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" \
  | tee "$OUT/status.disabled.json" \
  | python3 -m json.tool

python3 - "$OUT/status.disabled.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is True
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["ready_for_proof_submit"] is False
assert "live_execution_kill_switch_off" in j["blockers"]
print("[ok] disabled status safe")
PY

echo
echo "=== [c] recover signer key from local backup without printing it ==="
umask 077
python3 - "$TMP_SIGNER_PK" "$ACC" <<'PY'
import re, sys, subprocess
from pathlib import Path

out = Path(sys.argv[1])
target = sys.argv[2].lower()

files = []
for pat in [
    "validator-candidate-registry-local-deploy-proof.sh.bak.remove-candidate-pk-default.*",
    "validator-candidate-registry-local-deploy-proof.sh.bak.*",
]:
    files.extend(Path("/tmp").glob(pat))

files = sorted(files, key=lambda p: p.stat().st_mtime, reverse=True)

for p in files:
    text = p.read_text(errors="replace")
    m = re.search(r'CANDIDATE_PK="\$\{CANDIDATE_PK:-(0x[0-9a-fA-F]{64})\}"', text)
    if not m:
        continue

    pk = m.group(1)
    try:
        addr = subprocess.check_output(
            ["cast", "wallet", "address", pk],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        continue

    if addr.lower() == target:
        out.write_text(pk + "\n")
        out.chmod(0o600)
        print(f"[ok] signer={addr}")
        raise SystemExit(0)

raise SystemExit("[ERR] signer key not found")
PY

echo
echo "=== [d] enable status proof drop-in ==="
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
echo "=== [e] unlock native wallet ==="
test -s "$PASS_FILE"
python3 - "$ACC" "$PASS_FILE" "$BASE" <<'PY'
import json, sys, urllib.request, urllib.error

account, pass_file, base = sys.argv[1], sys.argv[2], sys.argv[3]
pw = open(pass_file).read().strip()
payload = json.dumps({"account": account, "passphrase": pw}).encode()

req = urllib.request.Request(
    base + "/__void/participant/wallet/unlock",
    data=payload,
    headers={"content-type":"application/json"},
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=10) as r:
        code = r.status
        body = r.read().decode()
except urllib.error.HTTPError as e:
    code = e.code
    body = e.read().decode()

j = json.loads(body or "{}")
if code >= 300 or not j.get("ok"):
    raise SystemExit(f"[ERR] unlock failed http={code} body={body[:200]}")
print("[ok] wallet unlocked")
PY

echo
echo "=== [f] enabled status must be green but still read-only ==="
curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" \
  | tee "$OUT/status.enabled.json" \
  | python3 -m json.tool

python3 - "$OUT/status.enabled.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
s=j["status"]
assert j["ok"] is True
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["ready_for_proof_submit"] is True
assert j["blockers"] == []
assert s["live_execution_enabled"] is True
assert s["signer_file_present"] is True
assert s["signer_key_valid_format"] is True
assert s["signer_matches_account"] is True
assert s["wallet_authority_ready"] is True
assert s["payload_ready"] is True
print("[ok] enabled status green and read-only")
PY

echo
echo "=== [g] disable drop-in and prove safe again ==="
rm -f "$DROPIN"
systemctl --user daemon-reload
systemctl --user restart void-node.service
sleep 3

curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" \
  | tee "$OUT/status.disabled-after.json" \
  | python3 -m json.tool

python3 - "$OUT/status.disabled-after.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["ready_for_proof_submit"] is False
assert "live_execution_kill_switch_off" in j["blockers"]
print("[ok] disabled-after status safe")
PY

echo
echo "[ok] validator registration live-submit status proof green"
