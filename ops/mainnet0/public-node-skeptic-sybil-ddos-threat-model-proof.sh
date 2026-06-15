#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-skeptic-sybil-ddos-threat-model-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node Skeptic Sybil / DDoS Threat Model Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_UI_V1" src/index.ts
grep -Fq "publicNodeSkepticSybilDdosThreatModelCard" src/index.ts
grep -Fq "publicNodeSkepticSybilDdosThreatModelRawLink" src/index.ts
grep -Fq "publicNodeSkepticSybilDdosThreatModelLink" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_DOC_V1" docs/public/public-node-skeptic-sybil-ddos-threat-model.md
grep -Fq "It does not mean the node is secure against Sybil or DDoS attacks." docs/public/public-node-skeptic-sybil-ddos-threat-model.md

curl -fsS --max-time 8 "$BASE/public-node/skeptic/sybil-ddos-threat-model.json" > "$OUT/sybil-ddos-threat-model.json"
curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS --max-time 8 "$BASE/public-node" > "$OUT/public-node.html"

grep -Fq '"marker":"VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_V1"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"route":"/public-node/skeptic/sybil-ddos-threat-model.json"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"parent":"/public-node/skeptic-audit-readiness.json"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"production_grade_claim":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"third_party_audit_complete":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"disclosure_type":"threat_model_disclosure_only"' "$OUT/sybil-ddos-threat-model.json"

grep -Fq '"disclosure_only":true' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"mitigation_complete":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"sybil_resistance_mature":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"route_level_rate_limit_claimed":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"reverse_proxy_ddos_protection_claimed":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"public_private_process_isolation_complete":false' "$OUT/sybil-ddos-threat-model.json"

grep -Fq '"sybil_peer_identity_pressure"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"public_route_flooding"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"socket_exhaustion"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"operator_review_pollution"' "$OUT/sybil-ddos-threat-model.json"

grep -Fq '"public_routes_read_only":true' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"public_route_mutation_allowed":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"core_ledger_mutation_allowed":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"wallet_mutation_allowed":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"validator_admission_mutation_allowed":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"wc_award_mutation_allowed":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"ledger_write_allowed":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"private_api_access_allowed":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"read_only_does_not_mean_dos_proof":true' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"public_route_crash_could_affect_local_node_availability":true' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"process_crash_risk_type":"availability_not_authorized_state_mutation"' "$OUT/sybil-ddos-threat-model.json"

grep -Fq '"automatic_sybil_resistance"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"route_level_rate_limiting"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"reverse_proxy_ddos_protection"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"wc_based_consensus_security"' "$OUT/sybil-ddos-threat-model.json"

grep -Fq '"public_inputs_can_enter_manual_review_queue":true' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"manual_review_required_before_trust_promotion":true' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"automatic_validator_or_wc_award_from_public_input":false' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"work_credits_indirect_influence_scope":"manual_operator_review_only"' "$OUT/sybil-ddos-threat-model.json"
grep -Fq '"work_credits_can_influence_block_finality":false' "$OUT/sybil-ddos-threat-model.json"

grep -Fq "/public-node/skeptic/sybil-ddos-threat-model.json" "$OUT/route-index.json"
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_V1" "$OUT/route-index.json"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticSybilDdosThreatModelCard" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticSybilDdosThreatModelLink" "$OUT/public-node.html"
grep -Fq "Sybil / DDoS Threat Model" "$OUT/public-node.html"
grep -Fq "Route-level rate limiting claimed" "$OUT/public-node.html"
grep -Fq "Automatic validator or WC award from public input" "$OUT/public-node.html"

echo "skeptic_sybil_ddos_threat_model_route_green=true"
echo "skeptic_sybil_ddos_threat_model_route_index_green=true"
echo "skeptic_sybil_ddos_threat_model_card_ui_green=true"
echo "skeptic_sybil_ddos_threat_model_doc_green=true"
echo "skeptic_sybil_ddos_mitigation_complete=false"
echo "skeptic_sybil_ddos_sybil_resistance_mature=false"
echo "skeptic_sybil_ddos_rate_limit_claimed=false"
echo "skeptic_sybil_ddos_reverse_proxy_ddos_claimed=false"
echo "skeptic_sybil_ddos_public_private_process_isolation_complete=false"
echo "skeptic_sybil_ddos_public_mutation=false"
echo "skeptic_sybil_ddos_auto_validator_or_wc_award=false"
echo "skeptic_sybil_ddos_wc_block_finality_power=false"
echo "VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_PROOF_V1_GREEN"
