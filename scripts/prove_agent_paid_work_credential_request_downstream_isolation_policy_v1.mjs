#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_AUTHORITY_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_SCHEMA_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_V1,
  classifyVoidAgentCredentialRequestDownstreamIsolationPolicyV1,
} from "../tools/void-agent-paid-work-credential-request-downstream-isolation-policy-v1.mjs";

const credentialRoute =
  "/__void/agents/paid-work/credential-requests/v1";

function loopbackPolicy() {
  return {
    schema: "void_agent_credential_request_loopback_connector_policy_v1",
    marker: "VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_V1",
    version: 1,
    funnel: {
      proxy_protocol_version: 2,
      tls_terminated_tcp_port: 443,
      target_uri: "tcp://127.0.0.1:9899",
    },
    connector: {
      service_unit: "tailscaled.service",
      effective_uid: 0,
      effective_gid: 0,
    },
    adapter: {
      service_unit:
        "void-agent-credential-request-proxy-v2-edge-v1.service",
      listen_host: "127.0.0.1",
      listen_port: 9899,
      ipv6_listener: false,
      effective_uid: 2101,
      effective_gid: 2101,
      cap_net_admin: false,
      no_new_privileges: true,
    },
    gateway: {
      service_unit: "void-ai-agent-public-gateway-v1.service",
      effective_uid: 2102,
      effective_gid: 2102,
      cap_net_admin: false,
      no_new_privileges: true,
    },
    firewall: {
      engine: "nftables",
      owner_uid: 0,
      table_family: "inet",
      table_name: "void_credential_edge_v1",
      chain_name: "output",
      chain_type: "filter",
      hook: "output",
      priority: 0,
      policy: "accept",
      rules: [
        {
          order: 1,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 9899,
          skuid: 0,
          verdict: "accept",
        },
        {
          order: 2,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 9899,
          skuid: null,
          verdict: "drop",
        },
      ],
      mutable_by_adapter: false,
      mutable_by_gateway: false,
    },
  };
}

function validPolicy() {
  return {
    schema:
      VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_SCHEMA_V1,
    marker:
      VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_V1,
    version: 1,
    loopback_connector_policy: loopbackPolicy(),
    shared_gateway: {
      service_unit: "void-ai-agent-public-gateway-v1.service",
      listen_host: "127.0.0.1",
      listen_port: 4112,
      credential_route_exposed: false,
      ordinary_routes_preserved: true,
    },
    dedicated_credential_downstream: {
      service_unit: "void-ai-agent-public-gateway-v1.service",
      listen_host: "127.0.0.1",
      listen_port: 4190,
      ipv6_listener: false,
      credential_method: "POST",
      credential_route: credentialRoute,
      credential_route_only: true,
      trusted_connector_uid: 2101,
      source_identity_forwarded: false,
    },
    downstream_firewall: {
      engine: "nftables",
      owner_uid: 0,
      table_family: "inet",
      table_name: "void_credential_gateway_edge_v1",
      chain_name: "output",
      chain_type: "filter",
      hook: "output",
      priority: 0,
      policy: "accept",
      rules: [
        {
          order: 1,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 4190,
          skuid: 2101,
          verdict: "accept",
        },
        {
          order: 2,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 4190,
          skuid: null,
          verdict: "drop",
        },
      ],
      mutable_by_adapter: false,
      mutable_by_gateway: false,
    },
  };
}

function clone(value) {
  return structuredClone(value);
}

function expectHold(mutator, pattern) {
  const input = validPolicy();
  mutator(input);
  const result =
    classifyVoidAgentCredentialRequestDownstreamIsolationPolicyV1(
      input,
    );
  assert.equal(result.ok, false);
  assert.equal(result.status, "HOLD");
  assert.match(result.reason, pattern);
  assert.equal(result.downstream_gateway_bypass_closed, false);
  assert.equal(result.local_transport_trust_proven, false);
  assert.equal(result.runtime_integration, false);
  assert.equal(result.funds_movement, false);
}

const qualified =
  classifyVoidAgentCredentialRequestDownstreamIsolationPolicyV1(
    validPolicy(),
  );
assert.equal(qualified.ok, true);
assert.equal(qualified.status, "POLICY_SHAPE_QUALIFIED_NOT_LIVE");
assert.equal(qualified.source_topology_policy_qualified, true);
assert.equal(
  qualified.downstream_gateway_bypass_policy_shape_qualified,
  true,
);
assert.equal(qualified.shared_gateway_credential_route_disabled, true);
assert.equal(qualified.ordinary_shared_gateway_routes_preserved, true);
assert.equal(qualified.dedicated_downstream_port, 4190);
assert.equal(qualified.adapter_uid, 2101);
assert.equal(qualified.gateway_uid, 2102);
assert.equal(qualified.source_identity_forwarded, false);
assert.equal(qualified.downstream_gateway_bypass_closed, false);
assert.equal(qualified.live_host_evidence_verified, false);
assert.equal(qualified.local_transport_trust_proven, false);
assert.equal(qualified.runtime_integration, false);

expectHold(
  (x) => {
    x.shared_gateway.credential_route_exposed = true;
  },
  /shared_gateway_bypass_not_closed/u,
);
expectHold(
  (x) => {
    x.shared_gateway.ordinary_routes_preserved = false;
  },
  /shared_gateway_bypass_not_closed/u,
);
expectHold(
  (x) => {
    x.dedicated_credential_downstream.listen_port = 4112;
    x.downstream_firewall.rules[0].tcp_dport = 4112;
    x.downstream_firewall.rules[1].tcp_dport = 4112;
  },
  /dedicated_listener_invalid/u,
);
expectHold(
  (x) => {
    x.dedicated_credential_downstream.listen_port = 9899;
    x.downstream_firewall.rules[0].tcp_dport = 9899;
    x.downstream_firewall.rules[1].tcp_dport = 9899;
  },
  /dedicated_listener_invalid/u,
);
expectHold(
  (x) => {
    x.dedicated_credential_downstream.listen_host = "0.0.0.0";
  },
  /dedicated_listener_invalid/u,
);
expectHold(
  (x) => {
    x.dedicated_credential_downstream.ipv6_listener = true;
  },
  /dedicated_listener_invalid/u,
);
expectHold(
  (x) => {
    x.dedicated_credential_downstream.credential_method = "GET";
  },
  /dedicated_listener_invalid/u,
);
expectHold(
  (x) => {
    x.dedicated_credential_downstream.credential_route =
      "/__void/agents/paid-work/credential-requests/v2";
  },
  /dedicated_listener_invalid/u,
);
expectHold(
  (x) => {
    x.dedicated_credential_downstream.credential_route_only = false;
  },
  /dedicated_listener_invalid/u,
);
expectHold(
  (x) => {
    x.dedicated_credential_downstream.trusted_connector_uid = 2102;
  },
  /dedicated_listener_invalid/u,
);
expectHold(
  (x) => {
    x.dedicated_credential_downstream.source_identity_forwarded = true;
  },
  /dedicated_listener_invalid/u,
);
expectHold(
  (x) => {
    x.downstream_firewall.rules[0].skuid = 2102;
  },
  /adapter_allow_rule_invalid/u,
);
expectHold(
  (x) => {
    x.downstream_firewall.rules[1].verdict = "accept";
  },
  /nonadapter_drop_rule_invalid/u,
);
expectHold(
  (x) => {
    x.downstream_firewall.rules.pop();
  },
  /firewall_rule_count_invalid/u,
);
expectHold(
  (x) => {
    x.downstream_firewall.mutable_by_adapter = true;
  },
  /firewall_identity_invalid/u,
);
expectHold(
  (x) => {
    x.loopback_connector_policy.adapter.cap_net_admin = true;
  },
  /loopback_connector_policy_invalid/u,
);
expectHold(
  (x) => {
    x.extra = true;
  },
  /downstream_isolation_shape_invalid/u,
);

for (const key of [
  "live_host_evidence_verified",
  "downstream_gateway_bypass_closed",
  "local_transport_trust_proven",
  "tailscale_funnel_configuration_verified",
  "gateway_runtime_configuration_verified",
  "runtime_integration",
  "listener_created",
  "firewall_mutation",
  "tailscale_mutation",
  "systemd_mutation",
  "credential_issuance",
  "credential_registry_write",
  "paid_work_dispatch",
  "work_credit_write",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "market_activation",
  "public_presale_activation",
  "treasury_or_liquidity_movement",
  "funds_movement",
]) {
  assert.equal(
    VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_AUTHORITY_V1[
      key
    ],
    false,
    key + " must remain false",
  );
}

const currentSourceTopology = clone(validPolicy());
currentSourceTopology.shared_gateway.credential_route_exposed = true;
const currentTopologyResult =
  classifyVoidAgentCredentialRequestDownstreamIsolationPolicyV1(
    currentSourceTopology,
  );
assert.equal(currentTopologyResult.ok, false);
assert.equal(
  currentTopologyResult.reason,
  "downstream_isolation_shared_gateway_bypass_not_closed",
);

console.log(
  "VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_V1_GREEN",
);
console.log("parent_loopback_connector_policy_reused=true");
console.log("shared_gateway_credential_route_must_be_disabled=true");
console.log("ordinary_shared_gateway_routes_preserved=true");
console.log("dedicated_credential_downstream_required=true");
console.log("adapter_uid_only_downstream_connector_required=true");
console.log("nonmatching_downstream_connector_drop_required=true");
console.log("source_identity_forwarding_forbidden=true");
console.log("current_shared_4112_credential_route_holds=true");
console.log("live_host_evidence_verified=false");
console.log("downstream_gateway_bypass_closed=false");
console.log("local_transport_trust_proven=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
