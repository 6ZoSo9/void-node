#!/usr/bin/env node

import {
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";
import {
  chmodSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_NODE_ONION_BINDING_MARKER,
  loadExistingVoidNodeKeypairV1,
  normalizeCanonicalVoidNodeIdV1,
  readAndVerifyVoidNodeOnionBindingV1,
  signVoidNodeOnionBindingV1,
} from "./lib/void-node-onion-binding-v1.mjs";
import { writeJsonAtomic } from "./lib/void-tor-onion-descriptor-v1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error("VOID_NODE_ONION_BINDING_V1_FAIL");
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    command: argv[0] || "help",
    keyFile: "",
    keypairModule: resolve(ROOT, "src/crypto/keypair.js"),
    hostnameFile: "",
    output: "",
    input: "",
    expectedNodeId: "",
    expectedOnionHostname: "",
    virtualPort: 80,
    issuedAt: "",
    expiresAt: "",
    validDays: 180,
    now: "",
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value for ${argument}`);
      return argv[index];
    };
    if (argument === "--key-file") options.keyFile = next();
    else if (argument === "--keypair-module") options.keypairModule = resolve(next());
    else if (argument === "--hostname-file") options.hostnameFile = next();
    else if (argument === "--output") options.output = next();
    else if (argument === "--input") options.input = next();
    else if (argument === "--expected-node-id") options.expectedNodeId = next();
    else if (argument === "--expected-onion-hostname") options.expectedOnionHostname = next();
    else if (argument === "--virtual-port") options.virtualPort = Number(next());
    else if (argument === "--issued-at") options.issuedAt = next();
    else if (argument === "--expires-at") options.expiresAt = next();
    else if (argument === "--valid-days") options.validDays = Number(next());
    else if (argument === "--now") options.now = next();
    else if (argument === "--help" || argument === "-h") options.command = "help";
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node tools/void-node-onion-binding-v1.mjs create \\
    --key-file PATH --hostname-file PATH --output PATH \\
    --expected-node-id NODE_ID [--virtual-port 80] [--valid-days 180]

  node tools/void-node-onion-binding-v1.mjs verify \\
    --input PATH [--expected-node-id NODE_ID] \\
    [--expected-onion-hostname HOST] [--virtual-port 80]

The create command loads the existing VOID node key through
src/crypto/keypair.js. It never generates a parallel identity key and never
prints the private-key path or contents.`);
}

function assertPrivateKeyFile(pathValue) {
  const path = resolve(pathValue);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("node private key must be a regular non-symlink file");
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) throw new Error("node private key must be owned by the current user");
  if ((stat.mode & 0o077) !== 0) throw new Error("node private key must not grant group or world permissions");
  return realpathSync(path);
}

async function loadExistingNodeKeypair(modulePath, keyPath) {
  const pair = await loadExistingVoidNodeKeypairV1(modulePath, keyPath);
  if (!pair || pair.privateKey?.type !== "private" || pair.privateKey?.asymmetricKeyType !== "ed25519") throw new Error("existing node private key is not Ed25519");
  if (pair.publicKey?.type !== "public" || pair.publicKey?.asymmetricKeyType !== "ed25519") throw new Error("existing node public key is not Ed25519");
  normalizeCanonicalVoidNodeIdV1(pair.nodeId);
  const derived = createPublicKey(pair.privateKey).export({ type: "spki", format: "der" });
  const supplied = pair.publicKey.export({ type: "spki", format: "der" });
  if (!derived.equals(supplied)) throw new Error("existing node private/public key mismatch");
  const probe = Buffer.from("VOID_NODE_ONION_BINDING_V1_KEYPAIR_PROBE", "utf8");
  const signature = cryptoSign(null, probe, pair.privateKey);
  if (!cryptoVerify(null, probe, pair.publicKey, signature)) throw new Error("existing node keypair self-check failed");
  return pair;
}

async function createBinding(options) {
  if (!options.keyFile || !options.hostnameFile || !options.output || !options.expectedNodeId) {
    throw new Error("create requires --key-file, --hostname-file, --output, and --expected-node-id");
  }
  if (!Number.isInteger(options.validDays) || options.validDays < 1 || options.validDays > 366) throw new Error("--valid-days must be from 1 through 366");
  const keyPath = assertPrivateKeyFile(options.keyFile);
  const hostnamePath = realpathSync(resolve(options.hostnameFile));
  const hostname = readFileSync(hostnamePath, "utf8").trim();
  const pair = await loadExistingNodeKeypair(options.keypairModule, keyPath);
  const expectedNodeId = normalizeCanonicalVoidNodeIdV1(options.expectedNodeId);
  if (pair.nodeId !== expectedNodeId) throw new Error("existing node key does not match --expected-node-id");
  const issuedAt = options.issuedAt ? new Date(options.issuedAt) : new Date();
  const expiresAt = options.expiresAt
    ? new Date(options.expiresAt)
    : new Date(issuedAt.getTime() + options.validDays * 24 * 60 * 60 * 1000);
  const binding = signVoidNodeOnionBindingV1({
    nodeId: pair.nodeId,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    onionHostname: hostname,
    virtualPort: options.virtualPort,
    issuedAt,
    expiresAt,
  });
  const outputPath = writeJsonAtomic(options.output, binding, 0o600);
  chmodSync(outputPath, 0o600);
  const verified = readAndVerifyVoidNodeOnionBindingV1(outputPath, {
    expectedNodeId: pair.nodeId,
    expectedOnionHostname: hostname,
    expectedVirtualPort: options.virtualPort,
    now: issuedAt,
    allowNotYetValidWithinSkew: true,
  });
  console.log("VOID_NODE_ONION_BINDING_V1_CREATE_GREEN");
  console.log(`marker=${VOID_NODE_ONION_BINDING_MARKER}`);
  console.log(`node_id=${verified.summary.node_id}`);
  console.log(`onion_uri=${verified.binding.transport.uri}`);
  console.log(`expires_at=${verified.summary.expires_at}`);
  console.log(`binding=${outputPath}`);
  console.log("private_key_disclosed=false");
}

function verifyBinding(options) {
  if (!options.input) throw new Error("verify requires --input");
  const verified = readAndVerifyVoidNodeOnionBindingV1(options.input, {
    expectedNodeId: options.expectedNodeId || undefined,
    expectedOnionHostname: options.expectedOnionHostname || undefined,
    expectedVirtualPort: options.virtualPort,
    now: options.now || undefined,
  });
  console.log("VOID_NODE_ONION_BINDING_V1_VERIFY_GREEN");
  console.log(`marker=${VOID_NODE_ONION_BINDING_MARKER}`);
  console.log(`node_id=${verified.summary.node_id}`);
  console.log(`onion_uri=${verified.binding.transport.uri}`);
  console.log(`expires_at=${verified.summary.expires_at}`);
  console.log("read_only=true");
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.command === "help") usage();
  else if (options.command === "create") await createBinding(options);
  else if (options.command === "verify") verifyBinding(options);
  else throw new Error(`unknown command: ${options.command}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
