#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  materializeReviewedNodePackageRuntimeV1,
  readReviewedNodePackageRuntimeProfileV1,
  verifyMaterializedReviewedNodePackageRuntimeV1,
  verifyReviewedNodePackageRuntimeV1,
} from "../../tools/void-reviewed-node-package-runtime-v1.mjs";

export const VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1 =
  "VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1";

export const SELECTED_REVIEWER_ADDRESS_V1 =
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e";

export const SIGNATURE_MARKER_V1 =
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1";

const CONTROL_REQUALIFICATION_MARKER_V1 =
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1";
const CONTROL_CHALLENGE_MARKER_V1 =
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1";
const REVIEWED_RUNTIME_PROFILE_RELATIVE_V1 =
  "ops/security/reviewed-node-package-runtime-ethers-v1.json";
const REVIEWED_RUNTIME_PROFILE_ID_V1 =
  "voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77";
const REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256_V1 =
  "5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73";
const ROLE_LABEL_V1 = "VOID_WC_VOID_MARKET_VAULT_LAUNCH_CONTROLLER_V1";
const COUPLED_LAUNCH_BYTES32_V1 =
  "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const COMPILED_IDENTITY_ID_V1 =
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a";
const VOID_TOKEN_V1 =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const KEY_RELATIVE_V1 =
  ".local/share/void/offline-keys/wc-void-launch-controller-v1/private-key.hex";
const CHALLENGE_ID_PATTERN = /^voidwclcc1_[0-9a-f]{64}$/u;
const SHA64 = /^[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const SIGNATURE65 = /^0x[0-9a-fA-F]{130}$/u;
const MAX_CHALLENGE_BYTES = 2 * 1024 * 1024;
const MIN_TTL_SECONDS = 60n;
const MAX_TTL_SECONDS = 1800n;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

export const VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_AUTHORITY_V1 =
  Object.freeze({
    offline_operator_action: true,
    fixed_selected_reviewer_only: true,
    exact_public_challenge_required: true,
    reviewed_ethers_runtime_required: true,
    private_key_path_fixed: true,
    private_key_printed: false,
    private_key_copied_to_repository: false,
    private_key_exported: false,
    network_access_required: false,
    rpc_call: false,
    wallet_provider_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    credential_access: false,
    wc_ledger_write: false,
    runtime_service_mutation: false,
    deployment_authorized: false,
    inventory_funding_authorized: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

function fail(code) {
  throw new Error(code);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function exactDataObject(value, keys, code) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    fail(code + "_not_object");
  }
  let own;
  let descriptors;
  let proto;
  try {
    own = Reflect.ownKeys(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
    proto = Object.getPrototypeOf(value);
  } catch {
    fail(code + "_introspection_failed");
  }
  if (proto !== Object.prototype && proto !== null) {
    fail(code + "_prototype_invalid");
  }
  if (
    own.length !== keys.length ||
    own.some(
      (key) =>
        typeof key !== "string" ||
        !keys.includes(key),
    )
  ) {
    fail(code + "_keys_mismatch");
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code + "_data_property_required:" + key);
    }
    Object.defineProperty(out, key, {
      value: descriptor.value,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return Object.freeze(out);
}

function decimal(value, code) {
  const text = typeof value === "bigint" ? value.toString() : String(value);
  if (!/^(0|[1-9][0-9]*)$/u.test(text)) fail(code);
  let parsed;
  try {
    parsed = BigInt(text);
  } catch {
    fail(code);
  }
  if (parsed < 0n || parsed > (1n << 64n) - 1n) fail(code);
  return parsed;
}

function readStableFileV1(file, {
  label,
  maxBytes,
  expectedSha256 = null,
  privateMode = false,
} = {}) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file
  ) {
    fail(label + "_path_invalid");
  }
  let fd = -1;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_RDONLY |
        Number(fs.constants.O_NOFOLLOW || 0),
    );
    const before = fs.fstatSync(fd, { bigint: true });
    if (
      !before.isFile() ||
      before.nlink !== 1n ||
      before.size < 1n ||
      before.size > BigInt(maxBytes)
    ) {
      fail(label + "_file_invalid");
    }
    if (typeof process.getuid === "function" && before.uid !== BigInt(process.getuid())) {
      fail(label + "_owner_invalid");
    }
    if (privateMode && Number(before.mode & 0o777n) !== 0o600) {
      fail(label + "_mode_invalid");
    }
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs ||
      before.mode !== after.mode ||
      before.uid !== after.uid ||
      before.gid !== after.gid ||
      before.nlink !== after.nlink ||
      after.size !== BigInt(bytes.length)
    ) {
      fail(label + "_changed_during_read");
    }
    const digest = sha256(bytes);
    if (
      expectedSha256 !== null &&
      (
        typeof expectedSha256 !== "string" ||
        !SHA64.test(expectedSha256) ||
        digest !== expectedSha256
      )
    ) {
      fail(label + "_sha256_mismatch");
    }
    return Object.freeze({ bytes, sha256: digest });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      String(error.code || "") === "ELOOP"
    ) {
      fail(label + "_symlink_forbidden");
    }
    throw error;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function readChallengeV1(file, expectedSha256) {
  const source = readStableFileV1(file, {
    label: "control_challenge",
    maxBytes: MAX_CHALLENGE_BYTES,
    expectedSha256,
    privateMode: true,
  });
  let text;
  let value;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(source.bytes);
    value = JSON.parse(text);
  } catch {
    fail("control_challenge_json_invalid");
  }
  if (text !== JSON.stringify(value, null, 2) + "\n") {
    fail("control_challenge_serialization_invalid");
  }
  return Object.freeze({ value, sha256: source.sha256 });
}

function readPrivateKeyV1(file) {
  const source = readStableFileV1(file, {
    label: "launch_controller_private_key",
    maxBytes: 256,
    privateMode: true,
  });
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true })
      .decode(source.bytes);
  } catch {
    source.bytes.fill(0);
    fail("launch_controller_private_key_text_invalid");
  }
  if (!/^(?:0x)?[0-9a-fA-F]{64}\n?$/u.test(text)) {
    source.bytes.fill(0);
    fail("launch_controller_private_key_format_invalid");
  }
  if (text.endsWith("\n")) text = text.slice(0, -1);
  const normalized = text.startsWith("0x") ? text : "0x" + text;
  source.bytes.fill(0);
  text = "";
  return normalized;
}

function writeExclusiveJsonV1(file, value) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file
  ) {
    fail("signature_output_path_invalid");
  }
  const relative = path.relative(ROOT, file);
  if (
    relative === "" ||
    (
      relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative)
    )
  ) {
    fail("signature_output_inside_repository");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("signature_output_parent_alias");
  }
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
  } finally {
    fs.closeSync(fd);
  }
  return Object.freeze({
    bytes: bytes.length,
    sha256: sha256(bytes),
  });
}

function makeRemovableTreeV1(root) {
  if (!fs.existsSync(root)) return;
  function walk(dir) {
    fs.chmodSync(dir, 0o700);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else fs.chmodSync(file, 0o600);
    }
  }
  walk(root);
}

async function withReviewedEthersV1(fn) {
  const { profile } = readReviewedNodePackageRuntimeProfileV1({
    relativePath: REVIEWED_RUNTIME_PROFILE_RELATIVE_V1,
    repoRoot: ROOT,
  });
  if (
    profile.profile_id !== REVIEWED_RUNTIME_PROFILE_ID_V1 ||
    profile.packages_aggregate_sha256 !==
      REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256_V1 ||
    canonicalJson(profile.root_packages) !== canonicalJson(["ethers"])
  ) {
    fail("offline_signer_reviewed_runtime_profile_mismatch");
  }
  const verified = verifyReviewedNodePackageRuntimeV1({
    profile,
    repoRoot: ROOT,
  });
  if (
    verified.ok !== true ||
    verified.status !== "REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED"
  ) {
    fail("offline_signer_reviewed_runtime_unverified");
  }

  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-launch-controller-offline-sign-"),
  );
  fs.chmodSync(parent, 0o700);
  const runtimeRoot = path.join(parent, "runtime");
  try {
    const materialized = materializeReviewedNodePackageRuntimeV1({
      profile,
      repoRoot: ROOT,
      destinationRoot: runtimeRoot,
    });
    if (
      materialized.ok !== true ||
      materialized.status !==
        "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED"
    ) {
      fail("offline_signer_private_runtime_unverified");
    }
    const reverified = verifyMaterializedReviewedNodePackageRuntimeV1({
      profile,
      destinationRoot: runtimeRoot,
      repoRoot: ROOT,
    });
    if (
      reverified.ok !== true ||
      reverified.status !==
        "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED"
    ) {
      fail("offline_signer_private_runtime_reverification_failed");
    }
    const ethersEntry = path.join(
      runtimeRoot,
      "node_modules",
      "ethers",
      "lib.esm",
      "index.js",
    );
    const ethers = await import(
      pathToFileURL(ethersEntry).href +
        "?profile=" +
        encodeURIComponent(profile.profile_id)
    );
    return await fn(Object.freeze({ ethers, profile }));
  } finally {
    makeRemovableTreeV1(parent);
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

function validateChallengeForSigningV1({
  challengeEnvelope,
  expectedAddress,
  nowUnix,
  ethers,
}) {
  const envelope = exactDataObject(
    challengeEnvelope,
    [
      "marker",
      "version",
      "challenge",
      "source_binding",
      "typed_data",
      "challenge_id",
      "typed_data_digest",
      "authority",
    ],
    "control_challenge_envelope",
  );
  if (
    envelope.marker !== CONTROL_REQUALIFICATION_MARKER_V1 ||
    envelope.version !== 1 ||
    typeof envelope.challenge_id !== "string" ||
    !CHALLENGE_ID_PATTERN.test(envelope.challenge_id) ||
    typeof envelope.typed_data_digest !== "string" ||
    !BYTES32.test(envelope.typed_data_digest)
  ) {
    fail("control_challenge_envelope_invalid");
  }

  const challenge = exactDataObject(
    envelope.challenge,
    [
      "marker",
      "version",
      "execution_epoch",
      "role_id",
      "candidate_address",
      "coupled_launch_id",
      "compiled_identity_id",
      "void_token",
      "source_binding_sha256",
      "nonce",
      "issued_at_unix",
      "expires_at_unix",
    ],
    "control_challenge",
  );

  const expectedRoleId = ethers.keccak256(
    ethers.toUtf8Bytes(ROLE_LABEL_V1),
  );
  const expectedSalt = ethers.keccak256(
    ethers.toUtf8Bytes(CONTROL_REQUALIFICATION_MARKER_V1),
  );
  const expectedDomain = {
    name: "VOID WC/VOID Launch Controller Control",
    version: "1",
    chainId: 2050,
    salt: expectedSalt,
  };
  const expectedTypes = {
    LaunchControllerControl: [
      { name: "execution_epoch", type: "uint64" },
      { name: "role_id", type: "bytes32" },
      { name: "candidate_address", type: "address" },
      { name: "coupled_launch_id", type: "bytes32" },
      { name: "compiled_identity_id", type: "string" },
      { name: "void_token", type: "address" },
      { name: "source_binding_sha256", type: "bytes32" },
      { name: "nonce", type: "bytes32" },
      { name: "issued_at_unix", type: "uint64" },
      { name: "expires_at_unix", type: "uint64" },
    ],
  };

  const candidate = ethers.getAddress(
    String(challenge.candidate_address),
  ).toLowerCase();
  const selected = ethers.getAddress(
    String(expectedAddress),
  ).toLowerCase();
  if (
    challenge.marker !== CONTROL_CHALLENGE_MARKER_V1 ||
    challenge.version !== 1 ||
    challenge.execution_epoch !== "2" ||
    challenge.role_id !== expectedRoleId ||
    candidate !== selected ||
    challenge.coupled_launch_id !== COUPLED_LAUNCH_BYTES32_V1 ||
    challenge.compiled_identity_id !== COMPILED_IDENTITY_ID_V1 ||
    ethers.getAddress(String(challenge.void_token)).toLowerCase() !==
      VOID_TOKEN_V1 ||
    typeof challenge.source_binding_sha256 !== "string" ||
    !BYTES32.test(challenge.source_binding_sha256) ||
    typeof challenge.nonce !== "string" ||
    !BYTES32.test(challenge.nonce)
  ) {
    fail("control_challenge_semantics_invalid");
  }

  const typedData = exactDataObject(
    envelope.typed_data,
    ["domain", "types", "value"],
    "control_typed_data",
  );
  const expectedValue = {
    execution_epoch: challenge.execution_epoch,
    role_id: challenge.role_id,
    candidate_address: challenge.candidate_address,
    coupled_launch_id: challenge.coupled_launch_id,
    compiled_identity_id: challenge.compiled_identity_id,
    void_token: challenge.void_token,
    source_binding_sha256: challenge.source_binding_sha256,
    nonce: challenge.nonce,
    issued_at_unix: challenge.issued_at_unix,
    expires_at_unix: challenge.expires_at_unix,
  };
  if (
    canonicalJson(typedData.domain) !== canonicalJson(expectedDomain) ||
    canonicalJson(typedData.types) !== canonicalJson(expectedTypes) ||
    canonicalJson(typedData.value) !== canonicalJson(expectedValue)
  ) {
    fail("control_typed_data_semantics_invalid");
  }

  const issued = decimal(challenge.issued_at_unix, "control_issued_invalid");
  const expires = decimal(challenge.expires_at_unix, "control_expires_invalid");
  const now = decimal(nowUnix, "control_now_invalid");
  if (
    expires <= issued ||
    expires - issued < MIN_TTL_SECONDS ||
    expires - issued > MAX_TTL_SECONDS
  ) {
    fail("control_challenge_ttl_invalid");
  }
  if (now < issued) fail("control_challenge_not_yet_valid");
  if (now >= expires) fail("control_challenge_expired");

  const digest = ethers.TypedDataEncoder.hash(
    typedData.domain,
    typedData.types,
    typedData.value,
  );
  if (digest !== envelope.typed_data_digest) {
    fail("control_typed_data_digest_mismatch");
  }

  const material = {
    marker: CONTROL_REQUALIFICATION_MARKER_V1,
    version: 1,
    challenge,
    source_binding: envelope.source_binding,
    typed_data: typedData,
  };
  const expectedChallengeId =
    "voidwclcc1_" +
    sha256(Buffer.from(canonicalJson(material), "utf8"));
  if (expectedChallengeId !== envelope.challenge_id) {
    fail("control_challenge_id_mismatch");
  }

  const authority = exactDataObject(
    envelope.authority,
    [
      "source_only_control_verification",
      "public_challenge_material",
      "public_signature_material",
      "signature_verification",
      "current_source_binding_required",
      "private_key_access",
      "credential_access",
      "wallet_or_signer_access",
      "transaction_construction",
      "transaction_signing_performed",
      "transaction_broadcast",
      "chain2050_write",
      "role_binding_authorized",
      "deployment_authorized",
      "inventory_funding_authorized",
      "market_activation",
      "public_presale_activation",
      "funds_movement",
    ],
    "control_challenge_authority",
  );
  const expectedAuthority = {
    source_only_control_verification: true,
    public_challenge_material: true,
    public_signature_material: true,
    signature_verification: true,
    current_source_binding_required: true,
    private_key_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing_performed: false,
    transaction_broadcast: false,
    chain2050_write: false,
    role_binding_authorized: false,
    deployment_authorized: false,
    inventory_funding_authorized: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  };
  if (canonicalJson(authority) !== canonicalJson(expectedAuthority)) {
    fail("control_challenge_authority_mismatch");
  }

  return Object.freeze({
    challenge_id: envelope.challenge_id,
    candidate_address: selected,
    typed_data: Object.freeze({
      domain: Object.freeze({ ...expectedDomain }),
      types: Object.freeze({
        LaunchControllerControl: Object.freeze(
          expectedTypes.LaunchControllerControl.map((row) =>
            Object.freeze({ ...row })
          ),
        ),
      }),
      value: Object.freeze({ ...expectedValue }),
    }),
    typed_data_digest: digest,
    expires_at_unix: expires.toString(),
  });
}

export async function signControlChallengeCoreV1({
  challengeEnvelope,
  privateKey,
  expectedAddress,
  nowUnix = Math.floor(Date.now() / 1000),
  ethers,
}) {
  if (
    !ethers ||
    typeof ethers.Wallet !== "function" ||
    typeof ethers.verifyTypedData !== "function" ||
    typeof ethers.TypedDataEncoder?.hash !== "function" ||
    typeof ethers.getAddress !== "function" ||
    typeof ethers.keccak256 !== "function" ||
    typeof ethers.toUtf8Bytes !== "function"
  ) {
    fail("offline_signer_ethers_exports_invalid");
  }

  const reviewed = validateChallengeForSigningV1({
    challengeEnvelope,
    expectedAddress,
    nowUnix,
    ethers,
  });

  let wallet;
  try {
    wallet = new ethers.Wallet(privateKey);
  } catch {
    fail("launch_controller_private_key_invalid");
  }
  const derived = wallet.address.toLowerCase();
  if (derived !== reviewed.candidate_address) {
    fail("launch_controller_private_key_address_mismatch");
  }

  const signature = await wallet.signTypedData(
    reviewed.typed_data.domain,
    reviewed.typed_data.types,
    reviewed.typed_data.value,
  );
  if (!SIGNATURE65.test(signature)) {
    fail("launch_controller_signature_shape_invalid");
  }
  const recovered = ethers.verifyTypedData(
    reviewed.typed_data.domain,
    reviewed.typed_data.types,
    reviewed.typed_data.value,
    signature,
  ).toLowerCase();
  if (recovered !== reviewed.candidate_address) {
    fail("launch_controller_signature_recovery_mismatch");
  }

  return Object.freeze({
    marker: SIGNATURE_MARKER_V1,
    version: 1,
    challenge_id: reviewed.challenge_id,
    signature,
  });
}

export async function reviewedOfflineSigningRuntimeV1() {
  return await withReviewedEthersV1(async ({ ethers, profile }) =>
    Object.freeze({
      reviewed_runtime_profile_id: profile.profile_id,
      reviewed_packages_aggregate_sha256:
        profile.packages_aggregate_sha256,
      ethers_version:
        typeof ethers.version === "string" ? ethers.version : null,
      private_key_access: false,
      network_access_required: false,
      transaction_signing: false,
      funds_movement: false,
    })
  );
}

export async function signSelectedLaunchControllerChallengeV1({
  challengePath,
  challengeSha256,
  outputPath,
  nowUnix = Math.floor(Date.now() / 1000),
} = {}) {
  const challenge = readChallengeV1(challengePath, challengeSha256);
  const keyPath = path.resolve(os.homedir(), KEY_RELATIVE_V1);

  return await withReviewedEthersV1(async ({ ethers, profile }) => {
    let privateKey = readPrivateKeyV1(keyPath);
    let envelope;
    try {
      envelope = await signControlChallengeCoreV1({
        challengeEnvelope: challenge.value,
        privateKey,
        expectedAddress: SELECTED_REVIEWER_ADDRESS_V1,
        nowUnix,
        ethers,
      });
    } finally {
      privateKey = "";
    }

    const written = writeExclusiveJsonV1(outputPath, envelope);
    return Object.freeze({
      marker: VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1,
      status: "PUBLIC_CONTROL_SIGNATURE_ENVELOPE_WRITTEN",
      challenge_id: envelope.challenge_id,
      candidate_address: SELECTED_REVIEWER_ADDRESS_V1,
      signature_sha256: sha256(
        Buffer.from(envelope.signature, "utf8"),
      ),
      output_sha256: written.sha256,
      reviewed_runtime_profile_id: profile.profile_id,
      reviewed_packages_aggregate_sha256:
        profile.packages_aggregate_sha256,
      private_key_path_fixed: true,
      private_key_printed: false,
      private_key_exported: false,
      transaction_signing: false,
      transaction_broadcast: false,
      chain2050_write: false,
      funds_movement: false,
    });
  });
}

function usage() {
  console.log(
    "sign --challenge /absolute/challenge.json --challenge-sha256 <64hex> " +
      "--output /absolute/signature.json",
  );
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      challenge: { type: "string" },
      "challenge-sha256": { type: "string" },
      output: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: true,
  });
  const command = positionals[0] || "";
  if (values.help || command === "help") {
    usage();
    return;
  }
  if (
    command !== "sign" ||
    !values.challenge ||
    !values["challenge-sha256"] ||
    !values.output
  ) {
    usage();
    fail("offline_signer_arguments_invalid");
  }
  const result = await signSelectedLaunchControllerChallengeV1({
    challengePath: path.resolve(values.challenge),
    challengeSha256: values["challenge-sha256"],
    outputPath: path.resolve(values.output),
  });
  console.log(result.marker);
  for (const [key, value] of Object.entries(result)) {
    if (key === "marker") continue;
    console.log(key + "=" + String(value));
  }
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(
      VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1 + "_HOLD",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
