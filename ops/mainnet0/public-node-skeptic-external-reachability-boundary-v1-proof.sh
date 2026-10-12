#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-skeptic-external-reachability-boundary-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node Skeptic External Reachability Boundary Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_UI_V1" src/index.ts
grep -Fq "publicNodeSkepticExternalReachabilityBoundaryCard" src/index.ts
grep -Fq "publicNodeSkepticExternalReachabilityBoundaryRawLink" src/index.ts
grep -Fq "publicNodeSkepticExternalReachabilityBoundaryLink" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_DOC_V1" docs/public/public-node-skeptic-external-reachability-boundary-v1.md
grep -Fq "It does not mean the public node has production uptime, global reachability, DDoS resistance, automatic failover, or validator readiness." docs/public/public-node-skeptic-external-reachability-boundary-v1.md

curl -fsS --max-time 8 "$BASE/public-node/skeptic/external-reachability-boundary-v1.json" > "$OUT/external-reachability-boundary.json"
curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS --max-time 8 "$BASE/public-node" > "$OUT/public-node.html"

grep -Fq '"marker":"VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_V1"' "$OUT/external-reachability-boundary.json"
grep -Fq '"route":"/public-node/skeptic/external-reachability-boundary-v1.json"' "$OUT/external-reachability-boundary.json"
grep -Fq '"parent":"/public-node/skeptic-audit-readiness.json"' "$OUT/external-reachability-boundary.json"
grep -Fq '"production_grade_claim":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"third_party_audit_complete":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"disclosure_type":"external_reachability_boundary_disclosure_only"' "$OUT/external-reachability-boundary.json"

grep -Fq '"local_loopback_ok_means_internet_reachable":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"configured_public_base_url_means_uptime_guarantee":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"public_base_url_configured":true' "$OUT/external-reachability-boundary.json"
grep -Fq '"cellular_manual_smoke_is_production_sla":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"lan_hairpin_timeout_alone_means_external_failure":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"lan_hairpin_success_alone_means_external_success":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"external_tester_smoke_required_for_public_claim":true' "$OUT/external-reachability-boundary.json"
grep -Fq '"public_route_reachable_means_public_mutation_allowed":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"public_route_reachable_means_validator_admission_allowed":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"public_route_reachable_means_wc_award_allowed":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"public_route_reachable_means_ledger_write_allowed":false' "$OUT/external-reachability-boundary.json"

grep -Fq '"loopback_probe_supported":true' "$OUT/external-reachability-boundary.json"
grep -Fq '"lan_probe_supported":true' "$OUT/external-reachability-boundary.json"
grep -Fq '"public_base_url_probe_supported":true' "$OUT/external-reachability-boundary.json"
grep -Fq '"cellular_or_non_lan_probe_preferred_for_public_check":true' "$OUT/external-reachability-boundary.json"
grep -Fq '"nat_hairpin_can_be_misleading":true' "$OUT/external-reachability-boundary.json"
grep -Fq '"router_port_forward_dependency_present":true' "$OUT/external-reachability-boundary.json"
grep -Fq '"isp_public_ip_dependency_present":true' "$OUT/external-reachability-boundary.json"
grep -Fq '"dns_domain_dependency_claimed":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"reverse_proxy_dependency_claimed":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"uptime_sla_claimed":false' "$OUT/external-reachability-boundary.json"
grep -Fq '"public_dos_resistance_claimed":false' "$OUT/external-reachability-boundary.json"

grep -Fq '"production_uptime_sla"' "$OUT/external-reachability-boundary.json"
grep -Fq '"multi_region_availability"' "$OUT/external-reachability-boundary.json"
grep -Fq '"automatic_failover"' "$OUT/external-reachability-boundary.json"
grep -Fq '"verified_dynamic_dns"' "$OUT/external-reachability-boundary.json"
grep -Fq '"verified_reverse_proxy_tls_edge"' "$OUT/external-reachability-boundary.json"
grep -Fq '"verified_public_ddos_resistance"' "$OUT/external-reachability-boundary.json"
grep -Fq '"public_reachability_as_validator_readiness"' "$OUT/external-reachability-boundary.json"

grep -Fq '"external_tester_receipt_lane"' "$OUT/external-reachability-boundary.json"
grep -Fq '"manual_non_lan_smoke_preferred"' "$OUT/external-reachability-boundary.json"
grep -Fq '"public_read_only_routes"' "$OUT/external-reachability-boundary.json"
grep -Fq '"no_public_mutation_authority"' "$OUT/external-reachability-boundary.json"
grep -Fq '"non_lan_scheduled_smoke"' "$OUT/external-reachability-boundary.json"
grep -Fq '"document_nat_hairpin_interpretation"' "$OUT/external-reachability-boundary.json"

grep -Fq "/public-node/skeptic/external-reachability-boundary-v1.json" "$OUT/route-index.json"
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_V1" "$OUT/route-index.json"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticExternalReachabilityBoundaryCard" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticExternalReachabilityBoundaryLink" "$OUT/public-node.html"
grep -Fq "External Reachability Boundary" "$OUT/public-node.html"
grep -Fq "Loopback OK means internet reachable" "$OUT/public-node.html"
grep -Fq "Configured public base URL means uptime guarantee" "$OUT/public-node.html"

echo "skeptic_external_reachability_boundary_route_green=true"
echo "skeptic_external_reachability_boundary_route_index_green=true"
echo "skeptic_external_reachability_boundary_card_ui_green=true"
echo "skeptic_external_reachability_boundary_doc_green=true"
echo "skeptic_external_reachability_loopback_ok_means_internet_reachable=false"
echo "skeptic_external_reachability_public_base_url_means_uptime_guarantee=false"
echo "skeptic_external_reachability_public_base_url_configured=true"
echo "skeptic_external_reachability_cellular_manual_smoke_is_production_sla=false"
echo "skeptic_external_reachability_lan_hairpin_timeout_alone_means_external_failure=false"
echo "skeptic_external_reachability_external_tester_smoke_required_for_public_claim=true"
echo "skeptic_external_reachability_public_mutation_from_reachability=false"
echo "skeptic_external_reachability_public_wc_award_from_reachability=false"
echo "skeptic_external_reachability_public_ledger_write_from_reachability=false"
echo "skeptic_external_reachability_uptime_sla_claimed=false"
echo "skeptic_external_reachability_public_dos_resistance_claimed=false"
echo "VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_PROOF_V1_GREEN"
