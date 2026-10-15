#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1,
  VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_SCHEMA_V1,
  VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1,
  VOID_CLOUDFLARE_ORIGIN_SENSITIVE_PATHS_V1,
  classifyVoidCloudflareOriginLoopbackIsolationPolicyV1,
} from "../tools/void-cloudflare-origin-loopback-isolation-policy-v1.mjs";

function canonical() {
  return {
    schema: VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_SCHEMA_V1,
    marker: VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1,
    version: 1,
    legacy_user_tunnel: {
      service_unit: "void-public-seed-named-tunnel-v1.service",
      manager_scope: "user",
      retirement_required: true,
      must_be_inactive_before_live_acceptance: true,
      ordinary_user_shared_identity_accepted: false,
    },
    cloudflared: {
      service_unit: "void-public-seed-named-tunnel-v1.service",
      manager_scope: "system",
      effective_uid: 991,
      effective_gid: 991,
      cap_net_admin: false,
      no_new_privileges: true,
      public_hostname: "seed.nullfeed.org",
      sensitive_origin_host: "127.0.0.1",
      sensitive_origin_port: 4311,
      sensitive_origin_http_host_header: "seed.nullfeed.org",
      disable_chunked_encoding_required: true,
      sensitive_paths: [...VOID_CLOUDFLARE_ORIGIN_SENSITIVE_PATHS_V1],
      ordinary_routes_preserved: true,
      worker_route_absence_required: true,
      pseudo_ipv4_mode_off_required: true,
      private_file_custody: {
        config_owner_uid: 991,
        credentials_owner_uid: 991,
        config_group_other_bits_zero: true,
        credentials_group_other_bits_zero: true,
        config_nlink_one: true,
        credentials_nlink_one: true,
        config_outside_repository: true,
        credentials_outside_repository: true,
      },
    },
    adapter: {
      service_unit: "void-cloudflare-origin-proxy-v2-adapter-v1.service",
      manager_scope: "system",
      effective_uid: 992,
      effective_gid: 992,
      cap_net_admin: false,
      no_new_privileges: true,
      runtime_marker: "VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_V1",
      listen_host: "127.0.0.1",
      listen_port: 4311,
      ipv6_listener: false,
      additional_listeners: [],
      dispatcher_host: "127.0.0.1",
      dispatcher_port: 4312,
    },
    dispatcher: {
      service_unit: "void-public-443-proxy-v2-dispatch-v1.service",
      manager_scope: "system",
      effective_uid: 993,
      effective_gid: 993,
      cap_net_admin: false,
      no_new_privileges: true,
      runtime_marker: "VOID_PUBLIC_443_PROXY_V2_DISPATCH_RUNTIME_V1",
      listen_host: "127.0.0.1",
      listen_port: 4312,
      ipv6_listener: false,
      additional_listeners: [],
    },
    firewall: {
      engine: "nftables",
      owner_uid: 0,
      table_family: "inet",
      table_name: "void_cloudflare_origin_edge_v1",
      chain_name: "output",
      chain_type: "filter",
      hook: "output",
      priority: 0,
      policy: "accept",
      mutable_by_cloudflared: false,
      mutable_by_adapter: false,
      mutable_by_dispatcher: false,
      rules: [
        {
          order: 1,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 4311,
          skuid: 991,
          verdict: "accept",
        },
        {
          order: 2,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 4311,
          skuid: null,
          verdict: "drop",
        },
        {
          order: 3,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 4312,
          skuid: 992,
          verdict: "accept",
        },
        {
          order: 4,
          oifname: "lo",
          ip_daddr: "127.0.0.1",
          l4proto: "tcp",
          tcp_dport: 4312,
          skuid: null,
          verdict: "drop",
        },
      ],
    },
  };
}

function clone(value) {
  return structuredClone(value);
}

function expectHold(mutator, reason) {
  const candidate = canonical();
  mutator(candidate);
  const result =
    classifyVoidCloudflareOriginLoopbackIsolationPolicyV1(candidate);
  assert.equal(result.ok, false, reason);
  assert.equal(result.status, "HOLD", reason);
  assert.equal(result.reason, reason);
  assert.equal(result.cloudflare_uid_isolation_proven, undefined);
  assert.equal(result.cloudflared_uid_isolation_proven, false);
  assert.equal(result.credential_content_access, false);
  assert.equal(result.runtime_integration, false);
  assert.equal(result.funds_movement, false);
}

const result =
  classifyVoidCloudflareOriginLoopbackIsolationPolicyV1(canonical());
assert.equal(result.ok, true);
assert.equal(result.status, "POLICY_SHAPE_QUALIFIED_NOT_LIVE");
assert.equal(
  result.marker,
  VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1,
);
assert.equal(result.policy_shape_qualified, true);
assert.equal(result.dedicated_system_cloudflared_identity_required, true);
assert.equal(result.historical_user_tunnel_retirement_required, true);
assert.equal(result.tunnel_private_file_custody_policy_shape_qualified, true);
assert.equal(result.exact_sensitive_tunnel_routes_qualified, true);
assert.equal(result.ordinary_tunnel_routes_preserved_required, true);
assert.equal(result.cloudflare_control_plane_evidence_required, true);
assert.equal(result.cloudflared_to_adapter_policy_shape_qualified, true);
assert.equal(result.adapter_to_dispatcher_policy_shape_qualified, true);
assert.equal(result.closed_world_listener_sets_required, true);
assert.equal(result.public_hostname, "seed.nullfeed.org");
assert.deepEqual(
  [...result.sensitive_paths].sort(),
  [...VOID_CLOUDFLARE_ORIGIN_SENSITIVE_PATHS_V1].sort(),
);
assert.equal(result.cloudflare_uid_isolation_proven, undefined);
assert.equal(result.cloudflared_uid_isolation_proven, false);
assert.equal(result.historical_user_tunnel_retired_verified, false);
assert.equal(result.tunnel_private_file_custody_verified, false);
assert.equal(result.credential_content_access, false);
assert.equal(result.tunnel_path_ownership_verified, false);
assert.equal(result.cloudflare_worker_route_absence_proven, false);
assert.equal(result.pseudo_ipv4_mode_off_proven, false);
assert.equal(result.nftables_ruleset_live_verified, false);
assert.equal(result.listener_ownership_live_verified, false);
assert.equal(result.dispatcher_exclusive_reachability_proven, false);
assert.equal(result.local_transport_trust_proven, false);
assert.equal(result.runtime_integration, false);
assert.equal(result.funds_movement, false);

expectHold(
  (x) => {
    x.legacy_user_tunnel.ordinary_user_shared_identity_accepted = true;
  },
  "cloudflare_isolation_legacy_tunnel_retirement_invalid",
);
expectHold(
  (x) => {
    x.legacy_user_tunnel.retirement_required = false;
  },
  "cloudflare_isolation_legacy_tunnel_retirement_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.manager_scope = "user";
  },
  "cloudflare_isolation_cloudflared_service_identity_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.effective_uid = 0;
  },
  "cloudflare_isolation_cloudflared_uid_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.cap_net_admin = true;
  },
  "cloudflare_isolation_cloudflared_cap_net_admin_forbidden",
);
expectHold(
  (x) => {
    x.cloudflared.no_new_privileges = false;
  },
  "cloudflare_isolation_cloudflared_no_new_privileges_required",
);
expectHold(
  (x) => {
    x.cloudflared.private_file_custody.credentials_owner_uid =
      x.adapter.effective_uid;
  },
  "cloudflare_isolation_private_file_custody_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.private_file_custody.credentials_group_other_bits_zero =
      false;
  },
  "cloudflare_isolation_private_file_custody_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.private_file_custody.credentials_outside_repository =
      false;
  },
  "cloudflare_isolation_private_file_custody_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.public_hostname = "example.invalid";
  },
  "cloudflare_isolation_cloudflared_route_policy_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.sensitive_origin_host = "0.0.0.0";
  },
  "cloudflare_isolation_cloudflared_route_policy_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.sensitive_origin_http_host_header = "origin.invalid";
  },
  "cloudflare_isolation_cloudflared_route_policy_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.disable_chunked_encoding_required = false;
  },
  "cloudflare_isolation_cloudflared_route_policy_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.ordinary_routes_preserved = false;
  },
  "cloudflare_isolation_cloudflared_route_policy_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.worker_route_absence_required = false;
  },
  "cloudflare_isolation_cloudflared_route_policy_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.pseudo_ipv4_mode_off_required = false;
  },
  "cloudflare_isolation_cloudflared_route_policy_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.sensitive_paths.pop();
  },
  "cloudflare_isolation_sensitive_paths_invalid",
);
expectHold(
  (x) => {
    x.cloudflared.sensitive_paths.push("/extra");
  },
  "cloudflare_isolation_sensitive_paths_invalid",
);
expectHold(
  (x) => {
    x.adapter.listen_host = "0.0.0.0";
  },
  "cloudflare_isolation_adapter_runtime_invalid",
);
expectHold(
  (x) => {
    x.adapter.ipv6_listener = true;
  },
  "cloudflare_isolation_adapter_runtime_invalid",
);
expectHold(
  (x) => {
    x.adapter.additional_listeners.push("127.0.0.1:4999");
  },
  "cloudflare_isolation_adapter_runtime_invalid",
);
expectHold(
  (x) => {
    x.adapter.runtime_marker = "wrong";
  },
  "cloudflare_isolation_adapter_runtime_invalid",
);
expectHold(
  (x) => {
    x.dispatcher.listen_host = "0.0.0.0";
  },
  "cloudflare_isolation_dispatcher_runtime_invalid",
);
expectHold(
  (x) => {
    x.dispatcher.ipv6_listener = true;
  },
  "cloudflare_isolation_dispatcher_runtime_invalid",
);
expectHold(
  (x) => {
    x.dispatcher.additional_listeners.push("127.0.0.1:4998");
  },
  "cloudflare_isolation_dispatcher_runtime_invalid",
);
expectHold(
  (x) => {
    x.adapter.dispatcher_port = x.adapter.listen_port;
    x.dispatcher.listen_port = x.adapter.listen_port;
  },
  "cloudflare_isolation_port_collision",
);
expectHold(
  (x) => {
    x.adapter.effective_uid = x.cloudflared.effective_uid;
  },
  "cloudflare_isolation_service_uid_separation_required",
);
expectHold(
  (x) => {
    x.dispatcher.effective_uid = x.adapter.effective_uid;
  },
  "cloudflare_isolation_service_uid_separation_required",
);
expectHold(
  (x) => {
    x.adapter.effective_gid = x.cloudflared.effective_gid;
  },
  "cloudflare_isolation_service_gid_separation_required",
);
expectHold(
  (x) => {
    x.firewall.owner_uid = 1000;
  },
  "cloudflare_isolation_firewall_identity_invalid",
);
expectHold(
  (x) => {
    x.firewall.mutable_by_cloudflared = true;
  },
  "cloudflare_isolation_firewall_identity_invalid",
);
expectHold(
  (x) => {
    x.firewall.rules[0].skuid = x.adapter.effective_uid;
  },
  "cloudflare_isolation_cloudflared_adapter_allow_rule_invalid",
);
expectHold(
  (x) => {
    x.firewall.rules[1].verdict = "accept";
  },
  "cloudflare_isolation_noncloudflared_adapter_drop_rule_invalid",
);
expectHold(
  (x) => {
    x.firewall.rules[2].skuid = x.cloudflared.effective_uid;
  },
  "cloudflare_isolation_adapter_dispatcher_allow_rule_invalid",
);
expectHold(
  (x) => {
    x.firewall.rules[3].verdict = "accept";
  },
  "cloudflare_isolation_nonadapter_dispatcher_drop_rule_invalid",
);
expectHold(
  (x) => {
    x.firewall.rules.pop();
  },
  "cloudflare_isolation_firewall_rule_count_invalid",
);
expectHold(
  (x) => {
    x.extra = true;
  },
  "cloudflare_isolation_shape_invalid",
);

for (const [key, expected] of Object.entries({
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
})) {
  assert.equal(
    VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "tools",
    "void-cloudflare-origin-loopback-isolation-policy-v1.mjs",
  ),
  "utf8",
);
const adapterRuntime = fs.readFileSync(
  path.join(
    process.cwd(),
    "ops",
    "public",
    "void-cloudflare-origin-proxy-v2-adapter-v1.mjs",
  ),
  "utf8",
);
const dispatcherRuntime = fs.readFileSync(
  path.join(
    process.cwd(),
    "ops",
    "public",
    "void-public-443-proxy-v2-dispatcher-v1.mjs",
  ),
  "utf8",
);
assert.ok(
  adapterRuntime.includes(
    'const MARKER = "VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_V1";',
  ),
);
assert.ok(adapterRuntime.includes('const HOST = "127.0.0.1";'));
assert.ok(
  dispatcherRuntime.includes(
    'const MARKER = "VOID_PUBLIC_443_PROXY_V2_DISPATCH_RUNTIME_V1";',
  ),
);
assert.ok(dispatcherRuntime.includes('const HOST = "127.0.0.1";'));
for (const required of [
  "void-public-seed-named-tunnel-v1.service",
  "void-cloudflare-origin-proxy-v2-adapter-v1.service",
  "void-public-443-proxy-v2-dispatch-v1.service",
  "manager_scope !== \"system\"",
  "ordinary_user_shared_identity_accepted !== false",
  'firewall.engine !== "nftables"',
  "cloudflared_uid_isolation_proven: false",
  "historical_user_tunnel_retired_verified: false",
  "runtime_integration: false",
]) {
  assert.ok(source.includes(required), required);
}

for (const forbidden of [
  "node:child_process",
  "exec(",
  "spawn(",
  "writeFile",
  "appendFile",
  "systemctl ",
  "nft ",
  "cloudflared tunnel",
  "tailscale ",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1_GREEN");
console.log("dedicated_system_cloudflared_identity_required=true");
console.log("historical_user_tunnel_retirement_required=true");
console.log("tunnel_private_file_custody_policy_shape_qualified=true");
console.log("credential_content_access=false");
console.log("exact_sensitive_tunnel_routes_qualified=true");
console.log("sensitive_origin_http_host_header_bound=true");
console.log("sensitive_origin_chunked_encoding_disabled_required=true");
console.log("ordinary_tunnel_routes_preserved_required=true");
console.log("cloudflare_control_plane_evidence_required=true");
console.log("pseudo_ipv4_mode_off_required=true");
console.log("cloudflared_to_adapter_policy_shape_qualified=true");
console.log("adapter_to_dispatcher_policy_shape_qualified=true");
console.log("closed_world_listener_sets_required=true");
console.log("noncloudflared_adapter_direct_connect_allowed=false");
console.log("nonadapter_dispatcher_direct_connect_allowed=false");
console.log("cloudflared_uid_isolation_proven=false");
console.log("tunnel_path_ownership_verified=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
