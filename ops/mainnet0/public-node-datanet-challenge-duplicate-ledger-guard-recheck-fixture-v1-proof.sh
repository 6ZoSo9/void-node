#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-datanet-challenge-duplicate-ledger-guard-recheck-fixture-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Challenge Duplicate Ledger Guard Recheck Fixture v1 Proof ==="
echo "marker=VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "base=$BASE"
echo "out=$OUT"

test -f src/index.ts
test -f docs/public/public-node-datanet-challenge-duplicate-ledger-guard-recheck-fixture-v1.md

grep -Fq "VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_ROUTE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_V1" src/index.ts
grep -Fq "VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_DOC_V1" docs/public/public-node-datanet-challenge-duplicate-ledger-guard-recheck-fixture-v1.md
grep -Fq "duplicate_ledger_check_performed_now: true" src/index.ts
grep -Fq "duplicate_ledger_entry_found: false" src/index.ts
grep -Fq "duplicate_policy_state: \"no_duplicate_found_fixture\"" src/index.ts
grep -Fq "award_record_preview_state_seen: \"preview_only_not_created_not_awarded\"" src/index.ts
grep -Fq "proposed_wc_delta_fixture: 100" src/index.ts
grep -Fq "wc_delta_now: 0" src/index.ts
grep -Fq "wc_award_decision_final: false" src/index.ts
grep -Fq "award_record_created_now: false" src/index.ts
grep -Fq "ledger_entry_created_now: false" src/index.ts
grep -Fq "ledger_write: false" src/index.ts
grep -Fq "wc_credit_award: false" src/index.ts
grep -Fq "mutation: false" src/index.ts

npm run build

curl -fsS "$BASE/public-node/datanet/challenge-duplicate-ledger-guard-recheck-fixture-v1.json" > "$OUT/duplicate-ledger-guard-recheck-fixture.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_V1"' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"ok":true' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"fixture_state":"duplicate_ledger_guard_recheck_fixture_only"' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"duplicate_ledger_check_performed_now":true' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"duplicate_ledger_entry_found":false' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"duplicate_policy_state":"no_duplicate_found_fixture"' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"award_record_preview_marker":"VOID_DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_FIXTURE_V1"' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"award_record_preview_state_seen":"preview_only_not_created_not_awarded"' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"selected_positive_wc_delta_fixture":true' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"proposed_wc_delta_fixture":100' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"proposed_wc_delta_final":false' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"duplicate_found":false' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"existing_ledger_entry_id":null' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"safe_to_continue_to_future_ledger_entry_preview":true' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"wc_delta_now":0' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"award_record_created_now":false' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"ledger_write":false' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"wc_credit_award":false' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"mutation":false' "$OUT/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '/public-node/datanet/challenge-duplicate-ledger-guard-recheck-fixture-v1.json' "$OUT/route-index.json"

echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_route_green=true"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_performed_now=true"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_duplicate_found=false"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_proposed_wc_delta=100"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_wc_delta_now=0"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_award_record_created_now=false"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_ledger_write=false"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_wc_credit_award=false"
echo "VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_PROOF_V1_GREEN"
