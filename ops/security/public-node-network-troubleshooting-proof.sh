#!/usr/bin/env bash
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}" || exit 1

DOC="docs/public/node-network-troubleshooting.md"
FAIL=0

ok(){ echo "[ok] $*"; }
fail(){ echo "[fail] $*"; FAIL=1; }

echo "=== public node network troubleshooting proof ==="
echo "mutation=false"
echo

echo "=== [1] doc exists and has operator flow ==="
test -f "$DOC" && ok "doc exists" || fail "missing $DOC"

grep -q 'VOID public node network troubleshooting' "$DOC" && ok "title" || fail "missing title"
grep -q 'ready:true' "$DOC" && ok "local VOID ready distinction" || fail "missing ready distinction"
grep -q 'carrier flaps' "$DOC" && ok "carrier flap section" || fail "missing carrier flap section"
grep -q 'Non-reboot recovery attempt' "$DOC" && ok "non-reboot recovery" || fail "missing recovery section"
grep -q 'Deeper live-failure capture' "$DOC" && ok "live failure capture" || fail "missing live failure capture"
grep -q 'Network troubleshooting should not mutate chain state' "$DOC" && ok "mutation safety note" || fail "missing mutation safety note"

echo
echo "=== [2] required commands present ==="
for pat in \
  'curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json' \
  'ip -br link' \
  'ip route' \
  'nmcli dev status' \
  'resolvectl status' \
  'journalctl -b -u NetworkManager' \
  'sudo systemctl restart NetworkManager'
do
  grep -qF "$pat" "$DOC" && ok "command: $pat" || fail "missing command: $pat"
done

echo
echo "=== [3] public-doc hygiene ==="
if grep -Eq 'zoso|Precision-Tower|Alienware|100\.122\.|100\.93\.|192\.168\.1\.88|0x1101A058|dev-agent-local' "$DOC"; then
  fail "doc contains local/private project-specific material"
else
  ok "no obvious local/private host material"
fi

echo
echo "=== [4] current node still locally ready ==="
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo || fail "local VOID ready unavailable"

echo

echo
echo "=== [4b] public docs discoverability ==="
grep -q 'node-network-troubleshooting.md' docs/public/README.md
grep -q 'Node network troubleshooting' docs/public/README.md
grep -q 'node-network-troubleshooting.md' docs/public/run-a-node.md
grep -q 'local VOID node remains ready but the host machine loses internet access' docs/public/run-a-node.md
echo "[ok] network troubleshooting doc discoverable from public docs"

echo "=== [5] summary ==="
python3 - <<PY2
print({
  "public_node_network_troubleshooting_doc": "green" if $FAIL == 0 else "failed",
  "mutation": False,
  "doc": "$DOC"
})
PY2

if [ "$FAIL" -eq 0 ]; then
  echo "[ok] public node network troubleshooting proof passed"
  exit 0
fi

echo "[fail] public node network troubleshooting proof failed"
exit 1
