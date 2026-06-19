#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"

echo "=== VOID public gateway priority cards v1 proof ==="

test -f "$SRC"

grep -Fq "VOID_PUBLIC_GATEWAY_V1" "$SRC"
grep -Fq "VOID_PUBLIC_GATEWAY_PRIORITY_CARDS_V1" "$SRC"

grep -Fq "Fund VOID" "$SRC"
grep -Fq "Earn WC" "$SRC"
grep -Fq "Verify DataNet" "$SRC"
grep -Fq "Inspect Public Proof" "$SRC"

grep -Fq 'href="/buy-void"' "$SRC"
grep -Fq 'href="/funding"' "$SRC"
grep -Fq 'href="/participant"' "$SRC"
grep -Fq 'href="/public-node"' "$SRC"
grep -Fq 'href="/public-node/route-index.json"' "$SRC"
grep -Fq 'href="/public-node/datanet/challenge/demo003-folder-fixture-v1"' "$SRC"
grep -Fq 'href="/public-node/datanet/challenge-offline-verify-pack-v1.json"' "$SRC"
grep -Fq 'href="/public-node/datanet/published-dataset-registry-v1.json"' "$SRC"

grep -Fq "Manual review required" "$SRC"
grep -Fq "No automatic token delivery" "$SRC"
grep -Fq "No investment return promised" "$SRC"
grep -Fq "WC is contribution-credit accounting" "$SRC"
grep -Fq "not a reward faucet" "$SRC"
grep -Fq "DataNet is read-only proof" "$SRC"
grep -Fq "Domains are names. VOID nodes are the host." "$SRC"

grep -Fq "Wallet/key/admin/operator/secret routes are blocked" "$SRC"
grep -Fq "Private JSON-RPC is not public" "$SRC"

echo "priority_card_fund_void=true"
echo "priority_card_earn_wc=true"
echo "priority_card_verify_datanet=true"
echo "priority_card_inspect_public_proof=true"
echo "node_hosted_domain_language_present=true"
echo "funding_manual_review_language_present=true"
echo "wc_not_reward_faucet_language_present=true"
echo "datanet_read_only_proof_language_present=true"
echo "private_route_exposure_performed_now=false"
echo "money_movement_performed_now=false"
echo "wc_ledger_write_performed_now=false"
echo "dns_mutation_performed_now=false"
echo "hosting_mutation_performed_now=false"
echo "VOID_PUBLIC_GATEWAY_PRIORITY_CARDS_V1_GREEN"
