#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1 =
  "VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1";
export const VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_SCHEMA_V1 =
  "void_buy_void_custody_node_binary_profile_v1";

export const VOID_BUY_VOID_CUSTODY_NODE_BINARY_EXPECTED_V1 = Object.freeze({
  host: "zoso-Precision-Tower-7810",
  path: "/usr/bin/node",
  bytes: 124827920,
  sha256: "fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48",
  version_string: "v22.23.3",
  uid: 0,
  gid: 0,
  mode_octal: "0755",
  nlink: 1,
  direct_regular: true,
  root_owned: true,
  group_world_writable: false,
  elf: true,
  stable_during_observation: true,
  parent_chain: Object.freeze([
    Object.freeze({
      path: "/",
      uid: 0,
      gid: 0,
      mode_octal: "0755",
      root_owned: true,
      group_world_writable: false,
    }),
    Object.freeze({
      path: "/usr",
      uid: 0,
      gid: 0,
      mode_octal: "0755",
      root_owned: true,
      group_world_writable: false,
    }),
    Object.freeze({
      path: "/usr/bin",
      uid: 0,
      gid: 0,
      mode_octal: "0755",
      root_owned: true,
      group_world_writable: false,
    }),
  ]),
});

export const VOID_BUY_VOID_CUSTODY_NODE_BINARY_AUTHORITY_V1 = Object.freeze({
  source_expected_identity_only: true,
  expected_node_binary_identity_selected: true,
  operator_evidence_authenticated: false,
  operator_evidence_signed: false,
  observation_time_bound: false,
  observation_freshness_proven: false,
  live_at_use_reverification_required: true,
  node_binary_identity_verified: false,
  immutable_root_install: false,
  service_unit_installed: false,
  service_started: false,
  service_restarted: false,
  runtime_integration: false,
  reserve_method_enabled: false,
  recover_method_enabled: false,
  payment_acceptance: false,
  public_presale_activation: false,
  production_gate_ready: false,
  funds_movement: false,
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJsonV1(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const PROFILE_BODY = Object.freeze({
  schema: VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_SCHEMA_V1,
  marker: VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1,
  version: 1,
  expected: VOID_BUY_VOID_CUSTODY_NODE_BINARY_EXPECTED_V1,
  observation_basis: Object.freeze({
    evidence_kind: "operator_provided_read_only_precision_census_v1",
    census_marker: "VOID_PRECISION_CUSTODY_NODE_BINARY_CENSUS_V1",
    census_source_sha256:
      "9d8413c8930e671a36783b2147e93a867072343ee5009741784f1b42d56e9134",
    observation_time_bound: false,
    authenticated_attestation: false,
  }),
  authority: VOID_BUY_VOID_CUSTODY_NODE_BINARY_AUTHORITY_V1,
});

export const VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_ID_V1 =
  "voidbuycustodynode1_" +
  sha256(Buffer.from(canonicalJsonV1(PROFILE_BODY) + "\n", "utf8"));

function hold(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1,
    version: 1,
    reason,
    profile_id: VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_ID_V1,
    authority: VOID_BUY_VOID_CUSTODY_NODE_BINARY_AUTHORITY_V1,
  });
}

export function classifyVoidBuyVoidCustodyNodeBinaryProfileV1(observed) {
  if (!observed || typeof observed !== "object" || Array.isArray(observed)) {
    return hold("custody_node_binary_observation_invalid");
  }
  if (
    canonicalJsonV1(observed) !==
    canonicalJsonV1(VOID_BUY_VOID_CUSTODY_NODE_BINARY_EXPECTED_V1)
  ) {
    return hold("custody_node_binary_identity_mismatch");
  }
  return Object.freeze({
    ok: true,
    status: "SOURCE_EXPECTED_NODE_BINARY_IDENTITY_GREEN",
    marker: VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1,
    version: 1,
    profile_id: VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_ID_V1,
    expected_node_binary_identity_selected: true,
    live_at_use_reverification_required: true,
    node_binary_identity_verified: false,
    runtime_integration: false,
    payment_acceptance: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
    authority: VOID_BUY_VOID_CUSTODY_NODE_BINARY_AUTHORITY_V1,
  });
}

export function inspectVoidBuyVoidCustodyNodeBinaryProfileV1() {
  return Object.freeze({
    ...PROFILE_BODY,
    profile_id: VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_ID_V1,
  });
}

if (import.meta.url === new URL("file://" + process.argv[1]).href) {
  const profile = inspectVoidBuyVoidCustodyNodeBinaryProfileV1();
  console.log(VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1);
  console.log("profile_id=" + profile.profile_id);
  console.log("fixed_node_path=" + profile.expected.path);
  console.log("node_version=" + profile.expected.version_string);
  console.log("node_bytes=" + profile.expected.bytes);
  console.log("node_sha256=" + profile.expected.sha256);
  console.log("expected_node_binary_identity_selected=true");
  console.log("operator_evidence_authenticated=false");
  console.log("observation_freshness_proven=false");
  console.log("live_at_use_reverification_required=true");
  console.log("node_binary_identity_verified=false");
  console.log("runtime_integration=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("production_gate_ready=false");
  console.log("funds_movement=false");
}
