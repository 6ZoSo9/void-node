#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-http://localhost:4100}

echo "== ports =="; ss -ltnp | egrep ':4100|:4700' || true

echo -e "\n== ready & txroot health =="
curl -fsS "$BASE/__void/ready.prom" | sed -n '1,50p' || true
curl -fsS "$BASE/health/txroot3?format=prom" | sed -n '1,20p' || true

echo -e "\n== head number (compat + prom) =="
curl -fsS "$BASE/blocks/latest/number2.json" && echo || true
curl -fsS "$BASE/metrics/void/head" 2>/dev/null | sed -n '1,5p' || true

echo -e "\n== proposer auto status =="
curl -fsS -X POST "$BASE/proposer/auto/start?ms=2000&dry=0&confirm=proposerAutoStart" | jq . >/dev/null || true
(curl -fsS "$BASE/proposer/auto/status" 2>/dev/null | jq .) || echo "{"ok":false,"note":"status route not mounted"}"

echo -e "\n== empty-block policy =="
curl -fsS "$BASE/blocks/empty-policy/status" | jq . || true

echo -e "\n== last-seal + persisted peek =="
curl -fsS "$BASE/dev/last-seal" | jq . || true
N=$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r .number)
curl -fsS "$BASE/blocks/$N/persisted" | jq . || true

echo -e "\n== recent header/txroot match check (5 blocks) =="
ok=1
for i in 0 1 2 3 4; do
  n=$((N-i))
  hdr=$(curl -fsS "$BASE/blocks/$n/header3" | jq -r .txRoot 2>/dev/null || echo "")
  calc=$(curl -fsS "$BASE/dev/txroot/$n.root" 2>/dev/null | jq -r .root || echo "")
  if [ -n "$calc" ] && [ -n "$hdr" ] && [ "$hdr" != "$calc" ]; then
    echo "mismatch at #$n hdr=$hdr calc=$calc"; ok=0
  else
    echo "ok #$n root=$hdr"
  fi
done
[ $ok -eq 1 ] && echo "✓ headers match computed roots (window=5)" || echo "⚠ mismatch detected"
