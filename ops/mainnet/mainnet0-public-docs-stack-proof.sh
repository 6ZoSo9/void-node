#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 public docs stack proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] required public docs ==="
for f in \
  README.md \
  docs/public/README.md \
  docs/public/start-here.md \
  docs/public/mainnet0-current-public-status.md \
  docs/public/quick-start.md \
  docs/public/windows-wsl2-quick-start.md \
  docs/public/mainnet0-faq.md \
  docs/public/void-network-whitepaper.md \
  docs/public/developer-reference.md \
  docs/public/support-runbook.md \
  docs/public/run-a-node.md \
  docs/public/participant-onboarding.md \
  docs/public/mainnet0-launch-notes.md \
  docs/public/mainnet0-announcement.md \
  docs/public/mainnet0-short-announcement.txt \
  docs/public/mainnet0-public-release-bundle-closeout.md
do
  test -f "$f"
done
echo "[ok] required public docs exist"

echo
echo "=== [3] public docs entry path ==="
grep -q 'docs/public/start-here.md' README.md
grep -q 'docs/public/developer-reference.md' README.md
grep -q 'start-here.md' docs/public/README.md
grep -q 'developer-reference.md' docs/public/README.md
grep -q '^status: public_mainnet0_live$' docs/public/start-here.md
grep -q '^status: public_mainnet0_live$' docs/public/mainnet0-current-public-status.md
grep -q '^status: public_mainnet0_live$' docs/public/quick-start.md
grep -q '^status: public_mainnet0_live$' docs/public/windows-wsl2-quick-start.md
grep -q '^status: public_mainnet0_live$' docs/public/mainnet0-faq.md
grep -q '^status: public_mainnet0_live$' docs/public/void-network-whitepaper.md
grep -q '^status: public_mainnet0_live$' docs/public/developer-reference.md
grep -q '^status: public_mainnet0_live$' docs/public/support-runbook.md
echo "[ok] public docs entry path/status present"

echo
echo "=== [4] guardrails across public package ==="
for f in \
  docs/public/start-here.md \
  docs/public/mainnet0-current-public-status.md \
  docs/public/quick-start.md \
  docs/public/windows-wsl2-quick-start.md \
  docs/public/mainnet0-faq.md \
  docs/public/support-runbook.md
do
  grep -q 'Public active validator admission remains disabled.' "$f"
  grep -q 'Public validator registration remains candidate/waiting only.' "$f"
  grep -q 'Vault126 onboarding has not been executed.' "$f"
  grep -q 'Future treasury spend remains separately guarded.' "$f"
done
echo "[ok] guardrails present across public package"

echo
echo "=== [5] no obvious secret material in public docs ==="
python3 - <<'PY'
from pathlib import Path
import re

paths = [Path("README.md")] + sorted(Path("docs/public").glob("*"))
patterns = {
    "pem_private_key_block": r"BEGIN [A-Z ]*PRIVATE KEY",
    "private_key_assignment": r"(?i)\bprivate[_-]?key\s*[:=]\s*[^\s]+",
    "mnemonic_assignment": r"(?i)\bmnemonic\s*[:=]\s*[^\n]+",
    "seed_phrase_assignment": r"(?i)\bseed[_ -]?phrase\s*[:=]\s*[^\n]+",
    "passphrase_assignment": r"(?i)\bpassphrase\s*[:=]\s*[^\n]+",
    "json_keystore_crypto": r'"crypto"\s*:\s*\{',
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
print("[ok] no obvious secret-like assignments, PEM private keys, or keystore blocks found")
PY

echo
echo "=== [6] individual public docs proofs ==="
make mainnet0-start-here-proof
make mainnet0-current-public-status-proof
make mainnet0-support-runbook-proof
make mainnet0-windows-wsl2-quick-start-proof
make mainnet0-quick-start-proof
make mainnet0-public-faq-proof
make mainnet0-whitepaper-proof
make mainnet0-developer-reference-proof
make mainnet0-public-release-bundle-closeout-proof
make mainnet0-public-onboarding-pack-proof

echo
echo "=== [7] status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [8] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-public-docs-stack-ready.json
echo
python3 - /tmp/void-public-docs-stack-ready.json <<'PY'
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
  "public_docs_stack": "green",
  "launch_state": "public_mainnet0_live",
  "entry_path": "README -> start-here -> docs",
  "linux_quick_start": "green",
  "windows_wsl2_quick_start": "green",
  "faq": "green",
  "whitepaper": "green",
  "developer_reference": "green",
  "support_runbook": "green",
  "guardrails": "present"
})
PY

echo "[ok] Mainnet-0 public docs stack proof passed"
