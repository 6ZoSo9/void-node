#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_PUBLIC_FIRST_OFFICIAL_RELEASE_REHEARSAL_V1"
ROOT="${VOID_REPO:-$(git rev-parse --show-toplevel)}"
OUT="$(mktemp -d /tmp/void-first-official-release-rehearsal-proof-v1-XXXXXX)"
trap 'rm -rf "$OUT"' EXIT
cd "$ROOT"

printf '%s\n' '=== [1] static contract ==='
node scripts/prove_public_first_official_release_rehearsal_v1.mjs
node --check tools/void-first-official-release-rehearsal-v1.mjs
bash -n ops/release/void-first-official-release-rehearsal-v1.sh
bash -n ops/release/normalize-github-ssh-remote-v1.sh
bash -n ops/security/public-python-bytecode-hygiene-v1-proof.sh
bash -n ops/security/public-first-official-release-rehearsal-v1-proof.sh

printf '%s\n' '=== [2] repository hygiene ==='
bash ops/security/public-python-bytecode-hygiene-v1-proof.sh

printf '%s\n' '=== [3] full no-publish rehearsal ==='
VOID_REHEARSAL_OUT="$OUT/rehearsal" \
VOID_REHEARSAL_NOW_UTC="2000-01-01T00:00:00Z" \
  bash ops/release/void-first-official-release-rehearsal-v1.sh \
  | tee "$OUT/rehearsal.log"

grep -q 'VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_V1 FULL_GREEN' "$OUT/rehearsal.log"
grep -q 'release_tag_published=false' "$OUT/rehearsal.log"
grep -q 'official_release_published=false' "$OUT/rehearsal.log"
grep -q 'live_deployment=false' "$OUT/rehearsal.log"
grep -q 'money_movement=false' "$OUT/rehearsal.log"

python3 - "$OUT/rehearsal/state/rehearsal-receipt-v1.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
assert j["marker"] == "VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_RECEIPT_V1", j
assert j["passed"] is True, j
assert len(j["stage_receipt_sha256s"]) == 8, j
for key in [
    "release_tag_published", "official_release_published", "live_deployment",
    "service_restart", "money_movement", "guarded_lanes_activated"
]:
    assert j["policy"][key] is False, (key, j)
print("rehearsal_receipt_boundary_verified=true")
PY

printf '%s\n' '=== [4] clean working-tree boundary ==='
git diff --check
tracked="$(git ls-files | grep -E '(^|/)__pycache__/|\.(pyc|pyo|pyd)$' || true)"
test -z "$tracked" || { printf '%s\n' "$tracked" >&2; exit 1; }

printf '%s\n' '=== [5] no live mutation boundary ==='
printf '%s\n' 'release_tag_published=false'
printf '%s\n' 'official_release_published=false'
printf '%s\n' 'live_deployment=false'
printf '%s\n' 'service_restart=false'
printf '%s\n' 'money_movement=false'
printf '%s\n' 'buy_void_fulfillment=false'
printf '%s\n' 'validator_admission=false'
printf '%s\n' 'treasury_movement=false'
printf '%s\n' 'authority_transfer=false'
printf '%s\n' 'guarded_lanes_activated=false'
printf '%s\n' "$MARKER FULL_GREEN"
