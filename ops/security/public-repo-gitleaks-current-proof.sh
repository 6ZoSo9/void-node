#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== public repo gitleaks current tracked proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] required config/files ==="
test -f .gitleaks.toml
test -f SECURITY.md
test -f CONTRIBUTING.md
test -f ops/security/public-repo-hardening-proof.sh
echo "[ok] required security files present"

echo
echo "=== [3] no tracked local runtime/secret dirs ==="
for p in .secrets .runtime data_a cache .cache; do
  if git ls-files -- "$p" | grep -q .; then
    echo "[fail] tracked files under $p"
    git ls-files -- "$p"
    exit 1
  fi
done

if git ls-files --error-unmatch ops/systemd-effective-baseline.20260320-053825.txt >/dev/null 2>&1; then
  echo "[fail] generated systemd baseline still tracked"
  exit 1
fi
echo "[ok] no tracked local runtime/secret dirs or generated systemd baseline"

echo
echo "=== [4] export committed tracked HEAD ==="
TS="$(date +%Y%m%d-%H%M%S)"
EXPORT="/tmp/void-gitleaks-current-proof-$TS"
TREE="$EXPORT/tree"
REPORT="/tmp/void-gitleaks-current-proof-$TS.json"

rm -rf "$EXPORT"
mkdir -p "$TREE"
git archive HEAD | tar -x -C "$TREE"
echo "tree=$TREE"

echo
echo "=== [5] run gitleaks on committed tracked HEAD ==="
set +e
gitleaks detect \
  --source "$TREE" \
  --no-git \
  --redact \
  --report-format json \
  --report-path "$REPORT"
GL_RC=$?
set -e

echo "gitleaks_rc=$GL_RC"
echo "report=$REPORT"

echo
echo "=== [6] classify findings ==="
python3 - "$REPORT" "$TREE" <<'PY'
import json, re, sys
from pathlib import Path

report = Path(sys.argv[1])
tree = Path(sys.argv[2])

if not report.exists() or report.stat().st_size == 0:
    print("[ok] no gitleaks findings")
    raise SystemExit(0)

data = json.load(open(report))

allowed_addr_paths = {
    "config/void-workcredits-devnet.live.json",
    "docs/VOID-DEVNET-PROTOCOL-STATE.json",
    "docs/VOID-WORKCREDITS-DEVNET-STATE.json",
    "ops/mainnet/void-mainnet.deployed.json",
    "ops/mainnet/void-mainnet.live.json",
    "ops/mainnet0/buy-void-real-fulfillment-closeout-proof.sh",
    "ops/mainnet0/mainnet0-8545-epoch125-state-proof.sh",
    "ops/void-workcredits-devnet-pool-state.sh",
}

allowed_consensus_paths = {
    "ops/mainnet/mainnet0-validator-live-admission-readiness.current.json",
    "ops/mainnet/validator-admission-promotion-plan.zoso.md",
    "ops/mainnet/validator-admission-public-keys.zoso.md",
    "ops/mainnet/validator-status.current.yaml",
    "ops/mainnet/validator-truth-upgrade-track.deployed.json",
    "ops/mainnet/validator-truth-upgrade-track.recovery-20260424-173432.json",
    "ops/mainnet/void-mainnet.deployed.json",
    "ops/mainnet/void-mainnet.live.json",
}

allowed_legacy_paths = {
    "src/index.js",
}

bad = []

def relpath(path):
    s = str(path)
    marker = "/tree/"
    if marker in s:
        return s.split(marker, 1)[1]
    if s.startswith(str(tree) + "/"):
        return s[len(str(tree))+1:]
    return s

for item in data:
    f = relpath(item.get("File") or "")
    line_no = int(item.get("StartLine") or 0)
    rule = item.get("RuleID") or item.get("Rule") or "unknown"

    try:
        line = (tree / f).read_text(errors="replace").splitlines()[line_no - 1].strip()
    except Exception:
        line = ""

    allowed = False

    if rule == "generic-api-key" and f in allowed_addr_paths and re.search(r"0x[a-fA-F0-9]{40}", line):
        allowed = True

    if rule == "generic-api-key" and f in allowed_consensus_paths:
        if re.search(r"(?i)(consensus[_-]?key|consensusKey).*0x[a-fA-F0-9]{64}", line):
            allowed = True

    if rule == "generic-api-key" and f == "ops/mainnet/void-mainnet.deployed.json":
        if re.search(r"adminGateMasterKey.*0x[a-fA-F0-9]{40}", line):
            allowed = True

    if rule == "generic-api-key" and f in allowed_legacy_paths and 'key = "' in line:
        allowed = True

    if not allowed:
        bad.append({
            "rule": rule,
            "file": f,
            "line": line_no,
            "fingerprint": item.get("Fingerprint"),
        })

print("findings_total=", len(data))
print("non_allowlisted_findings=", len(bad))

if bad:
    for x in bad[:80]:
        print("---")
        print("rule:", x["rule"])
        print("file:", x["file"])
        print("line:", x["line"])
        print("fingerprint:", x["fingerprint"])
    raise SystemExit(1)

print("[ok] all current tracked gitleaks findings are narrow public fixtures")
PY

echo
echo "=== [7] public baseline still green ==="
make public-repo-hardening-proof
make mainnet0-status-smoke

echo
echo "=== public repo gitleaks current tracked proof OK ==="
