#!/usr/bin/env node

export const VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_V1 =
  "VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_V1";

export const VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_SCHEMA_V1 =
  "void_agent_credential_request_loopback_connector_policy_v1";

export const VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_AUTHORITY_V1 =
  Object.freeze({
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
  });

const MAX_PORT = 65535;
const MAX_ID = 0xffffffff;
const SAFE_NAME = /^[a-zA-Z0-9_.@-]{1,128}$/u;
const TABLE_NAME = "void_credential_edge_v1";
const CHAIN_NAME = "output";
const TARGET_HOST = "127.0.0.1";
const PUBLIC_TLS_PORT = 443;

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_V1,
    version: 1,
    reason,
    policy_shape_qualified: false,
    ordinary_unprivileged_local_bypass_policy_closed: false,
    exact_connector_process_identity_proven: false,
    live_host_evidence_verified: false,
    local_transport_trust_proven: false,
    runtime_integration: false,
    funds_movement: false,
    authority:
      VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_AUTHORITY_V1,
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

function boolean(value, expected, code) {
  if (value !== expected) {
    throw new Error(code);
  }
}

function name(value, code) {
  if (typeof value !== "string" || !SAFE_NAME.test(value)) {
    throw new Error(code);
  }
  return value;
}

function requireRuleShape(rule, expected, code) {
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

export function classifyVoidAgentCredentialRequestLoopbackConnectorPolicyV1(
  input,
) {
  try {
    exactKeys(
      input,
      [
        "schema",
        "marker",
        "version",
        "funnel",
        "connector",
        "adapter",
        "gateway",
        "firewall",
      ],
      "loopback_policy_shape_invalid",
    );
    if (
      input.schema !==
        VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_SCHEMA_V1 ||
      input.marker !==
        VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_V1 ||
      input.version !== 1
    ) {
      throw new Error("loopback_policy_identity_invalid");
    }

    const funnel = exactKeys(
      input.funnel,
      [
        "proxy_protocol_version",
        "tls_terminated_tcp_port",
        "target_uri",
      ],
      "loopback_policy_funnel_shape_invalid",
    );
    if (
      funnel.proxy_protocol_version !== 2 ||
      funnel.tls_terminated_tcp_port !== PUBLIC_TLS_PORT
    ) {
      throw new Error("loopback_policy_funnel_mode_invalid");
    }

    const adapter = exactKeys(
      input.adapter,
      [
        "service_unit",
        "listen_host",
        "listen_port",
        "ipv6_listener",
        "effective_uid",
        "effective_gid",
        "cap_net_admin",
        "no_new_privileges",
      ],
      "loopback_policy_adapter_shape_invalid",
    );
    name(adapter.service_unit, "loopback_policy_adapter_service_invalid");
    const adapterPort = integer(
      adapter.listen_port,
      1024,
      MAX_PORT,
      "loopback_policy_adapter_port_invalid",
    );
    if (
      adapter.listen_host !== TARGET_HOST ||
      adapter.ipv6_listener !== false ||
      adapter.effective_uid === 0 ||
      adapter.effective_gid === 0
    ) {
      throw new Error("loopback_policy_adapter_identity_invalid");
    }
    integer(
      adapter.effective_uid,
      1,
      MAX_ID,
      "loopback_policy_adapter_uid_invalid",
    );
    integer(
      adapter.effective_gid,
      1,
      MAX_ID,
      "loopback_policy_adapter_gid_invalid",
    );
    boolean(
      adapter.cap_net_admin,
      false,
      "loopback_policy_adapter_cap_net_admin_forbidden",
    );
    boolean(
      adapter.no_new_privileges,
      true,
      "loopback_policy_adapter_no_new_privileges_required",
    );

    const gateway = exactKeys(
      input.gateway,
      [
        "service_unit",
        "effective_uid",
        "effective_gid",
        "cap_net_admin",
        "no_new_privileges",
      ],
      "loopback_policy_gateway_shape_invalid",
    );
    name(gateway.service_unit, "loopback_policy_gateway_service_invalid");
    integer(
      gateway.effective_uid,
      1,
      MAX_ID,
      "loopback_policy_gateway_uid_invalid",
    );
    integer(
      gateway.effective_gid,
      1,
      MAX_ID,
      "loopback_policy_gateway_gid_invalid",
    );
    boolean(
      gateway.cap_net_admin,
      false,
      "loopback_policy_gateway_cap_net_admin_forbidden",
    );
    boolean(
      gateway.no_new_privileges,
      true,
      "loopback_policy_gateway_no_new_privileges_required",
    );

    const connector = exactKeys(
      input.connector,
      [
        "service_unit",
        "effective_uid",
        "effective_gid",
      ],
      "loopback_policy_connector_shape_invalid",
    );
    if (connector.service_unit !== "tailscaled.service") {
      throw new Error("loopback_policy_connector_service_invalid");
    }
    if (connector.effective_uid !== 0 || connector.effective_gid !== 0) {
      throw new Error("loopback_policy_connector_root_identity_required");
    }
    if (
      connector.effective_uid === adapter.effective_uid ||
      connector.effective_uid === gateway.effective_uid
    ) {
      throw new Error("loopback_policy_connector_uid_not_isolated");
    }

    if (
      funnel.target_uri !==
      "tcp://" + TARGET_HOST + ":" + String(adapterPort)
    ) {
      throw new Error("loopback_policy_funnel_target_invalid");
    }

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
        "mutable_by_adapter",
        "mutable_by_gateway",
      ],
      "loopback_policy_firewall_shape_invalid",
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
      throw new Error("loopback_policy_firewall_identity_invalid");
    }
    if (!Array.isArray(firewall.rules) || firewall.rules.length !== 2) {
      throw new Error("loopback_policy_firewall_rule_count_invalid");
    }
    requireRuleShape(
      firewall.rules[0],
      {
        order: 1,
        port: adapterPort,
        skuid: connector.effective_uid,
        verdict: "accept",
      },
      "loopback_policy_connector_allow_rule",
    );
    requireRuleShape(
      firewall.rules[1],
      {
        order: 2,
        port: adapterPort,
        skuid: null,
        verdict: "drop",
      },
      "loopback_policy_nonconnector_drop_rule",
    );

    return Object.freeze({
      ok: true,
      status: "POLICY_SHAPE_QUALIFIED_NOT_LIVE",
      marker: VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_V1,
      version: 1,
      policy_shape_qualified: true,
      ordinary_unprivileged_local_bypass_policy_closed: true,
      public_tls_port: PUBLIC_TLS_PORT,
      adapter_host: TARGET_HOST,
      adapter_port: adapterPort,
      connector_service_unit: connector.service_unit,
      connector_uid: connector.effective_uid,
      firewall_table: TABLE_NAME,
      firewall_chain: CHAIN_NAME,
      root_equivalent_bypass_out_of_scope: true,
      exact_connector_process_identity_proven: false,
      live_host_evidence_verified: false,
      nftables_ruleset_live_verified: false,
      tailscaled_process_live_verified: false,
      listener_live_verified: false,
      local_transport_trust_proven: false,
      tailscale_funnel_configuration_verified: false,
      runtime_integration: false,
      funds_movement: false,
      authority:
        VOID_AGENT_CREDENTIAL_REQUEST_LOOPBACK_CONNECTOR_POLICY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}
