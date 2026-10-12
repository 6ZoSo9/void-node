#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/start-here.md"
INDEX="docs/public/README.md"
ROOT_README="README.md"
STATUS_DOC="docs/public/mainnet0-current-public-status.md"
QUICK="docs/public/quick-start.md"
WSL2="docs/public/windows-wsl2-quick-start.md"
FAQ="docs/public/mainnet0-faq.md"
WHITEPAPER="docs/public/void-network-whitepaper.md"
SUPPORT="docs/public/support-runbook.md"
BUNDLE="docs/public/mainnet0-public-release-bundle-closeout.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 start-here proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$INDEX" "$ROOT_README" "$STATUS_DOC" "$QUICK" "$WSL2" "$FAQ" "$WHITEPAPER" "$SUPPORT" "$BUNDLE" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] start-here identity/status ==="
grep -q '^# VOID Mainnet-0 Start Here$' "$DOC"
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q '^current_public_status_checkpoint: 0fd4b9b2 / ckpt-current-public-status-support-runbook-green-20260524-124839$' "$DOC"
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.' "$DOC"
echo "[ok] start-here identity/status present"

echo
echo "=== [3] reading path links ==="
grep -q 'docs/public/quick-start.md' "$DOC"
grep -q 'docs/public/windows-wsl2-quick-start.md' "$DOC"
grep -q 'docs/public/mainnet0-current-public-status.md' "$DOC"
grep -q 'docs/public/mainnet0-faq.md' "$DOC"
grep -q 'docs/public/void-network-whitepaper.md' "$DOC"
grep -q 'docs/public/run-a-node.md' "$DOC"
grep -q 'docs/public/participant-onboarding.md' "$DOC"
grep -q 'docs/public/support-runbook.md' "$DOC"
grep -q 'docs/public/mainnet0-announcement.md' "$DOC"
grep -q 'docs/public/mainnet0-public-release-bundle-closeout.md' "$DOC"
echo "[ok] reading path links present"

echo
echo "=== [4] guardrails ==="
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only.' "$DOC"
grep -q 'Vault126 onboarding has not been executed.' "$DOC"
grep -q 'Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.' "$DOC"
grep -q 'Future treasury spend remains separately guarded.' "$DOC"
grep -q 'No additional authority transfer is authorized by public launch status.' "$DOC"
echo "[ok] start-here guardrails present"

echo
echo "=== [5] docs links agree ==="
grep -q 'start-here.md' "$INDEX"
grep -q 'docs/public/start-here.md' "$ROOT_README"
grep -q '^status: public_mainnet0_live$' "$STATUS_DOC"
grep -q '^status: public_mainnet0_live$' "$QUICK"
grep -q '^status: public_mainnet0_live$' "$WSL2"
grep -q '^status: public_mainnet0_live$' "$FAQ"
grep -q '^status: public_mainnet0_live$' "$WHITEPAPER"
grep -q '^status: public_mainnet0_live$' "$SUPPORT"
grep -q '^status: public_release_bundle_cross_box_green$' "$BUNDLE"
grep -q '^status: public_mainnet0_live$' "$STATUS"
echo "[ok] docs links agree"

echo
echo "=== [6] dependent proofs ==="
make mainnet0-current-public-status-proof
make mainnet0-support-runbook-proof
make mainnet0-windows-wsl2-quick-start-proof
make mainnet0-quick-start-proof
make mainnet0-public-faq-proof
make mainnet0-status-smoke

echo
echo "=== [7] no obvious secret material in start-here doc ==="
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
echo "=== [8] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-start-here-ready.json
echo
python3 - /tmp/void-start-here-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [9] summary ==="
python3 - <<'PY'
print({
  "start_here": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "quick_start": "linked",
  "wsl2": "linked",
  "faq": "linked",
  "whitepaper": "linked",
  "support_runbook": "linked",
  "guardrails": "present"
})
PY

echo "[ok] Mainnet-0 start-here proof passed"
