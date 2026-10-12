// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { createPublicKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  activateVoidP2pSignedTrustPolicyV1,
  parseVoidP2pSignedTrustPolicyEnvelopeV1,
  readVoidP2pTrustPolicyInputsV1,
  signVoidP2pTrustPolicyV1,
  verifyVoidP2pSignedTrustPolicyV1,
  voidP2pTrustKeyIdFromPublicKeyPemV1,
  writeVoidP2pSignedTrustEnvelopeExclusiveV1,
  VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER,
  type VoidP2pSignedTrustPolicyEnvelopeV1,
  type VoidP2pTrustPolicyVerificationOptionsV1,
} from "./signed_trust_policy_wall_v1.js";

const DISABLED_MARKER = "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_DISABLED";
const EDGE_GATE_MARKER = "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_EDGE_GATE_DISABLED";
const VERIFIED_MARKER = "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_VERIFIED";
const ACTIVATED_MARKER = "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_ACTIVATED";
const STARTED_MARKER = "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_STARTED";
const STOPPED_MARKER = "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_STOPPED";
const SIGNED_MARKER = "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_SIGNED_OFFLINE";

function env(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined ? fallback : value.trim();
}

function envInt(name: string, fallback: number, allowZero = false): number {
  const raw = env(name);
  if (!raw) return fallback;
  if (!/^[0-9]+$/.test(raw)) throw new Error(`${name} must be an integer`);
  const value = Number(raw);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be >= ${minimum}`);
  }
  return value;
}

function requiredEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseArgs(argv: readonly string[]): Readonly<{
  command: string;
  options: Readonly<Record<string, string>>;
}> {
  const command = argv[0] && !argv[0].startsWith("--") ? argv[0] : "serve";
  const start = command === "serve" && argv[0]?.startsWith("--") ? 0 : 1;
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

function verificationOptions(
  options: Readonly<Record<string, string>>,
): VoidP2pTrustPolicyVerificationOptionsV1 {
  return Object.freeze({
    expected_network_id: option(
      options,
      "--network-id",
      "VOID_P2P_TRUST_POLICY_NETWORK_ID",
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

async function loadInputs(options: Readonly<Record<string, string>>): Promise<Readonly<{
  envelope: unknown;
  root_set: unknown;
  verify_options: VoidP2pTrustPolicyVerificationOptionsV1;
  state_dir: string;
}>> {
  const rootSetFile = option(
    options,
    "--root-set",
    "VOID_P2P_TRUST_POLICY_ROOT_SET_FILE",
  );
  const envelopeFile = option(
    options,
    "--envelope",
    "VOID_P2P_TRUST_POLICY_ENVELOPE_FILE",
  );
  const stateDir = option(
    options,
    "--state-dir",
    "VOID_P2P_TRUST_POLICY_STATE_DIR",
    "data/p2p-trust-policy-wall-v1",
  );
  const loaded = await readVoidP2pTrustPolicyInputsV1({
    root_set_file: rootSetFile,
    envelope_file: envelopeFile,
  });
  return Object.freeze({
    ...loaded,
    verify_options: verificationOptions(options),
    state_dir: path.resolve(stateDir),
  });
}

async function verifyCommand(options: Readonly<Record<string, string>>): Promise<void> {
  const loaded = await loadInputs(options);
  const verified = verifyVoidP2pSignedTrustPolicyV1({
    envelope: loaded.envelope,
    root_set: loaded.root_set,
    options: loaded.verify_options,
  });
  console.log(
    JSON.stringify({
      marker: VERIFIED_MARKER,
      wall_marker: VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER,
      network_id: verified.policy.network_id,
      epoch: verified.policy.epoch,
      policy_sha256: verified.policy_sha256,
      envelope_sha256: verified.envelope_sha256,
      threshold: verified.threshold,
      signer_key_ids: verified.signer_key_ids,
      allow_node_id_count: verified.policy.allow_node_ids.length,
      deny_node_id_count: verified.policy.deny_node_ids.length,
      peer_count: verified.policy.peers.length,
      permissionless: false,
    }),
  );
}

async function activateCommand(options: Readonly<Record<string, string>>): Promise<void> {
  if (env("VOID_P2P_TRUST_POLICY_ACTIVATION_ENABLED") !== "1") {
    throw new Error("VOID_P2P_TRUST_POLICY_ACTIVATION_ENABLED=1 is required for explicit activation");
  }
  const loaded = await loadInputs(options);
  const activated = await activateVoidP2pSignedTrustPolicyV1({
    envelope: loaded.envelope,
    root_set: loaded.root_set,
    options: loaded.verify_options,
    state_dir: loaded.state_dir,
  });
  console.log(
    JSON.stringify({
      marker: ACTIVATED_MARKER,
      wall_marker: VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER,
      network_id: activated.activation.network_id,
      epoch: activated.activation.epoch,
      policy_sha256: activated.activation.policy_sha256,
      signer_key_ids: activated.activation.signer_key_ids,
      threshold: activated.activation.threshold,
      generation: activated.activation.generation,
      state_dir: activated.state_dir,
      already_active: activated.already_active,
      permissionless: false,
    }),
  );
}

async function signCommand(options: Readonly<Record<string, string>>): Promise<void> {
  if (env("VOID_P2P_TRUST_POLICY_OFFLINE_SIGNING") !== "1") {
    throw new Error("VOID_P2P_TRUST_POLICY_OFFLINE_SIGNING=1 is required for offline signing");
  }
  const inputFile = path.resolve(option(options, "--input", "VOID_P2P_TRUST_POLICY_SIGN_INPUT"));
  const privateKeyFile = path.resolve(
    option(options, "--private-key", "VOID_P2P_TRUST_POLICY_SIGNING_KEY_FILE"),
  );
  const outputFile = path.resolve(option(options, "--output", "VOID_P2P_TRUST_POLICY_SIGN_OUTPUT"));
  const [rawInput, privateKeyPem] = await Promise.all([
    readFile(inputFile, "utf8"),
    readFile(privateKeyFile, "utf8"),
  ]);
  const parsed = JSON.parse(rawInput) as unknown;
  let policy: unknown = parsed;
  let existingSignatures: VoidP2pSignedTrustPolicyEnvelopeV1["signatures"] = [];
  try {
    const existing = parseVoidP2pSignedTrustPolicyEnvelopeV1(parsed);
    policy = existing.policy;
    existingSignatures = existing.signatures;
  } catch {
    // A bare policy document is the expected first-signature input.
  }
  const envelope = signVoidP2pTrustPolicyV1({
    policy,
    private_key_pem: privateKeyPem,
    existing_signatures: existingSignatures,
  });
  await writeVoidP2pSignedTrustEnvelopeExclusiveV1(outputFile, envelope);
  const publicKeyPem = createPublicKey(privateKeyPem).export({ type: "spki", format: "pem" }).toString();
  console.log(
    JSON.stringify({
      marker: SIGNED_MARKER,
      wall_marker: VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER,
      output_file: outputFile,
      network_id: envelope.policy.network_id,
      epoch: envelope.policy.epoch,
      signer_key_id: voidP2pTrustKeyIdFromPublicKeyPemV1(publicKeyPem),
      signature_count: envelope.signatures.length,
      network_access_performed: false,
    }),
  );
}

async function serveCommand(options: Readonly<Record<string, string>>): Promise<void> {
  if (env("VOID_P2P_TRUST_POLICY_WALL_ENABLED") !== "1") {
    console.error(DISABLED_MARKER);
    process.exitCode = 78;
    return;
  }
  if (env("VOID_P2P_EDGE_WALL_ENABLED") !== "1") {
    console.error(EDGE_GATE_MARKER);
    process.exitCode = 78;
    return;
  }
  const loaded = await loadInputs(options);
  const activated = await activateVoidP2pSignedTrustPolicyV1({
    envelope: loaded.envelope,
    root_set: loaded.root_set,
    options: loaded.verify_options,
    state_dir: loaded.state_dir,
  });

  const currentFile = fileURLToPath(import.meta.url);
  const repositoryRoot = path.resolve(path.dirname(currentFile), "../..");
  const tsx = path.join(repositoryRoot, "node_modules", ".bin", "tsx");
  const edgeRunner = path.join(repositoryRoot, "src", "p2p", "run_authenticated_edge_wall_v1.ts");
  const childEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    ...activated.verified.derived_edge_environment,
    VOID_P2P_EDGE_WALL_ENABLED: "1",
  };

  console.log(
    JSON.stringify({
      marker: STARTED_MARKER,
      wall_marker: VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER,
      network_id: activated.activation.network_id,
      epoch: activated.activation.epoch,
      policy_sha256: activated.activation.policy_sha256,
      generation: activated.activation.generation,
      already_active: activated.already_active,
      permissionless: false,
      edge_wall_child: edgeRunner,
    }),
  );

  const child = spawn(tsx, [edgeRunner], {
    cwd: repositoryRoot,
    env: childEnvironment,
    stdio: "inherit",
    shell: false,
  });
  let forwarded = false;
  const forward = (signal: NodeJS.Signals): void => {
    if (forwarded) return;
    forwarded = true;
    child.kill(signal);
  };
  process.once("SIGINT", () => forward("SIGINT"));
  process.once("SIGTERM", () => forward("SIGTERM"));

  const result = await new Promise<Readonly<{ code: number | null; signal: NodeJS.Signals | null }>>(
    (resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve(Object.freeze({ code, signal })));
    },
  );
  console.log(
    JSON.stringify({
      marker: STOPPED_MARKER,
      child_exit_code: result.code,
      child_signal: result.signal,
    }),
  );
  if (result.signal) {
    process.exitCode = 1;
  } else {
    process.exitCode = result.code ?? 1;
  }
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  switch (parsed.command) {
    case "serve":
      await serveCommand(parsed.options);
      return;
    case "verify":
      await verifyCommand(parsed.options);
      return;
    case "activate":
      await activateCommand(parsed.options);
      return;
    case "sign":
      await signCommand(parsed.options);
      return;
    default:
      throw new Error("command must be serve, verify, activate, or sign");
  }
}

main().catch((error) => {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "start_failure";
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(
    JSON.stringify({
      marker: "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_FAILURE",
      code,
      error: message,
    }),
  );
  process.exitCode = 1;
});
