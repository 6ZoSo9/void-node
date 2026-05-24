#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/mainnet0-current-public-status.md"
INDEX="docs/public/README.md"
WHITEPAPER="docs/public/void-network-whitepaper.md"
QUICK="docs/public/quick-start.md"
WSL2="docs/public/windows-wsl2-quick-start.md"
SUPPORT="docs/public/support-runbook.md"
START="docs/public/start-here.md"
BUNDLE="docs/public/mainnet0-public-release-bundle-closeout.md"
HYGIENE="ops/mainnet/mainnet0-public-release-hygiene.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 current public status proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$INDEX" "$WHITEPAPER" "$QUICK" "$WSL2" "$SUPPORT" "$START" "$BUNDLE" "$HYGIENE" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] current public status identity ==="
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q '^current_public_release_checkpoint: 2865819a / ckpt-public-release-bundle-whitepaper-green-20260524-103149$' "$DOC"
grep -q '^whitepaper_checkpoint: 9067695b / ckpt-mainnet0-whitepaper-v1-green-20260524-102511$' "$DOC"
grep -q '^public_release_hygiene_checkpoint: 9b904aa1 / ckpt-public-release-hygiene-public-live-green-20260524-090437$' "$DOC"
grep -q '^quick_start_checkpoint: 0635c606 / ckpt-mainnet0-quick-start-green-20260524-111319$' "$DOC"
grep -q '^windows_wsl2_quick_start_checkpoint: 3e2fb76c / ckpt-mainnet0-windows-wsl2-quick-start-green-20260524-112502$' "$DOC"
grep -q '^support_runbook_checkpoint: 85be902f / ckpt-mainnet0-support-runbook-green-20260524-123228$' "$DOC"
grep -q '^start_here_checkpoint: a149f3c4 / ckpt-mainnet0-start-here-green-20260524-163001$' "$DOC"
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.' "$DOC"
echo "[ok] public status identity/checkpoints present"

echo
echo "=== [3] public docs bundle listed ==="
grep -q 'docs/public/start-here.md' "$DOC"
grep -q 'docs/public/void-network-whitepaper.md' "$DOC"
grep -q 'docs/public/mainnet0-public-release-bundle-closeout.md' "$DOC"
grep -q 'docs/public/mainnet0-current-public-status.md' "$DOC"
grep -q 'mainnet0-current-public-status.md' "$INDEX"
grep -q '^status: public_mainnet0_live$' "$WHITEPAPER"
grep -q '^status: public_mainnet0_live$' "$QUICK"
grep -q '^status: public_mainnet0_live$' "$WSL2"
grep -q '^status: public_mainnet0_live$' "$SUPPORT"
grep -q '^status: public_mainnet0_live$' "$START"
grep -q '^status: public_release_bundle_cross_box_green$' "$BUNDLE"
grep -q '^status: public_live_release_hygiene_green$' "$HYGIENE"
echo "[ok] public docs bundle agrees"

echo
echo "=== [4] live and guarded scopes ==="
grep -q 'VOID Mainnet-0 public status is live.' "$DOC"
grep -q 'Whitepaper v1 is available.' "$DOC"
grep -q 'Start-here public landing overview is available.' "$DOC"
grep -q 'Linux quick-start is available.' "$DOC"
grep -q 'Windows WSL2 quick-start is available.' "$DOC"
grep -q 'Public support runbook is available.' "$DOC"
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only.' "$DOC"
grep -q 'Vault126 onboarding has not been executed.' "$DOC"
grep -q 'Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.' "$DOC"
grep -q 'Future treasury spend remains separately guarded.' "$DOC"
grep -q 'vault126 / epoch128 / expectedValidatorCount=127' "$DOC"
echo "[ok] live scope and guardrails present"

echo
echo "=== [5] status file agreement ==="
grep -q '^status: public_mainnet0_live$' "$STATUS"
grep -q 'This public launch state does not authorize public active validator admission' "$STATUS"
echo "[ok] status file agrees"

echo
echo "=== [6] dependent proofs ==="
make mainnet0-whitepaper-proof
make mainnet0-public-release-bundle-closeout-proof
make mainnet0-status-smoke

echo
echo "=== [7] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-current-public-status-ready.json
echo
python3 - /tmp/void-current-public-status-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [8] no obvious secret material in current public status doc ==="
python3 - "$DOC" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text()
patterns = {
    "pem_private_key_block": r"BEGIN [A-Z ]*PRIVATE KEY",
    "private_key_assignment": r"(?i)\bprivate[_-]?key\s*[:=]\s*[^\s]+",
    "mnemonic_assignment": r"(?i)\bmnemonic\s*[:=]\s*[^\n]+",
    "seed_phrase_assignment": r"(?i)\bseed[_ -]?phrase\s*[:=]\s*[^\n]+",
    "passphrase_assignment": r"(?i)\bpassphrase\s*[:=]\s*[^\n]+",
    "json_keystore_crypto": r'"crypto"\s*:\s*\{',
}
hits = []
for name, pat in patterns.items():
    for m in re.finditer(pat, text):
        line = text.count("\n", 0, m.start()) + 1
        hits.append((line, name))
if hits:
    print(hits)
    raise SystemExit(1)
print("[ok] no obvious secret-like assignments, PEM private keys, or keystore blocks found")
PY

echo
echo "=== [9] summary ==="
python3 - <<'PY'
print({
  "current_public_status": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "whitepaper": "included",
  "public_release_bundle": "cross_box_green",
  "public_active_validator_admission": "disabled",
  "vault126_onboarding_executed": False,
  "future_treasury_spend": "separately_guarded"
})
PY

echo "[ok] Mainnet-0 current public status proof passed"
