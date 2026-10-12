#!/usr/bin/env node

import {
  classifyVoidAgentCredentialRequestLoopbackConnectorPolicyV1,
} from "./void-agent-paid-work-credential-request-loopback-connector-policy-v1.mjs";

export const VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_V1 =
  "VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_V1";

export const VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_SCHEMA_V1 =
  "void_agent_credential_request_downstream_isolation_policy_v1";

export const VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    loopback_connector_policy_reused: true,
    shared_gateway_credential_route_must_be_disabled: true,
    dedicated_credential_downstream_listener_required: true,
    adapter_uid_only_downstream_connector_required: true,
    nonmatching_downstream_connector_drop_required: true,
    upstream_global_wall_direct_bypass_policy_required: true,
    gateway_uid_only_upstream_connector_required: true,
    nonmatching_upstream_connector_drop_required: true,
    ordinary_shared_gateway_routes_preserved: true,
    source_identity_forwarding_forbidden: true,
    root_owned_ruleset_required: true,
    root_equivalent_bypass_out_of_scope: true,
    source_topology_policy_qualified: true,
    live_host_evidence_verified: false,
    downstream_gateway_bypass_closed: false,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    gateway_runtime_configuration_verified: false,
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
  });

const TARGET_HOST = "127.0.0.1";
const SHARED_GATEWAY_PORT = 4112;
const CREDENTIAL_ROUTE =
  "/__void/agents/paid-work/credential-requests/v1";
const TABLE_NAME = "void_credential_gateway_edge_v1";
const CHAIN_NAME = "output";
const MAX_PORT = 65535;

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker:
      VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_V1,
    version: 1,
    reason,
    source_topology_policy_qualified: false,
    downstream_gateway_bypass_policy_shape_qualified: false,
    downstream_gateway_bypass_closed: false,
    live_host_evidence_verified: false,
    local_transport_trust_proven: false,
    runtime_integration: false,
    funds_movement: false,
    authority:
      VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_AUTHORITY_V1,
  });
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  const actual = Object.keys(value).sort().join("\n");
  const expected = [...keys].sort().join("\n");
  if (actual !== expected) {
    throw new Error(code);
  }
  return value;
}

function integer(value, minimum, maximum, code) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(code);
  }
  return value;
}

function requireDownstreamRule(rule, expected, code) {
  exactKeys(
    rule,
    [
      "order",
      "oifname",
      "ip_daddr",
      "l4proto",
      "tcp_dport",
      "skuid",
      "verdict",
    ],
    code + "_shape_invalid",
  );
  if (
    rule.order !== expected.order ||
    rule.oifname !== "lo" ||
    rule.ip_daddr !== TARGET_HOST ||
    rule.l4proto !== "tcp" ||
    rule.tcp_dport !== expected.port ||
    rule.skuid !== expected.skuid ||
    rule.verdict !== expected.verdict
  ) {
    throw new Error(code + "_invalid");
  }
}

export function classifyVoidAgentCredentialRequestDownstreamIsolationPolicyV1(
  input,
) {
  try {
    exactKeys(
      input,
      [
        "schema",
        "marker",
        "version",
        "loopback_connector_policy",
        "shared_gateway",
        "dedicated_credential_downstream",
        "credential_gateway_upstream",
        "downstream_firewall",
      ],
      "downstream_isolation_shape_invalid",
    );
    if (
      input.schema !==
        VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_SCHEMA_V1 ||
      input.marker !==
        VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_V1 ||
      input.version !== 1
    ) {
      throw new Error("downstream_isolation_identity_invalid");
    }

    const upstream =
      classifyVoidAgentCredentialRequestLoopbackConnectorPolicyV1(
        input.loopback_connector_policy,
      );
    if (
      upstream.ok !== true ||
      upstream.policy_shape_qualified !== true ||
      upstream.local_transport_trust_proven !== false ||
      upstream.runtime_integration !== false
    ) {
      throw new Error(
        "downstream_isolation_loopback_connector_policy_invalid",
      );
    }

    const shared = exactKeys(
      input.shared_gateway,
      [
        "service_unit",
        "listen_host",
        "listen_port",
        "ipv6_listener",
        "additional_listeners",
        "credential_route_exposed",
        "ordinary_routes_preserved",
      ],
      "downstream_isolation_shared_gateway_shape_invalid",
    );
    if (
      shared.service_unit !== upstream.gateway_service_unit ||
      shared.listen_host !== TARGET_HOST ||
      shared.listen_port !== SHARED_GATEWAY_PORT ||
      shared.ipv6_listener !== false ||
      !Array.isArray(shared.additional_listeners) ||
      shared.additional_listeners.length !== 0 ||
      shared.credential_route_exposed !== false ||
      shared.ordinary_routes_preserved !== true
    ) {
      throw new Error(
        "downstream_isolation_shared_gateway_bypass_not_closed",
      );
    }

    const dedicated = exactKeys(
      input.dedicated_credential_downstream,
      [
        "service_unit",
        "listen_host",
        "listen_port",
        "ipv6_listener",
        "additional_listeners",
        "credential_method",
        "credential_route",
        "credential_route_only",
        "trusted_connector_uid",
        "source_identity_forwarded",
      ],
      "downstream_isolation_dedicated_listener_shape_invalid",
    );
    const dedicatedPort = integer(
      dedicated.listen_port,
      1024,
      MAX_PORT,
      "downstream_isolation_dedicated_port_invalid",
    );
    if (
      dedicated.service_unit !== upstream.gateway_service_unit ||
      dedicated.listen_host !== TARGET_HOST ||
      dedicated.ipv6_listener !== false ||
      !Array.isArray(dedicated.additional_listeners) ||
      dedicated.additional_listeners.length !== 0 ||
      dedicated.credential_method !== "POST" ||
      dedicated.credential_route !== CREDENTIAL_ROUTE ||
      dedicated.credential_route_only !== true ||
      dedicated.trusted_connector_uid !== upstream.adapter_uid ||
      dedicated.source_identity_forwarded !== false ||
      dedicatedPort === SHARED_GATEWAY_PORT ||
      dedicatedPort === upstream.adapter_port
    ) {
      throw new Error(
        "downstream_isolation_dedicated_listener_invalid",
      );
    }

    const upstreamGateway = exactKeys(
      input.credential_gateway_upstream,
      [
        "listen_host",
        "listen_port",
        "ipv6_listener",
        "additional_listeners",
        "credential_route",
        "trusted_client_uid",
      ],
      "downstream_isolation_credential_gateway_upstream_shape_invalid",
    );
    const upstreamGatewayPort = integer(
      upstreamGateway.listen_port,
      1024,
      MAX_PORT,
      "downstream_isolation_credential_gateway_upstream_port_invalid",
    );
    if (
      upstreamGateway.listen_host !== TARGET_HOST ||
      upstreamGateway.ipv6_listener !== false ||
      !Array.isArray(upstreamGateway.additional_listeners) ||
      upstreamGateway.additional_listeners.length !== 0 ||
      upstreamGateway.credential_route !== CREDENTIAL_ROUTE ||
      upstreamGateway.trusted_client_uid !== upstream.gateway_uid ||
      upstreamGatewayPort === SHARED_GATEWAY_PORT ||
      upstreamGatewayPort === upstream.adapter_port ||
      upstreamGatewayPort === dedicatedPort
    ) {
      throw new Error(
        "downstream_isolation_credential_gateway_upstream_invalid",
      );
    }

    const firewall = exactKeys(
      input.downstream_firewall,
      [
        "engine",
        "owner_uid",
        "table_family",
        "table_name",
        "chain_name",
        "chain_type",
        "hook",
        "priority",
        "policy",
        "rules",
        "mutable_by_adapter",
        "mutable_by_gateway",
      ],
      "downstream_isolation_firewall_shape_invalid",
    );
    if (
      firewall.engine !== "nftables" ||
      firewall.owner_uid !== 0 ||
      firewall.table_family !== "inet" ||
      firewall.table_name !== TABLE_NAME ||
      firewall.chain_name !== CHAIN_NAME ||
      firewall.chain_type !== "filter" ||
      firewall.hook !== "output" ||
      firewall.priority !== 0 ||
      firewall.policy !== "accept" ||
      firewall.mutable_by_adapter !== false ||
      firewall.mutable_by_gateway !== false
    ) {
      throw new Error(
        "downstream_isolation_firewall_identity_invalid",
      );
    }
    if (!Array.isArray(firewall.rules) || firewall.rules.length !== 4) {
      throw new Error(
        "downstream_isolation_firewall_rule_count_invalid",
      );
    }
    requireDownstreamRule(
      firewall.rules[0],
      {
        order: 1,
        port: dedicatedPort,
        skuid: upstream.adapter_uid,
        verdict: "accept",
      },
      "downstream_isolation_adapter_allow_rule",
    );
    requireDownstreamRule(
      firewall.rules[1],
      {
        order: 2,
        port: dedicatedPort,
        skuid: null,
        verdict: "drop",
      },
      "downstream_isolation_nonadapter_drop_rule",
    );
    requireDownstreamRule(
      firewall.rules[2],
      {
        order: 3,
        port: upstreamGatewayPort,
        skuid: upstream.gateway_uid,
        verdict: "accept",
      },
      "downstream_isolation_gateway_upstream_allow_rule",
    );
    requireDownstreamRule(
      firewall.rules[3],
      {
        order: 4,
        port: upstreamGatewayPort,
        skuid: null,
        verdict: "drop",
      },
      "downstream_isolation_nongateway_upstream_drop_rule",
    );

    return Object.freeze({
      ok: true,
      status: "POLICY_SHAPE_QUALIFIED_NOT_LIVE",
      marker:
        VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_V1,
      version: 1,
      source_topology_policy_qualified: true,
      downstream_gateway_bypass_policy_shape_qualified: true,
      shared_gateway_credential_route_disabled: true,
      ordinary_shared_gateway_routes_preserved: true,
      closed_world_listener_sets_required: true,
      shared_gateway_ipv6_listener: false,
      dedicated_downstream_ipv6_listener: false,
      credential_gateway_upstream_ipv6_listener: false,
      dedicated_credential_downstream_required: true,
      credential_route: CREDENTIAL_ROUTE,
      shared_gateway_host: TARGET_HOST,
      shared_gateway_port: SHARED_GATEWAY_PORT,
      dedicated_downstream_host: TARGET_HOST,
      dedicated_downstream_port: dedicatedPort,
      credential_gateway_upstream_host: TARGET_HOST,
      credential_gateway_upstream_port: upstreamGatewayPort,
      gateway_service_unit: upstream.gateway_service_unit,
      adapter_service_unit: upstream.adapter_service_unit,
      adapter_uid: upstream.adapter_uid,
      gateway_uid: upstream.gateway_uid,
      downstream_firewall_table: TABLE_NAME,
      downstream_firewall_chain: CHAIN_NAME,
      source_identity_forwarded: false,
      root_equivalent_bypass_out_of_scope: true,
      downstream_gateway_bypass_closed: false,
      live_host_evidence_verified: false,
      local_transport_trust_proven: false,
      tailscale_funnel_configuration_verified: false,
      gateway_runtime_configuration_verified: false,
      runtime_integration: false,
      funds_movement: false,
      authority:
        VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}
