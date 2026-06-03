#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

LOG="${1:-/tmp/participant-first-user-trust-audit-$(date +%Y%m%d-%H%M%S).log}"
HTML="/tmp/participant-first-user-trust-audit-participant-$(date +%Y%m%d-%H%M%S).html"
TEXT="/tmp/participant-first-user-trust-audit-participant-$(date +%Y%m%d-%H%M%S).txt"

{
  echo "participant_first_user_trust_audit=started"
  echo "repo=$(pwd)"
  echo "timestamp=$(date -Is)"
  echo

  echo "=== repo truth ==="
  git status --short
  git branch --show-current
  git rev-parse --short HEAD
  git describe --tags --always --dirty
  curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo
  echo

  echo "=== fetch participant HTML ==="
  curl -fsS --max-time 8 http://127.0.0.1:4100/participant > "$HTML"
  test -s "$HTML"
  echo "html=$HTML"
  echo

  echo "=== participant served first-screen trust/status copy ==="
  python3 - "$HTML" "$TEXT" <<'PY'
from pathlib import Path
import sys, re, html

src = Path(sys.argv[1])
out = Path(sys.argv[2])

s = src.read_text(errors="replace")
s = re.sub(r"<script\b.*?</script>", " ", s, flags=re.S | re.I)
s = re.sub(r"<style\b.*?</style>", " ", s, flags=re.S | re.I)
s = re.sub(r"<[^>]+>", "\n", s)
s = html.unescape(s)

lines = [re.sub(r"\s+", " ", x).strip() for x in s.splitlines()]
needles = [
    "Mainnet", "public", "live", "guarded", "wallet", "Work Credits",
    "WC", "VOID", "Buy VOID", "Stake", "DataNet", "Run a node",
    "Start Here", "Earn", "Swap", "Bridge", "disabled",
    "explicit", "unlock", "sign"
]

seen = []
for line in lines:
    if len(line) < 3:
        continue
    if any(n.lower() in line.lower() for n in needles):
        if line not in seen:
            seen.append(line)

out.write_text("\n".join(seen) + "\n")
for line in seen[:260]:
    print(line)
PY
  test -s "$TEXT"
  echo "text=$TEXT"
  echo

  echo "=== required served trust markers ==="
  grep -q 'Mainnet-0: public-live' "$HTML"
  grep -q 'VOID_HOME_START_PUBLIC_CLARITY_V1' "$HTML"
  grep -q 'VOID_HOME_FIRST_USER_TRUST_BOUNDARY_V1' "$HTML"
  grep -q 'Safe now:' "$HTML"
  grep -q 'Guarded:' "$HTML"
  grep -q 'No blind deposits' "$HTML"
  grep -q 'Open Wallet' "$HTML"
  grep -q 'Guided Base or Ethereum USDC request only' "$HTML"
  grep -q 'Candidate/waiting preview only; active admission disabled' "$HTML"
  grep -q 'VOID_WC_TO_VOID_TEST_SWAP_EXPLAINER_V1' "$HTML"
  grep -q 'payment confirmation is not VOID fulfillment' "$HTML"
  grep -q 'Public Registration ≠ Active Validator Admission' "$HTML"
  echo "[ok] required served trust markers present"
  echo

  echo "=== participant source markers around first-user trust / guarded action copy ==="
  grep -nE \
    'PUBLIC|public-live|Mainnet-0|guarded|Start Here|Open Wallet|Earn WC|Buy VOID|Preview Staking|WC→VOID|WC -> VOID|unlock/sign|local-devnet|VOID_HOME|FIRST|GUIDED|ADVANCED|OPERATOR|wallet-first|first-user|trust' \
    src/index.ts \
    | sed -n '1,260p'
  echo

  echo "=== current public status branch cleanup pointer check ==="
  grep -nE \
    'github_branch_cleanup_checkpoint|remote_non_main_branch_count|archive_branch_tag_count|superseded_branch_cleanup_tag|branch_cleanup_canonical' \
    docs/public/mainnet0-current-public-status.md \
    ops/security/github-branch-cleanup.current.md \
    | sed -n '1,160p'
  echo

  echo "=== relevant proof targets ==="
  grep -nE \
    'participant-first-user-clarity-proof|public-first60-user-journey-proof|public-participant-first60-copy-proof|participant-buy-void-ux-proof|participant-stake-public-preview-proof|participant-wc-to-void-current-status-proof|mainnet0-current-public-status-proof|mainnet0-status-smoke' \
    Makefile \
    | sed -n '1,220p'
  echo

  echo "=== light proof stack ==="
  make participant-first-user-clarity-proof
  make public-first60-user-journey-proof
  make mainnet0-status-smoke
  echo

  echo "participant_first_user_trust_audit=complete"
} | tee "$LOG"

echo "audit_log=$LOG"
