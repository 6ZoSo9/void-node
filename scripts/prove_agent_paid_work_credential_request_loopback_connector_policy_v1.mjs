#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_AUTHORITY_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_SCHEMA_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_V1,
  classifyVoidAgentCredentialRequestLoopbackConnectorPolicyV1,
} from "../tools/void-agent-paid-work-credential-request-loopback-connector-policy-v1.mjs";
import {
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_AUTHORITY_V1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs";

const valid = Object.freeze({
  schema:
    VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_SCHEMA_V1,
  marker: VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_V1,
  version: 1,
  funnel: Object.freeze({
    proxy_protocol_version: 2,
    tls_terminated_tcp_port: 443,
    target_uri: "tcp://127.0.0.1:9899",
  }),
  connector: Object.freeze({
    service_unit: "tailscaled.service",
    effective_uid: 0,
    effective_gid: 0,
  }),
  adapter: Object.freeze({
    service_unit:
      "void-agent-credential-request-proxy-v2-edge-v1.service",
    listen_host: "127.0.0.1",
    listen_port: 9899,
    ipv6_listener: false,
    effective_uid: 1001,
    effective_gid: 1001,
    cap_net_admin: false,
    no_new_privileges: true,
  }),
  gateway: Object.freeze({
    service_unit: "void-ai-agent-public-gateway-v1.service",
    effective_uid: 1002,
    effective_gid: 1002,
    cap_net_admin: false,
    no_new_privileges: true,
  }),
  firewall: Object.freeze({
    engine: "nftables",
    owner_uid: 0,
    table_family: "inet",
    table_name: "void_credential_edge_v1",
    chain_name: "output",
    chain_type: "filter",
    hook: "output",
    priority: 0,
    policy: "accept",
    mutable_by_adapter: false,
    mutable_by_gateway: false,
    rules: Object.freeze([
      Object.freeze({
        order: 1,
        oifname: "lo",
        ip_daddr: "127.0.0.1",
        l4proto: "tcp",
        tcp_dport: 9899,
        skuid: 0,
        verdict: "accept",
      }),
      Object.freeze({
        order: 2,
        oifname: "lo",
        ip_daddr: "127.0.0.1",
        l4proto: "tcp",
        tcp_dport: 9899,
        skuid: null,
        verdict: "drop",
      }),
    ]),
  }),
});

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireQualified(value) {
  const runtime = value;
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "unexpected_policy_hold");
  }
  return runtime;
}

function expectHeld(mutator, reason) {
  const candidate = copy(valid);
  mutator(candidate);
  const result =
    classifyVoidAgentCredentialRequestLoopbackConnectorPolicyV1(
      candidate,
    );
  assert.equal(result.ok, false);
  if (result.ok !== false) {
    throw new Error("expected loopback connector policy HOLD");
  }
  assert.equal(result.reason, reason);
}

const accepted = requireQualified(
  classifyVoidAgentCredentialRequestLoopbackConnectorPolicyV1(valid),
);
assert.equal(
  accepted.status,
  "POLICY_SHAPE_QUALIFIED_NOT_LIVE",
);
assert.equal(accepted.policy_shape_qualified, true);
assert.equal(
  accepted.ordinary_unprivileged_local_bypass_policy_closed,
  true,
);
assert.equal(accepted.public_tls_port, 443);
assert.equal(accepted.adapter_host, "127.0.0.1");
assert.equal(accepted.adapter_port, 9899);
assert.equal(
  accepted.connector_service_unit,
  "tailscaled.service",
);
assert.equal(accepted.connector_uid, 0);
assert.equal(accepted.firewall_table, "void_credential_edge_v1");
assert.equal(accepted.firewall_chain, "output");
assert.equal(accepted.root_equivalent_bypass_out_of_scope, true);
assert.equal(accepted.exact_connector_process_identity_proven, false);
assert.equal(accepted.live_host_evidence_verified, false);
assert.equal(accepted.nftables_ruleset_live_verified, false);
assert.equal(accepted.tailscaled_process_live_verified, false);
assert.equal(accepted.listener_live_verified, false);
assert.equal(accepted.local_transport_trust_proven, false);
assert.equal(accepted.tailscale_funnel_configuration_verified, false);
assert.equal(accepted.runtime_integration, false);
assert.equal(accepted.funds_movement, false);

assert.equal(
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_AUTHORITY_V1
    .local_transport_trust_proven,
  false,
);
assert.equal(
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_AUTHORITY_V1
    .runtime_integration,
  false,
);

expectHeld(
  (x) => {
    x.extra = true;
  },
  "loopback_policy_shape_invalid",
);
expectHeld(
  (x) => {
    x.funnel.proxy_protocol_version = 1;
  },
  "loopback_policy_funnel_mode_invalid",
);
expectHeld(
  (x) => {
    x.funnel.tls_terminated_tcp_port = 8443;
  },
  "loopback_policy_funnel_mode_invalid",
);
expectHeld(
  (x) => {
    x.funnel.target_uri = "tcp://127.0.0.1:9900";
  },
  "loopback_policy_funnel_target_invalid",
);
expectHeld(
  (x) => {
    x.adapter.listen_host = "0.0.0.0";
  },
  "loopback_policy_adapter_identity_invalid",
);
expectHeld(
  (x) => {
    x.adapter.ipv6_listener = true;
  },
  "loopback_policy_adapter_identity_invalid",
);
expectHeld(
  (x) => {
    x.adapter.effective_uid = 0;
  },
  "loopback_policy_adapter_identity_invalid",
);
expectHeld(
  (x) => {
    x.adapter.cap_net_admin = true;
  },
  "loopback_policy_adapter_cap_net_admin_forbidden",
);
expectHeld(
  (x) => {
    x.adapter.no_new_privileges = false;
  },
  "loopback_policy_adapter_no_new_privileges_required",
);
expectHeld(
  (x) => {
    x.gateway.effective_uid = 0;
  },
  "loopback_policy_gateway_uid_invalid",
);
expectHeld(
  (x) => {
    x.gateway.cap_net_admin = true;
  },
  "loopback_policy_gateway_cap_net_admin_forbidden",
);
expectHeld(
  (x) => {
    x.gateway.no_new_privileges = false;
  },
  "loopback_policy_gateway_no_new_privileges_required",
);
expectHeld(
  (x) => {
    x.connector.service_unit = "not-tailscaled.service";
  },
  "loopback_policy_connector_service_invalid",
);
expectHeld(
  (x) => {
    x.connector.effective_uid = 100;
  },
  "loopback_policy_connector_root_identity_required",
);
expectHeld(
  (x) => {
    x.firewall.engine = "iptables";
  },
  "loopback_policy_firewall_identity_invalid",
);
expectHeld(
  (x) => {
    x.firewall.owner_uid = 1000;
  },
  "loopback_policy_firewall_identity_invalid",
);
expectHeld(
  (x) => {
    x.firewall.mutable_by_adapter = true;
  },
  "loopback_policy_firewall_identity_invalid",
);
expectHeld(
  (x) => {
    x.firewall.rules.push(copy(x.firewall.rules[1]));
  },
  "loopback_policy_firewall_rule_count_invalid",
);
expectHeld(
  (x) => {
    x.firewall.rules[0].skuid = 1001;
  },
  "loopback_policy_connector_allow_rule_invalid",
);
expectHeld(
  (x) => {
    x.firewall.rules[0].tcp_dport = 9900;
  },
  "loopback_policy_connector_allow_rule_invalid",
);
expectHeld(
  (x) => {
    x.firewall.rules[0].oifname = "eth0";
  },
  "loopback_policy_connector_allow_rule_invalid",
);
expectHeld(
  (x) => {
    x.firewall.rules[1].verdict = "accept";
  },
  "loopback_policy_nonconnector_drop_rule_invalid",
);
expectHeld(
  (x) => {
    x.firewall.rules[1].skuid = 1002;
  },
  "loopback_policy_nonconnector_drop_rule_invalid",
);
expectHeld(
  (x) => {
    const first = x.firewall.rules[0];
    x.firewall.rules[0] = x.firewall.rules[1];
    x.firewall.rules[1] = first;
  },
  "loopback_policy_connector_allow_rule_invalid",
);

assert.deepEqual(
  VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_AUTHORITY_V1,
  {
    source_contract: true,
    canonical_policy_validation: true,
    funnel_proxy_v2_tls_tcp_shape_required: true,
    ipv4_loopback_target_required: true,
    public_tls_port_443_required: true,
    nftables_output_policy_shape_required: true,
    originating_socket_uid_policy_required: true,
    nonmatching_connector_drop_required: true,
    connector_root_uid_required: true,
    adapter_nonroot_required: true,
    gateway_nonroot_required: true,
    adapter_cap_net_admin_forbidden: true,
    gateway_cap_net_admin_forbidden: true,
    no_new_privileges_required: true,
    root_owned_ruleset_required: true,
    root_equivalent_bypass_out_of_scope: true,
    exact_connector_process_identity_proven: false,
    live_host_evidence_verified: false,
    nftables_ruleset_live_verified: false,
    tailscaled_process_live_verified: false,
    listener_live_verified: false,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    runtime_integration: false,
    listener_created: false,
    firewall_mutation: false,
    tailscale_mutation: false,
    systemd_mutation: false,
    credential_issuance: false,
    credential_registry_write: false,
    paid_work_dispatch: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  },
);

console.log(
  VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_V1 +
    "_PROOF_GREEN",
);
console.log("policy_shape_qualified=true");
console.log("funnel_proxy_protocol_v2=true");
console.log("funnel_tls_terminated_tcp_port=443");
console.log("adapter_host=127.0.0.1");
console.log("nftables_output_skuid_allow_then_drop=true");
console.log("adapter_nonroot=true");
console.log("gateway_nonroot=true");
console.log("adapter_cap_net_admin=false");
console.log("gateway_cap_net_admin=false");
console.log("root_equivalent_bypass_out_of_scope=true");
console.log("exact_connector_process_identity_proven=false");
console.log("live_host_evidence_verified=false");
console.log("nftables_ruleset_live_verified=false");
console.log("tailscaled_process_live_verified=false");
console.log("listener_live_verified=false");
console.log("local_transport_trust_proven=false");
console.log("tailscale_funnel_configuration_verified=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
