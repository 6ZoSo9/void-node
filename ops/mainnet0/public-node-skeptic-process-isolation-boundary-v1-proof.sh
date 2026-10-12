#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-skeptic-process-isolation-boundary-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node Skeptic Process Isolation Boundary Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_SKEPTIC_PROCESS_ISOLATION_BOUNDARY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_PROCESS_ISOLATION_BOUNDARY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_PROCESS_ISOLATION_BOUNDARY_UI_V1" src/index.ts
grep -Fq "publicNodeSkepticProcessIsolationBoundaryCard" src/index.ts
grep -Fq "publicNodeSkepticProcessIsolationBoundaryRawLink" src/index.ts
grep -Fq "publicNodeSkepticProcessIsolationBoundaryLink" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_PROCESS_ISOLATION_BOUNDARY_DOC_V1" docs/public/public-node-skeptic-process-isolation-boundary-v1.md
grep -Fq "It does not mean public routes are DoS-proof, rate-limited, process-isolated, or unable to affect local node availability." docs/public/public-node-skeptic-process-isolation-boundary-v1.md

curl -fsS --max-time 8 "$BASE/public-node/skeptic/process-isolation-boundary-v1.json" > "$OUT/process-isolation-boundary.json"
curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS --max-time 8 "$BASE/public-node" > "$OUT/public-node.html"

grep -Fq '"marker":"VOID_PUBLIC_NODE_SKEPTIC_PROCESS_ISOLATION_BOUNDARY_V1"' "$OUT/process-isolation-boundary.json"
grep -Fq '"route":"/public-node/skeptic/process-isolation-boundary-v1.json"' "$OUT/process-isolation-boundary.json"
grep -Fq '"parent":"/public-node/skeptic-audit-readiness.json"' "$OUT/process-isolation-boundary.json"
grep -Fq '"production_grade_claim":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"third_party_audit_complete":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"disclosure_type":"process_isolation_and_availability_boundary_disclosure_only"' "$OUT/process-isolation-boundary.json"

grep -Fq '"public_private_process_isolation_complete":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_routes_read_only":true' "$OUT/process-isolation-boundary.json"
grep -Fq '"read_only_means_dos_proof":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"read_only_means_process_isolated":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_route_crash_can_affect_local_node_availability":true' "$OUT/process-isolation-boundary.json"
grep -Fq '"socket_exhaustion_can_affect_local_node_availability":true' "$OUT/process-isolation-boundary.json"
grep -Fq '"heavy_public_request_load_can_affect_local_node_availability":true' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_route_authorized_mutation_path_exists":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_route_can_mutate_core_ledger":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_route_can_mutate_wallet_or_keys":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_route_can_mutate_validator_set":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_route_can_award_work_credits":false' "$OUT/process-isolation-boundary.json"

grep -Fq '"public_node_surface_and_local_node_share_runtime_process":true' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_surface_has_separate_failure_domain":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_surface_has_verified_reverse_proxy_ddos_shield":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_surface_has_verified_rate_limit":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_surface_has_verified_request_queue_isolation":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_surface_has_verified_cpu_memory_cgroup_isolation":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"public_surface_has_verified_worker_process_pool":false' "$OUT/process-isolation-boundary.json"
grep -Fq '"systemd_user_service_runtime_quarantine_present":true' "$OUT/process-isolation-boundary.json"
grep -Fq '"route_level_mutation_disabled":true' "$OUT/process-isolation-boundary.json"
grep -Fq '"live_runtime_private_command_exposure":false' "$OUT/process-isolation-boundary.json"

grep -Fq '"public_route_crash"' "$OUT/process-isolation-boundary.json"
grep -Fq '"socket_exhaustion"' "$OUT/process-isolation-boundary.json"
grep -Fq '"slow_client_connection_pressure"' "$OUT/process-isolation-boundary.json"
grep -Fq '"large_request_pressure"' "$OUT/process-isolation-boundary.json"
grep -Fq '"shared_process_failure_cascade"' "$OUT/process-isolation-boundary.json"

grep -Fq '"production_grade_process_isolation"' "$OUT/process-isolation-boundary.json"
grep -Fq '"verified_dos_protection"' "$OUT/process-isolation-boundary.json"
grep -Fq '"verified_rate_limiting"' "$OUT/process-isolation-boundary.json"
grep -Fq '"verified_reverse_proxy_shielding"' "$OUT/process-isolation-boundary.json"
grep -Fq '"zero_availability_impact_from_public_routes"' "$OUT/process-isolation-boundary.json"

grep -Fq '"split_public_surface_into_separate_process"' "$OUT/process-isolation-boundary.json"
grep -Fq '"reverse_proxy_with_request_limits"' "$OUT/process-isolation-boundary.json"
grep -Fq '"per_route_timeout_and_size_caps"' "$OUT/process-isolation-boundary.json"
grep -Fq '"systemd_cgroup_limits_for_public_surface"' "$OUT/process-isolation-boundary.json"

grep -Fq "/public-node/skeptic/process-isolation-boundary-v1.json" "$OUT/route-index.json"
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_PROCESS_ISOLATION_BOUNDARY_V1" "$OUT/route-index.json"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_PROCESS_ISOLATION_BOUNDARY_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticProcessIsolationBoundaryCard" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticProcessIsolationBoundaryLink" "$OUT/public-node.html"
grep -Fq "Process Isolation & Availability Boundary" "$OUT/public-node.html"
grep -Fq "Read-only means DoS-proof" "$OUT/public-node.html"
grep -Fq "Public route authorized mutation path exists" "$OUT/public-node.html"

echo "skeptic_process_isolation_boundary_route_green=true"
echo "skeptic_process_isolation_boundary_route_index_green=true"
echo "skeptic_process_isolation_boundary_card_ui_green=true"
echo "skeptic_process_isolation_boundary_doc_green=true"
echo "skeptic_process_isolation_complete=false"
echo "skeptic_process_isolation_public_routes_read_only=true"
echo "skeptic_process_isolation_read_only_means_dos_proof=false"
echo "skeptic_process_isolation_read_only_means_process_isolated=false"
echo "skeptic_process_isolation_public_route_crash_can_affect_availability=true"
echo "skeptic_process_isolation_socket_exhaustion_can_affect_availability=true"
echo "skeptic_process_isolation_authorized_mutation_path_exists=false"
echo "skeptic_process_isolation_public_core_ledger_mutation=false"
echo "skeptic_process_isolation_public_wallet_key_mutation=false"
echo "skeptic_process_isolation_public_validator_mutation=false"
echo "skeptic_process_isolation_public_wc_award=false"
echo "skeptic_process_isolation_verified_rate_limit=false"
echo "skeptic_process_isolation_verified_reverse_proxy_ddos=false"
echo "VOID_PUBLIC_NODE_SKEPTIC_PROCESS_ISOLATION_BOUNDARY_PROOF_V1_GREEN"
