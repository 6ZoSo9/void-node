#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="${DOC:-ops/mainnet/mainnet0-key-ceremony-backup-voidkey2-20260523-122135.md}"
RESULT="ops/mainnet/mainnet0-key-ceremony-result-20260523-122739.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"

echo "=== Mainnet-0 key ceremony backup receipt proof ==="
echo "doc=$DOC"

echo
echo "=== [1] required files ==="
test -f "$DOC"
test -f "$RESULT"
test -f "$GONOGO"
echo "[ok] required files exist"

echo
echo "=== [2] receipt records verified encrypted backup only ==="
grep -q '^status: backup_verified$' "$DOC"
grep -q '^ceremony_id: 20260523-122135$' "$DOC"
grep -q '^backup_device_label: VOIDKEY2$' "$DOC"
grep -q '^backup_verified_sha256: true$' "$DOC"
grep -q '^private_file_count: 13$' "$DOC"
grep -q '^public_file_count: 13$' "$DOC"
grep -q '^manifest_line_count: 26$' "$DOC"
grep -q '^contains_secret_material: false$' "$DOC"
grep -q '^records_private_key_contents: false$' "$DOC"
echo "[ok] backup receipt records counts and verified manifest"

echo
echo "=== [3] receipt is non-launching and non-mutating ==="
grep -q '^launch_approval: false$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^funding: false$' "$DOC"
grep -q '^authority_transfer: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q 'This receipt does not approve launch.' "$DOC"
grep -q 'This receipt does not authorize funding.' "$DOC"
grep -q 'This receipt does not authorize AdminGate or UpdateGate authority transfer.' "$DOC"
echo "[ok] receipt is non-launching and non-mutating"

echo
echo "=== [4] no actual secret material ==="
if grep -En 'BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{20,}|secret[_ -]?(key|value)?[[:space:]]*[:=]|private[_ -]?key[[:space:]]*[:=]|mnemonic[[:space:]]*[:=]|seed[_ -]?phrase[[:space:]]*[:=]|passphrase[[:space:]]*[:=]' "$DOC"; then
  echo "[ERR] backup receipt contains actual secret-like material" >&2
  exit 1
fi
echo "[ok] no actual secret material in backup receipt"

echo
echo "=== [5] launch docs still block approval ==="
grep -q '^launch_approval: false$' "$GONOGO"
grep -q '^mutation_allowed: false$' "$GONOGO"
grep -q '^decision: NO_GO$' "$GONOGO"
echo "[ok] launch docs remain blocked"

echo
echo "=== [6] node ready ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json > /tmp/void-key-ceremony-backup-receipt-ready.json
python3 - /tmp/void-key-ceremony-backup-receipt-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [7] summary ==="
python3 - <<'PY'
print({
  "key_ceremony_backup_receipt": "green",
  "backup_device_label": "VOIDKEY2",
  "backup_verified_sha256": True,
  "private_file_count": 13,
  "public_file_count": 13,
  "manifest_line_count": 26,
  "contains_secret_material": False,
  "launch_approval": False,
  "mutation_allowed": False,
  "funding": False,
  "authority_transfer": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 key ceremony backup receipt proof passed"
