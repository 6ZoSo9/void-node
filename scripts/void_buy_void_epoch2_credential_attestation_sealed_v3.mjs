#!/usr/bin/env node
// Builtin-only live credential capability probe V3 with retained runtime-source custody.
// Source identity uses the reviewed Git object on stdin.
// This file is not privileged first-entry authority; #3177 remains required.
// No repository module, node_modules package, RPC client, or transaction codec is loaded.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V3";
const CONFIRM =
  "probeBuyVoidEpoch2InstalledCredentialSigningCapabilitySealedV3";
const SERVICE = "void-node-live.service";
const CREDENTIAL_ID = "buy-void-epoch2-fulfiller-v1";
const EXPECTED_ADDRESS = "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const SOURCE_BINDING_ID =
  "5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1";
const MAX_CREDENTIAL_BYTES = 256;
const MAX_FILE_BYTES = 2_000_000;
const MAX_DROPIN_BYTES = 64 * 1024;
const LOAD_CREDENTIAL_REDACTED = "[unprintable]";
const EPOCH2_CREDENTIAL_DROPIN_BASENAME =
  "97-buy-void-epoch2-fulfiller-credential-v1.conf";
const SHA40 = /^[0-9a-f]{40}$/u;
const HEX32 = /^[0-9a-f]{32}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const MASK64 = (1n << 64n) - 1n;
const EXPECTED_RUNTIME_HEAD =
  "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb";
const EXPECTED_RUNTIME_TREE =
  "de12c9d2d5e475d435d21da3b047d7b63b69e2b7";
const EXPECTED_RUNTIME_RELEASE =
  "/opt/void-node-live/releases/" + EXPECTED_RUNTIME_HEAD;
const PREDECESSOR_SEALED_PATH =
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const PREDECESSOR_SEALED_BLOB =
  "14cbe81e27d04fee77cbe75225ce308bf8561a7b";

const EPOCH2_SOURCE_TUPLE_BLOBS = Object.freeze({
  "src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts":
    "158cbf14fa2b566632c096a22e484b651cd44f6d",
  "src/economic/buy_void_epoch2_credential_source_binding_v1.ts":
    "4de9832a0f8e384e477177b55975e8557ec9147c",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
    "af2179651a88a74b158e7f3602fc5b3c30701f87",
  "src/economic/buy_void_payment_keyed_runtime_dependency_bootstrap_v1.ts":
    "1c72f07509521a4bc2a57a2865851f623a3955ad",
  "src/economic/buy_void_payment_keyed_dispatcher_guarded_broadcast_apply_v1.ts":
    "a0c64bee56d38af5e879524ea2ca75f5d2d707a6",
  "scripts/prove_buy_void_payment_keyed_full_runtime_v1.ts":
    "4159894a4188f02d8c40e80e515840e6cc11225d",
  "scripts/prove_buy_void_epoch2_runtime_credential_source_binding_v1.ts":
    "f0c7baeb7057a74f150c2e9e50634ca7948f92ae",
  "scripts/prove_buy_void_payment_keyed_epoch2_dormant_candidate_v1.ts":
    "0d9eb90c27031b9820a139be2af63c4c07433e20",
  "src/economic/buy_void_payment_keyed_transaction_preparation_v1.ts":
    "aa2f60c57c4cb8fed280d67397636ddd08a415cc",
  "src/economic/buy_void_payment_keyed_unsigned_transaction_v1.ts":
    "1e774ba0a26eecc1fb633faea8e8c27b4ebf806d",
  "src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.ts":
    "b20e6574abb56be8ae11d73974edda45e54a0b9a",
  "src/economic/buy_void_payment_keyed_custodian_signer_v1.ts":
    "2ff9274880db4c5e29dbc73acf363f75c6a2b33f",
  "src/economic/buy_void_payment_keyed_custodian_broadcast_v1.ts":
    "9e753c04f1127b440c28675199ae2c1f97a0f077",
  "src/economic/buy_void_payment_keyed_chain2050_broadcaster_v1.ts":
    "d184aef61760e4f0109b016d6f5331e93136048d",
  "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts":
    "2deaee8ae4e0fbd909b417eef96a76012174c668",
  "src/economic/buy_void_payment_keyed_chain2050_inspection_v1.ts":
    "b68a9e39cf5548f065042f590c58b341020cce7e",
  "src/economic/buy_void_payment_keyed_plan_reservation_v1.ts":
    "85ab70a1cee8c236dcab7bbb87cbf324bad49a40",
  "src/economic/buy_void_payment_keyed_preparation_custody_v1.ts":
    "3b06f5d87f1647003348c7459cb3797a3394d343",
  "src/economic/buy_void_epoch2_signer_control_v1.ts":
    "785fe80d74ae5f6840da22a19a337cd2bcee9944",
  "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts":
    "5fd9296d10d810b1976c159578f13cca5d1594fe",
  "scripts/prove_buy_void_epoch2_credential_signer_v1.ts":
    "19c991849243f3d751e3b924d551a9ece0ec0486",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts":
    "4e5d9a633b05d9254424c2132fc6620b94ff3692",
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json":
    "2c861c021192c034c98404989cd25b26788cd0f0",
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json":
    "1b605ebf698b69ef3a27eb2546df700878b53cf9",
  "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs":
    "db6a56b56eea4fe150ad1ebc98519bc263b70ee2",
  "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json":
    "ed853b88329cd3a708b22a025cec0fe48540168a",
  "ops/mainnet0/production-epoch2-rpc-target-v1.json":
    "5bc18bfdf27d982a6ded3b1e1ae2f26353a84189",
});
if (Object.keys(EPOCH2_SOURCE_TUPLE_BLOBS).length !== 27) {
  throw new Error("epoch2_sealed_source_tuple_cardinality_invalid");
}

const REVIEWED_BLOBS = Object.freeze({
  ...EPOCH2_SOURCE_TUPLE_BLOBS,
  "tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs":
    "834f17d99c0351c0f2b10fb024f3ee43afae8a42",
  "src/economic/buy_void_epoch2_credential_attestation_v1.ts":
    "66e18fd566825e2f2f71a673418209f6824b7c81",
});

const RUNTIME_AUTHORITY_BLOBS = Object.freeze({
  ...REVIEWED_BLOBS,
  [PREDECESSOR_SEALED_PATH]: PREDECESSOR_SEALED_BLOB,
});
const AUTHORITY_PATHS = Object.freeze(
  Object.keys(RUNTIME_AUTHORITY_BLOBS).sort(),
);

function safeReason(error) {
  const raw = String(error && error.message || "").trim();
  return /^[a-z0-9_:-]{1,160}$/u.test(raw)
    ? raw
    : "epoch2_sealed_attestation_failed";
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function sanitizedGitEnvironment() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
  };
}

function trustedExecutableAncestorCustody(resolved, leaf) {
  const root = path.parse(resolved).root;
  const parts = path.relative(root, path.dirname(resolved))
    .split(path.sep).filter(Boolean);
  let current = root;
  const inspectDirectory = (candidate) => {
    const st = fs.lstatSync(candidate, { bigint: true });
    const mode = st.mode & 0o7777n;
    if (!st.isDirectory() || st.isSymbolicLink() ||
        st.uid !== 0n || st.gid !== 0n || (mode & 0o022n) !== 0n) {
      throw new Error("epoch2_sealed_trusted_executable_ancestor_invalid:" + leaf);
    }
    requireRuntimeNonwritable(
      candidate,
      "epoch2_sealed_trusted_executable_ancestor_" + leaf,
    );
  };
  inspectDirectory(root);
  for (const part of parts) {
    current = path.join(current, part);
    inspectDirectory(current);
  }
}

function revalidateTrustedExecutable(tool) {
  trustedExecutableAncestorCustody(tool.real, tool.leaf);
  const retained = fs.fstatSync(tool.fd, { bigint: true });
  const visible = fs.lstatSync(tool.real, { bigint: true });
  const mode = visible.mode & 0o7777n;
  if (!visible.isFile() || visible.isSymbolicLink() ||
      visible.uid !== 0n || visible.gid !== 0n || visible.nlink !== 1n ||
      (mode & 0o022n) !== 0n || (mode & 0o111n) === 0n ||
      !statIdentitySame(tool.opened, retained) ||
      !statIdentitySame(retained, visible)) {
    throw new Error("epoch2_sealed_trusted_executable_generation_changed:" + tool.leaf);
  }
  requireRuntimeNonwritable(
    tool.real,
    "epoch2_sealed_trusted_executable_leaf_" + tool.leaf,
  );
}

function trustedExecutable(candidate, leaf) {
  const resolved = fs.realpathSync(candidate);
  if (path.basename(resolved) !== leaf &&
      path.basename(candidate) !== leaf) {
    throw new Error("epoch2_sealed_trusted_executable_leaf_invalid:" + leaf);
  }
  trustedExecutableAncestorCustody(resolved, leaf);
  const before = fs.lstatSync(resolved, { bigint: true });
  const mode = before.mode & 0o7777n;
  if (!before.isFile() || before.isSymbolicLink() ||
      before.uid !== 0n || before.gid !== 0n || before.nlink !== 1n ||
      (mode & 0o022n) !== 0n || (mode & 0o111n) === 0n) {
    throw new Error("epoch2_sealed_trusted_executable_invalid:" + leaf);
  }
  requireRuntimeNonwritable(
    resolved,
    "epoch2_sealed_trusted_executable_leaf_" + leaf,
  );
  const noFollow = fs.constants.O_NOFOLLOW;
  if (!Number.isInteger(noFollow) || noFollow === 0) {
    throw new Error("epoch2_sealed_trusted_executable_nofollow_unavailable");
  }
  const fd = fs.openSync(resolved, fs.constants.O_RDONLY | noFollow);
  let success = false;
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!statIdentitySame(before, opened)) {
      throw new Error("epoch2_sealed_trusted_executable_rebound:" + leaf);
    }
    const tool = { fd, real: resolved, leaf, opened };
    revalidateTrustedExecutable(tool);
    success = true;
    return tool;
  } finally {
    if (!success) fs.closeSync(fd);
  }
}

function execTrustedExecutable(tool, args, options = {}) {
  revalidateTrustedExecutable(tool);
  const executable = tool.real;
  let result;
  try {
    result = execFileSync(executable, args, {
      ...options,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } finally {
    revalidateTrustedExecutable(tool);
  }
  return result;
}

const GIT_TOOL = trustedExecutable("/usr/bin/git", "git");
const SYSTEMCTL_TOOL =
  trustedExecutable("/usr/bin/systemctl", "systemctl");

function git(root, args) {
  return execTrustedExecutable(GIT_TOOL, [
    "-C", root,
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    ...args,
  ], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 256 * 1024,
    env: sanitizedGitEnvironment(),
  }).trim();
}

function gitLocalBoolean(root, name) {
  try {
    const value = git(root, ["config", "--local", "--bool", "--get", name]);
    if (value === "true") return true;
    if (value === "false" || value === "") return false;
    throw new Error("epoch2_sealed_git_config_value_invalid");
  } catch (error) {
    if (Number(error && error.status) === 1) return false;
    throw error;
  }
}

function readPinnedRegularFile(absolute, maxBytes) {
  let fd = -1;
  let bytes = null;
  try {
    const before = fs.lstatSync(absolute, { bigint: true });
    if (before.isSymbolicLink() || !before.isFile() ||
        before.size < 1n || before.size > BigInt(maxBytes)) {
      throw new Error("epoch2_sealed_source_file_shape_invalid");
    }
    const noFollow = fs.constants.O_NOFOLLOW;
    if (!Number.isInteger(noFollow) || noFollow === 0) {
      throw new Error("epoch2_sealed_nofollow_unavailable");
    }
    fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow | fs.constants.O_NONBLOCK);
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!statIdentitySame(before, opened)) {
      throw new Error("epoch2_sealed_source_file_replaced");
    }
    bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const n = fs.readSync(fd, bytes, offset, bytes.length - offset, null);
      if (!Number.isSafeInteger(n) || n <= 0) {
        throw new Error("epoch2_sealed_source_file_read_invalid");
      }
      offset += n;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(absolute, { bigint: true });
    if (!statIdentitySame(opened, after) ||
        !statIdentitySame(opened, visible)) {
      throw new Error("epoch2_sealed_source_file_changed");
    }
    return Buffer.from(bytes);
  } finally {
    if (bytes !== null) bytes.fill(0);
    if (fd >= 0) fs.closeSync(fd);
  }
}

function statIdentitySame(left, right) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

function requireRuntimeNonwritable(candidate, label, accessFn=fs.accessSync) {
  try {
    accessFn(candidate, fs.constants.W_OK);
  } catch (error) {
    if (error && (error.code === "EACCES" || error.code === "EPERM")) return;
    throw new Error(label + "_runtime_write_audit_failed");
  }
  throw new Error(label + "_runtime_writable");
}

function requireReviewedDirectory(candidate, label) {
  const st = fs.lstatSync(candidate, { bigint: true });
  const mode = st.mode & 0o7777n;
  if (!st.isDirectory() || st.isSymbolicLink() ||
      st.uid !== 0n || st.gid !== 0n || (mode & 0o022n) !== 0n) {
    throw new Error(label + "_metadata_invalid");
  }
  requireRuntimeNonwritable(candidate, label);
  return st;
}

function requireReviewedLeaf(candidate, label) {
  const st = fs.lstatSync(candidate, { bigint: true });
  const mode = st.mode & 0o7777n;
  if (!st.isFile() || st.isSymbolicLink() ||
      st.uid !== 0n || st.gid !== 0n || st.nlink !== 1n ||
      st.size < 1n || st.size > BigInt(MAX_FILE_BYTES) ||
      (mode & 0o022n) !== 0n) {
    throw new Error(label + "_metadata_invalid");
  }
  requireRuntimeNonwritable(candidate, label);
  return st;
}

function openReviewedSourceCustody(root, expectedHead) {
  const normalized = path.resolve(root);
  let real;
  try { real = fs.realpathSync(normalized); }
  catch { throw new Error("epoch2_sealed_runtime_release_unavailable"); }
  if (real !== normalized || normalized !== EXPECTED_RUNTIME_RELEASE ||
      expectedHead !== EXPECTED_RUNTIME_HEAD) {
    throw new Error("epoch2_sealed_runtime_release_identity_invalid");
  }

  const directoryRecords = new Map();
  const leafRecords = new Map();
  const seenDirectories = new Set();

  function observeDirectory(candidate, label) {
    if (seenDirectories.has(candidate)) return;
    const st = requireReviewedDirectory(candidate, label);
    directoryRecords.set(candidate, st);
    seenDirectories.add(candidate);
  }

  observeDirectory(normalized, "epoch2_sealed_source_root");
  for (const relative of AUTHORITY_PATHS) {
    if (typeof relative !== "string" || relative.length < 1 ||
        relative.startsWith("/") || relative.includes("\\") ||
        path.posix.normalize(relative) !== relative ||
        relative.split("/").includes("..")) {
      throw new Error("epoch2_sealed_source_relative_path_invalid");
    }
    const parts = relative.split("/");
    let current = normalized;
    for (const component of parts.slice(0, -1)) {
      current = path.join(current, component);
      observeDirectory(current, "epoch2_sealed_source_directory");
    }
    const absolute = path.join(normalized, relative);
    const st = requireReviewedLeaf(
      absolute, "epoch2_sealed_source_leaf",
    );
    leafRecords.set(relative, Object.freeze({
      absolute,
      identity: st,
      expected_blob: RUNTIME_AUTHORITY_BLOBS[relative],
    }));
  }

  function revalidateMetadata() {
    for (const [absolute, expected] of directoryRecords) {
      const current = requireReviewedDirectory(
        absolute, "epoch2_sealed_source_directory_terminal",
      );
      if (!statIdentitySame(expected, current)) {
        throw new Error("epoch2_sealed_source_directory_generation_changed");
      }
    }
    for (const record of leafRecords.values()) {
      const current = requireReviewedLeaf(
        record.absolute, "epoch2_sealed_source_leaf_terminal",
      );
      if (!statIdentitySame(record.identity, current)) {
        throw new Error("epoch2_sealed_source_leaf_generation_changed");
      }
    }
  }

  revalidateMetadata();

  function collectBlobs(label) {
    revalidateMetadata();
    const observed = {};
    for (const [relative, record] of leafRecords) {
      const bytes = readPinnedRegularFile(record.absolute, MAX_FILE_BYTES);
      try {
        const blob = gitBlob(bytes);
        if (blob !== record.expected_blob) {
          throw new Error(label + "_blob_mismatch:" + relative);
        }
        observed[relative] = blob;
      } finally {
        bytes.fill(0);
      }
    }
    revalidateMetadata();
    for (const [relative, expectedBlob] of
      Object.entries(EPOCH2_SOURCE_TUPLE_BLOBS)) {
      if (observed[relative] !== expectedBlob) {
        throw new Error(label + "_source_tuple_drift");
      }
    }
    return Object.freeze(observed);
  }

  const initialBlobs = collectBlobs("epoch2_sealed_source_initial");
  const source = Object.freeze({
    head: EXPECTED_RUNTIME_HEAD,
    tree: EXPECTED_RUNTIME_TREE,
    branch: "main",
    blobs: initialBlobs,
  });

  const revalidate = () => {
    const current = collectBlobs("epoch2_sealed_source_terminal");
    if (JSON.stringify(current) !== JSON.stringify(initialBlobs)) {
      throw new Error("epoch2_sealed_source_census_changed");
    }
    return true;
  };

  return Object.freeze({ source, revalidate });
}

function parseSystemdShowProperties(show) {
  const props = new Map();
  for (const line of String(show).split(/\r?\n/u)) {
    if (!line) continue;
    const at = line.indexOf("=");
    if (at <= 0) throw new Error("epoch2_sealed_systemd_show_line_invalid");
    const key = line.slice(0, at);
    if (props.has(key)) {
      throw new Error("epoch2_sealed_systemd_show_duplicate_property");
    }
    props.set(key, line.slice(at + 1));
  }
  return props;
}

function redactedLoadCredentialBindingFromShow(
  show,
  uid = process.getuid(),
) {
  if (!Number.isSafeInteger(uid) || uid < 0) {
    throw new Error("epoch2_sealed_redacted_loadcredential_uid_invalid");
  }
  const props = parseSystemdShowProperties(show);
  if (props.get("LoadCredential") !== LOAD_CREDENTIAL_REDACTED) {
    throw new Error("epoch2_sealed_redacted_loadcredential_marker_invalid");
  }
  const dropIns = String(props.get("DropInPaths") || "")
    .split(/\s+/u).filter(Boolean);
  const matches = dropIns.filter(
    (candidate) =>
      path.basename(candidate) === EPOCH2_CREDENTIAL_DROPIN_BASENAME,
  );
  if (matches.length !== 1) {
    throw new Error("epoch2_sealed_redacted_dropin_cardinality_invalid");
  }
  const dropInPath = matches[0];
  if (!path.isAbsolute(dropInPath) ||
      path.normalize(dropInPath) !== dropInPath) {
    throw new Error("epoch2_sealed_redacted_dropin_path_invalid");
  }

  const namespaceRoot = path.parse(dropInPath).root;
  const parentParts = path.relative(
    namespaceRoot,
    path.dirname(dropInPath),
  ).split(path.sep).filter(Boolean);
  let currentParent = namespaceRoot;
  for (const part of parentParts) {
    currentParent = path.join(currentParent, part);
    const stat = fs.lstatSync(currentParent, { bigint: true });
    const parentMode = stat.mode & 0o7777n;
    const stickyProtected =
      stat.uid === 0n && (parentMode & 0o1000n) !== 0n;
    if (stat.isSymbolicLink() || !stat.isDirectory() ||
        (stat.uid !== 0n && stat.uid !== BigInt(uid)) ||
        ((parentMode & 0o022n) !== 0n && !stickyProtected)) {
      throw new Error("epoch2_sealed_redacted_dropin_namespace_untrusted");
    }
  }

  const before = fs.lstatSync(dropInPath, { bigint: true });
  const mode = before.mode & 0o777n;
  if (before.isSymbolicLink() || !before.isFile() ||
      before.uid !== BigInt(uid) || before.nlink !== 1n ||
      before.size < 1n || before.size > BigInt(MAX_DROPIN_BYTES) ||
      (mode & 0o077n) !== 0n) {
    throw new Error("epoch2_sealed_redacted_dropin_policy_invalid");
  }
  const bytes = readPinnedRegularFile(dropInPath, MAX_DROPIN_BYTES);
  let text = "";
  try {
    text = bytes.toString("utf8");
  } finally {
    bytes.fill(0);
  }
  const after = fs.lstatSync(dropInPath, { bigint: true });
  if (!statIdentitySame(before, after)) {
    throw new Error("epoch2_sealed_redacted_dropin_changed");
  }
  const lines = text.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) =>
      line.length > 0 && !line.startsWith("#") && !line.startsWith(";")
    );
  if (lines.length !== 2 || lines[0] !== "[Service]" ||
      !lines[1].startsWith("LoadCredential=" + CREDENTIAL_ID + ":")) {
    throw new Error("epoch2_sealed_redacted_dropin_semantics_invalid");
  }
  const binding = lines[1].slice("LoadCredential=".length);
  const sourcePath = binding.slice((CREDENTIAL_ID + ":").length);
  if (!path.isAbsolute(sourcePath) ||
      path.normalize(sourcePath) !== sourcePath) {
    throw new Error("epoch2_sealed_redacted_source_path_invalid");
  }
  return binding;
}

function parseSystemdObservation(
  show,
  environ,
  cgroup,
  uid = process.getuid(),
  redactedBinding = null,
) {
  const props = parseSystemdShowProperties(show);
  if (props.get("ActiveState") !== "active" ||
      props.get("SubState") !== "running") {
    throw new Error("epoch2_sealed_service_not_active_running");
  }
  const pid = Number(props.get("MainPID"));
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error("epoch2_sealed_service_main_pid_invalid");
  }
  if (!Number.isSafeInteger(uid) || uid < 0 ||
      !serviceCgroupBound(cgroup, uid)) {
    throw new Error("epoch2_sealed_service_main_pid_cgroup_mismatch");
  }
  const invocation = String(props.get("InvocationID") || "").toLowerCase();
  if (!HEX32.test(invocation)) {
    throw new Error("epoch2_sealed_service_invocation_invalid");
  }
  const loads = String(props.get("LoadCredential") || "")
    .split(/\s+/u).filter(Boolean);
  const prefix = CREDENTIAL_ID + ":";
  const matches = loads.filter((row) => row.startsWith(prefix));
  let loadCredentialBinding = null;
  if (matches.length === 1) {
    loadCredentialBinding = matches[0];
  } else if (
    matches.length === 0 &&
    loads.length === 1 &&
    loads[0] === LOAD_CREDENTIAL_REDACTED &&
    typeof redactedBinding === "string" &&
    redactedBinding.startsWith(prefix)
  ) {
    loadCredentialBinding = redactedBinding;
  } else {
    throw new Error("epoch2_sealed_loadcredential_cardinality_invalid");
  }
  const sourcePath = loadCredentialBinding.slice(prefix.length);
  if (!path.isAbsolute(sourcePath) || path.normalize(sourcePath) !== sourcePath) {
    throw new Error("epoch2_sealed_loadcredential_source_invalid");
  }

  if (!Buffer.isBuffer(environ) || environ.length < 1 ||
      environ.length > 1_048_576) {
    throw new Error("epoch2_sealed_process_environ_invalid");
  }
  const rows = environ.toString("utf8").split("\0").filter(Boolean);
  const exactEnv = (name) => {
    const prefixEnv = name + "=";
    const values = rows
      .filter((row) => row.startsWith(prefixEnv))
      .map((row) => row.slice(prefixEnv.length));
    if (values.length !== 1) {
      throw new Error("epoch2_sealed_process_env_cardinality:" + name);
    }
    return values[0];
  };
  const processInvocation = exactEnv("INVOCATION_ID").toLowerCase();
  if (processInvocation !== invocation) {
    throw new Error("epoch2_sealed_process_invocation_mismatch");
  }
  const credentialsDirectory = exactEnv("CREDENTIALS_DIRECTORY");
  if (!path.isAbsolute(credentialsDirectory) ||
      path.normalize(credentialsDirectory) !== credentialsDirectory ||
      !(
        /^\/run\/credentials\/void-node-live[.]service$/u
          .test(credentialsDirectory) ||
        /^\/run\/user\/[0-9]+\/credentials\/void-node-live[.]service$/u
          .test(credentialsDirectory)
      )) {
    throw new Error("epoch2_sealed_credentials_directory_invalid");
  }
  const processCommit = exactEnv("VOID_PROCESS_SOURCE_COMMIT").toLowerCase();
  const processTree = exactEnv("VOID_PROCESS_SOURCE_TREE").toLowerCase();
  const processBranch = exactEnv("VOID_PROCESS_SOURCE_BRANCH");
  if (!SHA40.test(processCommit) || !SHA40.test(processTree) ||
      processBranch !== "main") {
    throw new Error("epoch2_sealed_process_source_invalid");
  }
  return Object.freeze({
    service: SERVICE,
    main_pid: pid,
    invocation_id: invocation,
    credential_id: CREDENTIAL_ID,
    credentials_directory: credentialsDirectory,
    loadcredential_binding_sha256:
      sha256Bytes(Buffer.from(loadCredentialBinding, "utf8")),
    credentials_directory_sha256:
      sha256Bytes(Buffer.from(credentialsDirectory, "utf8")),
    main_pid_cgroup_sha256:
      sha256Bytes(Buffer.from(String(cgroup), "utf8")),
    process_invocation_id: processInvocation,
    process_source_commit: processCommit,
    process_source_tree: processTree,
    process_source_branch: processBranch,
  });
}

function serviceCgroupBound(cgroup, uid) {
  if (typeof cgroup !== "string" || cgroup.length < 1 ||
      cgroup.length > 1_048_576 ||
      !Number.isSafeInteger(uid) || uid < 0) {
    return false;
  }
  const userPrefix =
    "/user.slice/user-" + String(uid) + ".slice/user@" +
    String(uid) + ".service/";
  return cgroup.split("\n").some((line) => {
    const first = line.indexOf(":");
    const second = first < 0 ? -1 : line.indexOf(":", first + 1);
    const cgroupPath = second < 0 ? "" : line.slice(second + 1);
    if (!cgroupPath.startsWith(userPrefix)) return false;
    return cgroupPath.endsWith("/" + SERVICE) ||
      cgroupPath.includes("/" + SERVICE + "/");
  });
}

function canonicalUserBusPaths(uid) {
  if (!Number.isSafeInteger(uid) || uid < 0) {
    throw new Error("epoch2_sealed_user_bus_uid_invalid");
  }
  const runtimeDirectory = "/run/user/" + String(uid);
  const busPath = runtimeDirectory + "/bus";
  return Object.freeze({
    runtime_directory: runtimeDirectory,
    bus_path: busPath,
    bus_address: "unix:path=" + busPath,
  });
}

function canonicalUserBusEnvironment() {
  if (process.platform !== "linux" ||
      typeof process.getuid !== "function") {
    throw new Error("epoch2_sealed_linux_required");
  }
  const uid = process.getuid();
  const paths = canonicalUserBusPaths(uid);
  let runtimeStat;
  let busStat;
  try {
    runtimeStat = fs.lstatSync(paths.runtime_directory, { bigint: true });
    busStat = fs.lstatSync(paths.bus_path, { bigint: true });
  } catch {
    throw new Error("epoch2_sealed_user_bus_unavailable");
  }
  const runtimeMode = runtimeStat.mode & 0o7777n;
  if (!runtimeStat.isDirectory() || runtimeStat.isSymbolicLink() ||
      runtimeStat.uid !== BigInt(uid) || (runtimeMode & 0o077n) !== 0n) {
    throw new Error("epoch2_sealed_user_runtime_directory_untrusted");
  }
  if (!busStat.isSocket() || busStat.isSymbolicLink() ||
      busStat.uid !== BigInt(uid)) {
    throw new Error("epoch2_sealed_user_bus_socket_untrusted");
  }
  return Object.freeze({
    uid,
    paths,
    bus_stat: busStat,
    env: Object.freeze({
      PATH: "/usr/bin:/bin",
      XDG_RUNTIME_DIR: paths.runtime_directory,
      DBUS_SESSION_BUS_ADDRESS: paths.bus_address,
    }),
  });
}

function observeLiveSystemd() {
  const userBus = canonicalUserBusEnvironment();
  const show = execTrustedExecutable(SYSTEMCTL_TOOL, [
    "--user", "show", SERVICE, "--no-pager",
    "-p", "ActiveState",
    "-p", "SubState",
    "-p", "MainPID",
    "-p", "InvocationID",
    "-p", "LoadCredential",
    "-p", "DropInPaths",
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
    maxBuffer: 128 * 1024,
    env: userBus.env,
  });
  let busAfter;
  try {
    busAfter = fs.lstatSync(userBus.paths.bus_path, { bigint: true });
  } catch {
    throw new Error("epoch2_sealed_user_bus_changed");
  }
  if (!statIdentitySame(userBus.bus_stat, busAfter)) {
    throw new Error("epoch2_sealed_user_bus_changed");
  }
  const match = show.match(/^MainPID=([0-9]+)$/mu);
  if (!match) throw new Error("epoch2_sealed_service_main_pid_missing");
  const pid = Number(match[1]);
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error("epoch2_sealed_service_main_pid_invalid");
  }
  const environ = fs.readFileSync("/proc/" + String(pid) + "/environ");
  const cgroup = fs.readFileSync(
    "/proc/" + String(pid) + "/cgroup",
    { encoding: "utf8" },
  );
  const redactedBinding =
    /^LoadCredential=\[unprintable\]$/mu.test(show)
      ? redactedLoadCredentialBindingFromShow(show, userBus.uid)
      : null;
  return parseSystemdObservation(
    show,
    environ,
    cgroup,
    userBus.uid,
    redactedBinding,
  );
}

function observationStable(before, after) {
  for (const key of Object.keys(before)) {
    if (before[key] !== after[key]) return false;
  }
  return Object.keys(before).length === Object.keys(after).length;
}

function openCredentialGeneration(directory, options = {}) {
  let dirFd = -1;
  let keyFd = -1;
  let scratch = null;
  let bytes = null;
  let success = false;
  let closed = false;
  const ancestors = [];
  let beforeDir = null;
  let beforeKey = null;
  let visiblePath = "";
  try {
    if (process.platform !== "linux" ||
        typeof process.getuid !== "function") {
      throw new Error("epoch2_sealed_linux_required");
    }
    const uid = BigInt(process.getuid());
    const noFollow = fs.constants.O_NOFOLLOW;
    const nonBlock = fs.constants.O_NONBLOCK;
    const directoryFlag = fs.constants.O_DIRECTORY;
    const beforeKeyOpen = options?.beforeKeyOpen;
    if (beforeKeyOpen !== undefined && typeof beforeKeyOpen !== "function") {
      throw new Error("epoch2_sealed_credential_test_hook_invalid");
    }
    if (!Number.isInteger(noFollow) || noFollow === 0 ||
        !Number.isInteger(nonBlock) || nonBlock === 0 ||
        !Number.isInteger(directoryFlag) || directoryFlag === 0 ||
        !fs.existsSync("/proc/self/fd")) {
      throw new Error("epoch2_sealed_fd_primitives_unavailable");
    }

    const root = path.parse(directory).root;
    const components = path.relative(root, directory)
      .split(path.sep).filter(Boolean);
    let current = root;
    const inspect = (name, isLeaf) => {
      const stat = fs.lstatSync(name, { bigint: true });
      const mode = stat.mode & 0o7777n;
      const stickyProtected =
        !isLeaf && stat.uid === 0n && (mode & 0o1000n) !== 0n;
      if (stat.isSymbolicLink() || !stat.isDirectory() ||
          (stat.uid !== 0n && stat.uid !== uid) ||
          ((mode & 0o022n) !== 0n && !stickyProtected)) {
        throw new Error("epoch2_sealed_credential_namespace_untrusted");
      }
      ancestors.push({ name, stat });
    };
    inspect(root, components.length === 0);
    for (let i = 0; i < components.length; i += 1) {
      current = path.join(current, components[i]);
      inspect(current, i === components.length - 1);
    }
    beforeDir = ancestors[ancestors.length - 1].stat;
    dirFd = fs.openSync(
      directory,
      fs.constants.O_RDONLY | directoryFlag | noFollow,
    );
    const openedDir = fs.fstatSync(dirFd, { bigint: true });
    if (!statIdentitySame(beforeDir, openedDir)) {
      throw new Error("epoch2_sealed_credential_directory_replaced");
    }

    visiblePath = path.join(directory, CREDENTIAL_ID);
    beforeKey = fs.lstatSync(visiblePath, { bigint: true });
    const mode = beforeKey.mode & 0o777n;
    if (beforeKey.isSymbolicLink() || !beforeKey.isFile() ||
        beforeKey.uid !== uid || beforeKey.nlink !== 1n ||
        beforeKey.size < 1n ||
        beforeKey.size > BigInt(MAX_CREDENTIAL_BYTES) ||
        (mode & 0o077n) !== 0n) {
      throw new Error("epoch2_sealed_credential_file_policy_invalid");
    }

    const pinned =
      "/proc/self/fd/" + String(dirFd) + "/" + CREDENTIAL_ID;
    if (beforeKeyOpen) {
      beforeKeyOpen({ directory, visiblePath, pinned });
    }
    keyFd = fs.openSync(
      pinned,
      fs.constants.O_RDONLY | noFollow | nonBlock,
    );
    const openedKey = fs.fstatSync(keyFd, { bigint: true });
    if (!openedKey.isFile() || openedKey.isSymbolicLink()) {
      throw new Error("epoch2_sealed_credential_file_open_type_invalid");
    }
    if (!statIdentitySame(beforeKey, openedKey)) {
      throw new Error("epoch2_sealed_credential_file_replaced");
    }

    scratch = Buffer.alloc(MAX_CREDENTIAL_BYTES + 1);
    let count = 0;
    while (count < scratch.length) {
      const n = fs.readSync(
        keyFd, scratch, count, scratch.length - count, null,
      );
      if (!Number.isSafeInteger(n) || n < 0) {
        throw new Error("epoch2_sealed_credential_read_invalid");
      }
      if (n === 0) break;
      count += n;
    }
    if (count !== Number(beforeKey.size) || count > MAX_CREDENTIAL_BYTES) {
      throw new Error("epoch2_sealed_credential_bytes_changed");
    }
    bytes = Buffer.from(scratch.subarray(0, count));

    const revalidate = () => {
      if (closed) {
        throw new Error("epoch2_sealed_credential_generation_closed");
      }
      let retainedKey;
      let visibleKey;
      let retainedDir;
      let visibleDir;
      try {
        retainedKey = fs.fstatSync(keyFd, { bigint: true });
        visibleKey = fs.lstatSync(visiblePath, { bigint: true });
        retainedDir = fs.fstatSync(dirFd, { bigint: true });
        visibleDir = fs.lstatSync(directory, { bigint: true });
      } catch {
        throw new Error(
          "epoch2_sealed_credential_generation_changed_after_read"
        );
      }
      if (!statIdentitySame(beforeKey, retainedKey) ||
          !statIdentitySame(beforeKey, visibleKey) ||
          !statIdentitySame(beforeDir, retainedDir) ||
          !statIdentitySame(beforeDir, visibleDir)) {
        throw new Error(
          "epoch2_sealed_credential_generation_changed_after_read"
        );
      }
      for (const ancestor of ancestors) {
        let visible;
        try {
          visible = fs.lstatSync(ancestor.name, { bigint: true });
        } catch {
          throw new Error(
            "epoch2_sealed_credential_parent_changed_after_read"
          );
        }
        if (!statIdentitySame(ancestor.stat, visible)) {
          throw new Error(
            "epoch2_sealed_credential_parent_changed_after_read"
          );
        }
      }
      return true;
    };

    const close = () => {
      if (closed) {
        throw new Error("epoch2_sealed_credential_generation_closed");
      }
      closed = true;
      if (bytes !== null) bytes.fill(0);
      let closeFailed = false;
      for (const fd of [keyFd, dirFd]) {
        if (fd >= 0) {
          try {
            fs.closeSync(fd);
          } catch {
            closeFailed = true;
          }
        }
      }
      keyFd = -1;
      dirFd = -1;
      if (closeFailed) {
        throw new Error("epoch2_sealed_credential_fd_close_uncertain");
      }
    };

    revalidate();
    success = true;
    return Object.freeze({ bytes, revalidate, close });
  } finally {
    if (scratch !== null) scratch.fill(0);
    if (!success) {
      if (bytes !== null) bytes.fill(0);
      for (const fd of [keyFd, dirFd]) {
        if (fd >= 0) {
          try { fs.closeSync(fd); } catch (_closeError) { void _closeError; }
        }
      }
    }
  }
}

function privateKeyFromCredential(bytes) {
  let start = 0;
  let end = bytes.length;
  const ws = (v) => v === 0x20 || v === 0x09 || v === 0x0a || v === 0x0d;
  while (start < end && ws(bytes[start])) start += 1;
  while (end > start && ws(bytes[end - 1])) end -= 1;
  if (end - start === 66 &&
      bytes[start] === 0x30 &&
      (bytes[start + 1] === 0x78 || bytes[start + 1] === 0x58)) {
    start += 2;
  }
  if (end - start !== 64) {
    throw new Error("epoch2_sealed_private_key_shape_invalid");
  }
  const out = Buffer.alloc(32);
  const hexValue = (v) => {
    if (v >= 0x30 && v <= 0x39) return v - 0x30;
    if (v >= 0x41 && v <= 0x46) return v - 0x41 + 10;
    if (v >= 0x61 && v <= 0x66) return v - 0x61 + 10;
    return -1;
  };
  for (let i = 0; i < 32; i += 1) {
    const hi = hexValue(bytes[start + i * 2]);
    const lo = hexValue(bytes[start + i * 2 + 1]);
    if (hi < 0 || lo < 0) {
      out.fill(0);
      throw new Error("epoch2_sealed_private_key_shape_invalid");
    }
    out[i] = (hi << 4) | lo;
  }
  return out;
}

function rotl64(value, shift) {
  const n = BigInt(shift % 64);
  if (n === 0n) return value & MASK64;
  return ((value << n) | (value >> (64n - n))) & MASK64;
}

const KECCAK_RC = Object.freeze([
  0x0000000000000001n, 0x0000000000008082n,
  0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n,
  0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn,
  0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n,
  0x0000000080000001n, 0x8000000080008008n,
]);
const KECCAK_ROT = Object.freeze([
  Object.freeze([0, 36, 3, 41, 18]),
  Object.freeze([1, 44, 10, 45, 2]),
  Object.freeze([62, 6, 43, 15, 61]),
  Object.freeze([28, 55, 25, 21, 56]),
  Object.freeze([27, 20, 39, 8, 14]),
]);

function keccakF1600(state) {
  for (const rc of KECCAK_RC) {
    const c = new Array(5);
    const d = new Array(5);
    for (let x = 0; x < 5; x += 1) {
      c[x] =
        state[x] ^ state[x + 5] ^ state[x + 10] ^
        state[x + 15] ^ state[x + 20];
    }
    for (let x = 0; x < 5; x += 1) {
      d[x] = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1);
    }
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        state[x + 5 * y] =
          (state[x + 5 * y] ^ d[x]) & MASK64;
      }
    }
    const b = new Array(25).fill(0n);
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const destinationX = y;
        const destinationY = (2 * x + 3 * y) % 5;
        b[destinationX + 5 * destinationY] =
          rotl64(state[x + 5 * y], KECCAK_ROT[x][y]);
      }
    }
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        state[x + 5 * y] =
          (b[x + 5 * y] ^
            ((~b[(x + 1) % 5 + 5 * y]) &
             b[(x + 2) % 5 + 5 * y])) & MASK64;
      }
    }
    state[0] = (state[0] ^ rc) & MASK64;
  }
}

function keccak256(bytes) {
  const rate = 136;
  const state = new Array(25).fill(0n);
  let offset = 0;
  while (offset + rate <= bytes.length) {
    const block = bytes.subarray(offset, offset + rate);
    absorbBlock(state, block);
    keccakF1600(state);
    offset += rate;
  }
  const finalBlock = Buffer.alloc(rate);
  bytes.copy(finalBlock, 0, offset);
  finalBlock[bytes.length - offset] ^= 0x01;
  finalBlock[rate - 1] ^= 0x80;
  absorbBlock(state, finalBlock);
  keccakF1600(state);
  const out = Buffer.alloc(32);
  for (let i = 0; i < 32; i += 1) {
    const lane = state[Math.floor(i / 8)];
    out[i] = Number((lane >> BigInt((i % 8) * 8)) & 0xffn);
  }
  return out;
}

function absorbBlock(state, block) {
  for (let laneIndex = 0; laneIndex < 17; laneIndex += 1) {
    let lane = 0n;
    for (let byteIndex = 0; byteIndex < 8; byteIndex += 1) {
      lane |=
        BigInt(block[laneIndex * 8 + byteIndex]) <<
        BigInt(byteIndex * 8);
    }
    state[laneIndex] = (state[laneIndex] ^ lane) & MASK64;
  }
}

function keyMaterial(privateKey) {
  const ecdh = crypto.createECDH("secp256k1");
  ecdh.setPrivateKey(privateKey);
  const publicKey = ecdh.getPublicKey(null, "uncompressed");
  if (publicKey.length !== 65 || publicKey[0] !== 4) {
    publicKey.fill(0);
    throw new Error("epoch2_sealed_public_key_invalid");
  }
  const digest = keccak256(publicKey.subarray(1));
  const address =
    "0x" + digest.subarray(12).toString("hex").toLowerCase();
  digest.fill(0);

  // RFC 5915 ECPrivateKey with named-curve secp256k1 (1.3.132.0.10).
  // This keeps the private scalar in zeroable Buffers and avoids JWK/base64
  // string materialization of credential bytes.
  const der = Buffer.concat([
    Buffer.from("302e0201010420", "hex"),
    privateKey,
    Buffer.from("a00706052b8104000a", "hex"),
  ]);
  let privateObject;
  try {
    privateObject = crypto.createPrivateKey({
      key: der,
      format: "der",
      type: "sec1",
    });
  } finally {
    der.fill(0);
  }
  const publicObject = crypto.createPublicKey(privateObject);
  const publicFingerprint = sha256Bytes(publicKey);
  const publicSpkiDer = publicObject.export({
    format: "der",
    type: "spki",
  });
  if (!Buffer.isBuffer(publicSpkiDer) ||
      publicSpkiDer.length < 32 || publicSpkiDer.length > 1024) {
    publicKey.fill(0);
    throw new Error("epoch2_sealed_public_spki_invalid");
  }
  const publicSpkiDerHex = publicSpkiDer.toString("hex");
  publicSpkiDer.fill(0);
  publicKey.fill(0);
  return {
    address,
    privateObject,
    publicObject,
    publicFingerprint,
    publicSpkiDerHex,
  };
}

function assertCryptoSelfTest() {
  const empty = keccak256(Buffer.alloc(0)).toString("hex");
  if (empty !==
      "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470") {
    throw new Error("epoch2_sealed_keccak_self_test_failed");
  }
  const one = Buffer.alloc(32);
  one[31] = 1;
  try {
    const material = keyMaterial(one);
    if (material.address !==
        "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf") {
      throw new Error("epoch2_sealed_address_self_test_failed");
    }
  } finally {
    one.fill(0);
  }
}

function buildChallenge(source, observation) {
  const random = crypto.randomBytes(32);
  try {
    const nonceHex = random.toString("hex");
    const text = [
      "VOID_BUY_VOID_EPOCH2_CREDENTIAL_CHALLENGE_SEALED_V3",
      source.head,
      source.tree,
      source.branch,
      observation.service,
      String(observation.main_pid),
      observation.invocation_id,
      observation.credential_id,
      observation.loadcredential_binding_sha256,
      observation.credentials_directory_sha256,
      observation.main_pid_cgroup_sha256,
      observation.process_source_commit,
      observation.process_source_tree,
      observation.process_source_branch,
      nonceHex,
    ].join("\0");
    const message = Buffer.from(text, "utf8");
    return {
      message,
      nonce_hex: nonceHex,
      challenge_sha256: sha256Bytes(message),
    };
  } finally {
    random.fill(0);
  }
}

function credentialFifoRaceSelfTest() {
  const fixture = fs.mkdtempSync(
    "/tmp/void-sealed-v3-credential-fifo-race-",
  );
  const leaf = path.join(fixture, CREDENTIAL_ID);
  let swapped = false;
  let held = false;
  try {
    fs.writeFileSync(leaf, Buffer.from([0x31]), { mode: 0o600 });
    try {
      openCredentialGeneration(fixture, {
        beforeKeyOpen: () => {
          fs.unlinkSync(leaf);
          execFileSync("mkfifo", [leaf], {
            env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" },
            stdio: ["ignore", "ignore", "pipe"],
            timeout: 5_000,
          });
          fs.chmodSync(leaf, 0o600);
          swapped = true;
        },
      });
    } catch (error) {
      held =
        swapped &&
        String(error?.message || "") ===
          "epoch2_sealed_credential_file_open_type_invalid";
    }
  } finally {
    try {
      fs.rmSync(fixture, { recursive: true, force: true });
    } catch (cleanupError) {
      void cleanupError;
    }
  }
  if (!held) {
    throw new Error("epoch2_sealed_credential_fifo_race_adversary_failed");
  }
}

function trustedExecutableSelfTest() {
  credentialFifoRaceSelfTest();
  const gitVersion = execTrustedExecutable(GIT_TOOL, ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 64 * 1024,
    env: sanitizedGitEnvironment(),
  });
  if (!String(gitVersion).startsWith("git version ")) {
    throw new Error("epoch2_sealed_retained_git_self_test_failed");
  }
  const systemctlVersion = execTrustedExecutable(SYSTEMCTL_TOOL, ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 64 * 1024,
    env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" },
  });
  if (!String(systemctlVersion).startsWith("systemd ")) {
    throw new Error("epoch2_sealed_retained_systemctl_self_test_failed");
  }
  let reboundHeld = false;
  try {
    revalidateTrustedExecutable({
      ...GIT_TOOL,
      real: SYSTEMCTL_TOOL.real,
    });
  } catch (error) {
    reboundHeld =
      String(error?.message || "").includes("trusted_executable_generation_changed");
  }
  if (!reboundHeld) {
    throw new Error("epoch2_sealed_trusted_executable_rebind_adversary_failed");
  }
  let writableAncestorHeld = false;
  const fixture = "/tmp/void-sealed-v3-trusted-executable-self-test";
  try {
    fs.writeFileSync(fixture, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    trustedExecutable(fixture, path.basename(fixture));
  } catch {
    writableAncestorHeld = true;
  } finally {
    try { fs.unlinkSync(fixture); } catch (cleanupError) { void cleanupError; }
  }
  if (!writableAncestorHeld) {
    throw new Error("epoch2_sealed_writable_ancestor_adversary_failed");
  }
  console.log(MARKER + "_SELF_TEST_GREEN");
  console.log("trusted_git_retained_generation_revalidated_path_execution=true");
  console.log("trusted_systemctl_retained_generation_revalidated_path_execution=true");
  console.log("trusted_executable_path_rebind_rejected=true");
  console.log("trusted_executable_writable_ancestor_rejected=true");
  console.log("credential_regular_to_fifo_race_rejected=true");
  console.log("credential_open_nonblocking_required=true");
  console.log("credential_content_read=false");
  console.log("signing_performed=false");
  console.log("transaction_constructed=false");
  console.log("funds_movement=false");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 1 && argv[0] === "--self-test") {
    trustedExecutableSelfTest();
    return;
  }
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(
      "Source-only V3 invocation uses one pinned current-source Git object on stdin " +
      "with --expected-head <40-hex-sha>. Live authority additionally requires " +
      "the protected privileged first-entry tracked in #3177.",
    );
    return;
  }
  if (process.argv[1] !== "-") {
    throw new Error("epoch2_sealed_git_object_stdin_required");
  }
  const probe = argv.includes("--probe");
  const confirmAt = argv.indexOf("--confirm");
  const confirmation =
    confirmAt >= 0 && confirmAt + 1 < argv.length
      ? argv[confirmAt + 1]
      : "";
  const expectedHeadAt = argv.indexOf("--expected-head");
  const expectedHead =
    expectedHeadAt >= 0 && expectedHeadAt + 1 < argv.length
      ? String(argv[expectedHeadAt + 1]).toLowerCase()
      : "";
  const sourceBlobAt = argv.indexOf("--sealed-source-blob");
  const sealedSourceBlob =
    sourceBlobAt >= 0 && sourceBlobAt + 1 < argv.length
      ? String(argv[sourceBlobAt + 1]).toLowerCase()
      : "";
  const allowed = new Set([
    "--probe", "--confirm", "--expected-head", "--sealed-source-blob",
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--confirm" || argv[i] === "--expected-head" ||
        argv[i] === "--sealed-source-blob") {
      i += 1;
      continue;
    }
    if (!allowed.has(argv[i])) {
      throw new Error("epoch2_sealed_unknown_argument");
    }
  }
  if (!probe) {
    console.log(JSON.stringify({
      marker: MARKER,
      status: "disabled",
      reason: "epoch2_sealed_probe_not_requested",
      systemd_observation_performed: false,
      credential_content_read: false,
      signing_performed: false,
      transaction_constructed: false,
      rpc_call_performed: false,
      transaction_broadcast_performed: false,
      filesystem_write_performed: false,
      funds_movement: false,
    }, null, 2));
    return;
  }
  if (confirmation !== CONFIRM) {
    throw new Error("epoch2_sealed_confirmation_mismatch");
  }
  if (!SHA40.test(expectedHead)) {
    throw new Error("epoch2_sealed_expected_head_invalid");
  }
  if (!SHA40.test(sealedSourceBlob)) {
    throw new Error("epoch2_sealed_source_blob_invalid");
  }
  if (expectedHead !== EXPECTED_RUNTIME_HEAD) {
    throw new Error("epoch2_sealed_runtime_head_mismatch");
  }
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("epoch2_sealed_linux_x64_required");
  }

  if (process.execArgv.length !== 1 ||
      process.execArgv[0] !== "--input-type=module" ||
      String(process.env.NODE_OPTIONS || "") !== "" ||
      String(process.env.NODE_PATH || "") !== "" ||
      String(process.env.LD_PRELOAD || "") !== "" ||
      String(process.env.LD_LIBRARY_PATH || "") !== "" ||
      String(process.env.LD_AUDIT || "") !== "") {
    throw new Error("epoch2_sealed_node_execution_context_invalid");
  }
  assertCryptoSelfTest();
  const root = path.resolve(process.cwd());
  const sourceCustody = openReviewedSourceCustody(root, expectedHead);
  const source = sourceCustody.source;
  const trustedNode = trustedExecutable(
    process.execPath,
    path.basename(fs.realpathSync(process.execPath)),
  );
  try {
    if (fs.realpathSync(process.execPath) !== trustedNode.real) {
      throw new Error("epoch2_sealed_node_execution_context_invalid");
    }
    revalidateTrustedExecutable(trustedNode);
  } finally {
    fs.closeSync(trustedNode.fd);
  }
  const before = observeLiveSystemd();
  if (before.process_source_commit !== source.head ||
      before.process_source_tree !== source.tree ||
      before.process_source_branch !== source.branch) {
    throw new Error("epoch2_sealed_live_process_source_mismatch");
  }

  const credentialGeneration =
    openCredentialGeneration(before.credentials_directory);
  const credential = credentialGeneration.bytes;
  let privateKey = null;
  let signature = null;
  let challenge = null;
  let output = null;
  let operationError = null;
  try {
    privateKey = privateKeyFromCredential(credential);
    credential.fill(0);
    const material = keyMaterial(privateKey);
    if (material.address !== EXPECTED_ADDRESS) {
      throw new Error("epoch2_sealed_immutable_fulfiller_mismatch");
    }
    challenge = buildChallenge(source, before);
    signature = crypto.sign(
      "sha256",
      challenge.message,
      { key: material.privateObject, dsaEncoding: "ieee-p1363" },
    );
    if (signature.length !== 64 ||
        !crypto.verify(
          "sha256",
          challenge.message,
          { key: material.publicObject, dsaEncoding: "ieee-p1363" },
          signature,
        )) {
      throw new Error("epoch2_sealed_local_signature_verify_failed");
    }
    const after = observeLiveSystemd();
    if (!observationStable(before, after)) {
      throw new Error("epoch2_sealed_systemd_invocation_changed");
    }

    sourceCustody.revalidate();
    credentialGeneration.revalidate();
    sourceCustody.revalidate();
    const body = {
      marker: MARKER,
      version: 3,
      status: "EPOCH2_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_V3_GREEN",
      source_head: source.head,
      source_tree: source.tree,
      source_branch: source.branch,
      sealed_probe_git_blob: sealedSourceBlob,
      credential_source_binding_id: SOURCE_BINDING_ID,
      credential_id: CREDENTIAL_ID,
      immutable_fulfiller: EXPECTED_ADDRESS,
      systemd: {
        service: after.service,
        main_pid: after.main_pid,
        invocation_id: after.invocation_id,
        loadcredential_binding_sha256:
          after.loadcredential_binding_sha256,
        credentials_directory_sha256:
          after.credentials_directory_sha256,
        main_pid_cgroup_sha256:
          after.main_pid_cgroup_sha256,
        process_source_commit: after.process_source_commit,
        process_source_tree: after.process_source_tree,
        process_source_branch: after.process_source_branch,
        raw_loadcredential_source_path_output: false,
        raw_credentials_directory_output: false,
      },
      challenge: {
        domain:
          "VOID_BUY_VOID_EPOCH2_CREDENTIAL_CHALLENGE_SEALED_V3",
        nonce_hex: challenge.nonce_hex,
        challenge_sha256: challenge.challenge_sha256,
        signature_sha256: sha256Bytes(signature),
        public_signature_p1363_hex: signature.toString("hex"),
        public_key_spki_der_hex: material.publicSpkiDerHex,
        public_key_uncompressed_sha256: material.publicFingerprint,
        raw_challenge_output: false,
        public_signature_output: true,
        public_key_output: true,
        transaction_constructed: false,
      },
      credential_content_read: true,
      immutable_fulfiller_identity_proven: true,
      active_signing_capability_proven: true,
      runtime_source_acl_nonwritability_verified: true,
      runtime_source_bounded_descriptor_reads_per_census: true,
      runtime_source_acl_barrier_and_pre_post_census_stable: true,
      runtime_source_revalidated_after_final_observation: true,
      trusted_tool_ancestor_nonwritability_verified: true,
      trusted_tool_retained_generation_revalidated_path_execution: true,
      trusted_tool_generation_revalidated: true,
      runtime_source_revalidated_immediately_before_evidence: true,
      privileged_first_entry_authenticated: false,
      credential_generation_retained_through_signing: true,
      credential_generation_revalidated_after_final_observation: true,
      credential_generation_revalidated_immediately_before_close: true,
      raw_private_key_output: false,
      private_key_string_materialization: false,
      raw_signed_transaction_output: false,
      rpc_call_performed: false,
      transaction_constructed: false,
      root_owned_node_binary_verified: true,
      node_loader_environment_empty: true,
      native_loader_environment_empty: true,
      transaction_broadcast_performed: false,
      transaction_submission_performed: false,
      filesystem_write_performed: false,
      runtime_activation_authorized: false,
      public_payment_acceptance_authorized: false,
      presale_activation_authorized: false,
      funds_movement: false,
    };
    output = {
      ...body,
      evidence_id:
        "voide2sealed3_" +
        sha256Bytes(Buffer.from(JSON.stringify(body), "utf8")),
    };
  } catch (error) {
    operationError = error;
  } finally {
    if (operationError === null) {
      try {
        credentialGeneration.revalidate();
        sourceCustody.revalidate();
      } catch (closingRevalidationError) {
        operationError = closingRevalidationError;
      }
    }
    credential.fill(0);
    if (privateKey !== null) privateKey.fill(0);
    if (signature !== null) signature.fill(0);
    if (challenge !== null) challenge.message.fill(0);
    try {
      credentialGeneration.close();
    } catch (closeError) {
      if (operationError === null) operationError = closeError;
    }
  }
  if (operationError !== null) throw operationError;
  sourceCustody.revalidate();
  revalidateTrustedExecutable(GIT_TOOL);
  revalidateTrustedExecutable(SYSTEMCTL_TOOL);
  console.log(JSON.stringify(output, null, 2));
}

export {
  MARKER,
  CONFIRM,
  EXPECTED_ADDRESS,
  EPOCH2_SOURCE_TUPLE_BLOBS,
  REVIEWED_BLOBS,
  AUTHORITY_PATHS,
  keccak256,
  keyMaterial,
  privateKeyFromCredential,
  openCredentialGeneration,
  buildChallenge,
  openReviewedSourceCustody,
  requireRuntimeNonwritable,
  parseSystemdObservation,
  redactedLoadCredentialBindingFromShow,
  serviceCgroupBound,
  canonicalUserBusPaths,
};

const directFileExecution = process.argv[1] && process.argv[1] !== "-" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (process.argv[1] === "-" || directFileExecution) {
  main().catch((error) => {
    console.error(JSON.stringify({
      marker: MARKER + "_HOLD",
      status: "HOLD",
      reason: safeReason(error),
      raw_private_key_output: false,
      raw_signature_output: false,
      raw_signed_transaction_output: false,
      systemd_mutation_performed: false,
      rpc_call_performed: false,
      transaction_constructed: false,
      transaction_broadcast_performed: false,
      transaction_submission_performed: false,
      filesystem_write_performed: false,
      runtime_activation_authorized: false,
      public_payment_acceptance_authorized: false,
      presale_activation_authorized: false,
      funds_movement: false,
    }, null, 2));
    process.exitCode = 2;
  });
}
