#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/void-network-whitepaper.md"
INDEX="docs/public/README.md"
BUNDLE="docs/public/mainnet0-public-release-bundle-closeout.md"
HYGIENE="ops/mainnet/mainnet0-public-release-hygiene.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 whitepaper proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$INDEX" "$BUNDLE" "$HYGIENE" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] whitepaper identity/status ==="
grep -q '^# VOID Network Whitepaper$' "$DOC"
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^version: v0.1-mainnet0$' "$DOC"
grep -q '49f460ea / ckpt-mainnet0-public-release-bundle-closeout-green-20260524-091935' "$DOC"
grep -q 'public_mainnet0_live / GO_PUBLIC_MAINNET0' "$DOC"
echo "[ok] whitepaper identity and launch status present"

echo
echo "=== [3] technical sections ==="
grep -q '## 4. Network architecture' "$DOC"
grep -q '## 5. Proof philosophy' "$DOC"
grep -q '## 6. Consensus and validator model' "$DOC"
grep -q '## 7. Treasury architecture' "$DOC"
grep -q '## 8. Tokenomics' "$DOC"
grep -q '## 10. Data and privacy' "$DOC"
grep -q '## 11. Security model' "$DOC"
grep -q '## 13. Running a node' "$DOC"
grep -q '## 14. Roadmap' "$DOC"
grep -q '## 15. Risks' "$DOC"
echo "[ok] technical sections present"

echo
echo "=== [4] tokenomics and economics ==="
grep -q 'maximum supply: `666,666,666 VOID`' "$DOC"
grep -q 'premine: `333,333,333 VOID`' "$DOC"
grep -q 'non-premined emissions supply: `333,333,333 VOID`' "$DOC"
grep -q 'released by the existing protocol emission rules over 100 years' "$DOC"
grep -q '`10,000,000 VOID` finite fixed-price presale inventory' "$DOC"
grep -q '`10,000,000 VOID` protocol-side WC/VOID opening inventory' "$DOC"
grep -q '`2 VOID per 1 USDC`' "$DOC"
grep -q '`0 WC` protocol seed' "$DOC"
echo "[ok] tokenomics and current economic policy present"

echo
echo "=== [5] guardrails ==="
grep -q 'Public active validator admission remains disabled' "$DOC"
grep -q 'public registration remains candidate/waiting only' "$DOC"
grep -q 'Public presale intake and production WC/VOID market activation are coupled and remain closed' "$DOC"
grep -q 'WC/VOID production candidate is `HOLD`' "$DOC"
grep -q 'Automatic Buy VOID fulfillment is not enabled' "$DOC"
grep -q 'Future treasury spend and authority changes remain separately guarded' "$DOC"
echo "[ok] current guardrails present"

echo
echo "=== [6] DataNet/WC/Obelisk ==="
grep -q '## 4.4 DataNet' "$DOC"
grep -q '## 4.6 Work Credits' "$DOC"
grep -q '## 4.7 Obelisk Wallet and wallet-operated agent/oracle' "$DOC"
grep -q 'wallet-operated oracle/agent' "$DOC"
grep -q 'accepted useful work' "$DOC"
echo "[ok] DataNet, Work Credits, and Obelisk sections present"

echo
echo "=== [7] public docs index agreement ==="
grep -q 'void-network-whitepaper.md' "$INDEX"
grep -q '^status: public_release_bundle_cross_box_green$' "$BUNDLE"
grep -q '^status: public_live_release_hygiene_green$' "$HYGIENE"
grep -q '^status: public_mainnet0_live$' "$STATUS"
echo "[ok] public docs index/status agree"

echo
echo "=== [8] no obvious secret material in whitepaper ==="
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
hits=[]
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
echo "=== [9] status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [10] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-whitepaper-ready.json
echo
python3 - /tmp/void-whitepaper-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [11] summary ==="
python3 - <<'PY'
print({
  "whitepaper": "green",
  "status": "public_mainnet0_live",
  "technical_sections": "present",
  "tokenomics": "present",
  "guardrails": "present",
  "datanet_wc_obelisk": "present"
})
PY

echo "[ok] Mainnet-0 whitepaper proof passed"
