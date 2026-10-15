#!/usr/bin/env node

export const VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1 =
  "VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1";
export const VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_SCHEMA_V1 =
  "void_cloudflare_origin_loopback_isolation_policy_v1";

export const VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    dedicated_system_cloudflared_identity_required: true,
    historical_user_tunnel_retirement_required: true,
    tunnel_private_file_custody_required: true,
    exact_sensitive_tunnel_routes_required: true,
    ordinary_tunnel_routes_preserved_required: true,
    cloudflare_control_plane_evidence_required: true,
    cloudflared_to_adapter_uid_policy_required: true,
    adapter_to_dispatcher_uid_policy_required: true,
    ipv4_loopback_only_required: true,
    closed_world_listener_sets_required: true,
    root_owned_ruleset_required: true,
    root_equivalent_bypass_out_of_scope: true,
    live_host_evidence_verified: false,
    cloudflared_process_live_verified: false,
    historical_user_tunnel_retired_verified: false,
    tunnel_private_file_custody_verified: false,
    credential_content_access: false,
    tunnel_path_ownership_verified: false,
    cloudflare_worker_route_absence_proven: false,
    pseudo_ipv4_mode_off_proven: false,
    nftables_ruleset_live_verified: false,
    listener_ownership_live_verified: false,
    cloudflared_uid_isolation_proven: false,
    dispatcher_exclusive_reachability_proven: false,
    local_transport_trust_proven: false,
    runtime_integration: false,
    firewall_mutation: false,
    systemd_mutation: false,
    tunnel_mutation: false,
    dns_mutation: false,
    network_mutation: false,
    credential_issuance: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const HOST = "127.0.0.1";
const PUBLIC_HOSTNAME = "seed.nullfeed.org";
const TUNNEL_SERVICE_UNIT = "void-public-seed-named-tunnel-v1.service";
const ADAPTER_SERVICE_UNIT =
  "void-cloudflare-origin-proxy-v2-adapter-v1.service";
const DISPATCHER_SERVICE_UNIT =
  "void-public-443-proxy-v2-dispatch-v1.service";
const ADAPTER_RUNTIME_MARKER =
  "VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_V1";
const DISPATCHER_RUNTIME_MARKER =
  "VOID_PUBLIC_443_PROXY_V2_DISPATCH_RUNTIME_V1";
const TABLE_NAME = "void_cloudflare_origin_edge_v1";
const CHAIN_NAME = "output";
const MAX_ID = 0xffffffff;
const MAX_PORT = 65535;

export const VOID_CLOUDFLARE_ORIGIN_SENSITIVE_PATHS_V1 = Object.freeze([
  "/__void/agents/paid-work/credential-requests/v1",
  "/wc/public-earning-pilot-v1/claim-ticket",
  "/wc/public-earning-pilot-v1/submit-result",
]);

function fail(code) {
  throw new Error(code);
}

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1,
    version: 1,
    reason,
    policy_shape_qualified: false,
    cloudflared_uid_isolation_proven: false,
    dispatcher_exclusive_reachability_proven: false,
    tunnel_path_ownership_verified: false,
    credential_content_access: false,
    runtime_integration: false,
    funds_movement: false,
    authority:
      VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1,
  });
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  if (
    Object.keys(value).sort().join("\n") !==
    [...keys].sort().join("\n")
  ) {
    fail(code);
  }
  return value;
}

function integer(value, minimum, maximum, code) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(code);
  }
  return value;
}

function bool(value, expected, code) {
  if (value !== expected) fail(code);
}

function exactSensitivePaths(value) {
  if (
    !Array.isArray(value) ||
    value.length !== VOID_CLOUDFLARE_ORIGIN_SENSITIVE_PATHS_V1.length
  ) {
    fail("cloudflare_isolation_sensitive_paths_invalid");
  }
  const actual = [...value].sort().join("\n");
  const expected =
    [...VOID_CLOUDFLARE_ORIGIN_SENSITIVE_PATHS_V1].sort().join("\n");
  if (actual !== expected || new Set(value).size !== value.length) {
    fail("cloudflare_isolation_sensitive_paths_invalid");
  }
  return Object.freeze([...value]);
}

function serviceIdentity(value, label, expectedUnit) {
  const service = exactKeys(
    value,
    [
      "service_unit",
      "manager_scope",
      "effective_uid",
      "effective_gid",
      "cap_net_admin",
      "no_new_privileges",
    ],
    label + "_shape_invalid",
  );
  if (
    service.service_unit !== expectedUnit ||
    service.manager_scope !== "system"
  ) {
    fail(label + "_service_identity_invalid");
  }
  integer(
    service.effective_uid,
    1,
    MAX_ID,
    label + "_uid_invalid",
  );
  integer(
    service.effective_gid,
    1,
    MAX_ID,
    label + "_gid_invalid",
  );
  bool(
    service.cap_net_admin,
    false,
    label + "_cap_net_admin_forbidden",
  );
  bool(
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
    rule.ip_daddr !== HOST ||
    rule.l4proto !== "tcp" ||
    rule.tcp_dport !== expected.port ||
    rule.skuid !== expected.skuid ||
    rule.verdict !== expected.verdict
  ) {
    fail(code + "_invalid");
  }
}

export function classifyVoidCloudflareOriginLoopbackIsolationPolicyV1(
  input,
) {
  try {
    exactKeys(
      input,
      [
        "schema",
        "marker",
        "version",
        "legacy_user_tunnel",
        "cloudflared",
        "adapter",
        "dispatcher",
        "firewall",
      ],
      "cloudflare_isolation_shape_invalid",
    );
    if (
      input.schema !==
        VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_SCHEMA_V1 ||
      input.marker !==
        VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1 ||
      input.version !== 1
    ) {
      fail("cloudflare_isolation_identity_invalid");
    }

    const legacy = exactKeys(
      input.legacy_user_tunnel,
      [
        "service_unit",
        "manager_scope",
        "retirement_required",
        "must_be_inactive_before_live_acceptance",
        "ordinary_user_shared_identity_accepted",
      ],
      "cloudflare_isolation_legacy_tunnel_shape_invalid",
    );
    if (
      legacy.service_unit !== TUNNEL_SERVICE_UNIT ||
      legacy.manager_scope !== "user" ||
      legacy.retirement_required !== true ||
      legacy.must_be_inactive_before_live_acceptance !== true ||
      legacy.ordinary_user_shared_identity_accepted !== false
    ) {
      fail("cloudflare_isolation_legacy_tunnel_retirement_invalid");
    }

    const cloudflaredBase = serviceIdentity(
      {
        service_unit: input.cloudflared?.service_unit,
        manager_scope: input.cloudflared?.manager_scope,
        effective_uid: input.cloudflared?.effective_uid,
        effective_gid: input.cloudflared?.effective_gid,
        cap_net_admin: input.cloudflared?.cap_net_admin,
        no_new_privileges: input.cloudflared?.no_new_privileges,
      },
      "cloudflare_isolation_cloudflared",
      TUNNEL_SERVICE_UNIT,
    );
    const cloudflared = exactKeys(
      input.cloudflared,
      [
        "service_unit",
        "manager_scope",
        "effective_uid",
        "effective_gid",
        "cap_net_admin",
        "no_new_privileges",
        "public_hostname",
        "sensitive_origin_host",
        "sensitive_origin_port",
        "sensitive_origin_http_host_header",
        "disable_chunked_encoding_required",
        "sensitive_paths",
        "ordinary_routes_preserved",
        "worker_route_absence_required",
        "pseudo_ipv4_mode_off_required",
        "private_file_custody",
      ],
      "cloudflare_isolation_cloudflared_shape_invalid",
    );
    if (
      cloudflared.public_hostname !== PUBLIC_HOSTNAME ||
      cloudflared.sensitive_origin_host !== HOST ||
      cloudflared.sensitive_origin_http_host_header !== PUBLIC_HOSTNAME ||
      cloudflared.disable_chunked_encoding_required !== true ||
      cloudflared.ordinary_routes_preserved !== true ||
      cloudflared.worker_route_absence_required !== true ||
      cloudflared.pseudo_ipv4_mode_off_required !== true
    ) {
      fail("cloudflare_isolation_cloudflared_route_policy_invalid");
    }
    const custody = exactKeys(
      cloudflared.private_file_custody,
      [
        "config_owner_uid",
        "credentials_owner_uid",
        "config_group_other_bits_zero",
        "credentials_group_other_bits_zero",
        "config_nlink_one",
        "credentials_nlink_one",
        "config_outside_repository",
        "credentials_outside_repository",
      ],
      "cloudflare_isolation_private_file_custody_shape_invalid",
    );
    if (
      custody.config_owner_uid !== cloudflaredBase.effective_uid ||
      custody.credentials_owner_uid !== cloudflaredBase.effective_uid ||
      custody.config_group_other_bits_zero !== true ||
      custody.credentials_group_other_bits_zero !== true ||
      custody.config_nlink_one !== true ||
      custody.credentials_nlink_one !== true ||
      custody.config_outside_repository !== true ||
      custody.credentials_outside_repository !== true
    ) {
      fail("cloudflare_isolation_private_file_custody_invalid");
    }

    const adapterPort = integer(
      cloudflared.sensitive_origin_port,
      1024,
      MAX_PORT,
      "cloudflare_isolation_adapter_port_invalid",
    );
    const sensitivePaths = exactSensitivePaths(
      cloudflared.sensitive_paths,
    );

    const adapterBase = serviceIdentity(
      {
        service_unit: input.adapter?.service_unit,
        manager_scope: input.adapter?.manager_scope,
        effective_uid: input.adapter?.effective_uid,
        effective_gid: input.adapter?.effective_gid,
        cap_net_admin: input.adapter?.cap_net_admin,
        no_new_privileges: input.adapter?.no_new_privileges,
      },
      "cloudflare_isolation_adapter",
      ADAPTER_SERVICE_UNIT,
    );
    const adapter = exactKeys(
      input.adapter,
      [
        "service_unit",
        "manager_scope",
        "effective_uid",
        "effective_gid",
        "cap_net_admin",
        "no_new_privileges",
        "runtime_marker",
        "listen_host",
        "listen_port",
        "ipv6_listener",
        "additional_listeners",
        "dispatcher_host",
        "dispatcher_port",
      ],
      "cloudflare_isolation_adapter_shape_invalid",
    );
    if (
      adapter.runtime_marker !== ADAPTER_RUNTIME_MARKER ||
      adapter.listen_host !== HOST ||
      adapter.listen_port !== adapterPort ||
      adapter.ipv6_listener !== false ||
      !Array.isArray(adapter.additional_listeners) ||
      adapter.additional_listeners.length !== 0 ||
      adapter.dispatcher_host !== HOST
    ) {
      fail("cloudflare_isolation_adapter_runtime_invalid");
    }
    const dispatcherPort = integer(
      adapter.dispatcher_port,
      1024,
      MAX_PORT,
      "cloudflare_isolation_dispatcher_port_invalid",
    );
    if (dispatcherPort === adapterPort) {
      fail("cloudflare_isolation_port_collision");
    }

    const dispatcherBase = serviceIdentity(
      {
        service_unit: input.dispatcher?.service_unit,
        manager_scope: input.dispatcher?.manager_scope,
        effective_uid: input.dispatcher?.effective_uid,
        effective_gid: input.dispatcher?.effective_gid,
        cap_net_admin: input.dispatcher?.cap_net_admin,
        no_new_privileges: input.dispatcher?.no_new_privileges,
      },
      "cloudflare_isolation_dispatcher",
      DISPATCHER_SERVICE_UNIT,
    );
    const dispatcher = exactKeys(
      input.dispatcher,
      [
        "service_unit",
        "manager_scope",
        "effective_uid",
        "effective_gid",
        "cap_net_admin",
        "no_new_privileges",
        "runtime_marker",
        "listen_host",
        "listen_port",
        "ipv6_listener",
        "additional_listeners",
      ],
      "cloudflare_isolation_dispatcher_shape_invalid",
    );
    if (
      dispatcher.runtime_marker !== DISPATCHER_RUNTIME_MARKER ||
      dispatcher.listen_host !== HOST ||
      dispatcher.listen_port !== dispatcherPort ||
      dispatcher.ipv6_listener !== false ||
      !Array.isArray(dispatcher.additional_listeners) ||
      dispatcher.additional_listeners.length !== 0
    ) {
      fail("cloudflare_isolation_dispatcher_runtime_invalid");
    }

    const uids = [
      cloudflaredBase.effective_uid,
      adapterBase.effective_uid,
      dispatcherBase.effective_uid,
    ];
    const gids = [
      cloudflaredBase.effective_gid,
      adapterBase.effective_gid,
      dispatcherBase.effective_gid,
    ];
    if (new Set(uids).size !== uids.length) {
      fail("cloudflare_isolation_service_uid_separation_required");
    }
    if (new Set(gids).size !== gids.length) {
      fail("cloudflare_isolation_service_gid_separation_required");
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
        "mutable_by_cloudflared",
        "mutable_by_adapter",
        "mutable_by_dispatcher",
      ],
      "cloudflare_isolation_firewall_shape_invalid",
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
      firewall.mutable_by_cloudflared !== false ||
      firewall.mutable_by_adapter !== false ||
      firewall.mutable_by_dispatcher !== false
    ) {
      fail("cloudflare_isolation_firewall_identity_invalid");
    }
    if (!Array.isArray(firewall.rules) || firewall.rules.length !== 4) {
      fail("cloudflare_isolation_firewall_rule_count_invalid");
    }

    requireRule(
      firewall.rules[0],
      {
        order: 1,
        port: adapterPort,
        skuid: cloudflaredBase.effective_uid,
        verdict: "accept",
      },
      "cloudflare_isolation_cloudflared_adapter_allow_rule",
    );
    requireRule(
      firewall.rules[1],
      {
        order: 2,
        port: adapterPort,
        skuid: null,
        verdict: "drop",
      },
      "cloudflare_isolation_noncloudflared_adapter_drop_rule",
    );
    requireRule(
      firewall.rules[2],
      {
        order: 3,
        port: dispatcherPort,
        skuid: adapterBase.effective_uid,
        verdict: "accept",
      },
      "cloudflare_isolation_adapter_dispatcher_allow_rule",
    );
    requireRule(
      firewall.rules[3],
      {
        order: 4,
        port: dispatcherPort,
        skuid: null,
        verdict: "drop",
      },
      "cloudflare_isolation_nonadapter_dispatcher_drop_rule",
    );

    return Object.freeze({
      ok: true,
      status: "POLICY_SHAPE_QUALIFIED_NOT_LIVE",
      marker: VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1,
      version: 1,
      policy_shape_qualified: true,
      dedicated_system_cloudflared_identity_required: true,
      historical_user_tunnel_retirement_required: true,
      tunnel_private_file_custody_policy_shape_qualified: true,
      exact_sensitive_tunnel_routes_qualified: true,
      ordinary_tunnel_routes_preserved_required: true,
      cloudflare_control_plane_evidence_required: true,
      cloudflared_to_adapter_policy_shape_qualified: true,
      adapter_to_dispatcher_policy_shape_qualified: true,
      closed_world_listener_sets_required: true,
      public_hostname: PUBLIC_HOSTNAME,
      sensitive_paths: sensitivePaths,
      tunnel_service_unit: TUNNEL_SERVICE_UNIT,
      adapter_service_unit: ADAPTER_SERVICE_UNIT,
      dispatcher_service_unit: DISPATCHER_SERVICE_UNIT,
      cloudflared_uid: cloudflaredBase.effective_uid,
      adapter_uid: adapterBase.effective_uid,
      dispatcher_uid: dispatcherBase.effective_uid,
      adapter_host: HOST,
      adapter_port: adapterPort,
      dispatcher_host: HOST,
      dispatcher_port: dispatcherPort,
      firewall_table: TABLE_NAME,
      firewall_chain: CHAIN_NAME,
      root_equivalent_bypass_out_of_scope: true,
      live_host_evidence_verified: false,
      cloudflared_process_live_verified: false,
      historical_user_tunnel_retired_verified: false,
      tunnel_private_file_custody_verified: false,
      credential_content_access: false,
      tunnel_path_ownership_verified: false,
      cloudflare_worker_route_absence_proven: false,
      pseudo_ipv4_mode_off_proven: false,
      nftables_ruleset_live_verified: false,
      listener_ownership_live_verified: false,
      cloudflared_uid_isolation_proven: false,
      dispatcher_exclusive_reachability_proven: false,
      local_transport_trust_proven: false,
      runtime_integration: false,
      funds_movement: false,
      authority:
        VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}
