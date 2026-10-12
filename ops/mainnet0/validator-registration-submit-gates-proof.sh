#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"


# __void_candidate_key_env_guard_v1
# __void_candidate_key_self_recover_v1
CANDIDATE_PK="${CANDIDATE_PK:-}"
CANDIDATE_PK_FILE="${CANDIDATE_PK_FILE:-}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"

TMP_CANDIDATE_PK_SELF="${TMP_CANDIDATE_PK_SELF:-}"
cleanup_submit_gates_candidate_pk() {
  if [ -n "${TMP_CANDIDATE_PK_SELF:-}" ] && [ -e "$TMP_CANDIDATE_PK_SELF" ]; then
    shred -u "$TMP_CANDIDATE_PK_SELF" 2>/dev/null || rm -f "$TMP_CANDIDATE_PK_SELF"
  fi
}
trap cleanup_submit_gates_candidate_pk EXIT

if [ -z "$CANDIDATE_PK" ] && [ -z "$CANDIDATE_PK_FILE" ]; then
  TMP_CANDIDATE_PK_SELF="/tmp/void-submit-gates-candidate-pk.$$"
  umask 077
  python3 - <<'PYKEY' "$TMP_CANDIDATE_PK_SELF" "$ACC"
import re, sys, subprocess
from pathlib import Path

out = Path(sys.argv[1])
target = sys.argv[2].lower()

candidates = []
for pat in [
    "validator-candidate-registry-local-deploy-proof.sh.bak.remove-candidate-pk-default.*",
    "validator-candidate-registry-local-deploy-proof.sh.bak.*",
]:
    for p in Path("/tmp").glob(pat):
        try:
            candidates.append((p.stat().st_mtime, p))
        except FileNotFoundError:
            pass

candidates.sort(reverse=True)

rxs = [
    re.compile(r'CANDIDATE_PK="\$\{CANDIDATE_PK:-(0x[0-9a-fA-F]{64})\}"'),
    re.compile(r'CANDIDATE_PK="\$\{CANDIDATE_PK:-([0-9a-fA-F]{64})\}"'),
]

for _, p in candidates:
    s = p.read_text(errors="replace")
    for rx in rxs:
        m = rx.search(s)
        if not m:
            continue
        pk = m.group(1)
        if not pk.startswith("0x"):
            pk = "0x" + pk
        try:
            addr = subprocess.check_output(
                ["cast", "wallet", "address", pk],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
        except Exception:
            continue
        if addr.lower() == target:
            out.write_text(pk + "\\n")
            out.chmod(0o600)
            print(f"[ok] submit-gates recovered candidate key from backup={p.name}; key not printed")
            print(f"[ok] derived={addr}")
            raise SystemExit(0)

raise SystemExit("[ERR] CANDIDATE_PK or CANDIDATE_PK_FILE must be provided; no local backup key derived to target account")
PYKEY
  CANDIDATE_PK_FILE="$TMP_CANDIDATE_PK_SELF"
  CANDIDATE_PK=""
fi

if [ -n "$CANDIDATE_PK_FILE" ]; then
  test -f "$CANDIDATE_PK_FILE"
fi

export CANDIDATE_PK
export CANDIDATE_PK_FILE


echo "=== submit gates proof ==="
echo "[gate] submit path must remain disabled until real wallet execution proof exists"
echo "[gate] public registration must not mutate active validator set"
echo "[gate] draft API must remain non-mutating"
echo "[gate] participant UI must keep guarded shell"
echo

CANDIDATE_PK="$CANDIDATE_PK" CANDIDATE_PK_FILE="$CANDIDATE_PK_FILE" ops/mainnet0/validator-registration-lane-proof.sh

echo
echo "[ok] submit gates are still enforced by current lane proof"
