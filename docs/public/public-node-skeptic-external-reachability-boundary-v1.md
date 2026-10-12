# Public Node External Reachability Boundary v1

Marker: `VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_DOC_V1`

This document is an external-reachability boundary disclosure. It does not claim production uptime, global reachability, DDoS resistance, automatic failover, or validator readiness.

Parent disclosure:

```text
/public-node/skeptic-audit-readiness.json

Child route:

/public-node/skeptic/external-reachability-boundary-v1.json

Route marker:

VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_V1
1. Reachability truth boundary

The v1 truth boundary is:

local_loopback_ok_means_internet_reachable=false
configured_public_base_url_means_uptime_guarantee=false
public_base_url_configured=true
cellular_manual_smoke_is_production_sla=false
lan_hairpin_timeout_alone_means_external_failure=false
lan_hairpin_success_alone_means_external_success=false
external_tester_smoke_required_for_public_claim=true
public_route_reachable_means_public_mutation_allowed=false
public_route_reachable_means_validator_admission_allowed=false
public_route_reachable_means_wc_award_allowed=false
public_route_reachable_means_ledger_write_allowed=false

A public base URL is configuration. It is not a guarantee of public availability.

A loopback probe proves the local process can answer locally. It does not prove outside clients can reach it.

A same-LAN public-IP probe may be distorted by NAT hairpin behavior. A cellular or otherwise non-LAN smoke is stronger evidence for public reachability.

2. Current reachability boundary

The v1 boundary is:

loopback_probe_supported=true
lan_probe_supported=true
public_base_url_probe_supported=true
cellular_or_non_lan_probe_preferred_for_public_check=true
nat_hairpin_can_be_misleading=true
router_port_forward_dependency_present=true
isp_public_ip_dependency_present=true
dns_domain_dependency_claimed=false
reverse_proxy_dependency_claimed=false
uptime_sla_claimed=false
public_dos_resistance_claimed=false
3. Observed Mainnet-0 notes

The v1 public truth is:

loopback checks are necessary but not sufficient
LAN hairpin behavior may differ from real outside-client behavior
manual cellular or non-LAN tester checks are stronger public reachability evidence than same-LAN public-IP probes
public reachability does not expand mutation authority
public reachability can fail due to router, ISP, firewall, NAT, service, or host load
4. Not claimed in v1

This route does not claim:

production_uptime_sla
multi_region_availability
automatic_failover
verified_dynamic_dns
verified_reverse_proxy_tls_edge
verified_public_ddos_resistance
verified_global_reachability
continuous_external_monitoring
public_reachability_as_validator_readiness
5. Current guardrails

Current guardrails:

loopback_route_smokes
public_base_url_status_route
tester_share_page
route_manifest_discovery
self_check_snapshot
external_tester_receipt_lane
manual_non_lan_smoke_preferred
public_read_only_routes
no_public_mutation_authority
live_status_rollup_guards
6. Future hardening path

Future hardening should include:

separate_external_reachability_monitor
non_lan_scheduled_smoke
public_base_url_dns_or_domain_binding
reverse_proxy_tls_front_door
route_timeout_and_rate_limit_layer
public_node_health_page_separate_from_core_health
document_nat_hairpin_interpretation
operator_incident_runbook_for_public_route_timeout

Passing the proof for this route means the public disclosure matches the declared v1 boundary. It does not mean the public node has production uptime, global reachability, DDoS resistance, automatic failover, or validator readiness.
