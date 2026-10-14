#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1,
  VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_SCHEMA_V1,
  VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_V1,
  classifyVoidPublicEarnLoopbackIsolationPolicyV1,
} from "../tools/void-public-earn-loopback-isolation-policy-v1.mjs";

function canonical() {
  return {
    schema: VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_SCHEMA_V1,
    marker: VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_V1,
    version: 1,
    dispatcher: {
      service_unit: "void-public-443-proxy-v2-dispatch-v1.service",
      effective_uid: 1201,
      effective_gid: 1301,
      cap_net_admin: false,
      no_new_privileges: true,
    },
    earn_edge: {
      service_unit: "void-public-earn-proxy-v2-edge-v1.service",
      listen_host: "127.0.0.1",
      listen_port: 19001,
      ipv6_listener: false,
      effective_uid: 1202,
      effective_gid: 1302,
      cap_net_admin: false,
      no_new_privileges: true,
      rate_state: {
        parent_owner_uid: 1202,
        file_owner_uid: 1202,
        parent_group_other_bits_zero: true,
        file_group_other_bits_zero: true,
        single_process_owner: true,
      },
    },
    gateway: {
      service_unit: "void-public-earn-gateway-v1.service",
      shared_listen_host: "127.0.0.1",
      shared_listen_port: 19002,
      shared_mutations_exposed: false,
      dedicated_listen_host: "127.0.0.1",
      dedicated_listen_port: 19003,
      dedicated_ipv6_listener: false,
      additional_dedicated_listeners: [],
      effective_uid: 1203,
      effective_gid: 1303,
      cap_net_admin: false,
      no_new_privileges: true,
    },
    firewall: {
      engine: "nftables",
      owner_uid: 0,
      table_family: "inet",
      table_name: "void_public_earn_edge_v1",
      chain_name: "output",
      chain_type: "filter",
      hook: "output",
      priority: 0,
      policy: "accept",
      mutable_by_dispatcher: false,
      mutable_by_edge: false,
      mutable_by_gateway: false,
      rules: [
        {
          order: 1,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 19001,
          skuid: 1201,
          verdict: "accept",
        },
        {
          order: 2,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 19001,
          skuid: null,
          verdict: "drop",
        },
        {
          order: 3,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 19003,
          skuid: 1202,
          verdict: "accept",
        },
        {
          order: 4,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 19003,
          skuid: null,
          verdict: "drop",
        },
      ],
    },
  };
}

function held(mutator, expectedReason) {
  const input = structuredClone(canonical());
  mutator(input);
  const result = classifyVoidPublicEarnLoopbackIsolationPolicyV1(input);
  assert.equal(result.ok, false, expectedReason);
  assert.equal(result.status, "HOLD", expectedReason);
  assert.equal(result.reason, expectedReason);
  assert.equal(result.local_transport_trust_proven, false);
  assert.equal(result.runtime_integration, false);
  assert.equal(result.funds_movement, false);
}

const accepted = classifyVoidPublicEarnLoopbackIsolationPolicyV1(canonical());
assert.equal(accepted.ok, true);
assert.equal(accepted.status, "POLICY_SHAPE_QUALIFIED_NOT_LIVE");
assert.equal(accepted.policy_shape_qualified, true);
assert.equal(accepted.dispatcher_to_edge_policy_shape_qualified, true);
assert.equal(accepted.edge_to_dedicated_gateway_policy_shape_qualified, true);
assert.equal(accepted.shared_mutation_bypass_policy_shape_qualified, true);
assert.equal(accepted.edge_rate_state_custody_policy_shape_qualified, true);
assert.equal(accepted.dispatcher_uid, 1201);
assert.equal(accepted.earn_edge_uid, 1202);
assert.equal(accepted.gateway_uid, 1203);
assert.equal(accepted.earn_edge_port, 19001);
assert.equal(accepted.shared_gateway_port, 19002);
assert.equal(accepted.dedicated_gateway_port, 19003);
assert.equal(accepted.firewall_table, "void_public_earn_edge_v1");
assert.equal(accepted.funnel_to_dispatcher_trust_proven, false);
assert.equal(accepted.live_host_evidence_verified, false);
assert.equal(accepted.nftables_ruleset_live_verified, false);
assert.equal(accepted.listener_ownership_live_verified, false);
assert.equal(accepted.state_custody_live_verified, false);
assert.equal(accepted.local_transport_trust_proven, false);
assert.equal(accepted.runtime_integration, false);
assert.equal(accepted.funds_movement, false);
assert.equal(
  VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1.systemd_mutation,
  false,
);
assert.equal(
  VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1.firewall_mutation,
  false,
);
assert.equal(
  VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1.work_credit_write,
  false,
);

held(
  (input) => {
    input.gateway.shared_mutations_exposed = true;
  },
  "public_earn_isolation_gateway_identity_invalid",
);
held(
  (input) => {
    input.gateway.dedicated_listen_host = "0.0.0.0";
  },
  "public_earn_isolation_gateway_identity_invalid",
);
held(
  (input) => {
    input.gateway.dedicated_ipv6_listener = true;
  },
  "public_earn_isolation_gateway_identity_invalid",
);
held(
  (input) => {
    input.gateway.additional_dedicated_listeners.push("127.0.0.1:19004");
  },
  "public_earn_isolation_gateway_identity_invalid",
);
held(
  (input) => {
    input.gateway.dedicated_listen_port = input.earn_edge.listen_port;
  },
  "public_earn_isolation_gateway_identity_invalid",
);
held(
  (input) => {
    input.earn_edge.listen_host = "::1";
  },
  "public_earn_isolation_edge_identity_invalid",
);
held(
  (input) => {
    input.earn_edge.effective_uid = input.dispatcher.effective_uid;
  },
  "public_earn_isolation_edge_identity_invalid",
);
held(
  (input) => {
    input.gateway.effective_uid = input.earn_edge.effective_uid;
  },
  "public_earn_isolation_gateway_identity_invalid",
);
held(
  (input) => {
    input.earn_edge.cap_net_admin = true;
  },
  "public_earn_isolation_edge_cap_net_admin_forbidden",
);
held(
  (input) => {
    input.gateway.no_new_privileges = false;
  },
  "public_earn_isolation_gateway_no_new_privileges_required",
);
held(
  (input) => {
    input.earn_edge.rate_state.parent_owner_uid = 7777;
  },
  "public_earn_isolation_rate_state_custody_invalid",
);
held(
  (input) => {
    input.earn_edge.rate_state.file_group_other_bits_zero = false;
  },
  "public_earn_isolation_rate_state_custody_invalid",
);
held(
  (input) => {
    input.earn_edge.rate_state.single_process_owner = false;
  },
  "public_earn_isolation_rate_state_custody_invalid",
);
held(
  (input) => {
    input.gateway.service_unit = input.earn_edge.service_unit;
  },
  "public_earn_isolation_service_units_not_dedicated",
);
held(
  (input) => {
    input.firewall.owner_uid = 1000;
  },
  "public_earn_isolation_firewall_identity_invalid",
);
held(
  (input) => {
    input.firewall.mutable_by_edge = true;
  },
  "public_earn_isolation_firewall_identity_invalid",
);
held(
  (input) => {
    input.firewall.rules[0].skuid = input.earn_edge.effective_uid;
  },
  "public_earn_isolation_dispatcher_edge_allow_rule_invalid",
);
held(
  (input) => {
    input.firewall.rules[1].verdict = "accept";
  },
  "public_earn_isolation_non_dispatcher_edge_drop_rule_invalid",
);
held(
  (input) => {
    input.firewall.rules[2].skuid = input.gateway.effective_uid;
  },
  "public_earn_isolation_edge_gateway_allow_rule_invalid",
);
held(
  (input) => {
    input.firewall.rules[3].verdict = "accept";
  },
  "public_earn_isolation_non_edge_gateway_drop_rule_invalid",
);
held(
  (input) => {
    input.firewall.rules.pop();
  },
  "public_earn_isolation_firewall_rule_count_invalid",
);
held(
  (input) => {
    input.extra = true;
  },
  "public_earn_isolation_shape_invalid",
);

console.log("VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_V1_GREEN");
console.log("dispatcher_to_edge_uid_policy_shape_qualified=true");
console.log("edge_to_dedicated_gateway_uid_policy_shape_qualified=true");
console.log("shared_mutation_bypass_policy_shape_qualified=true");
console.log("edge_rate_state_custody_policy_shape_qualified=true");
console.log("funnel_to_dispatcher_trust_proven=false");
console.log("live_host_evidence_verified=false");
console.log("local_transport_trust_proven=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
