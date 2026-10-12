#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/developer-reference.md"
INDEX="docs/public/README.md"
ROOT_README="README.md"
STATUS_DOC="docs/public/mainnet0-current-public-status.md"
STACK_PROOF="ops/mainnet/mainnet0-public-docs-stack-proof.sh"
SUPPORT="docs/public/support-runbook.md"
WHITEPAPER="docs/public/void-network-whitepaper.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 developer reference proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$INDEX" "$ROOT_README" "$STATUS_DOC" "$STACK_PROOF" "$SUPPORT" "$WHITEPAPER" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] developer reference identity/status ==="
grep -q '^# VOID Mainnet-0 Developer Reference$' "$DOC"
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q '^current_public_status_checkpoint: 9bf3ca86 / ckpt-current-public-status-public-docs-stack-green-20260524-211134$' "$DOC"
grep -q '^public_docs_stack_checkpoint: 791d6f4a / ckpt-mainnet0-public-docs-stack-green-20260524-175137$' "$DOC"
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.' "$DOC"
echo "[ok] developer reference identity/status present"

echo
echo "=== [3] endpoints and proof targets ==="
grep -q 'http://127.0.0.1:4100' "$DOC"
grep -q 'http://127.0.0.1:4100/participant' "$DOC"
grep -q '/__void/ready.json' "$DOC"
grep -q 'curl -fsS http://127.0.0.1:4100/__void/ready.json' "$DOC"
grep -q 'make mainnet0-public-docs-stack-proof' "$DOC"
grep -q 'make mainnet0-current-public-status-proof' "$DOC"
grep -q 'make mainnet0-status-smoke' "$DOC"
grep -q 'make mainnet0-crossbox-status-smoke' "$DOC"
echo "[ok] endpoints and proof targets present"

echo
echo "=== [4] public docs links ==="
grep -q 'docs/public/start-here.md' "$DOC"
grep -q 'docs/public/mainnet0-current-public-status.md' "$DOC"
grep -q 'docs/public/quick-start.md' "$DOC"
grep -q 'docs/public/windows-wsl2-quick-start.md' "$DOC"
grep -q 'docs/public/mainnet0-faq.md' "$DOC"
grep -q 'docs/public/void-network-whitepaper.md' "$DOC"
grep -q 'docs/public/support-runbook.md' "$DOC"
grep -q 'docs/public/run-a-node.md' "$DOC"
grep -q 'docs/public/participant-onboarding.md' "$DOC"
echo "[ok] public docs links present"

echo
echo "=== [5] guarded boundaries ==="
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only.' "$DOC"
grep -q 'Vault126 onboarding has not been executed.' "$DOC"
grep -q 'Payment confirmation does not equal VOID sent.' "$DOC"
grep -q 'Future treasury spend remains separately guarded.' "$DOC"
grep -q 'Do not send blind deposits.' "$DOC"
grep -q 'Work Credits are intended for accepted, useful, verifiable work.' "$DOC"
echo "[ok] guarded boundaries present"

echo
echo "=== [6] docs links agree ==="
grep -q 'developer-reference.md' "$INDEX"
grep -q 'docs/public/developer-reference.md' "$ROOT_README"
grep -q '^status: public_mainnet0_live$' "$STATUS_DOC"
grep -q '^status: public_mainnet0_live$' "$SUPPORT"
grep -q '^status: public_mainnet0_live$' "$WHITEPAPER"
grep -q '^status: public_mainnet0_live$' "$STATUS"
grep -q '^mainnet0-public-docs-stack-proof:' Makefile
echo "[ok] docs links agree"

echo
echo "=== [7] no obvious secret material in developer reference ==="
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
echo "=== [8] dependent proof smoke ==="
make mainnet0-current-public-status-proof
make mainnet0-status-smoke

echo
echo "=== [9] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-developer-reference-ready.json
echo
python3 - /tmp/void-developer-reference-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [10] summary ==="
python3 - <<'PY'
print({
  "developer_reference": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "readiness_endpoint": "documented",
  "proof_targets": "documented",
  "guarded_boundaries": "present"
})
PY

echo "[ok] Mainnet-0 developer reference proof passed"
