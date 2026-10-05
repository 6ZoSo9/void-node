#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  TypedDataEncoder,
  getAddress,
  isHexString,
  keccak256,
  toUtf8Bytes,
  verifyTypedData,
} from "ethers";

export const VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1 =
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1";
export const VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1 =
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1";
export const VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1 =
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1";
export const VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1 =
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1";

export const VOID_WC_VOID_LAUNCH_CONTROLLER_HISTORICAL_REFERENCE_V1 =
  Object.freeze({
    address: "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e",
    public_identity_sha256:
      "7ca273a6b188e64e7099d57e7705345559fe7156c12406cde5097ce47350f431",
    source_generation: "2026-09-25",
    current_authority: false,
    signing_challenge_previously_verified: false,
  });

export const VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_DOMAIN_V1 =
  Object.freeze({
    name: "VOID WC/VOID Launch Controller Control",
    version: "1",
    chainId: 2050,
    salt: keccak256(
      toUtf8Bytes(
        "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1",
      ),
    ),
  });

export const VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_TYPES_V1 =
  Object.freeze({
    LaunchControllerControl: Object.freeze([
      Object.freeze({ name: "execution_epoch", type: "uint64" }),
      Object.freeze({ name: "role_id", type: "bytes32" }),
      Object.freeze({ name: "candidate_address", type: "address" }),
      Object.freeze({ name: "coupled_launch_id", type: "bytes32" }),
      Object.freeze({ name: "compiled_identity_id", type: "string" }),
      Object.freeze({ name: "void_token", type: "address" }),
      Object.freeze({ name: "source_binding_sha256", type: "bytes32" }),
      Object.freeze({ name: "nonce", type: "bytes32" }),
      Object.freeze({ name: "issued_at_unix", type: "uint64" }),
      Object.freeze({ name: "expires_at_unix", type: "uint64" }),
    ]),
  });

export const VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_ROLE_ID_V1 =
  keccak256(toUtf8Bytes("VOID_WC_VOID_MARKET_VAULT_LAUNCH_CONTROLLER_V1"));

export const VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_AUTHORITY_V1 =
  Object.freeze({
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
  });

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const COUPLED_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const IDENTITY_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-current-binding-v2.json";
const CONTROL_REL =
  "tools/void-wc-void-launch-controller-control-requalification-v1.mjs";
const PACKAGE_REL = "package.json";
const PACKAGE_LOCK_REL = "package-lock.json";

const EXPECTED_SOURCE_BLOBS = Object.freeze({
  [COUPLED_REL]: "fbbc3174406f76077c8cb2fc11df9545938c0c8f",
  [IDENTITY_REL]: "1009c41250a40bb793c88057a7187cec01c8704b",
  [PACKAGE_REL]: "f28c3e9446c7623ef203da36a9642d046e5f34ee",
  [PACKAGE_LOCK_REL]: "b2671f0149f522b2489247016df0a5ec4bb72b8b",
});
const EXPECTED_COUPLED_LAUNCH_ID =
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
const EXPECTED_COUPLED_LAUNCH_BYTES32 =
  "0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
const EXPECTED_COMPILED_IDENTITY_ID =
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a";
const EXPECTED_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const MAX_TTL_SECONDS = 1800n;
const MIN_TTL_SECONDS = 60n;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const CHALLENGE_ID = /^voidwclcc1_[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voidwlcce1_[0-9a-f]{64}$/u;

function fail(reason) {
  throw new Error(reason);
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

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactOwnDataObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + "_not_object");
  }
  let proto;
  let own;
  let descriptors;
  try {
    proto = Object.getPrototypeOf(value);
    own = Reflect.ownKeys(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    fail(label + "_introspection_failed");
  }
  if (proto !== Object.prototype && proto !== null) {
    fail(label + "_prototype_invalid");
  }
  if (
    own.length !== keys.length ||
    own.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    fail(label + "_keys_mismatch");
  }
  const out = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(label + "_data_property_required:" + key);
    }
    out[key] = descriptor.value;
  }
  return out;
}

function exactAuthorityV1(value) {
  const expected =
    VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_AUTHORITY_V1;
  const actual = exactOwnDataObject(
    value,
    Object.keys(expected),
    "control_authority",
  );
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (actual[key] !== expectedValue) {
      fail("control_authority_mismatch:" + key);
    }
  }
  return Object.freeze({ ...actual });
}

function canonicalAddress(value, reason) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/u.test(value)) {
    fail(reason);
  }
  let normalized;
  try {
    normalized = getAddress(value).toLowerCase();
  } catch {
    fail(reason);
  }
  if (!/^0x[0-9a-f]{40}$/u.test(normalized)) fail(reason);
  if (normalized === "0x" + "0".repeat(40)) fail(reason);
  return normalized;
}

function decimal(value, max, reason) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/u.test(value)) {
    fail(reason);
  }
  let parsed;
  try {
    parsed = BigInt(value);
  } catch {
    fail(reason);
  }
  if (parsed < 0n || parsed > max) fail(reason);
  return parsed;
}

function gitRead(args, reason) {
  let output;
  try {
    output = execFileSync("git", ["-C", ROOT, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    }).trim();
  } catch {
    fail(reason);
  }
  return output;
}

function requireCleanRepositoryV1() {
  if (
    gitRead(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "control_source_repository_status_unavailable",
    ) !== ""
  ) {
    fail("control_source_repository_not_clean");
  }
}

function readJson(relativePath, reason) {
  let raw;
  try {
    raw = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  } catch {
    fail(reason);
  }
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    fail(reason);
  }
  if (raw !== JSON.stringify(value, null, 2) + "\n") {
    fail(reason);
  }
  return value;
}

export function readCurrentLaunchControllerControlSourceBindingV1() {
  requireCleanRepositoryV1();
  const head = gitRead(["rev-parse", "HEAD"], "control_source_head_unavailable");
  const tree = gitRead(
    ["rev-parse", "HEAD^{tree}"],
    "control_source_tree_unavailable",
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("control_source_repository_identity_invalid");
  }

  const sourceBlobs = {};
  for (const [relativePath, expectedBlob] of
    Object.entries(EXPECTED_SOURCE_BLOBS)) {
    const blob = gitRead(
      ["rev-parse", "HEAD:" + relativePath],
      "control_source_blob_unavailable",
    );
    if (!HEX40.test(blob) || blob !== expectedBlob) {
      fail("control_source_blob_mismatch:" + relativePath);
    }
    sourceBlobs[relativePath] = blob;
  }

  const coupled = readJson(
    COUPLED_REL,
    "control_coupled_candidate_invalid",
  );
  const identity = readJson(
    IDENTITY_REL,
    "control_compiled_identity_acceptance_invalid",
  );
  const launchId =
    coupled?.shared_post_discovery_reconciliation?.coupled_launch_id;
  const voidToken = canonicalAddress(
    coupled?.shared_post_discovery_reconciliation?.void_token,
    "control_void_token_invalid",
  );
  const identityId = identity?.identity?.identity_id;
  if (
    coupled?.marker !== "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1" ||
    coupled?.version !== 1 ||
    launchId !== EXPECTED_COUPLED_LAUNCH_ID ||
    voidToken !== EXPECTED_VOID_TOKEN ||
    identity?.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_BINDING_V2" ||
    identity?.version !== 2 ||
    identity?.status !==
      "COMPILED_IDENTITY_CURRENT_CORRECTED_DEPLOYMENT_HOLD" ||
    identity?.corrected_coupled_launch_id !== EXPECTED_COUPLED_LAUNCH_ID ||
    identity?.corrected_vault_bytes32 !== EXPECTED_COUPLED_LAUNCH_BYTES32 ||
    identity?.decision?.old_control_signature_generation_reusable !== false ||
    identityId !== EXPECTED_COMPILED_IDENTITY_ID
  ) {
    fail("control_current_launch_source_semantics_invalid");
  }

  const controlContractBlob = gitRead(
    ["rev-parse", "HEAD:" + CONTROL_REL],
    "control_contract_source_blob_unavailable",
  );
  if (!HEX40.test(controlContractBlob)) {
    fail("control_contract_source_blob_invalid");
  }

  const binding = Object.freeze({
    source_head_sha: head,
    source_tree_sha: tree,
    control_contract_git_blob_sha1: controlContractBlob,
    source_blobs: Object.freeze({ ...sourceBlobs }),
    coupled_launch_id: launchId,
    coupled_launch_id_bytes32: EXPECTED_COUPLED_LAUNCH_BYTES32,
    compiled_identity_id: identityId,
    void_token: voidToken,
  });
  return Object.freeze({
    ...binding,
    source_binding_sha256: sha256(
      Buffer.from(canonicalJson(binding), "utf8"),
    ),
  });
}

function assertSourceBindingCurrentV1(bindingValue) {
  const binding = exactOwnDataObject(
    bindingValue,
    [
      "source_head_sha",
      "source_tree_sha",
      "control_contract_git_blob_sha1",
      "source_blobs",
      "coupled_launch_id",
      "coupled_launch_id_bytes32",
      "compiled_identity_id",
      "void_token",
      "source_binding_sha256",
    ],
    "control_source_binding",
  );
  if (
    typeof binding.source_head_sha !== "string" ||
    !HEX40.test(binding.source_head_sha) ||
    typeof binding.source_tree_sha !== "string" ||
    !HEX40.test(binding.source_tree_sha) ||
    typeof binding.control_contract_git_blob_sha1 !== "string" ||
    !HEX40.test(binding.control_contract_git_blob_sha1) ||
    binding.coupled_launch_id !== EXPECTED_COUPLED_LAUNCH_ID ||
    binding.coupled_launch_id_bytes32 !== EXPECTED_COUPLED_LAUNCH_BYTES32 ||
    binding.compiled_identity_id !== EXPECTED_COMPILED_IDENTITY_ID ||
    canonicalAddress(
      binding.void_token,
      "control_source_binding_void_token_invalid",
    ) !== EXPECTED_VOID_TOKEN ||
    typeof binding.source_binding_sha256 !== "string" ||
    !HEX64.test(binding.source_binding_sha256)
  ) {
    fail("control_source_binding_invalid");
  }
  const blobs = exactOwnDataObject(
    binding.source_blobs,
    Object.keys(EXPECTED_SOURCE_BLOBS),
    "control_source_binding_blobs",
  );
  for (const [relativePath, expectedBlob] of
    Object.entries(EXPECTED_SOURCE_BLOBS)) {
    if (blobs[relativePath] !== expectedBlob) {
      fail("control_source_binding_blob_invalid:" + relativePath);
    }
  }
  const material = {
    source_head_sha: binding.source_head_sha,
    source_tree_sha: binding.source_tree_sha,
    control_contract_git_blob_sha1:
      binding.control_contract_git_blob_sha1,
    source_blobs: blobs,
    coupled_launch_id: binding.coupled_launch_id,
    coupled_launch_id_bytes32: binding.coupled_launch_id_bytes32,
    compiled_identity_id: binding.compiled_identity_id,
    void_token: binding.void_token,
  };
  if (
    sha256(Buffer.from(canonicalJson(material), "utf8")) !==
      binding.source_binding_sha256
  ) {
    fail("control_source_binding_digest_mismatch");
  }

  requireCleanRepositoryV1();
  const currentHead = gitRead(
    ["rev-parse", "HEAD"],
    "control_current_head_unavailable",
  );
  try {
    execFileSync(
      "git",
      [
        "-C",
        ROOT,
        "merge-base",
        "--is-ancestor",
        binding.source_head_sha,
        currentHead,
      ],
      { stdio: ["ignore", "ignore", "ignore"] },
    );
  } catch {
    fail("control_source_head_not_ancestor_of_current_head");
  }
  const reviewedTree = gitRead(
    ["rev-parse", binding.source_head_sha + "^{tree}"],
    "control_reviewed_source_tree_unavailable",
  );
  if (reviewedTree !== binding.source_tree_sha) {
    fail("control_reviewed_source_tree_mismatch");
  }
  for (const [relativePath, expectedBlob] of
    Object.entries(EXPECTED_SOURCE_BLOBS)) {
    const reviewedBlob = gitRead(
      [
        "rev-parse",
        binding.source_head_sha + ":" + relativePath,
      ],
      "control_reviewed_source_blob_unavailable",
    );
    if (
      reviewedBlob !== expectedBlob ||
      reviewedBlob !== blobs[relativePath]
    ) {
      fail("control_reviewed_source_blob_mismatch:" + relativePath);
    }
  }

  const reviewedControlBlob = gitRead(
    [
      "rev-parse",
      binding.source_head_sha + ":" + CONTROL_REL,
    ],
    "control_reviewed_contract_source_blob_unavailable",
  );
  const currentControlBlob = gitRead(
    ["rev-parse", "HEAD:" + CONTROL_REL],
    "control_current_contract_source_blob_unavailable",
  );
  if (
    reviewedControlBlob !== binding.control_contract_git_blob_sha1 ||
    currentControlBlob !== binding.control_contract_git_blob_sha1
  ) {
    fail("control_contract_source_blob_drift");
  }

  for (const [relativePath, expectedBlob] of
    Object.entries(EXPECTED_SOURCE_BLOBS)) {
    const currentBlob = gitRead(
      ["rev-parse", "HEAD:" + relativePath],
      "control_current_source_blob_unavailable",
    );
    if (currentBlob !== expectedBlob) {
      fail("control_current_source_blob_mismatch:" + relativePath);
    }
  }
  return Object.freeze({
    ...material,
    source_blobs: Object.freeze({ ...blobs }),
    source_binding_sha256: binding.source_binding_sha256,
  });
}

function exactTypedDataV1(value) {
  const typed = exactOwnDataObject(
    value,
    ["domain", "types", "value"],
    "control_typed_data",
  );
  const domain = exactOwnDataObject(
    typed.domain,
    ["name", "version", "chainId", "salt"],
    "control_typed_data_domain",
  );
  const types = exactOwnDataObject(
    typed.types,
    ["LaunchControllerControl"],
    "control_typed_data_types",
  );
  const typeList = types.LaunchControllerControl;
  if (!Array.isArray(typeList) || typeList.length !== 10) {
    fail("control_typed_data_type_list_invalid");
  }
  const normalizedTypes = [];
  const descriptors = Object.getOwnPropertyDescriptors(typeList);
  for (let index = 0; index < typeList.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail("control_typed_data_type_entry_data_property_required");
    }
    normalizedTypes.push(
      exactOwnDataObject(
        descriptor.value,
        ["name", "type"],
        "control_typed_data_type_entry",
      ),
    );
  }
  const valueObject = exactOwnDataObject(
    typed.value,
    [
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
    "control_typed_data_value",
  );
  return Object.freeze({
    domain: Object.freeze({ ...domain }),
    types: Object.freeze({
      LaunchControllerControl: Object.freeze(
        normalizedTypes.map((entry) => Object.freeze({ ...entry })),
      ),
    }),
    value: Object.freeze({ ...valueObject }),
  });
}

function typedValue(challenge) {
  return {
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
}

export function voidWcVoidLaunchControllerControlTypedDataV1(challenge) {
  return Object.freeze({
    domain: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_DOMAIN_V1,
    types: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_TYPES_V1,
    value: Object.freeze(typedValue(challenge)),
  });
}

export function voidWcVoidLaunchControllerControlDigestV1(challenge) {
  const data = voidWcVoidLaunchControllerControlTypedDataV1(challenge);
  return TypedDataEncoder.hash(data.domain, data.types, data.value);
}

export function prepareVoidWcVoidLaunchControllerControlChallengeV1({
  candidateAddress,
  nowUnix = Math.floor(Date.now() / 1000),
  ttlSeconds = 900,
  nonce = null,
} = {}) {
  const source = readCurrentLaunchControllerControlSourceBindingV1();
  const candidate = canonicalAddress(
    candidateAddress,
    "control_candidate_address_invalid",
  );
  const now = decimal(String(nowUnix), (1n << 64n) - 1n, "control_now_invalid");
  const ttl = decimal(
    String(ttlSeconds),
    (1n << 64n) - 1n,
    "control_ttl_invalid",
  );
  if (ttl < MIN_TTL_SECONDS || ttl > MAX_TTL_SECONDS) {
    fail("control_ttl_out_of_range");
  }
  const nonceValue =
    nonce === null
      ? "0x" + crypto.randomBytes(32).toString("hex")
      : String(nonce);
  if (!BYTES32.test(nonceValue)) fail("control_nonce_invalid");

  const challenge = Object.freeze({
    marker: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1,
    version: 1,
    execution_epoch: "2",
    role_id: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_ROLE_ID_V1,
    candidate_address: candidate,
    coupled_launch_id: EXPECTED_COUPLED_LAUNCH_BYTES32,
    compiled_identity_id: EXPECTED_COMPILED_IDENTITY_ID,
    void_token: EXPECTED_VOID_TOKEN,
    source_binding_sha256: "0x" + source.source_binding_sha256,
    nonce: nonceValue,
    issued_at_unix: now.toString(),
    expires_at_unix: (now + ttl).toString(),
  });
  const typedData =
    voidWcVoidLaunchControllerControlTypedDataV1(challenge);
  const typedDataDigest = TypedDataEncoder.hash(
    typedData.domain,
    typedData.types,
    typedData.value,
  );
  const material = Object.freeze({
    marker: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1,
    version: 1,
    challenge,
    source_binding: source,
    typed_data: typedData,
  });
  const challengeId =
    "voidwclcc1_" +
    sha256(Buffer.from(canonicalJson(material), "utf8"));
  return Object.freeze({
    ...material,
    challenge_id: challengeId,
    typed_data_digest: typedDataDigest,
    authority: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_AUTHORITY_V1,
  });
}

function validateChallengeEnvelopeV1(value, nowUnix) {
  const envelope = exactOwnDataObject(
    value,
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
    envelope.marker !==
      VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1 ||
    envelope.version !== 1 ||
    typeof envelope.challenge_id !== "string" ||
    !CHALLENGE_ID.test(envelope.challenge_id) ||
    typeof envelope.typed_data_digest !== "string" ||
    !BYTES32.test(envelope.typed_data_digest)
  ) {
    fail("control_challenge_envelope_invalid");
  }
  exactAuthorityV1(envelope.authority);

  const source = assertSourceBindingCurrentV1(envelope.source_binding);
  const challenge = exactOwnDataObject(
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
  const candidate = canonicalAddress(
    challenge.candidate_address,
    "control_challenge_candidate_invalid",
  );
  if (
    challenge.marker !==
      VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1 ||
    challenge.version !== 1 ||
    challenge.execution_epoch !== "2" ||
    challenge.role_id !==
      VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_ROLE_ID_V1 ||
    challenge.coupled_launch_id !== EXPECTED_COUPLED_LAUNCH_BYTES32 ||
    challenge.compiled_identity_id !== EXPECTED_COMPILED_IDENTITY_ID ||
    canonicalAddress(
      challenge.void_token,
      "control_challenge_void_token_invalid",
    ) !== EXPECTED_VOID_TOKEN ||
    challenge.source_binding_sha256 !==
      "0x" + source.source_binding_sha256 ||
    typeof challenge.nonce !== "string" ||
    !BYTES32.test(challenge.nonce)
  ) {
    fail("control_challenge_semantics_invalid");
  }
  const issued = decimal(
    challenge.issued_at_unix,
    (1n << 64n) - 1n,
    "control_challenge_issued_invalid",
  );
  const expires = decimal(
    challenge.expires_at_unix,
    (1n << 64n) - 1n,
    "control_challenge_expires_invalid",
  );
  const now = decimal(
    String(nowUnix),
    (1n << 64n) - 1n,
    "control_verify_now_invalid",
  );
  if (
    expires <= issued ||
    expires - issued < MIN_TTL_SECONDS ||
    expires - issued > MAX_TTL_SECONDS
  ) {
    fail("control_challenge_time_window_invalid");
  }
  if (now < issued) fail("control_challenge_not_yet_valid");
  if (now >= expires) fail("control_challenge_expired");

  const suppliedTypedData = exactTypedDataV1(envelope.typed_data);
  const expectedTypedData =
    voidWcVoidLaunchControllerControlTypedDataV1(challenge);
  if (
    canonicalJson(suppliedTypedData) !==
      canonicalJson(expectedTypedData)
  ) {
    fail("control_challenge_typed_data_mismatch");
  }
  const material = {
    marker: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1,
    version: 1,
    challenge,
    source_binding: source,
    typed_data: expectedTypedData,
  };
  const expectedId =
    "voidwclcc1_" +
    sha256(Buffer.from(canonicalJson(material), "utf8"));
  if (envelope.challenge_id !== expectedId) {
    fail("control_challenge_id_mismatch");
  }
  const digest = TypedDataEncoder.hash(
    expectedTypedData.domain,
    expectedTypedData.types,
    expectedTypedData.value,
  );
  if (envelope.typed_data_digest !== digest) {
    fail("control_challenge_typed_data_digest_mismatch");
  }
  const normalizedChallenge = Object.freeze({
    ...challenge,
    candidate_address: candidate,
  });
  const normalizedEnvelope = Object.freeze({
    marker: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1,
    version: 1,
    challenge: normalizedChallenge,
    source_binding: source,
    typed_data: expectedTypedData,
    challenge_id: expectedId,
    typed_data_digest: digest,
    authority: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_AUTHORITY_V1,
  });
  return Object.freeze({
    challenge: normalizedChallenge,
    challenge_envelope: normalizedEnvelope,
    source_binding: source,
    challenge_id: expectedId,
    typed_data_digest: digest,
    issued_at_unix: issued,
    expires_at_unix: expires,
  });
}

export function buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1({
  challengeId,
  signature,
} = {}) {
  if (
    typeof challengeId !== "string" ||
    !CHALLENGE_ID.test(challengeId) ||
    typeof signature !== "string" ||
    !isHexString(signature, 65)
  ) {
    fail("control_signature_envelope_build_input_invalid");
  }
  return Object.freeze({
    marker: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1,
    version: 1,
    challenge_id: challengeId,
    signature,
  });
}

export async function verifyVoidWcVoidLaunchControllerControlSignatureV1({
  challengeEnvelope,
  signatureEnvelope,
  nowUnix = Math.floor(Date.now() / 1000),
} = {}) {
  const challenge = validateChallengeEnvelopeV1(
    challengeEnvelope,
    nowUnix,
  );
  const signature = exactOwnDataObject(
    signatureEnvelope,
    ["marker", "version", "challenge_id", "signature"],
    "control_signature_envelope",
  );
  if (
    signature.marker !==
      VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1 ||
    signature.version !== 1 ||
    signature.challenge_id !== challenge.challenge_id ||
    typeof signature.signature !== "string" ||
    !isHexString(signature.signature, 65)
  ) {
    fail("control_signature_envelope_invalid");
  }

  const data =
    voidWcVoidLaunchControllerControlTypedDataV1(
      challenge.challenge,
    );
  let recovered;
  try {
    recovered = canonicalAddress(
      verifyTypedData(
        data.domain,
        data.types,
        data.value,
        signature.signature,
      ),
      "control_signature_recovered_address_invalid",
    );
  } catch {
    fail("control_signature_verification_failed");
  }
  if (recovered !== challenge.challenge.candidate_address) {
    fail("control_signature_candidate_mismatch");
  }

  const verifiedAt = decimal(
    String(nowUnix),
    (1n << 64n) - 1n,
    "control_verify_now_invalid",
  );
  const normalizedSignatureEnvelope = Object.freeze({
    marker: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1,
    version: 1,
    challenge_id: challenge.challenge_id,
    signature: signature.signature,
  });
  const identityMaterial = Object.freeze({
    marker: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1,
    version: 1,
    status: "CANDIDATE_CONTROL_VERIFIED_ROLE_NOT_AUTHORIZED",
    challenge_envelope: challenge.challenge_envelope,
    signature_envelope: normalizedSignatureEnvelope,
    challenge_id: challenge.challenge_id,
    candidate_address: recovered,
    coupled_launch_id: EXPECTED_COUPLED_LAUNCH_ID,
    coupled_launch_id_bytes32: EXPECTED_COUPLED_LAUNCH_BYTES32,
    compiled_identity_id: EXPECTED_COMPILED_IDENTITY_ID,
    void_token: EXPECTED_VOID_TOKEN,
    source_binding_sha256:
      challenge.source_binding.source_binding_sha256,
    source_head_sha: challenge.source_binding.source_head_sha,
    typed_data_digest: challenge.typed_data_digest,
    signature: signature.signature,
    valid_until_unix: challenge.expires_at_unix.toString(),
    control_verified: true,
    role_binding_authorized: false,
    deployment_authorized: false,
    inventory_funding_authorized: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_AUTHORITY_V1,
  });
  const evidenceId =
    "voidwlcce1_" +
    sha256(Buffer.from(canonicalJson(identityMaterial), "utf8"));
  if (!EVIDENCE_ID.test(evidenceId)) {
    fail("control_evidence_id_internal_invalid");
  }
  return Object.freeze({
    ...identityMaterial,
    evidence_id: evidenceId,
    verified_at_unix: verifiedAt.toString(),
  });
}

export async function reverifyVoidWcVoidLaunchControllerControlEvidenceV1({
  evidence,
  nowUnix = Math.floor(Date.now() / 1000),
} = {}) {
  const value = exactOwnDataObject(
    evidence,
    [
      "marker",
      "version",
      "status",
      "challenge_envelope",
      "signature_envelope",
      "challenge_id",
      "candidate_address",
      "coupled_launch_id",
      "coupled_launch_id_bytes32",
      "compiled_identity_id",
      "void_token",
      "source_binding_sha256",
      "source_head_sha",
      "typed_data_digest",
      "signature",
      "valid_until_unix",
      "control_verified",
      "role_binding_authorized",
      "deployment_authorized",
      "inventory_funding_authorized",
      "market_activation_authorized",
      "public_presale_activation_authorized",
      "funds_movement_authorized",
      "authority",
      "evidence_id",
      "verified_at_unix",
    ],
    "control_evidence",
  );
  if (
    value.marker !== VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1 ||
    value.version !== 1 ||
    value.status !== "CANDIDATE_CONTROL_VERIFIED_ROLE_NOT_AUTHORIZED" ||
    typeof value.evidence_id !== "string" ||
    !EVIDENCE_ID.test(value.evidence_id) ||
    typeof value.challenge_id !== "string" ||
    !CHALLENGE_ID.test(value.challenge_id) ||
    typeof value.typed_data_digest !== "string" ||
    !BYTES32.test(value.typed_data_digest) ||
    typeof value.signature !== "string" ||
    !isHexString(value.signature, 65) ||
    value.control_verified !== true ||
    value.role_binding_authorized !== false ||
    value.deployment_authorized !== false ||
    value.inventory_funding_authorized !== false ||
    value.market_activation_authorized !== false ||
    value.public_presale_activation_authorized !== false ||
    value.funds_movement_authorized !== false
  ) {
    fail("control_evidence_identity_invalid");
  }
  exactAuthorityV1(value.authority);

  const fresh =
    await verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: value.challenge_envelope,
      signatureEnvelope: value.signature_envelope,
      nowUnix,
    });

  for (const key of [
    "evidence_id",
    "challenge_id",
    "candidate_address",
    "coupled_launch_id",
    "coupled_launch_id_bytes32",
    "compiled_identity_id",
    "void_token",
    "source_binding_sha256",
    "source_head_sha",
    "typed_data_digest",
    "signature",
    "valid_until_unix",
  ]) {
    if (value[key] !== fresh[key]) {
      fail("control_evidence_reverification_mismatch:" + key);
    }
  }

  const verifiedAt = decimal(
    value.verified_at_unix,
    (1n << 64n) - 1n,
    "control_evidence_verified_at_invalid",
  );
  const issuedAt = decimal(
    fresh.challenge_envelope.challenge.issued_at_unix,
    (1n << 64n) - 1n,
    "control_evidence_issued_at_invalid",
  );
  const validUntil = decimal(
    fresh.valid_until_unix,
    (1n << 64n) - 1n,
    "control_evidence_valid_until_invalid",
  );
  const now = decimal(
    String(nowUnix),
    (1n << 64n) - 1n,
    "control_verify_now_invalid",
  );
  if (
    verifiedAt < issuedAt ||
    verifiedAt >= validUntil ||
    verifiedAt > now
  ) {
    fail("control_evidence_verified_at_out_of_window");
  }

  return Object.freeze({
    ...fresh,
    verified_at_unix: value.verified_at_unix,
    reverified_at_unix: now.toString(),
    evidence_reverified: true,
  });
}

function isInsideRepo(file) {
  const relative = path.relative(ROOT, file);
  return (
    relative === "" ||
    (
      relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative)
    )
  );
}

function readStableFile(file, { label, maxBytes, expectedSha256 }) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file
  ) {
    fail(label + "_path_invalid");
  }
  if (isInsideRepo(file)) {
    fail(label + "_must_be_outside_repository");
  }
  let real;
  try {
    real = fs.realpathSync.native(file);
  } catch {
    fail(label + "_path_unavailable");
  }
  if (real !== file) fail(label + "_path_alias_forbidden");
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.size < 1 || before.size > maxBytes) {
      fail(label + "_size_invalid");
    }
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (count <= 0) fail(label + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    ) {
      fail(label + "_changed_during_read");
    }
    const digest = sha256(bytes);
    if (
      typeof expectedSha256 !== "string" ||
      !HEX64.test(expectedSha256) ||
      digest !== expectedSha256
    ) {
      fail(label + "_sha256_mismatch");
    }
    return Object.freeze({ bytes, sha256: digest });
  } finally {
    fs.closeSync(fd);
  }
}

function readStableJson(file, options) {
  const source = readStableFile(file, options);
  let text;
  let value;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(source.bytes);
    value = JSON.parse(text);
  } catch {
    fail(options.label + "_json_invalid");
  }
  if (text !== JSON.stringify(value, null, 2) + "\n") {
    fail(options.label + "_serialization_invalid");
  }
  return Object.freeze({ ...source, value });
}

function writePrivateJson(file, value) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file
  ) {
    fail("control_output_path_invalid");
  }
  if (isInsideRepo(file)) {
    fail("control_output_must_be_outside_repository");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("control_output_parent_alias_forbidden");
  }
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const bytes = prettyBytes(value);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    return Object.freeze({ bytes: bytes.length, sha256: sha256(bytes) });
  } finally {
    fs.closeSync(fd);
  }
}

function usage() {
  console.log(
    "prepare --candidate-address 0x... --output /absolute/challenge.json [--ttl-seconds 900]",
  );
  console.log(
    "verify --challenge /absolute/challenge.json --challenge-sha256 <64hex> " +
      "--signature /absolute/signature.json --signature-sha256 <64hex> " +
      "--output /absolute/evidence.json",
  );
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      "candidate-address": { type: "string" },
      output: { type: "string" },
      "ttl-seconds": { type: "string" },
      challenge: { type: "string" },
      "challenge-sha256": { type: "string" },
      signature: { type: "string" },
      "signature-sha256": { type: "string" },
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
  if (command === "prepare") {
    if (!values["candidate-address"] || !values.output) {
      fail("control_prepare_arguments_missing");
    }
    const ttlRaw =
      values["ttl-seconds"] === undefined
        ? "900"
        : values["ttl-seconds"];
    if (
      typeof ttlRaw !== "string" ||
      !/^[1-9][0-9]*$/u.test(ttlRaw)
    ) {
      fail("control_ttl_invalid");
    }
    const ttl = Number(ttlRaw);
    if (!Number.isSafeInteger(ttl)) fail("control_ttl_invalid");
    const challenge =
      prepareVoidWcVoidLaunchControllerControlChallengeV1({
        candidateAddress: values["candidate-address"],
        ttlSeconds: ttl,
      });
    const written = writePrivateJson(values.output, challenge);
    console.log(
      VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1,
    );
    console.log("status=CHALLENGE_PREPARED_NO_AUTHORITY");
    console.log("challenge_id=" + challenge.challenge_id);
    console.log("candidate_address=" + challenge.challenge.candidate_address);
    console.log("typed_data_digest=" + challenge.typed_data_digest);
    console.log("expires_at_unix=" + challenge.challenge.expires_at_unix);
    console.log("challenge_sha256=" + written.sha256);
    console.log("role_binding_authorized=false");
    console.log("deployment_authorized=false");
    console.log("funds_movement=false");
    return;
  }
  if (command === "verify") {
    if (
      !values.challenge ||
      !values["challenge-sha256"] ||
      !values.signature ||
      !values["signature-sha256"] ||
      !values.output
    ) {
      fail("control_verify_arguments_missing");
    }
    const challenge = readStableJson(values.challenge, {
      label: "control_challenge_file",
      maxBytes: MAX_JSON_BYTES,
      expectedSha256: values["challenge-sha256"],
    });
    const signature = readStableJson(values.signature, {
      label: "control_signature_file",
      maxBytes: 64 * 1024,
      expectedSha256: values["signature-sha256"],
    });
    const evidence =
      await verifyVoidWcVoidLaunchControllerControlSignatureV1({
        challengeEnvelope: challenge.value,
        signatureEnvelope: signature.value,
      });
    const written = writePrivateJson(values.output, evidence);
    console.log(
      VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1,
    );
    console.log("status=" + evidence.status);
    console.log("evidence_id=" + evidence.evidence_id);
    console.log("candidate_address=" + evidence.candidate_address);
    console.log("control_verified=true");
    console.log("valid_until_unix=" + evidence.valid_until_unix);
    console.log("evidence_sha256=" + written.sha256);
    console.log("role_binding_authorized=false");
    console.log("deployment_authorized=false");
    console.log("inventory_funding_authorized=false");
    console.log("market_activation=false");
    console.log("public_presale_activation=false");
    console.log("funds_movement=false");
    return;
  }
  usage();
  fail("control_command_invalid");
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(
      "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1_HOLD",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
