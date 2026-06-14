#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
ROUTE="$BASE/public-node/risk-register.json"
TMP="$(mktemp /tmp/void-risk-register-v1.XXXXXX.json)"
trap 'rm -f "$TMP"' EXIT

echo "VOID_PUBLIC_NODE_RISK_REGISTER_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_RISK_REGISTER_DOC_V1" docs/public/public-node-risk-register.md
grep -Fq "VOID_PUBLIC_NODE_RISK_REGISTER_UI_V1" src/index.ts

curl -fsS -o "$TMP" "$ROUTE"
jq empty "$TMP" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_RISK_REGISTER_V1"' "$TMP" >/dev/null
jq -e '.risk_register_version=="v1"' "$TMP" >/dev/null
jq -e '.phase=="guarded_mainnet_0_bootstrap"' "$TMP" >/dev/null
jq -e '.risk_count==8' "$TMP" >/dev/null
jq -e '(.risks|length)==8' "$TMP" >/dev/null

jq -e '.policy.public_read_only==true' "$TMP" >/dev/null
jq -e '.policy.public_mutation==false' "$TMP" >/dev/null
jq -e '.policy.money_movement==false' "$TMP" >/dev/null
jq -e '.policy.wc_credit_award==false' "$TMP" >/dev/null
jq -e '.policy.wc_to_void_swap==false' "$TMP" >/dev/null
jq -e '.policy.validator_mutation==false' "$TMP" >/dev/null

jq -e 'all(.risks[]; (.id|type=="string") and (.title|type=="string") and (.status|type=="string") and (.gate_state|type=="string") and (.public_mutation_open|type=="boolean") and (.claim_state|type=="string") and (.mitigation|type=="string") and (.last_reviewed|type=="string"))' "$TMP" >/dev/null

jq -e 'all(.risks[]; (.status as $s | ["known","gated","mitigated","not_open","future_work","must_not_be_claimed_yet"] | index($s)) and (.gate_state as $g | ["closed","read_only","operator_only","controlled_test","public_limited","public_open"] | index($g)) and (.claim_state as $c | ["acknowledged_only","gated_not_open","mitigated_with_proof","future_work","must_not_be_claimed_solved"] | index($c)))' "$TMP" >/dev/null

jq -e '[.risks[] | select((.gate_state=="closed" or .gate_state=="read_only" or .gate_state=="operator_only") and .public_mutation_open==true)] | length == 0' "$TMP" >/dev/null
jq -e '[.risks[] | select(.claim_state=="must_not_be_claimed_solved" and .status=="mitigated")] | length == 0' "$TMP" >/dev/null

jq -e '[.risks[].id] | index("guarded_bootstrap_centralization") and index("sybil_ddos_public_participation") and index("sparse_node_density") and index("datanet_core_isolation") and index("upgrade_transparency") and index("wc_economic_integrity") and index("datanet_content_liability") and index("client_resource_exhaustion")' "$TMP" >/dev/null

echo "risk_register_green=true"
echo "risk_register_count=8"
echo "risk_register_public_mutation=false"
echo "risk_register_wc_credit_award=false"
echo "risk_register_wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_RISK_REGISTER_PROOF_V1_GREEN"
