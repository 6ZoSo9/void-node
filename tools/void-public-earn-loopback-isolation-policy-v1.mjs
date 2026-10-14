#!/usr/bin/env node

export const VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_V1 =
  "VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_V1";

export const VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_SCHEMA_V1 =
  "void_public_earn_loopback_isolation_policy_v1";

export const VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    dispatcher_to_edge_uid_policy_required: true,
    edge_to_dedicated_gateway_uid_policy_required: true,
    shared_gateway_mutation_routes_disabled_required: true,
    ipv4_loopback_only_required: true,
    nftables_output_policy_shape_required: true,
    root_owned_ruleset_required: true,
    service_uid_separation_required: true,
    edge_rate_state_same_uid_private_custody_required: true,
    edge_rate_state_single_process_owner_required: true,
    root_equivalent_bypass_out_of_scope: true,
    funnel_to_dispatcher_trust_proven: false,
    live_host_evidence_verified: false,
    nftables_ruleset_live_verified: false,
    listener_ownership_live_verified: false,
    state_custody_live_verified: false,
    local_transport_trust_proven: false,
    runtime_integration: false,
    listener_created: false,
    firewall_mutation: false,
    systemd_mutation: false,
    funnel_mutation: false,
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
const DISPATCHER_SERVICE_UNIT =
  "void-public-443-proxy-v2-dispatch-v1.service";
const EARN_EDGE_SERVICE_UNIT =
  "void-public-earn-proxy-v2-edge-v1.service";
const GATEWAY_SERVICE_UNIT = "void-public-earn-gateway-v1.service";
const TABLE_NAME = "void_public_earn_edge_v1";
const CHAIN_NAME = "output";
const MAX_PORT = 65535;
const MAX_ID = 0xffffffff;
const SAFE_NAME = /^[a-zA-Z0-9_.@-]{1,128}$/u;

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_V1,
    version: 1,
    reason,
    policy_shape_qualified: false,
    shared_mutation_bypass_policy_shape_qualified: false,
    edge_rate_state_custody_policy_shape_qualified: false,
    funnel_to_dispatcher_trust_proven: false,
    live_host_evidence_verified: false,
    local_transport_trust_proven: false,
    runtime_integration: false,
    funds_movement: false,
    authority: VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1,
  });
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  const actual = Object.keys(value).sort().join("\n");
  const expected = [...keys].sort().join("\n");
  if (actual !== expected) throw new Error(code);
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

function name(value, code) {
  if (typeof value !== "string" || !SAFE_NAME.test(value)) {
    throw new Error(code);
  }
  return value;
}

function requiredBoolean(value, expected, code) {
  if (value !== expected) throw new Error(code);
}

function serviceIdentity(value, label) {
  const service = exactKeys(
    value,
    [
      "service_unit",
      "effective_uid",
      "effective_gid",
      "cap_net_admin",
      "no_new_privileges",
    ],
    label + "_shape_invalid",
  );
  name(service.service_unit, label + "_service_invalid");
  integer(service.effective_uid, 1, MAX_ID, label + "_uid_invalid");
  integer(service.effective_gid, 1, MAX_ID, label + "_gid_invalid");
  requiredBoolean(
    service.cap_net_admin,
    false,
    label + "_cap_net_admin_forbidden",
  );
  requiredBoolean(
    service.no_new_privileges,
    true,
    label + "_no_new_privileges_required",
  );
  return service;
}

function requireRule(rule, expected, code) {
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

export function classifyVoidPublicEarnLoopbackIsolationPolicyV1(input) {
  try {
    exactKeys(
      input,
      [
        "schema",
        "marker",
        "version",
        "dispatcher",
        "earn_edge",
        "gateway",
        "firewall",
      ],
      "public_earn_isolation_shape_invalid",
    );
    if (
      input.schema !== VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_SCHEMA_V1 ||
      input.marker !== VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_V1 ||
      input.version !== 1
    ) {
      throw new Error("public_earn_isolation_identity_invalid");
    }

    const dispatcher = serviceIdentity(
      input.dispatcher,
      "public_earn_isolation_dispatcher",
    );
    if (dispatcher.service_unit !== DISPATCHER_SERVICE_UNIT) {
      throw new Error("public_earn_isolation_dispatcher_service_invalid");
    }

    const edge = exactKeys(
      input.earn_edge,
      [
        "service_unit",
        "listen_host",
        "listen_port",
        "ipv6_listener",
        "effective_uid",
        "effective_gid",
        "cap_net_admin",
        "no_new_privileges",
        "rate_state",
      ],
      "public_earn_isolation_edge_shape_invalid",
    );
    name(edge.service_unit, "public_earn_isolation_edge_service_invalid");
    if (edge.service_unit !== EARN_EDGE_SERVICE_UNIT) {
      throw new Error("public_earn_isolation_edge_service_invalid");
    }
    const edgePort = integer(
      edge.listen_port,
      1024,
      MAX_PORT,
      "public_earn_isolation_edge_port_invalid",
    );
    integer(
      edge.effective_uid,
      1,
      MAX_ID,
      "public_earn_isolation_edge_uid_invalid",
    );
    integer(
      edge.effective_gid,
      1,
      MAX_ID,
      "public_earn_isolation_edge_gid_invalid",
    );
    if (
      edge.listen_host !== TARGET_HOST ||
      edge.ipv6_listener !== false ||
      edge.effective_uid === dispatcher.effective_uid
    ) {
      throw new Error("public_earn_isolation_edge_identity_invalid");
    }
    requiredBoolean(
      edge.cap_net_admin,
      false,
      "public_earn_isolation_edge_cap_net_admin_forbidden",
    );
    requiredBoolean(
      edge.no_new_privileges,
      true,
      "public_earn_isolation_edge_no_new_privileges_required",
    );

    const rateState = exactKeys(
      edge.rate_state,
      [
        "parent_owner_uid",
        "file_owner_uid",
        "parent_group_other_bits_zero",
        "file_group_other_bits_zero",
        "single_process_owner",
      ],
      "public_earn_isolation_rate_state_shape_invalid",
    );
    if (
      rateState.parent_owner_uid !== edge.effective_uid ||
      rateState.file_owner_uid !== edge.effective_uid ||
      rateState.parent_group_other_bits_zero !== true ||
      rateState.file_group_other_bits_zero !== true ||
      rateState.single_process_owner !== true
    ) {
      throw new Error("public_earn_isolation_rate_state_custody_invalid");
    }

    const gateway = exactKeys(
      input.gateway,
      [
        "service_unit",
        "shared_listen_host",
        "shared_listen_port",
        "shared_mutations_exposed",
        "dedicated_listen_host",
        "dedicated_listen_port",
        "dedicated_ipv6_listener",
        "additional_dedicated_listeners",
        "effective_uid",
        "effective_gid",
        "cap_net_admin",
        "no_new_privileges",
      ],
      "public_earn_isolation_gateway_shape_invalid",
    );
    name(gateway.service_unit, "public_earn_isolation_gateway_service_invalid");
    if (gateway.service_unit !== GATEWAY_SERVICE_UNIT) {
      throw new Error("public_earn_isolation_gateway_service_invalid");
    }
    const sharedPort = integer(
      gateway.shared_listen_port,
      1024,
      MAX_PORT,
      "public_earn_isolation_shared_port_invalid",
    );
    const dedicatedPort = integer(
      gateway.dedicated_listen_port,
      1024,
      MAX_PORT,
      "public_earn_isolation_dedicated_port_invalid",
    );
    integer(
      gateway.effective_uid,
      1,
      MAX_ID,
      "public_earn_isolation_gateway_uid_invalid",
    );
    integer(
      gateway.effective_gid,
      1,
      MAX_ID,
      "public_earn_isolation_gateway_gid_invalid",
    );
    if (
      gateway.shared_listen_host !== TARGET_HOST ||
      gateway.dedicated_listen_host !== TARGET_HOST ||
      gateway.shared_mutations_exposed !== false ||
      gateway.dedicated_ipv6_listener !== false ||
      !Array.isArray(gateway.additional_dedicated_listeners) ||
      gateway.additional_dedicated_listeners.length !== 0 ||
      gateway.effective_uid === dispatcher.effective_uid ||
      gateway.effective_uid === edge.effective_uid ||
      sharedPort === dedicatedPort ||
      sharedPort === edgePort ||
      dedicatedPort === edgePort
    ) {
      throw new Error("public_earn_isolation_gateway_identity_invalid");
    }
    requiredBoolean(
      gateway.cap_net_admin,
      false,
      "public_earn_isolation_gateway_cap_net_admin_forbidden",
    );
    requiredBoolean(
      gateway.no_new_privileges,
      true,
      "public_earn_isolation_gateway_no_new_privileges_required",
    );

    const firewall = exactKeys(
      input.firewall,
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
        "mutable_by_dispatcher",
        "mutable_by_edge",
        "mutable_by_gateway",
      ],
      "public_earn_isolation_firewall_shape_invalid",
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
      firewall.mutable_by_dispatcher !== false ||
      firewall.mutable_by_edge !== false ||
      firewall.mutable_by_gateway !== false
    ) {
      throw new Error("public_earn_isolation_firewall_identity_invalid");
    }
    if (!Array.isArray(firewall.rules) || firewall.rules.length !== 4) {
      throw new Error("public_earn_isolation_firewall_rule_count_invalid");
    }

    requireRule(
      firewall.rules[0],
      {
        order: 1,
        port: edgePort,
        skuid: dispatcher.effective_uid,
        verdict: "accept",
      },
      "public_earn_isolation_dispatcher_edge_allow_rule",
    );
    requireRule(
      firewall.rules[1],
      {
        order: 2,
        port: edgePort,
        skuid: null,
        verdict: "drop",
      },
      "public_earn_isolation_non_dispatcher_edge_drop_rule",
    );
    requireRule(
      firewall.rules[2],
      {
        order: 3,
        port: dedicatedPort,
        skuid: edge.effective_uid,
        verdict: "accept",
      },
      "public_earn_isolation_edge_gateway_allow_rule",
    );
    requireRule(
      firewall.rules[3],
      {
        order: 4,
        port: dedicatedPort,
        skuid: null,
        verdict: "drop",
      },
      "public_earn_isolation_non_edge_gateway_drop_rule",
    );

    return Object.freeze({
      ok: true,
      status: "POLICY_SHAPE_QUALIFIED_NOT_LIVE",
      marker: VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_V1,
      version: 1,
      policy_shape_qualified: true,
      dispatcher_to_edge_policy_shape_qualified: true,
      edge_to_dedicated_gateway_policy_shape_qualified: true,
      shared_mutation_bypass_policy_shape_qualified: true,
      edge_rate_state_custody_policy_shape_qualified: true,
      dispatcher_service_unit: dispatcher.service_unit,
      earn_edge_service_unit: edge.service_unit,
      gateway_service_unit: gateway.service_unit,
      dispatcher_uid: dispatcher.effective_uid,
      earn_edge_uid: edge.effective_uid,
      gateway_uid: gateway.effective_uid,
      earn_edge_host: TARGET_HOST,
      earn_edge_port: edgePort,
      shared_gateway_host: TARGET_HOST,
      shared_gateway_port: sharedPort,
      dedicated_gateway_host: TARGET_HOST,
      dedicated_gateway_port: dedicatedPort,
      firewall_table: TABLE_NAME,
      firewall_chain: CHAIN_NAME,
      root_equivalent_bypass_out_of_scope: true,
      funnel_to_dispatcher_trust_proven: false,
      live_host_evidence_verified: false,
      nftables_ruleset_live_verified: false,
      listener_ownership_live_verified: false,
      state_custody_live_verified: false,
      local_transport_trust_proven: false,
      runtime_integration: false,
      funds_movement: false,
      authority: VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}
