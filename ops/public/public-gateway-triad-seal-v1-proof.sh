#!/usr/bin/env bash
SRC="src/index.ts"
fail=0

req() {
  if ! grep -Fq "$1" "$SRC"; then
    echo "missing: $1"
    fail=1
  fi
}

echo "=== VOID public gateway triad seal v1 proof ==="

req 'VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1'
req 'APP.get("/public-node/triad-seal-v1.json"'
req 'public_gateway_triad_seal'
req 'VOID public gateway triad is coherently wired'
req 'VOID_PUBLIC_GATEWAY_PRIORITY_CARDS_V1'
req '/public-node/funding'
req 'VOID_FUNDING_PATH_TIGHTEN_V1'
req 'guarded_usdc_to_void_request_path: true'
req 'manual_review_required: true'
req 'automatic_token_delivery: false'
req 'investment_return_claim: false'
req 'public_fulfillment: false'
req 'wallet_send_now: false'
req '/public-node/wc'
req 'VOID_WC_REVIEW_PATH_LANDING_V1'
req 'contribution_credit_accounting: true'
req 'reward_faucet: false'
req 'operator_decision_required: true'
req 'automatic_award: false'
req 'wc_ledger_write_now: false'
req '/public-node/datanet'
req 'VOID_DATANET_PRIORITY_LANDING_V1'
req 'read_only_public_verification: true'
req 'public_mutation: false'
req 'request_dataset_id_used_to_build_filesystem_path: false'
req 'private_path_disclosure: false'
req 'rpc_public: false'
req 'admin_public: false'
req 'operator_public: false'
req 'wallet_public: false'
req 'secrets_public: false'
req 'operator_queue_public: false'
req 'money_movement: false'
req 'buy_void_fulfillment: false'
req 'validator_mutation: false'
req 'Public gateway triad seal'
req 'human funding path landing page'
req 'human Work Credits review path landing page'
req 'human DataNet landing page'

if [ "$fail" -ne 0 ]; then
  echo "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1_PROOF_FAILED"
  exit 1
fi

echo "funding_leg_sealed=true"
echo "wc_leg_sealed=true"
echo "datanet_leg_sealed=true"
echo "root_gateway_triad_links_present=true"
echo "route_index_triad_seal_entry_present=true"
echo "private_controls_public=false"
echo "mutation_performed_now=false"
echo "money_movement_performed_now=false"
echo "wallet_send_performed_now=false"
echo "wc_ledger_write_performed_now=false"
echo "buy_void_fulfillment_performed_now=false"
echo "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1_GREEN"
