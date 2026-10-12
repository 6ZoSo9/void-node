#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/mainnet0-public-release-bundle-closeout.md"
ROOT_README="README.md"
INDEX="docs/public/README.md"
LAUNCH="docs/public/mainnet0-launch-notes.md"
NODE="docs/public/run-a-node.md"
PARTICIPANT="docs/public/participant-onboarding.md"
ANNOUNCEMENT="docs/public/mainnet0-announcement.md"
SHORT="docs/public/mainnet0-short-announcement.txt"
WHITEPAPER="docs/public/void-network-whitepaper.md"
HYGIENE="ops/mainnet/mainnet0-public-release-hygiene.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 public release bundle closeout proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$ROOT_README" "$INDEX" "$LAUNCH" "$NODE" "$PARTICIPANT" "$ANNOUNCEMENT" "$SHORT" "$WHITEPAPER" "$HYGIENE" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] bundle closeout artifact ==="
grep -q '^status: public_release_bundle_cross_box_green$' "$DOC"
grep -q '^public_release_hygiene_checkpoint: 9b904aa1 / ckpt-public-release-hygiene-public-live-green-20260524-090437$' "$DOC"
grep -q '^whitepaper_checkpoint: 9067695b / ckpt-mainnet0-whitepaper-v1-green-20260524-102511$' "$DOC"
grep -q '^launch_state: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q '^launch_approval: true$' "$DOC"
grep -q '^mutation_allowed_scope: launch_state_public_surface_status_only$' "$DOC"
grep -q '^precision_ready: true$' "$DOC"
grep -q '^alienware_ready: true$' "$DOC"
grep -q 'Sanitized public release export/gitleaks path is green on committed public-live hygiene HEAD.' "$DOC"
grep -q 'docs/public/void-network-whitepaper.md gives the detailed technical and economic whitepaper.' "$DOC"
grep -q 'Whitepaper v1 is cross-box proven.' "$DOC"
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Vault126 onboarding has not been executed.' "$DOC"
grep -q 'Future treasury spend remains separately guarded.' "$DOC"
grep -q 'No private keys, seed phrases, wallet secrets, or credential material are included.' "$DOC"
echo "[ok] bundle closeout artifact records public release truth and guardrails"

echo
echo "=== [3] public docs agreement ==="
grep -q 'docs/public/README.md' "$ROOT_README"
grep -q '^status: public_mainnet0_live$' "$INDEX"
grep -q '^status: public_mainnet0_live$' "$LAUNCH"
grep -q '^status: public_mainnet0_live$' "$NODE"
grep -q '^status: public_mainnet0_live$' "$PARTICIPANT"
grep -q '^status: public_mainnet0_live$' "$ANNOUNCEMENT"
grep -q 'VOID Network Mainnet-0 is live.' "$ANNOUNCEMENT"
grep -q 'VOID Network Mainnet-0 is live.' "$SHORT"
grep -q '^status: public_mainnet0_live$' "$WHITEPAPER"
grep -q '^# VOID Network Whitepaper$' "$WHITEPAPER"
grep -q 'Maximum supply cap: 666,666,666 VOID.' "$WHITEPAPER"
echo "[ok] public docs agree"

echo
echo "=== [4] hygiene/status agreement ==="
grep -q '^status: public_live_release_hygiene_green$' "$HYGIENE"
grep -q '^launch_state: public_mainnet0_live$' "$HYGIENE"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$HYGIENE"
grep -q '^status: public_mainnet0_live$' "$STATUS"
grep -q 'This public launch state does not authorize public active validator admission' "$STATUS"
echo "[ok] hygiene and status agree"

echo
echo "=== [5] guardrail language remains present ==="
for f in "$ROOT_README" "$INDEX" "$LAUNCH" "$PARTICIPANT" "$ANNOUNCEMENT" "$HYGIENE" "$DOC"; do
  grep -q 'Public active validator admission remains disabled' "$f"
done
grep -q 'Buy VOID fulfillment remains explicit' "$DOC"
grep -q 'Future treasury spend remains separately guarded' "$DOC"
echo "[ok] guardrail language present"

echo
echo "=== [6] whitepaper proof ==="
make mainnet0-whitepaper-proof

echo
echo "=== [7] public release hygiene proof ==="
make mainnet0-public-release-hygiene-proof

echo
echo "=== [8] status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [9] local node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-public-release-bundle-closeout-ready.json
echo
python3 - /tmp/void-public-release-bundle-closeout-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [10] no obvious secret material in public release docs ==="
python3 - <<'CHECK_SECRETS'
from pathlib import Path
import re

paths = [
    Path("README.md"),
    Path("docs/public/README.md"),
    Path("docs/public/mainnet0-launch-notes.md"),
    Path("docs/public/run-a-node.md"),
    Path("docs/public/participant-onboarding.md"),
    Path("docs/public/mainnet0-announcement.md"),
    Path("docs/public/mainnet0-short-announcement.txt"),
    Path("docs/public/mainnet0-public-release-bundle-closeout.md"),
    Path("docs/public/void-network-whitepaper.md"),
    Path("ops/mainnet/mainnet0-public-release-hygiene.current.md"),
]

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
CHECK_SECRETS
echo
echo "=== [11] summary ==="
python3 - <<'PY'
print({
  "public_release_bundle_closeout": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "public_docs": "ready",
  "announcement": "ready",
  "hygiene": "cross_box_green",
  "whitepaper": "cross_box_green",
  "public_active_validator_admission": "disabled",
  "vault126_onboarding_executed": False,
  "future_treasury_spend": "separately_guarded"
})
PY

echo "[ok] Mainnet-0 public release bundle closeout proof passed"
