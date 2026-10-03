#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
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
const COUPLED_LAUNCH_ID_V1 =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const COUPLED_LAUNCH_BYTES32_V1 =
  "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const COMPILED_IDENTITY_ID_V1 =
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a";
const VOID_TOKEN_V1 =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const KEY_PATH_V1 =
  "/home/zoso/.local/share/void/offline-keys/wc-void-launch-controller-v1/private-key.hex";
const GIT_V1 = "/usr/bin/git";
const NODE_V1 = "/usr/bin/node";
const COUPLED_REL_V1 =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const IDENTITY_REL_V1 =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";
const CONTROL_REL_V1 =
  "tools/void-wc-void-launch-controller-control-requalification-v1.mjs";
const EXPECTED_SOURCE_BLOBS_V1 = Object.freeze({
  [COUPLED_REL_V1]: "d78bc88dd26c47921a54c081a79ceefc0d5abcee",
  [IDENTITY_REL_V1]: "c85b6bc59caac6bc765cb8e969cb980386161d12",
  "package.json": "f28c3e9446c7623ef203da36a9642d046e5f34ee",
  "package-lock.json": "b2671f0149f522b2489247016df0a5ec4bb72b8b",
});
const HEX40 = /^[0-9a-f]{40}$/u;
const CHALLENGE_ID_PATTERN = /^voidwclcc1_[0-9a-f]{64}$/u;
const SHA64 = /^[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const SIGNATURE65 = /^0x[0-9a-fA-F]{130}$/u;
const MAX_CHALLENGE_BYTES = 2 * 1024 * 1024;
const MIN_TTL_SECONDS = 60n;
const MAX_TTL_SECONDS = 1800n;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

export function validateSanitizedOfflineSignerEnvironmentV1(
  env = process.env,
  execPath = process.execPath,
  execArgv = process.execArgv,
) {
  const allowed = new Set([
    "HOME",
    "PATH",
    "LANG",
    "LC_ALL",
    "VOID_NIMO_OFFLINE_SIGNER_LAUNCH_V1",
  ]);
  const keys = Object.keys(env);
  if (
    keys.some((key) => !allowed.has(key)) ||
    env.HOME !== "/home/zoso" ||
    env.PATH !== "/usr/bin:/bin" ||
    env.LANG !== "C" ||
    env.LC_ALL !== "C" ||
    env.VOID_NIMO_OFFLINE_SIGNER_LAUNCH_V1 !== "1"
  ) {
    fail("offline_signer_environment_not_sanitized");
  }
  let actualNode;
  let expectedNode;
  try {
    actualNode = fs.realpathSync.native(execPath);
    expectedNode = fs.realpathSync.native(NODE_V1);
  } catch {
    fail("offline_signer_node_executable_unavailable");
  }
  if (actualNode !== expectedNode) {
    fail("offline_signer_node_executable_mismatch");
  }
  if (
    !Array.isArray(execArgv) ||
    execArgv.length !== 0
  ) {
    fail("offline_signer_node_preload_flags_forbidden");
  }
  return Object.freeze({
    sanitized_environment: true,
    node_executable: expectedNode,
    ambient_node_options_absent: true,
    ambient_node_path_absent: true,
    ambient_dynamic_loader_overrides_absent: true,
    node_preload_flags_absent: true,
  });
}

export const VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_AUTHORITY_V1 =
  Object.freeze({
    offline_operator_action: true,
    fixed_selected_reviewer_only: true,
    exact_public_challenge_required: true,
    reviewed_ethers_runtime_required: true,
    sanitized_process_environment_required: true,
    node_preload_flags_forbidden: true,
    current_source_binding_reverification_required: true,
    private_key_path_fixed: true,
    absolute_key_path_fixed: true,
    private_key_access: true,
    credential_access: true,
    wallet_or_signer_access: true,
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

function gitBlobSha1V1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function gitBlobBytesV1(blobSha, label) {
  if (typeof blobSha !== "string" || !HEX40.test(blobSha)) {
    fail(label + "_blob_invalid");
  }
  let bytes;
  try {
    bytes = execFileSync(
      GIT_V1,
      [
        "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.attributesFile=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "core.preloadIndex=false",
        "-c", "submodule.recurse=false",
        "-C", ROOT,
        "cat-file",
        "blob",
        blobSha,
      ],
      {
        cwd: "/",
        encoding: null,
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 4 * 1024 * 1024,
        env: reviewedGitEnvV1(),
      },
    );
  } catch {
    fail(label + "_blob_unavailable");
  }
  if (!Buffer.isBuffer(bytes) || gitBlobSha1V1(bytes) !== blobSha) {
    fail(label + "_blob_content_mismatch");
  }
  return bytes;
}

function writePrivateRuntimeFileV1(file, bytes, mode = 0o400) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    mode,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fchmodSync(fd, mode);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    (stat.mode & 0o777) !== mode
  ) {
    fail("offline_signer_runtime_private_file_invalid");
  }
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

function reviewedGitEnvV1() {
  return {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    HOME: "/nonexistent",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
}

function gitReadV1(args, code) {
  let output;
  try {
    output = execFileSync(
      GIT_V1,
      [
        "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.attributesFile=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "core.preloadIndex=false",
        "-c", "submodule.recurse=false",
        "-C", ROOT,
        ...args,
      ],
      {
        cwd: "/",
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: reviewedGitEnvV1(),
      },
    ).trim();
  } catch {
    fail(code);
  }
  return output;
}

function requireCleanRepositoryV1() {
  if (
    gitReadV1(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "offline_signer_repository_status_unavailable",
    ) !== ""
  ) {
    fail("offline_signer_repository_not_clean");
  }
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

function openPinnedParentDirectoryV1(file, label) {
  const noFollow = Number(fs.constants.O_NOFOLLOW || 0);
  const directoryFlag = Number(fs.constants.O_DIRECTORY || 0);
  if (noFollow === 0 || directoryFlag === 0) {
    fail(label + "_directory_nofollow_unavailable");
  }

  const parent = path.dirname(file);
  const relative = path.relative("/", parent);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail(label + "_parent_path_invalid");
  }
  const components =
    relative === "" ? [] : relative.split(path.sep);
  if (
    components.some(
      (component) =>
        !component ||
        component === "." ||
        component === "..",
    )
  ) {
    fail(label + "_parent_path_invalid");
  }

  let fd = -1;
  try {
    fd = fs.openSync(
      "/",
      fs.constants.O_RDONLY | directoryFlag | noFollow,
    );
    for (const component of components) {
      const nextPath = "/proc/self/fd/" + fd + "/" + component;
      const nextFd = fs.openSync(
        nextPath,
        fs.constants.O_RDONLY | directoryFlag | noFollow,
      );
      const stat = fs.fstatSync(nextFd, { bigint: true });
      if (!stat.isDirectory()) {
        fs.closeSync(nextFd);
        fail(label + "_parent_not_directory");
      }
      fs.closeSync(fd);
      fd = nextFd;
    }
    const stat = fs.fstatSync(fd, { bigint: true });
    if (!stat.isDirectory()) {
      fail(label + "_parent_not_directory");
    }
    return Object.freeze({
      fd,
      proc_path: "/proc/self/fd/" + fd,
      basename: path.basename(file),
    });
  } catch (error) {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      String(error.code || "") === "ELOOP"
    ) {
      fail(label + "_parent_symlink_forbidden");
    }
    throw error;
  }
}

function sameOpenedFileIdentityV1(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.nlink === right.nlink &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid
  );
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
  const parent = openPinnedParentDirectoryV1(file, label);
  const pinnedPath = parent.proc_path + "/" + parent.basename;
  let fd = -1;
  try {
    let pathnameBefore;
    try {
      pathnameBefore = fs.lstatSync(pinnedPath, { bigint: true });
    } catch {
      fail(label + "_preopen_identity_unavailable");
    }
    if (
      !pathnameBefore.isFile() ||
      pathnameBefore.isSymbolicLink() ||
      pathnameBefore.nlink !== 1n ||
      pathnameBefore.size < 1n ||
      pathnameBefore.size > BigInt(maxBytes)
    ) {
      fail(label + "_file_invalid");
    }

    fd = fs.openSync(
      pinnedPath,
      fs.constants.O_RDONLY |
        Number(fs.constants.O_NOFOLLOW || 0),
    );
    const before = fs.fstatSync(fd, { bigint: true });
    if (
      !before.isFile() ||
      before.nlink !== 1n ||
      before.size < 1n ||
      before.size > BigInt(maxBytes) ||
      !sameOpenedFileIdentityV1(pathnameBefore, before)
    ) {
      fail(label + "_preopen_identity_mismatch");
    }

    let canonicalBound;
    let originalPathBefore;
    try {
      canonicalBound = fs.realpathSync.native(file);
      originalPathBefore = fs.lstatSync(file, { bigint: true });
    } catch {
      fail(label + "_original_path_unavailable_after_pin");
    }
    if (
      canonicalBound !== file ||
      !sameOpenedFileIdentityV1(before, originalPathBefore)
    ) {
      fail(label + "_original_path_not_bound_to_pinned_file");
    }

    if (
      typeof process.getuid === "function" &&
      before.uid !== BigInt(process.getuid())
    ) {
      fail(label + "_owner_invalid");
    }
    if (privateMode && Number(before.mode & 0o777n) !== 0o600) {
      fail(label + "_mode_invalid");
    }

    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    let pathnameAfter;
    let canonicalAfter;
    let originalPathAfter;
    try {
      pathnameAfter = fs.lstatSync(pinnedPath, { bigint: true });
      canonicalAfter = fs.realpathSync.native(file);
      originalPathAfter = fs.lstatSync(file, { bigint: true });
    } catch {
      fail(label + "_path_changed_during_read");
    }
    if (
      !sameOpenedFileIdentityV1(before, after) ||
      !sameOpenedFileIdentityV1(after, pathnameAfter) ||
      canonicalAfter !== file ||
      !sameOpenedFileIdentityV1(after, originalPathAfter) ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs ||
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
    try {
      fs.closeSync(parent.fd);
    } catch {}
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

export function testOnlyReadTransferredControlChallengeV1(
  file,
  expectedSha256,
) {
  return readChallengeV1(file, expectedSha256);
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

function reviewedSigningBridgeSourceV1() {
  return `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  Wallet,
  getAddress,
  verifyTypedData,
} from "ethers";
import * as control from "./source/control-requalification-v1.mjs";

const BRIDGE_MARKER =
  "VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_REVIEWED_SIGNING_BRIDGE_V1";

function stable(value) {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + stable(value[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

function output(value, status = 0) {
  process.stdout.write(JSON.stringify(value) + "\\n");
  process.exitCode = status;
}

async function main() {
  const operation = process.argv[2] || "";
  const inputRelative = process.argv[3] || "";
  if (
    !["probe", "sign"].includes(operation) ||
    !inputRelative ||
    path.isAbsolute(inputRelative) ||
    inputRelative.split("/").some(
      (part) => !part || part === "." || part === ".."
    )
  ) {
    throw new Error("bridge_input_invalid");
  }
  const input = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), inputRelative), "utf8")
  );

  if (operation === "probe") {
    output({
      marker: BRIDGE_MARKER,
      version: 1,
      ok: true,
      operation,
      ethers_version:
        typeof (await import("ethers")).version === "string"
          ? (await import("ethers")).version
          : null,
      permission_fenced: true,
      ancestor_package_resolution_allowed: false,
    });
    return;
  }

  const envelope = input.challenge_envelope;
  const expectedAddress = String(input.expected_address || "").toLowerCase();
  if (
    !envelope ||
    typeof envelope !== "object" ||
    Array.isArray(envelope) ||
    !/^0x[0-9a-f]{40}$/.test(expectedAddress)
  ) {
    throw new Error("bridge_sign_input_invalid");
  }

  if (
    envelope.marker !==
      control.VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1 ||
    envelope.version !== 1 ||
    envelope.challenge?.marker !==
      control.VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1 ||
    envelope.challenge?.version !== 1 ||
    envelope.challenge?.role_id !==
      control.VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_ROLE_ID_V1 ||
    getAddress(String(envelope.challenge?.candidate_address)).toLowerCase() !==
      expectedAddress
  ) {
    throw new Error("bridge_challenge_identity_mismatch");
  }

  const canonicalTyped =
    control.voidWcVoidLaunchControllerControlTypedDataV1(
      envelope.challenge
    );
  if (stable(canonicalTyped) !== stable(envelope.typed_data)) {
    throw new Error("bridge_typed_data_mismatch");
  }
  const digest =
    control.voidWcVoidLaunchControllerControlDigestV1(
      envelope.challenge
    );
  if (digest !== envelope.typed_data_digest) {
    throw new Error("bridge_typed_data_digest_mismatch");
  }

  const expires = BigInt(String(envelope.challenge.expires_at_unix));
  const nowBeforeKey = BigInt(Math.floor(Date.now() / 1000));
  if (nowBeforeKey >= expires) {
    throw new Error("bridge_challenge_expired");
  }

  let privateKey = fs.readFileSync(0, "utf8");
  if (!/^(?:0x)?[0-9a-fA-F]{64}$/.test(privateKey)) {
    privateKey = "";
    throw new Error("bridge_private_key_invalid");
  }
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;

  let wallet;
  try {
    wallet = new Wallet(privateKey);
  } finally {
    privateKey = "";
  }
  if (wallet.address.toLowerCase() !== expectedAddress) {
    throw new Error("bridge_private_key_address_mismatch");
  }
  if (BigInt(Math.floor(Date.now() / 1000)) >= expires) {
    throw new Error("bridge_challenge_expired");
  }

  const signature = await wallet.signTypedData(
    canonicalTyped.domain,
    canonicalTyped.types,
    canonicalTyped.value
  );
  if (BigInt(Math.floor(Date.now() / 1000)) >= expires) {
    throw new Error("bridge_challenge_expired");
  }
  const recovered = verifyTypedData(
    canonicalTyped.domain,
    canonicalTyped.types,
    canonicalTyped.value,
    signature
  ).toLowerCase();
  if (recovered !== expectedAddress) {
    throw new Error("bridge_signature_recovery_mismatch");
  }

  const signatureEnvelope =
    control.buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1({
      challengeId: envelope.challenge_id,
      signature,
    });

  output({
    marker: BRIDGE_MARKER,
    version: 1,
    ok: true,
    operation,
    envelope: signatureEnvelope,
    permission_fenced: true,
    ancestor_package_resolution_allowed: false,
  });
}

main().catch(() => {
  output({
    marker: BRIDGE_MARKER,
    version: 1,
    ok: false,
    error: "reviewed_signing_bridge_failed",
  }, 2);
});
`;
}

function reviewedChildExecutionEnvV1() {
  return {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    HOME: "/nonexistent",
  };
}

function runPermissionFencedReviewedChildV1({
  profile,
  runtimeRoot,
  entryFile,
  args,
  stdinText = "",
  allowFailure = false,
}) {
  const verified = verifyMaterializedReviewedNodePackageRuntimeV1({
    profile,
    destinationRoot: runtimeRoot,
    repoRoot: ROOT,
  });
  if (
    verified.ok !== true ||
    verified.status !== "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED"
  ) {
    fail("offline_signer_reviewed_child_runtime_unverified");
  }
  const root = fs.realpathSync.native(runtimeRoot);
  const entry = fs.realpathSync.native(entryFile);
  const relative = path.relative(root, entry);
  const stat = fs.lstatSync(entry);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative) ||
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1
  ) {
    fail("offline_signer_reviewed_child_entry_invalid");
  }
  if (
    !Array.isArray(args) ||
    args.some((value) => typeof value !== "string")
  ) {
    fail("offline_signer_reviewed_child_args_invalid");
  }

  const result = spawnSync(
    NODE_V1,
    [
      "--permission",
      "--allow-fs-read=" + root,
      entry,
      ...args,
    ],
    {
      cwd: root,
      input: stdinText,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
      maxBuffer: 16 * 1024 * 1024,
      env: reviewedChildExecutionEnvV1(),
    },
  );
  if (result.error) {
    fail("offline_signer_reviewed_child_spawn_failed");
  }
  if (result.status !== 0 && !allowFailure) {
    fail("offline_signer_reviewed_child_execution_failed");
  }
  return Object.freeze({
    ok: result.status === 0,
    status: result.status,
    stdout: String(result.stdout || ""),
    permission_fenced: true,
    allowed_fs_read_root: root,
    ancestor_package_resolution_allowed: false,
    ambient_node_resolution_overrides_ignored: true,
    ambient_dynamic_loader_overrides_ignored: true,
    profile_id: profile.profile_id,
    packages_aggregate_sha256: profile.packages_aggregate_sha256,
  });
}

function parseReviewedBridgeOutputV1(execution, operation) {
  const text = String(execution.stdout || "").trim();
  if (text.length < 2 || text.length > 2 * 1024 * 1024) {
    fail("offline_signer_reviewed_child_output_invalid");
  }
  const lines = text.split(/\r?\n/u);
  if (lines.length !== 1) {
    fail("offline_signer_reviewed_child_output_multiline");
  }
  let value;
  try {
    value = JSON.parse(lines[0]);
  } catch {
    fail("offline_signer_reviewed_child_output_json_invalid");
  }
  if (
    value?.marker !==
      "VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_REVIEWED_SIGNING_BRIDGE_V1" ||
    value?.version !== 1 ||
    value?.operation !== operation ||
    value?.ok !== true ||
    value?.permission_fenced !== true ||
    value?.ancestor_package_resolution_allowed !== false
  ) {
    fail("offline_signer_reviewed_child_output_mismatch");
  }
  return value;
}

async function withReviewedSigningRuntimeV1(controlBlobSha1, fn) {
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

    const controlBytes = gitBlobBytesV1(
      controlBlobSha1,
      "offline_signer_control_contract",
    );
    const sourceRoot = path.join(runtimeRoot, "source");
    const controlPath = path.join(
      sourceRoot,
      "control-requalification-v1.mjs",
    );
    writePrivateRuntimeFileV1(controlPath, controlBytes, 0o400);

    const bridgePath = path.join(runtimeRoot, "signing-bridge.mjs");
    writePrivateRuntimeFileV1(
      bridgePath,
      Buffer.from(reviewedSigningBridgeSourceV1(), "utf8"),
      0o400,
    );

    const inputRoot = path.join(runtimeRoot, "inputs");
    fs.mkdirSync(inputRoot, { mode: 0o700 });

    const run = (operation, payload, stdinText = "") => {
      const inputPath = path.join(
        inputRoot,
        operation + "-" + crypto.randomBytes(8).toString("hex") + ".json",
      );
      const inputBytes = Buffer.from(
        JSON.stringify(payload, null, 2) + "\n",
        "utf8",
      );
      if (inputBytes.length > 2 * 1024 * 1024) {
        fail("offline_signer_reviewed_child_input_too_large");
      }
      writePrivateRuntimeFileV1(inputPath, inputBytes, 0o400);
      const execution = runPermissionFencedReviewedChildV1({
        profile,
        runtimeRoot,
        entryFile: bridgePath,
        args: [operation, path.relative(runtimeRoot, inputPath)],
        stdinText,
        allowFailure: true,
      });
      if (!execution.ok) {
        fail("offline_signer_reviewed_child_execution_failed");
      }
      return parseReviewedBridgeOutputV1(execution, operation);
    };

    return await fn(Object.freeze({
      profile,
      run,
      permission_fenced: true,
      ancestor_package_resolution_allowed: false,
      ambient_node_resolution_overrides_ignored: true,
      ambient_dynamic_loader_overrides_ignored: true,
    }));
  } finally {
    makeRemovableTreeV1(parent);
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

function validateCurrentSourceBindingV1(
  bindingValue,
  challenge,
) {
  const binding = exactDataObject(
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
    binding.coupled_launch_id !== COUPLED_LAUNCH_ID_V1 ||
    binding.coupled_launch_id_bytes32 !== COUPLED_LAUNCH_BYTES32_V1 ||
    binding.compiled_identity_id !== COMPILED_IDENTITY_ID_V1 ||
    binding.void_token !== VOID_TOKEN_V1 ||
    typeof binding.source_binding_sha256 !== "string" ||
    !SHA64.test(binding.source_binding_sha256)
  ) {
    fail("control_source_binding_invalid");
  }
  const blobs = exactDataObject(
    binding.source_blobs,
    Object.keys(EXPECTED_SOURCE_BLOBS_V1),
    "control_source_binding_blobs",
  );
  for (const [relativePath, expectedBlob] of
    Object.entries(EXPECTED_SOURCE_BLOBS_V1)) {
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
      binding.source_binding_sha256 ||
    challenge.source_binding_sha256 !==
      "0x" + binding.source_binding_sha256
  ) {
    fail("control_source_binding_digest_mismatch");
  }

  requireCleanRepositoryV1();
  const currentHead = gitReadV1(
    ["rev-parse", "HEAD"],
    "control_current_head_unavailable",
  );
  if (!HEX40.test(currentHead)) {
    fail("control_current_head_invalid");
  }
  if (currentHead !== binding.source_head_sha) {
    fail("offline_signer_current_head_not_exact_challenge_head");
  }

  const reviewedTree = gitReadV1(
    ["rev-parse", binding.source_head_sha + "^{tree}"],
    "control_reviewed_source_tree_unavailable",
  );
  if (reviewedTree !== binding.source_tree_sha) {
    fail("control_reviewed_source_tree_mismatch");
  }

  for (const [relativePath, expectedBlob] of
    Object.entries(EXPECTED_SOURCE_BLOBS_V1)) {
    const reviewedBlob = gitReadV1(
      ["rev-parse", binding.source_head_sha + ":" + relativePath],
      "control_reviewed_source_blob_unavailable",
    );
    const currentBlob = gitReadV1(
      ["rev-parse", "HEAD:" + relativePath],
      "control_current_source_blob_unavailable",
    );
    if (
      reviewedBlob !== expectedBlob ||
      reviewedBlob !== blobs[relativePath] ||
      currentBlob !== expectedBlob
    ) {
      fail("control_source_blob_drift:" + relativePath);
    }
  }

  const reviewedControlBlob = gitReadV1(
    ["rev-parse", binding.source_head_sha + ":" + CONTROL_REL_V1],
    "control_reviewed_contract_source_blob_unavailable",
  );
  const currentControlBlob = gitReadV1(
    ["rev-parse", "HEAD:" + CONTROL_REL_V1],
    "control_current_contract_source_blob_unavailable",
  );
  if (
    reviewedControlBlob !== binding.control_contract_git_blob_sha1 ||
    currentControlBlob !== binding.control_contract_git_blob_sha1
  ) {
    fail("control_contract_source_blob_drift");
  }
  return Object.freeze({
    source_binding_sha256: binding.source_binding_sha256,
    source_head_sha: binding.source_head_sha,
    current_head_sha: currentHead,
    current_source_binding_verified: true,
  });
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

  const sourceBinding = validateCurrentSourceBindingV1(
    envelope.source_binding,
    challenge,
  );

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
    source_binding_sha256: sourceBinding.source_binding_sha256,
    current_source_binding_verified:
      sourceBinding.current_source_binding_verified,
  });
}

async function signValidatedControlChallengeV1({
  reviewed,
  privateKey,
  ethers,
  nowUnix = null,
}) {
  const liveNow = () =>
    nowUnix === null
      ? BigInt(Math.floor(Date.now() / 1000))
      : decimal(nowUnix, "control_now_invalid");

  if (liveNow() >= BigInt(reviewed.expires_at_unix)) {
    fail("control_challenge_expired");
  }

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

  if (liveNow() >= BigInt(reviewed.expires_at_unix)) {
    fail("control_challenge_expired");
  }

  const signature = await wallet.signTypedData(
    reviewed.typed_data.domain,
    reviewed.typed_data.types,
    reviewed.typed_data.value,
  );
  if (liveNow() >= BigInt(reviewed.expires_at_unix)) {
    fail("control_challenge_expired");
  }
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

  return await signValidatedControlChallengeV1({
    reviewed,
    privateKey,
    ethers,
    nowUnix,
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
} = {}) {
  validateSanitizedOfflineSignerEnvironmentV1();
  const challenge = readChallengeV1(challengePath, challengeSha256);

  return await withReviewedEthersV1(async ({ ethers, profile }) => {
    const signingNowUnix = Math.floor(Date.now() / 1000);
    const reviewed = validateChallengeForSigningV1({
      challengeEnvelope: challenge.value,
      expectedAddress: SELECTED_REVIEWER_ADDRESS_V1,
      nowUnix: signingNowUnix,
      ethers,
    });
    if (
      BigInt(Math.floor(Date.now() / 1000)) >=
      BigInt(reviewed.expires_at_unix)
    ) {
      fail("control_challenge_expired");
    }

    let privateKey = readPrivateKeyV1(KEY_PATH_V1);
    let envelope;
    try {
      envelope = await signValidatedControlChallengeV1({
        reviewed,
        privateKey,
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
      exact_challenge_source_head_required: true,
      current_source_binding_verified: true,
      sanitized_environment_required: true,
      private_key_access: true,
      credential_access: true,
      wallet_or_signer_access: true,
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
