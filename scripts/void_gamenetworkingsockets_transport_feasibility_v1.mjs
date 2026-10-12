import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const MARKER =
  "VOID_GAMENETWORKINGSOCKETS_TRANSPORT_FEASIBILITY_V1";
export const RESULT_MARKER =
  "VOID_GAMENETWORKINGSOCKETS_TRANSPORT_FEASIBILITY_RESULT_V1";

function fail(message) {
  throw new Error(message);
}
function assertCondition(condition, message) {
  if (!condition) fail(message);
}
function record(value, label) {
  assertCondition(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value;
}
function exactKeys(value, label, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} must contain exactly: ${wanted.join(", ")}`,
  );
}
function boolean(value, label) {
  assertCondition(typeof value === "boolean", `${label} must be boolean`);
  return value;
}
function string(value, label, pattern) {
  assertCondition(
    typeof value === "string" &&
      value === value.trim() &&
      value.length > 0,
    `${label} must be a non-empty trimmed string`,
  );
  if (pattern) {
    assertCondition(pattern.test(value), `${label} has invalid format`);
  }
  return value;
}
function falseAuthority(value) {
  const authority = record(value, "authority");
  const keys = [
    "consensus_change",
    "node_identity_change",
    "trust_policy_change",
    "key_or_credential_access",
    "steam_api_key_access",
    "steam_operator_token_access",
    "network_listener_start",
    "external_connection",
    "package_install",
    "source_download",
    "service_restart",
    "deployment",
    "wallet_or_signer_access",
    "work_credit_write",
    "payment_execution",
    "money_movement",
  ];
  exactKeys(authority, "authority", keys);
  for (const key of keys) {
    assertCondition(
      boolean(authority[key], `authority.${key}`) === false,
      `authority.${key} must remain false`,
    );
  }
  return authority;
}

export function evaluateGameNetworkingSocketsFeasibilityV1(inputValue) {
  const input = record(inputValue, "input");
  exactKeys(input, "input", [
    "marker",
    "version",
    "upstream",
    "current_void_transport",
    "proposed_phase",
    "authority",
  ]);
  assertCondition(input.marker === MARKER, "marker mismatch");
  assertCondition(input.version === 1, "version mismatch");

  const upstream = record(input.upstream, "upstream");
  exactKeys(upstream, "upstream", [
    "repository",
    "candidate_tag",
    "license",
    "steam_client_required",
    "steamworks_partner_required",
    "steam_datagram_relay_required",
    "steam_authentication_required",
    "native_ice_status",
    "turn_relay_assumed",
    "custom_signaling_required_for_unknown_ip_p2p",
  ]);
  assertCondition(
    string(upstream.repository, "upstream.repository") ===
      "ValveSoftware/GameNetworkingSockets",
    "upstream repository mismatch",
  );
  const tag = string(
    upstream.candidate_tag,
    "upstream.candidate_tag",
    /^v[0-9]+\.[0-9]+\.[0-9]+$/,
  );
  assertCondition(
    upstream.license === "BSD-3-Clause",
    "upstream license is not BSD-3-Clause",
  );
  for (const key of [
    "steam_client_required",
    "steamworks_partner_required",
    "steam_datagram_relay_required",
    "steam_authentication_required",
    "turn_relay_assumed",
  ]) {
    assertCondition(
      boolean(upstream[key], `upstream.${key}`) === false,
      `upstream.${key} must be false`,
    );
  }
  assertCondition(
    boolean(
      upstream.custom_signaling_required_for_unknown_ip_p2p,
      "upstream.custom_signaling_required_for_unknown_ip_p2p",
    ) === true,
    "custom signaling requirement must remain explicit",
  );
  assertCondition(
    upstream.native_ice_status === "beta" ||
      upstream.native_ice_status === "not_evaluated",
    "native ICE status mismatch",
  );

  const current = record(
    input.current_void_transport,
    "current_void_transport",
  );
  exactKeys(current, "current_void_transport", [
    "source_path",
    "implementation",
    "frame_prefix_bytes",
    "max_message_bytes",
    "message_types",
    "signed_pub_messages_required",
    "authenticated_edge_walls_preserved",
    "signed_trust_policy_preserved",
    "activation_lease_preserved",
  ]);
  assertCondition(
    current.source_path === "src/node_core.ts",
    "current transport source mismatch",
  );
  assertCondition(
    current.implementation === "node_net_tcp",
    "current transport implementation mismatch",
  );
  assertCondition(
    current.frame_prefix_bytes === 4,
    "current frame prefix changed",
  );
  assertCondition(
    current.max_message_bytes === 65536,
    "current max message bytes changed",
  );
  assertCondition(
    JSON.stringify(current.message_types) ===
      JSON.stringify(["HELLO", "PEERS", "PUB", "SUB"]),
    "current message types changed",
  );
  for (const key of [
    "signed_pub_messages_required",
    "authenticated_edge_walls_preserved",
    "signed_trust_policy_preserved",
    "activation_lease_preserved",
  ]) {
    assertCondition(
      boolean(current[key], `current_void_transport.${key}`) === true,
      `current_void_transport.${key} must remain true`,
    );
  }

  const phase = record(input.proposed_phase, "proposed_phase");
  exactKeys(phase, "proposed_phase", [
    "mode",
    "default_enabled",
    "replace_current_transport",
    "consensus_dependency",
    "node_identity_dependency",
    "existing_message_signatures_required",
    "existing_wire_messages_preserved",
    "steam_service_dependency",
    "automatic_package_install",
    "automatic_source_download",
    "production_activation_requested",
    "benchmark_profiles",
  ]);
  assertCondition(
    phase.mode === "optional_loopback_sidecar_benchmark",
    "phase mode mismatch",
  );
  for (const key of [
    "default_enabled",
    "replace_current_transport",
    "consensus_dependency",
    "node_identity_dependency",
    "steam_service_dependency",
    "automatic_package_install",
    "automatic_source_download",
    "production_activation_requested",
  ]) {
    assertCondition(
      boolean(phase[key], `proposed_phase.${key}`) === false,
      `proposed_phase.${key} must remain false`,
    );
  }
  for (const key of [
    "existing_message_signatures_required",
    "existing_wire_messages_preserved",
  ]) {
    assertCondition(
      boolean(phase[key], `proposed_phase.${key}`) === true,
      `proposed_phase.${key} must remain true`,
    );
  }
  assertCondition(
    Array.isArray(phase.benchmark_profiles) &&
      phase.benchmark_profiles.length >= 4 &&
      new Set(phase.benchmark_profiles).size ===
        phase.benchmark_profiles.length,
    "benchmark profiles must be unique and non-empty",
  );

  falseAuthority(input.authority);

  return {
    marker: RESULT_MARKER,
    version: 1,
    status: "proceed_to_optional_sidecar_build_probe",
    upstream_tag: tag,
    current_transport_preserved: true,
    exact_void_wire_messages_preserved: true,
    exact_void_message_signatures_preserved: true,
    steam_runtime_required: false,
    steam_service_dependency: false,
    steam_datagram_relay_assumed: false,
    custom_signaling_work_required_later: true,
    host_readiness_probe_required: true,
    loopback_benchmark_required_before_tailnet: true,
    tailnet_benchmark_required_before_public_network: true,
    production_activation_authorized: false,
    authority: input.authority,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main(argv) {
  assertCondition(
    argv.length === 3,
    "usage: node void_gamenetworkingsockets_transport_feasibility_v1.mjs <input.json> <output.json>",
  );
  const result = evaluateGameNetworkingSocketsFeasibilityV1(
    readJson(argv[1]),
  );
  fs.writeFileSync(
    argv[2],
    `${JSON.stringify(result, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main(process.argv.slice(1));
}
