set -euo pipefail
echo "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_NEGATIVE_FIXTURE_V1_PROOF_BEGIN"
src=src/index.ts
doc=docs/public/public-node-usdc-external-payment-proof-pack-negative-fixture-v1.md
fixture=fixtures/public/usdc-external-payment-proof-pack-negative-fixture-v1.json
verifier=ops/mainnet0/usdc-external-payment-proof-pack-static-verifier-v1.py
need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }
test "$(grep -F "runtimeApp.get(\"/public-node/usdc-void-buy-pool/external-payment-proof-pack-negative-fixture-v1.json\"" "$src" | wc -l)" = "1"
python3 "$verifier" >/tmp/negative-fixture-good.out
grep -qF "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_STATIC_VERIFIER_V1_GREEN" /tmp/negative-fixture-good.out
if python3 "$verifier" "$fixture" >/tmp/negative-fixture-bad.out 2>&1; then echo "negative_fixture_unexpected_pass=true"; cat /tmp/negative-fixture-bad.out; exit 1; fi
grep -qF "canonical_payment_identity_mismatch" /tmp/negative-fixture-bad.out
need "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_NEGATIVE_FIXTURE_V1" "$src"
need "/public-node/usdc-void-buy-pool/external-payment-proof-pack-negative-fixture-v1.json" "$src"
need "negative_fixture_rejected_by_static_verifier_authority_false" "$src"
need "known_good_fixture_passes: true" "$src"
need "known_bad_fixture_rejected: true" "$src"
need "expected_rejection_reason: \"canonical_payment_identity_mismatch\"" "$src"
need "negative_fixture_only: true" "$src"
need "live_chain_data: false" "$src"
need "external_chain_rpc_fetch_enabled: false" "$src"
need "real_payment_verified_now: false" "$src"
need "finality_verified_now: false" "$src"
need "external_state_root_trust_enabled: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"
need "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_NEGATIVE_FIXTURE_V1" "$doc"
need "The verifier must pass the known-good example fixture and reject this known-bad negative fixture" "$doc"
need "negative_fixture_only" "$fixture"
need "intentionally_wrong_negative_fixture_identity_must_be_rejected" "$fixture"
need "canonical_payment_identity_mismatch" /tmp/negative-fixture-bad.out
bad "live_chain_data: true" "$src"
bad "external_chain_rpc_fetch_enabled: true" "$src"
bad "real_payment_verified_now: true" "$src"
bad "finality_verified_now: true" "$src"
bad "external_state_root_trust_enabled: true" "$src"
bad "automatic_fulfillment_enabled: true" "$src"
bad "private_allocation_ledger_write_enabled: true" "$src"
bad "inventory_reserved_now: true" "$src"
bad "void_transfer_now: true" "$src"
echo "known_good_fixture_passes_green=true"
echo "known_bad_fixture_rejected_green=true"
echo "negative_fixture_route_duplicate_count_green=true"
echo "negative_fixture_authority_false_green=true"
echo "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_NEGATIVE_FIXTURE_V1_GREEN"
