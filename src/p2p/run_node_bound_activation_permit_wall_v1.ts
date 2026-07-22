// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { createHash, createPublicKey, X509Certificate } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { open, readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readVoidP2pTrustPolicyInputsV1,
  verifyVoidP2pSignedTrustPolicyV1,
  type VoidP2pTrustPolicyVerificationOptionsV1,
} from "./signed_trust_policy_wall_v1.js";
import {
  canonicalVoidP2pActivationPermitJsonV1,
  consumeVoidP2pNodeBoundActivationPermitV1,
  createVoidP2pActivationPermitRootSetV1,
  deriveVoidP2pEdgeEnvironmentFromRuntimeProfileV1,
  hashVoidP2pActivationPermitDocumentV1,
  hashVoidP2pActivationRuntimeProfileV1,
  parseVoidP2pNodeBoundActivationPermitEnvelopeV1,
  readVoidP2pActivationPermitJsonFileV1,
  signVoidP2pNodeBoundActivationPermitV1,
  verifyVoidP2pNodeBoundActivationPermitV1,
  voidP2pActivationPermitKeyIdFromPublicKeyPemV1,
  writeVoidP2pActivationPermitEnvelopeExclusiveV1,
  VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_SCHEMA_V1,
  VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1,
  VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
  type VoidP2pActivationPermitRootSetV1,
  type VoidP2pActivationRuntimeProfileV1,
  type VoidP2pNodeBoundActivationPermitEnvelopeV1,
} from "./node_bound_activation_permit_wall_v1.js";

const DISABLED_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_DISABLED";
const TRUST_GATE_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_TRUST_GATE_DISABLED";
const EDGE_GATE_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_EDGE_GATE_DISABLED";
const PROFILE_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_PROFILED";
const ROOT_SET_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_ROOT_SET_CREATED";
const SIGNED_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_SIGNED_OFFLINE";
const VERIFIED_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_VERIFIED";
const CONSUMED_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_CONSUMED";
const STARTED_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_STARTED";
const STOPPED_MARKER = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_STOPPED";

function env(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined ? fallback : value.trim();
}

function requiredEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function envInt(name: string, fallback: number, allowZero = false): number {
  const raw = env(name);
  if (!raw) return fallback;
  if (!/^[0-9]+$/.test(raw)) throw new Error(`${name} must be a canonical integer`);
  const value = Number(raw);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be >= ${minimum}`);
  }
  return value;
}

function parseArgs(argv: readonly string[]): Readonly<{
  command: string;
  options: Readonly<Record<string, string>>;
}> {
  const command = argv[0] && !argv[0].startsWith("--") ? argv[0] : "serve";
  const start = argv[0]?.startsWith("--") ? 0 : 1;
  const options: Record<string, string> = {};
  for (let index = start; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`arguments must use --name value pairs; invalid token at ${index}`);
    }
    if (Object.prototype.hasOwnProperty.call(options, name)) {
      throw new Error(`duplicate option: ${name}`);
    }
    options[name] = value;
  }
  return Object.freeze({ command, options: Object.freeze(options) });
}

function option(
  options: Readonly<Record<string, string>>,
  name: string,
  environmentName: string,
  fallback = "",
): string {
  const value = options[name] ?? env(environmentName, fallback);
  if (!value) throw new Error(`${name} or ${environmentName} is required`);
  return value;
}


async function edgeNodeIdFromCertificate(certFile: string): Promise<string> {
  const certificatePem = await readFile(certFile, "utf8");
  const certificate = new X509Certificate(certificatePem);
  if (certificate.publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("edge identity certificate public key must be Ed25519");
  }
  const der = certificate.publicKey.export({ type: "spki", format: "der" });
  return createHash("sha256").update(der).digest("hex");
}

async function writeExclusiveJson(file: string, value: unknown): Promise<void> {
  const resolved = path.resolve(file);
  const handle = await open(resolved, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function trustVerificationOptions(
  options: Readonly<Record<string, string>>,
): VoidP2pTrustPolicyVerificationOptionsV1 {
  return Object.freeze({
    expected_network_id: option(
      options,
      "--network-id",
      "VOID_P2P_ACTIVATION_PERMIT_NETWORK_ID",
      "void-mainnet0-chain2050",
    ),
    max_clock_skew_ms: envInt("VOID_P2P_TRUST_POLICY_MAX_CLOCK_SKEW_MS", 60_000, true),
    max_policy_lifetime_ms: envInt(
      "VOID_P2P_TRUST_POLICY_MAX_LIFETIME_MS",
      30 * 24 * 60 * 60_000,
    ),
    max_allow_node_ids: envInt("VOID_P2P_TRUST_POLICY_MAX_ALLOW_NODE_IDS", 1_024),
    max_deny_node_ids: envInt("VOID_P2P_TRUST_POLICY_MAX_DENY_NODE_IDS", 1_024),
    max_peers: envInt("VOID_P2P_TRUST_POLICY_MAX_PEERS", 256, true),
    max_document_bytes: envInt("VOID_P2P_TRUST_POLICY_MAX_DOCUMENT_BYTES", 1024 * 1024),
  });
}

function profileFromEnvironment(): VoidP2pActivationRuntimeProfileV1 {
  const profile: VoidP2pActivationRuntimeProfileV1 = {
    schema: VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1,
    network_id: env("VOID_P2P_ACTIVATION_PERMIT_NETWORK_ID", "void-mainnet0-chain2050"),
    control: {
      activation_permit_state_dir: requiredEnv("VOID_P2P_ACTIVATION_PERMIT_STATE_DIR"),
      trust_policy_state_dir: requiredEnv("VOID_P2P_TRUST_POLICY_STATE_DIR"),
    },
    edge: {
      mode: requiredEnv("VOID_P2P_EDGE_WALL_MODE") as "listen" | "dial" | "both",
      listen_host: requiredEnv("VOID_P2P_EDGE_WALL_LISTEN_HOST"),
      listen_port: envInt("VOID_P2P_EDGE_WALL_LISTEN_PORT", 4790),
      backend_host: requiredEnv("VOID_P2P_EDGE_WALL_BACKEND_HOST"),
      backend_port: envInt("VOID_P2P_EDGE_WALL_BACKEND_PORT", 4700),
      status_host: requiredEnv("VOID_P2P_EDGE_WALL_STATUS_HOST"),
      status_port: envInt("VOID_P2P_EDGE_WALL_STATUS_PORT", 4190),
      key_file: requiredEnv("VOID_P2P_EDGE_WALL_KEY_FILE"),
      cert_file: requiredEnv("VOID_P2P_EDGE_WALL_CERT_FILE"),
      audit_log: requiredEnv("VOID_P2P_EDGE_WALL_AUDIT_LOG"),
    },
    limits: {
      handshake_timeout_ms: envInt("VOID_P2P_EDGE_WALL_HANDSHAKE_TIMEOUT_MS", 10_000),
      max_clock_skew_ms: envInt("VOID_P2P_EDGE_WALL_MAX_CLOCK_SKEW_MS", 60_000, true),
      idle_timeout_ms: envInt("VOID_P2P_EDGE_WALL_IDLE_TIMEOUT_MS", 120_000),
      backend_connect_timeout_ms: envInt("VOID_P2P_EDGE_WALL_BACKEND_CONNECT_TIMEOUT_MS", 5_000),
      max_connections: envInt("VOID_P2P_EDGE_WALL_MAX_CONNECTIONS", 128),
      max_connections_per_ip: envInt("VOID_P2P_EDGE_WALL_MAX_CONNECTIONS_PER_IP", 8),
      max_pending_handshakes: envInt("VOID_P2P_EDGE_WALL_MAX_PENDING_HANDSHAKES", 32),
      max_auth_line_bytes: envInt("VOID_P2P_EDGE_WALL_MAX_AUTH_LINE_BYTES", 16_384),
      quarantine_threshold: envInt("VOID_P2P_EDGE_WALL_QUARANTINE_THRESHOLD", 3),
      quarantine_base_ms: envInt("VOID_P2P_EDGE_WALL_QUARANTINE_BASE_MS", 30_000),
      quarantine_max_ms: envInt("VOID_P2P_EDGE_WALL_QUARANTINE_MAX_MS", 3_600_000),
      reconnect_min_ms: envInt("VOID_P2P_EDGE_WALL_RECONNECT_MIN_MS", 1_000),
      reconnect_max_ms: envInt("VOID_P2P_EDGE_WALL_RECONNECT_MAX_MS", 30_000),
    },
  };
  return hashVoidP2pActivationRuntimeProfileV1(profile).profile;
}

async function profileCommand(options: Readonly<Record<string, string>>): Promise<void> {
  if (env("VOID_P2P_ACTIVATION_PERMIT_PROFILE_GENERATION") !== "1") {
    throw new Error("VOID_P2P_ACTIVATION_PERMIT_PROFILE_GENERATION=1 is required");
  }
  const output = path.resolve(
    option(options, "--output", "VOID_P2P_ACTIVATION_RUNTIME_PROFILE_OUTPUT"),
  );
  const hashed = hashVoidP2pActivationRuntimeProfileV1(profileFromEnvironment());
  await writeExclusiveJson(output, hashed.profile);
  console.log(JSON.stringify({
    marker: PROFILE_MARKER,
    wall_marker: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
    output_file: output,
    network_id: hashed.profile.network_id,
    runtime_profile_sha256: hashed.profile_sha256,
    activation_permit_state_dir: hashed.profile.control.activation_permit_state_dir,
    trust_policy_state_dir: hashed.profile.control.trust_policy_state_dir,
    network_access_performed: false,
  }));
}

async function rootSetCommand(options: Readonly<Record<string, string>>): Promise<void> {
  if (env("VOID_P2P_ACTIVATION_PERMIT_OFFLINE_ROOT_SET") !== "1") {
    throw new Error("VOID_P2P_ACTIVATION_PERMIT_OFFLINE_ROOT_SET=1 is required");
  }
  const manifestFile = path.resolve(
    option(options, "--manifest", "VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_MANIFEST"),
  );
  const output = path.resolve(option(options, "--output", "VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_OUTPUT"));
  const parsed = JSON.parse(await readFile(manifestFile, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("root-set manifest must be an object");
  }
  const source = parsed as Record<string, unknown>;
  const keys = Object.keys(source).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["network_id", "public_key_files", "threshold"])) {
    throw new Error("root-set manifest fields must be network_id, public_key_files, threshold");
  }
  if (typeof source.network_id !== "string" || !Array.isArray(source.public_key_files)) {
    throw new Error("root-set manifest values are malformed");
  }
  if (!Number.isSafeInteger(source.threshold)) throw new Error("root-set threshold must be an integer");
  const publicKeys = await Promise.all(source.public_key_files.map(async (entry, index) => {
    if (typeof entry !== "string" || !path.isAbsolute(entry)) {
      throw new Error(`public_key_files[${index}] must be an absolute path`);
    }
    return readFile(entry, "utf8");
  }));
  const rootSet = createVoidP2pActivationPermitRootSetV1({
    network_id: source.network_id,
    threshold: source.threshold as number,
    public_key_pems: publicKeys,
  });
  await writeExclusiveJson(output, rootSet);
  console.log(JSON.stringify({
    marker: ROOT_SET_MARKER,
    wall_marker: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
    output_file: output,
    schema: VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_SCHEMA_V1,
    network_id: rootSet.network_id,
    threshold: rootSet.threshold,
    key_ids: rootSet.keys.map((entry) => entry.key_id),
    root_set_sha256: hashVoidP2pActivationPermitDocumentV1(rootSet),
    network_access_performed: false,
  }));
}

async function signCommand(options: Readonly<Record<string, string>>): Promise<void> {
  if (env("VOID_P2P_ACTIVATION_PERMIT_OFFLINE_SIGNING") !== "1") {
    throw new Error("VOID_P2P_ACTIVATION_PERMIT_OFFLINE_SIGNING=1 is required");
  }
  const inputFile = path.resolve(option(options, "--input", "VOID_P2P_ACTIVATION_PERMIT_SIGN_INPUT"));
  const privateKeyFile = path.resolve(
    option(options, "--private-key", "VOID_P2P_ACTIVATION_PERMIT_SIGNING_KEY_FILE"),
  );
  const outputFile = path.resolve(option(options, "--output", "VOID_P2P_ACTIVATION_PERMIT_SIGN_OUTPUT"));
  const [rawInput, privateKeyPem] = await Promise.all([
    readVoidP2pActivationPermitJsonFileV1(inputFile),
    readFile(privateKeyFile, "utf8"),
  ]);
  let permit: unknown = rawInput;
  let signatures: VoidP2pNodeBoundActivationPermitEnvelopeV1["signatures"] = [];
  try {
    const envelope = parseVoidP2pNodeBoundActivationPermitEnvelopeV1(rawInput);
    permit = envelope.permit;
    signatures = envelope.signatures;
  } catch {
    // A bare permit is the expected first-signature input.
  }
  const envelope = signVoidP2pNodeBoundActivationPermitV1({
    permit,
    private_key_pem: privateKeyPem,
    existing_signatures: signatures,
  });
  await writeVoidP2pActivationPermitEnvelopeExclusiveV1(outputFile, envelope);
  const publicKeyPem = createPublicKey(privateKeyPem)
    .export({ type: "spki", format: "pem" })
    .toString();
  console.log(JSON.stringify({
    marker: SIGNED_MARKER,
    wall_marker: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
    output_file: outputFile,
    network_id: envelope.permit.network_id,
    edge_node_id: envelope.permit.edge_node_id,
    sequence: envelope.permit.sequence,
    signer_key_id: voidP2pActivationPermitKeyIdFromPublicKeyPemV1(publicKeyPem),
    signature_count: envelope.signatures.length,
    network_access_performed: false,
  }));
}

type Loaded = Readonly<{
  network_id: string;
  trust_inputs: Readonly<{ envelope: unknown; root_set: unknown }>;
  trust_verified: ReturnType<typeof verifyVoidP2pSignedTrustPolicyV1>;
  trust_root_set_sha256: string;
  profile: VoidP2pActivationRuntimeProfileV1;
  profile_sha256: string;
  edge_node_id: string;
  permit_root_set: unknown;
  permit_envelope: unknown;
  permit_verified: ReturnType<typeof verifyVoidP2pNodeBoundActivationPermitV1>;
}>;

async function loadVerified(options: Readonly<Record<string, string>>): Promise<Loaded> {
  const networkId = option(
    options,
    "--network-id",
    "VOID_P2P_ACTIVATION_PERMIT_NETWORK_ID",
    "void-mainnet0-chain2050",
  );
  const trustRootFile = path.resolve(
    option(options, "--trust-root-set", "VOID_P2P_TRUST_POLICY_ROOT_SET_FILE"),
  );
  const trustEnvelopeFile = path.resolve(
    option(options, "--trust-envelope", "VOID_P2P_TRUST_POLICY_ENVELOPE_FILE"),
  );
  const profileFile = path.resolve(
    option(options, "--runtime-profile", "VOID_P2P_ACTIVATION_RUNTIME_PROFILE_FILE"),
  );
  const permitRootFile = path.resolve(
    option(options, "--permit-root-set", "VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_FILE"),
  );
  const permitEnvelopeFile = path.resolve(
    option(options, "--permit-envelope", "VOID_P2P_ACTIVATION_PERMIT_ENVELOPE_FILE"),
  );
  const [trustInputs, profileInput, permitRootSet, permitEnvelope] = await Promise.all([
    readVoidP2pTrustPolicyInputsV1({
      root_set_file: trustRootFile,
      envelope_file: trustEnvelopeFile,
    }),
    readVoidP2pActivationPermitJsonFileV1(profileFile),
    readVoidP2pActivationPermitJsonFileV1(permitRootFile),
    readVoidP2pActivationPermitJsonFileV1(permitEnvelopeFile),
  ]);
  const trustVerified = verifyVoidP2pSignedTrustPolicyV1({
    ...trustInputs,
    options: trustVerificationOptions(options),
  });
  const profileHashed = hashVoidP2pActivationRuntimeProfileV1(profileInput);
  if (profileHashed.profile.network_id !== networkId) {
    throw new Error("runtime profile is bound to another VOID network");
  }
  const edgeNodeId = await edgeNodeIdFromCertificate(profileHashed.profile.edge.cert_file);
  const trustRootSetSha256 = hashVoidP2pActivationPermitDocumentV1(trustInputs.root_set);
  const permitVerified = verifyVoidP2pNodeBoundActivationPermitV1({
    envelope: permitEnvelope,
    root_set: permitRootSet,
    options: {
      expected_network_id: networkId,
      expected_edge_node_id: edgeNodeId,
      expected_policy_epoch: trustVerified.policy.epoch,
      expected_policy_sha256: trustVerified.policy_sha256,
      expected_policy_envelope_sha256: trustVerified.envelope_sha256,
      expected_trust_root_set_sha256: trustRootSetSha256,
      expected_runtime_profile_sha256: profileHashed.profile_sha256,
      max_clock_skew_ms: envInt("VOID_P2P_ACTIVATION_PERMIT_MAX_CLOCK_SKEW_MS", 60_000, true),
      max_permit_lifetime_ms: envInt(
        "VOID_P2P_ACTIVATION_PERMIT_MAX_LIFETIME_MS",
        24 * 60 * 60_000,
      ),
      max_document_bytes: envInt("VOID_P2P_ACTIVATION_PERMIT_MAX_DOCUMENT_BYTES", 1024 * 1024),
    },
  });
  return Object.freeze({
    network_id: networkId,
    trust_inputs: trustInputs,
    trust_verified: trustVerified,
    trust_root_set_sha256: trustRootSetSha256,
    profile: profileHashed.profile,
    profile_sha256: profileHashed.profile_sha256,
    edge_node_id: edgeNodeId,
    permit_root_set: permitRootSet,
    permit_envelope: permitEnvelope,
    permit_verified: permitVerified,
  });
}

async function verifyCommand(options: Readonly<Record<string, string>>): Promise<void> {
  const loaded = await loadVerified(options);
  console.log(JSON.stringify({
    marker: VERIFIED_MARKER,
    wall_marker: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
    network_id: loaded.network_id,
    edge_node_id: loaded.edge_node_id,
    sequence: loaded.permit_verified.permit.sequence,
    permit_sha256: loaded.permit_verified.permit_sha256,
    permit_envelope_sha256: loaded.permit_verified.envelope_sha256,
    activation_permit_root_set_sha256: loaded.permit_verified.root_set_sha256,
    policy_epoch: loaded.trust_verified.policy.epoch,
    policy_sha256: loaded.trust_verified.policy_sha256,
    policy_envelope_sha256: loaded.trust_verified.envelope_sha256,
    trust_root_set_sha256: loaded.trust_root_set_sha256,
    runtime_profile_sha256: loaded.profile_sha256,
    signer_key_ids: loaded.permit_verified.signer_key_ids,
    threshold: loaded.permit_verified.threshold,
    permissionless: false,
  }));
}

async function consumeLoaded(loaded: Loaded) {
  return consumeVoidP2pNodeBoundActivationPermitV1({
    verified: loaded.permit_verified,
    trust_policy_envelope: loaded.trust_inputs.envelope,
    trust_root_set: loaded.trust_inputs.root_set,
    runtime_profile: loaded.profile,
    state_dir: loaded.profile.control.activation_permit_state_dir,
  });
}

async function consumeCommand(options: Readonly<Record<string, string>>): Promise<void> {
  if (env("VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_ENABLED") !== "1") {
    throw new Error("VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_ENABLED=1 is required");
  }
  const loaded = await loadVerified(options);
  const consumed = await consumeLoaded(loaded);
  console.log(JSON.stringify({
    marker: CONSUMED_MARKER,
    wall_marker: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
    network_id: consumed.consumption.network_id,
    edge_node_id: consumed.consumption.edge_node_id,
    sequence: consumed.consumption.sequence,
    permit_sha256: consumed.consumption.permit_sha256,
    policy_sha256: consumed.consumption.policy_sha256,
    runtime_profile_sha256: consumed.consumption.runtime_profile_sha256,
    generation: consumed.generation,
    state_dir: consumed.state_dir,
    edge_started: false,
  }));
}

function childEnvironment(
  loaded: Loaded,
  consumed: Awaited<ReturnType<typeof consumeLoaded>>,
): NodeJS.ProcessEnv {
  const output: NodeJS.ProcessEnv = {
    ...process.env,
    ...deriveVoidP2pEdgeEnvironmentFromRuntimeProfileV1(loaded.profile),
    VOID_P2P_TRUST_POLICY_WALL_ENABLED: "1",
    VOID_P2P_EDGE_WALL_ENABLED: "1",
    VOID_P2P_TRUST_POLICY_NETWORK_ID: loaded.network_id,
    VOID_P2P_TRUST_POLICY_ROOT_SET_FILE: consumed.sealed_trust_root_set_file,
    VOID_P2P_TRUST_POLICY_ENVELOPE_FILE: consumed.sealed_policy_envelope_file,
    VOID_P2P_TRUST_POLICY_STATE_DIR: loaded.profile.control.trust_policy_state_dir,
    VOID_P2P_ACTIVATION_PERMIT_OFFLINE_SIGNING: "0",
    VOID_P2P_ACTIVATION_PERMIT_OFFLINE_ROOT_SET: "0",
    VOID_P2P_ACTIVATION_PERMIT_PROFILE_GENERATION: "0",
    VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_ENABLED: "0",
    VOID_P2P_TRUST_POLICY_OFFLINE_SIGNING: "0",
    VOID_P2P_TRUST_POLICY_ACTIVATION_ENABLED: "0",
  };
  for (const name of [
    "VOID_P2P_ACTIVATION_PERMIT_SIGNING_KEY_FILE",
    "VOID_P2P_ACTIVATION_PERMIT_SIGN_INPUT",
    "VOID_P2P_ACTIVATION_PERMIT_SIGN_OUTPUT",
    "VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_MANIFEST",
    "VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_OUTPUT",
    "VOID_P2P_TRUST_POLICY_SIGNING_KEY_FILE",
    "VOID_P2P_TRUST_POLICY_SIGN_INPUT",
    "VOID_P2P_TRUST_POLICY_SIGN_OUTPUT",
  ]) {
    delete output[name];
  }
  return output;
}

async function serveCommand(options: Readonly<Record<string, string>>): Promise<void> {
  if (env("VOID_P2P_ACTIVATION_PERMIT_WALL_ENABLED") !== "1") {
    console.error(DISABLED_MARKER);
    process.exitCode = 78;
    return;
  }
  if (env("VOID_P2P_TRUST_POLICY_WALL_ENABLED") !== "1") {
    console.error(TRUST_GATE_MARKER);
    process.exitCode = 78;
    return;
  }
  if (env("VOID_P2P_EDGE_WALL_ENABLED") !== "1") {
    console.error(EDGE_GATE_MARKER);
    process.exitCode = 78;
    return;
  }
  const loaded = await loadVerified(options);
  const consumed = await consumeLoaded(loaded);
  const currentFile = fileURLToPath(import.meta.url);
  const repositoryRoot = path.resolve(path.dirname(currentFile), "../..");
  const tsx = path.join(repositoryRoot, "node_modules", ".bin", "tsx");
  const trustRunner = path.join(repositoryRoot, "src", "p2p", "run_signed_trust_policy_wall_v1.ts");
  const child = spawn(tsx, [trustRunner, "serve"], {
    cwd: repositoryRoot,
    env: childEnvironment(loaded, consumed),
    stdio: "inherit",
    shell: false,
  });
  await Promise.race([
    once(child, "spawn"),
    once(child, "error").then(([error]) => Promise.reject(error)),
  ]);
  console.log(JSON.stringify({
    marker: STARTED_MARKER,
    wall_marker: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
    network_id: loaded.network_id,
    edge_node_id: loaded.edge_node_id,
    sequence: consumed.consumption.sequence,
    permit_sha256: consumed.consumption.permit_sha256,
    policy_epoch: consumed.consumption.policy_epoch,
    policy_sha256: consumed.consumption.policy_sha256,
    runtime_profile_sha256: consumed.consumption.runtime_profile_sha256,
    generation: consumed.generation,
    child_pid: child.pid,
    permissionless: false,
  }));
  const forwardTerm = () => {
    if (!child.killed) child.kill("SIGTERM");
  };
  const forwardInt = () => {
    if (!child.killed) child.kill("SIGINT");
  };
  process.on("SIGTERM", forwardTerm);
  process.on("SIGINT", forwardInt);
  const [code, signal] = await once(child, "exit") as [number | null, NodeJS.Signals | null];
  process.off("SIGTERM", forwardTerm);
  process.off("SIGINT", forwardInt);
  console.log(JSON.stringify({
    marker: STOPPED_MARKER,
    wall_marker: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
    child_exit_code: code,
    child_signal: signal,
  }));
  process.exitCode = code ?? (signal ? 1 : 0);
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv.slice(2));
  switch (command) {
    case "profile":
      await profileCommand(options);
      return;
    case "root-set":
      await rootSetCommand(options);
      return;
    case "sign":
      await signCommand(options);
      return;
    case "verify":
      await verifyCommand(options);
      return;
    case "consume":
      await consumeCommand(options);
      return;
    case "serve":
      await serveCommand(options);
      return;
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`HOLD: ${message}`);
  process.exitCode = 1;
});
