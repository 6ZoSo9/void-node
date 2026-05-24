#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

LAUNCH="docs/public/mainnet0-launch-notes.md"
NODE="docs/public/run-a-node.md"
PARTICIPANT="docs/public/participant-onboarding.md"
INDEX="docs/public/README.md"
ROOT_README="README.md"
ANNOUNCEMENT="docs/public/mainnet0-announcement.md"
SHORT_ANNOUNCEMENT="docs/public/mainnet0-short-announcement.txt"
CLOSEOUT="ops/mainnet/mainnet0-public-live-closeout.20260524-075712.md"
STATUS="ops/mainnet/mainnet0-status.current.md"

echo "=== Mainnet-0 public onboarding pack proof ==="

echo
echo "=== [1] required files ==="
for f in "$ROOT_README" "$INDEX" "$LAUNCH" "$NODE" "$PARTICIPANT" "$ANNOUNCEMENT" "$SHORT_ANNOUNCEMENT" "$CLOSEOUT" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] root README pointer ==="
grep -q "VOID Mainnet-0 is live" "$ROOT_README"
grep -q "docs/public/README.md" "$ROOT_README"
grep -q "docs/public/run-a-node.md" "$ROOT_README"
grep -q "Public active validator admission remains disabled." "$ROOT_README"
grep -q "Future treasury spend remains separately guarded." "$ROOT_README"
echo "[ok] root README points to public docs and guardrails"

echo
echo "=== [3] docs index ==="
grep -q "^status: public_mainnet0_live$" "$INDEX"
grep -q "mainnet0-launch-notes.md" "$INDEX"
grep -q "run-a-node.md" "$INDEX"
grep -q "participant-onboarding.md" "$INDEX"
grep -q "Public active validator admission remains disabled." "$INDEX"
echo "[ok] docs index present"

echo
echo "=== [4] announcement docs ==="
grep -q "^status: public_mainnet0_live$" "$ANNOUNCEMENT"
grep -q "^decision: GO_PUBLIC_MAINNET0$" "$ANNOUNCEMENT"
grep -q "VOID Network Mainnet-0 is live." "$ANNOUNCEMENT"
grep -q "Public active validator admission remains disabled." "$ANNOUNCEMENT"
grep -q "Vault126 onboarding has not been executed." "$ANNOUNCEMENT"
grep -q "Future treasury spend remains separately guarded." "$ANNOUNCEMENT"
grep -q "Status: public_mainnet0_live / GO_PUBLIC_MAINNET0" "$SHORT_ANNOUNCEMENT"
grep -q "Start with docs/public/README.md." "$SHORT_ANNOUNCEMENT"
echo "[ok] announcement docs present and guarded"

echo
echo "=== [5] launch notes ==="
grep -q '^status: public_mainnet0_live$' "$LAUNCH"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$LAUNCH"
grep -q 'ckpt-mainnet0-public-live-closeout-green-20260524-075712' "$LAUNCH"
grep -q 'Public active validator admission remains disabled.' "$LAUNCH"
grep -q 'Vault126 onboarding has not been executed.' "$LAUNCH"
grep -q 'No additional treasury spend is authorized by launch status.' "$LAUNCH"
grep -q '0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2' "$LAUNCH"
echo "[ok] launch notes encode public-live truth and guardrails"

echo
echo "=== [6] run node docs ==="
grep -q 'git clone https://github.com/6ZoSo9/void-node.git' "$NODE"
grep -q 'npm install' "$NODE"
grep -q 'npm run build' "$NODE"
grep -q 'http://127.0.0.1:4100/participant' "$NODE"
grep -q 'WSL2' "$NODE"
grep -q 'Do not expose private keys.' "$NODE"
echo "[ok] node-running docs present"

echo
echo "=== [7] participant onboarding docs ==="
grep -q 'Public validator registration is candidate/waiting only for Mainnet-0.' "$PARTICIPANT"
grep -q 'Payment confirmation does not equal VOID sent.' "$PARTICIPANT"
grep -q 'Do not send blind direct deposits.' "$PARTICIPANT"
grep -q 'vault126 / epoch128 / expectedValidatorCount=127' "$PARTICIPANT"
grep -q 'Do not share private keys or seed phrases.' "$PARTICIPANT"
echo "[ok] participant onboarding docs preserve safety boundaries"

echo
echo "=== [8] closeout/status agreement ==="
grep -q '^status: public_mainnet0_live_cross_box_green$' "$CLOSEOUT"
grep -q '^status: public_mainnet0_live$' "$STATUS"
grep -q 'This public launch state does not authorize public active validator admission' "$STATUS"
echo "[ok] closeout and status agree"

echo
echo "=== [9] no obvious secret material in public docs ==="
python3 - <<'CHECK_PUBLIC_DOC_SECRETS'
from pathlib import Path
import re

paths = [Path("README.md")] + sorted(Path("docs/public").glob("*"))
patterns = {
    "pem_private_key_block": r"BEGIN [A-Z ]*PRIVATE KEY",
    "private_key_assignment": r"(?i)\bprivate[_-]?key\s*[:=]\s*[^\s]+",
    "mnemonic_assignment": r"(?i)\bmnemonic\s*[:=]\s*[^\n]+",
    "seed_phrase_assignment": r"(?i)\bseed[_ -]?phrase\s*[:=]\s*[^\n]+",
    "passphrase_assignment": r"(?i)\bpassphrase\s*[:=]\s*[^\n]+",
    "json_keystore_crypto": r"\"crypto\"\s*:\s*\{",
}
hits = []
for path in paths:
    if not path.is_file():
        continue
    text = path.read_text()
    for name, pat in patterns.items():
        for m in re.finditer(pat, text):
            line = text.count("\n", 0, m.start()) + 1
            hits.append((str(path), line, name))
if hits:
    for hit in hits:
        print("[ERR]", hit)
    raise SystemExit(1)
print("[ok] no obvious secret-like assignments, keystore blocks, or PEM private keys found")
CHECK_PUBLIC_DOC_SECRETS
echo
echo "=== [10] summary ==="
python3 - <<'PY'
print({
  "public_onboarding_pack": "green",
  "root_readme": "present",
  "launch_notes": "present",
  "run_node_docs": "present",
  "participant_onboarding": "present",
  "announcement": "present",
  "launch_state": "public_mainnet0_live",
  "public_active_validator_admission": "disabled",
  "additional_treasury_spend_authorized": False
})
PY

echo "[ok] Mainnet-0 public onboarding pack proof passed"
