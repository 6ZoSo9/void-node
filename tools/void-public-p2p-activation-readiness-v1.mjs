#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
  validateVoidBootstrapRecordReleaseRootV1,
  validateVoidBootstrapRecordSignedIdV1,
} from "../scripts/lib/void_bootstrap_record_release_root_v1.mjs";
import {
  VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SCHEMA_V1,
  composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1,
  validateVoidP2pUdpSwarmObserverAuthorizationV1,
} from "../scripts/lib/void_p2p_udp_swarm_signed_observer_authorization_v1.mjs";

export const VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1 =
  "VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1";

const VOID_PUBLIC_P2P_RELAY_INTRODUCTION_SCHEMA_V1 =
  "void_p2p_udp_swarm_public_relay_introduction_v1";
const VOID_DISCOVERY_ID_RE = /^voidpud1_[0-9a-f]{64}$/;
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_JSON_FILES = 4096;
const MAX_TRUST_ARTIFACT_CANDIDATES = 96;

const REQUIRED_GATES = Object.freeze([
  ["trust_artifact_candidate_budget_valid", "trust_artifact_candidate_budget_exceeded"],
  ["release_root_active", "release_root_not_active"],
  ["signed_bootstrap_record_id_valid", "signed_bootstrap_record_id_unavailable"],
  ["signed_observer_authorization_valid", "signed_observer_authorization_unavailable"],
  ["relay_introduction_artifact_valid", "relay_introduction_artifact_unavailable"],
  ["collector_source_contract_present", "collector_source_contract_missing"],
  ["runtime_mount_collector_support_present", "runtime_mount_collector_support_missing"],
  ["entrypoint_runtime_mount_wired", "entrypoint_runtime_mount_unwired"],
  ["defaults_fail_closed", "runtime_defaults_not_fail_closed"],
]);

function fail(message) {
  const error = new Error(message);
  error.name = "VoidPublicP2pActivationReadinessError";
  throw error;
}

function readUtf8(rootDir, relativePath, { required = true, maxBytes = MAX_JSON_BYTES } = {}) {
  const target = path.resolve(rootDir, relativePath);
  if (!target.startsWith(`${path.resolve(rootDir)}${path.sep}`)) {
    fail(`path escaped repository root: ${relativePath}`);
  }
  if (!fs.existsSync(target)) {
    if (required) fail(`required file missing: ${relativePath}`);
    return "";
  }
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail(`path must be a regular non-symlink file: ${relativePath}`);
  }
  if (stat.size > maxBytes) fail(`file exceeds read bound: ${relativePath}`);
  return fs.readFileSync(target, "utf8");
}

function readJson(rootDir, relativePath, options = {}) {
  const text = readUtf8(rootDir, relativePath, options);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    fail(`JSON parse failed: ${relativePath}`);
  }
}

function walkJsonFiles(rootDir, relativeRoot) {
  const base = path.resolve(rootDir, relativeRoot);
  if (!base.startsWith(`${path.resolve(rootDir)}${path.sep}`) || !fs.existsSync(base)) {
    return [];
  }
  const out = [];
  const stack = [base];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const stat = fs.lstatSync(absolute);
      if (stat.size < 2 || stat.size > MAX_JSON_BYTES) continue;
      out.push(absolute);
      if (out.length > MAX_JSON_FILES) {
        fail(`JSON artifact scan exceeded ${MAX_JSON_FILES} files`);
      }
    }
  }
  return out.sort();
}

function scanSchemaArtifacts(rootDir, schemas) {
  const wanted = new Set(schemas);
  const matches = [];
  for (const relativeRoot of ["config", "public"]) {
    for (const absolute of walkJsonFiles(rootDir, relativeRoot)) {
      let value;
      try {
        value = JSON.parse(fs.readFileSync(absolute, "utf8"));
      } catch {
        continue;
      }
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        wanted.has(value.schema)
      ) {
        matches.push(Object.freeze({
          relative_path: path.relative(rootDir, absolute).replaceAll(path.sep, "/"),
          value,
        }));
        if (matches.length > MAX_TRUST_ARTIFACT_CANDIDATES) {
          return Object.freeze(matches);
        }
      }
    }
  }
  return Object.freeze(matches);
}

function falseAuthority(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const required = [
    "private_routes_exposed",
    "wallet_authority",
    "signer_authority",
    "validator_authority",
    "treasury_authority",
    "work_credit_authority",
    "money_movement_authority",
  ];
  return required.every((key) => raw[key] === false);
}

function inspectManifest(rootDir) {
  const manifest = readJson(rootDir, "public/bootstrap/v1.json");
  const endpoints = Array.isArray(manifest?.sync_endpoints)
    ? manifest.sync_endpoints.filter((entry) => (
      entry &&
      typeof entry === "object" &&
      entry.enabled === true &&
      entry.transport === "https"
    ))
    : [];
  return Object.freeze({
    schema: manifest?.schema ?? null,
    status: manifest?.status ?? null,
    manifest_id: typeof manifest?.manifest_id === "string" ? manifest.manifest_id : null,
    https_sync_endpoint_count: endpoints.length,
    private_tailnet_endpoints_published:
      manifest?.private_tailnet_endpoints_published === true,
    authority_safe: falseAuthority(manifest?.authority),
    public_https_sync_ready:
      manifest?.schema === "void_public_bootstrap_v1" &&
      manifest?.network === "VOID Network" &&
      manifest?.chain_id === 2050 &&
      manifest?.status === "stable_https_seed" &&
      endpoints.length >= 1 &&
      manifest?.private_tailnet_endpoints_published === false &&
      falseAuthority(manifest?.authority),
  });
}

function validateRelayIntroductionEnvelope(raw, validatedRoot) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("relay introduction artifact must be an object");
  }
  const expected = ["schema", "signed_record_id", "locator_mirrors", "discovery"].sort();
  if (JSON.stringify(Object.keys(raw).sort()) !== JSON.stringify(expected)) {
    throw new Error("relay introduction artifact keys mismatch");
  }
  if (raw.schema !== VOID_PUBLIC_P2P_RELAY_INTRODUCTION_SCHEMA_V1) {
    throw new Error("relay introduction artifact schema mismatch");
  }
  if (
    !Array.isArray(raw.locator_mirrors) ||
    raw.locator_mirrors.length < 3 ||
    raw.locator_mirrors.length > 16
  ) {
    throw new Error("relay introduction locator mirror count invalid");
  }
  if (
    !raw.discovery ||
    typeof raw.discovery !== "object" ||
    Array.isArray(raw.discovery) ||
    !VOID_DISCOVERY_ID_RE.test(String(raw.discovery.discovery_id || ""))
  ) {
    throw new Error("relay introduction discovery identity invalid");
  }
  validateVoidBootstrapRecordSignedIdV1(raw.signed_record_id, validatedRoot);
  return true;
}

function stripSourceTriviaV1(source) {
  let output = "";
  let state = "code";
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (state === "code") {
      if (current === "/" && next === "/") {
        output += "  ";
        index += 1;
        state = "line-comment";
        continue;
      }
      if (current === "/" && next === "*") {
        output += "  ";
        index += 1;
        state = "block-comment";
        continue;
      }
      if (current === "'" || current === '"' || current === "`") {
        output += " ";
        state = current;
        continue;
      }
      output += current;
      continue;
    }

    if (state === "line-comment") {
      if (current === "\n") {
        output += "\n";
        state = "code";
      } else {
        output += " ";
      }
      continue;
    }

    if (state === "block-comment") {
      if (current === "*" && next === "/") {
        output += "  ";
        index += 1;
        state = "code";
      } else {
        output += current === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (current === "\\") {
      output += " ";
      if (index + 1 < source.length) {
        index += 1;
        output += source[index] === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (current === state) {
      output += " ";
      state = "code";
    } else {
      output += current === "\n" ? "\n" : " ";
    }
  }
  return output;
}

function entrypointRuntimeMountWiringPresentV1(rawSource) {
  const source = stripSourceTriviaV1(rawSource);
  const mount = /\b(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*await\s+createVoidUdpSwarmNodeRuntimeMountV1\s*\(/.exec(source);
  if (!mount) return false;

  const afterMount = source.slice((mount.index ?? 0) + mount[0].length);
  const route = /\bregisterVoidUdpSwarmNodeRuntimeReadonlyRouteV1\s*\(\s*app\s*,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*;/.exec(afterMount);
  const collector = /\bawait\s+([A-Za-z_$][A-Za-z0-9_$]*)\.startPublicRelayIntroductionCollectorV1\s*\(/.exec(afterMount);

  return Boolean(
    route &&
    collector &&
    route[1] === mount[1] &&
    collector[1] === mount[1]
  );
}

function chooseReadinessLocalNodeIdV1(observerAuthorization, discovery) {
  const used = new Set();
  for (const observer of observerAuthorization?.observers || []) {
    if (typeof observer?.node_id === "string") used.add(observer.node_id);
  }
  for (const observation of discovery?.observations || []) {
    for (const key of ["source_node_id", "relay_node_id", "target_node_id"]) {
      if (typeof observation?.[key] === "string") used.add(observation[key]);
    }
  }
  for (let value = 0; value < 4096; value += 1) {
    const candidate = value.toString(16).padStart(32, "0");
    if (!used.has(candidate)) return candidate;
  }
  fail("unable to derive collision-free readiness local node ID");
}

async function relayCompositionPrefetchCompatibleV1({
  relayIntroduction,
  observerAuthorization,
  releaseRoot,
  nowMs,
}) {
  const authenticatedDiscoverySources = (observerAuthorization?.observers || []).map(
    (entry) => Object.freeze({
      node_id: entry.node_id,
      public_key_pem: entry.public_key_pem,
    }),
  );
  const localNodeId = chooseReadinessLocalNodeIdV1(
    observerAuthorization,
    relayIntroduction?.discovery,
  );
  let recordFetchCalls = 0;
  let manifestFetchCalls = 0;

  try {
    await composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1({
      observerAuthorization,
      releaseRoot,
      authenticatedDiscoverySources,
      localNodeId,
      nowMs,
      signedRecordId: relayIntroduction.signed_record_id,
      locatorMirrors: relayIntroduction.locator_mirrors,
      discovery: relayIntroduction.discovery,
      fetchRecordBytes: async () => {
        recordFetchCalls += 1;
        throw new Error("VOID_PUBLIC_P2P_READINESS_PREFETCH_SENTINEL");
      },
      fetchManifestBytes: async () => {
        manifestFetchCalls += 1;
        throw new Error("VOID_PUBLIC_P2P_READINESS_MANIFEST_FETCH_UNEXPECTED");
      },
    });
  } catch {
    // Reaching the injected record transport proves all earlier authority,
    // discovery-signature/topology, and locator-mirror admission checks passed.
  }

  return recordFetchCalls > 0 && manifestFetchCalls === 0;
}

export function classifyVoidPublicP2pActivationReadinessV1(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    fail("readiness snapshot must be an object");
  }
  const blockers = [];
  for (const [gate, blocker] of REQUIRED_GATES) {
    if (snapshot[gate] !== true) blockers.push(blocker);
  }
  blockers.sort();

  const decision = blockers.length === 0
    ? "ACTIVATION_SOURCE_READY"
    : "HOLD";

  return Object.freeze({
    marker: VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1,
    decision,
    blockers: Object.freeze(blockers),
    ready: decision === "ACTIVATION_SOURCE_READY",
    production_activation_authorized: false,
    deployment_performed: false,
    service_restart_performed: false,
    private_key_generated_or_read: false,
    wallet_or_signer_access: false,
    transaction_or_broadcast: false,
    funds_moved: false,
    external_acceptance_required_after_deployment: true,
  });
}

export async function evaluateVoidPublicP2pActivationReadinessV1({
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  nowMs = Date.now(),
} = {}) {
  const root = path.resolve(rootDir);
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) fail("nowMs must be a non-negative safe integer");

  const releaseRootRaw = readJson(root, "config/void-bootstrap-record-release-root-v1.json");
  let validatedRoot = null;
  let releaseRootValid = false;
  let releaseRootValidationError = null;
  try {
    validatedRoot = validateVoidBootstrapRecordReleaseRootV1(releaseRootRaw, {
      allowHold: true,
    });
    releaseRootValid = true;
  } catch (error) {
    releaseRootValidationError = String(error?.message || error);
  }

  const releaseRootStatus = releaseRootValid ? validatedRoot.root.status : null;
  const releaseRootThreshold = releaseRootValid ? validatedRoot.root.threshold : null;
  const releaseRootKeyCount = releaseRootValid ? validatedRoot.keys.length : 0;
  const releaseRootActive =
    releaseRootValid &&
    releaseRootStatus === "active" &&
    Number.isSafeInteger(releaseRootThreshold) &&
    releaseRootThreshold >= 1 &&
    releaseRootKeyCount >= releaseRootThreshold;

  const artifacts = scanSchemaArtifacts(root, [
    VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
    VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SCHEMA_V1,
    VOID_PUBLIC_P2P_RELAY_INTRODUCTION_SCHEMA_V1,
  ]);

  const trustArtifactCandidateBudgetValid =
    artifacts.length <= MAX_TRUST_ARTIFACT_CANDIDATES;

  const signedRecordCandidates = artifacts.filter(
    (entry) => entry.value.schema === VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
  );
  const observerCandidates = artifacts.filter(
    (entry) => entry.value.schema === VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SCHEMA_V1,
  );
  const relayCandidates = artifacts.filter(
    (entry) => entry.value.schema === VOID_PUBLIC_P2P_RELAY_INTRODUCTION_SCHEMA_V1,
  );

  let signedRecordValidCount = 0;
  let embeddedSignedRecordValidCount = 0;
  let observerValidCount = 0;
  let relayStructuralValidCount = 0;
  let relayValidCount = 0;
  const validObserverCandidates = [];
  const structurallyValidRelayCandidates = [];

  if (releaseRootActive && trustArtifactCandidateBudgetValid) {
    for (const candidate of signedRecordCandidates) {
      try {
        validateVoidBootstrapRecordSignedIdV1(candidate.value, validatedRoot);
        signedRecordValidCount += 1;
      } catch {
        // Invalid candidates are evidence only; they do not satisfy readiness.
      }
    }
    for (const candidate of observerCandidates) {
      try {
        validateVoidP2pUdpSwarmObserverAuthorizationV1(
          candidate.value,
          validatedRoot.root,
          { nowMs },
        );
        observerValidCount += 1;
        validObserverCandidates.push(candidate);
      } catch {
        // Invalid, inactive, expired, or wrong-root authorization is not readiness.
      }
    }
    for (const candidate of relayCandidates) {
      try {
        validateRelayIntroductionEnvelope(candidate.value, validatedRoot);
        relayStructuralValidCount += 1;
        embeddedSignedRecordValidCount += 1;
        structurallyValidRelayCandidates.push(candidate);
      } catch {
        // Invalid or wrong-root introduction does not satisfy readiness.
      }
    }

    for (const relayCandidate of structurallyValidRelayCandidates) {
      for (const observerCandidate of validObserverCandidates) {
        if (
          await relayCompositionPrefetchCompatibleV1({
            relayIntroduction: relayCandidate.value,
            observerAuthorization: observerCandidate.value,
            releaseRoot: validatedRoot.root,
            nowMs,
          })
        ) {
          relayValidCount += 1;
          break;
        }
      }
    }
  }

  const sourceReadOptions = { maxBytes: MAX_SOURCE_BYTES };
  const collectorSource = readUtf8(
    root,
    "src/p2p/udp_swarm_public_relay_introduction_collector_v1.ts",
    sourceReadOptions,
  );
  const runtimeMountSource = readUtf8(
    root,
    "src/p2p/udp_swarm_node_runtime_mount_v1.ts",
    sourceReadOptions,
  );
  const indexSource = readUtf8(root, "src/index.ts", sourceReadOptions);
  const launcherSource = readUtf8(root, "ops/run-void-node-live-v1.sh", sourceReadOptions);
  const envExample = readUtf8(root, ".env.example", sourceReadOptions);
  const manifest = inspectManifest(root);

  const collectorSourceContractPresent =
    collectorSource.includes("VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1") &&
    collectorSource.includes("export class VoidUdpSwarmPublicRelayIntroductionCollectorV1") &&
    collectorSource.includes("signed_observer_authorization_required_by_composition: true");

  const runtimeMountCollectorSupportPresent =
    runtimeMountSource.includes("startPublicRelayIntroductionCollectorV1") &&
    runtimeMountSource.includes("activateVerifiedDiscoveryCompositionV1") &&
    runtimeMountSource.includes("publicRelayIntroductionCollector");

  const entrypointRuntimeMountWired =
    entrypointRuntimeMountWiringPresentV1(indexSource);

  const launcherRuntimeWiringPresent =
    launcherSource.includes("VOID_P2P_UDP_SWARM_RUNTIME_ENABLED") &&
    launcherSource.includes("VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED");

  const defaultsFailClosed =
    envExample.includes("VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=0") &&
    envExample.includes("VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED=0");

  const snapshot = Object.freeze({
    trust_artifact_candidate_count: artifacts.length,
    trust_artifact_candidate_limit: MAX_TRUST_ARTIFACT_CANDIDATES,
    trust_artifact_candidate_budget_valid: trustArtifactCandidateBudgetValid,
    release_root_valid: releaseRootValid,
    release_root_status: releaseRootStatus,
    release_root_threshold: releaseRootThreshold,
    release_root_key_count: releaseRootKeyCount,
    release_root_validation_error: releaseRootValidationError,
    release_root_active: releaseRootActive,
    signed_bootstrap_record_id_candidate_count: signedRecordCandidates.length,
    signed_bootstrap_record_id_valid_count: signedRecordValidCount,
    signed_bootstrap_record_id_standalone_valid_count: signedRecordValidCount,
    signed_bootstrap_record_id_embedded_valid_count: embeddedSignedRecordValidCount,
    signed_bootstrap_record_id_valid:
      signedRecordValidCount >= 1 || embeddedSignedRecordValidCount >= 1,
    signed_observer_authorization_candidate_count: observerCandidates.length,
    signed_observer_authorization_valid_count: observerValidCount,
    signed_observer_authorization_valid: observerValidCount >= 1,
    relay_introduction_artifact_candidate_count: relayCandidates.length,
    relay_introduction_artifact_structural_valid_count: relayStructuralValidCount,
    relay_introduction_artifact_prefetch_compatible_count: relayValidCount,
    relay_introduction_artifact_valid_count: relayValidCount,
    relay_introduction_artifact_valid: relayValidCount >= 1,
    collector_source_contract_present: collectorSourceContractPresent,
    runtime_mount_collector_support_present: runtimeMountCollectorSupportPresent,
    entrypoint_runtime_mount_wired: entrypointRuntimeMountWired,
    launcher_runtime_wiring_present: launcherRuntimeWiringPresent,
    defaults_fail_closed: defaultsFailClosed,
    public_manifest: manifest,
  });

  const classification = classifyVoidPublicP2pActivationReadinessV1(snapshot);
  return Object.freeze({
    ...classification,
    version: 1,
    snapshot,
    scanned_artifact_paths: Object.freeze(
      artifacts.map((entry) => entry.relative_path).sort(),
    ),
    mutation_attempted: false,
    network_calls_performed: false,
  });
}

function parseArgs(argv) {
  const out = { root: "", output: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      const value = argv[++i];
      if (!value) fail("--root requires a path");
      out.root = value;
    } else if (arg === "--output") {
      const value = argv[++i];
      if (!value) fail("--output requires a path");
      out.output = value;
    } else if (arg === "--help") {
      process.stdout.write(
        "Usage: node tools/void-public-p2p-activation-readiness-v1.mjs [--root PATH] [--output PATH]\n",
      );
      process.exit(0);
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await evaluateVoidPublicP2pActivationReadinessV1({
    rootDir: args.root || undefined,
  });
  const encoded = `${JSON.stringify(result, null, 2)}\n`;
  if (args.output) {
    fs.writeFileSync(path.resolve(args.output), encoded, {
      encoding: "utf8",
      mode: 0o600,
    });
  }
  process.stdout.write(encoded);
  process.exitCode = result.decision === "ACTIVATION_SOURCE_READY" ? 0 : 2;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && invoked === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      marker: VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1,
      decision: "HOLD",
      error: String(error?.message || error),
      mutation_attempted: false,
    })}\n`);
    process.exitCode = 1;
  }
}
