#!/usr/bin/env node
// Builtin-only live credential capability probe.
// Live authority requires execution from the reviewed Git object on stdin.
// No repository module, node_modules package, RPC client, or transaction codec is loaded.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2";
const CONFIRM =
  "probeBuyVoidEpoch2AuthenticatedCredentialSigningCapabilitySealedV2";
const SERVICE = "void-node-live.service";
const CREDENTIAL_ID = "buy-void-epoch2-fulfiller-v1";
const EXPECTED_ADDRESS = "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const SOURCE_BINDING_ID =
  "5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1";
const MAX_CREDENTIAL_BYTES = 256;
const MAX_FILE_BYTES = 2_000_000;
const MAX_DROPIN_BYTES = 64 * 1024;
const EPOCH2_CREDENTIAL_DROPIN_BASENAME =
  "97-buy-void-epoch2-fulfiller-credential-v1.conf";
const SHA40 = /^[0-9a-f]{40}$/u;
const HEX32 = /^[0-9a-f]{32}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const MASK64 = (1n << 64n) - 1n;

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
  "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v1.py":
    "5dec0f9534c3b2d6c8d4a0647e69d3c89ab91cd6",
});

const SEALED_PATH =
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const QUALIFIER_PATH =
  "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v1.py";
const QUALIFIER_MARKER =
  "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1";
const CREDENTIAL_LOCK_ID =
  "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c";
const AUTHORITY_PATHS = Object.freeze([
  SEALED_PATH,
  ...Object.keys(REVIEWED_BLOBS),
]);

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

function trustedExecutable(candidate, leaf) {
  const resolved = fs.realpathSync(candidate);
  const stat = fs.lstatSync(resolved, { bigint: true });
  const mode = stat.mode & 0o7777n;
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0n ||
      (mode & 0o022n) !== 0n || path.basename(resolved) !== leaf) {
    throw new Error("epoch2_sealed_trusted_executable_invalid:" + leaf);
  }
  return resolved;
}

const GIT = trustedExecutable("/usr/bin/git", "git");
const PYTHON3 = trustedExecutable(
  "/usr/bin/python3",
  path.basename(fs.realpathSync("/usr/bin/python3")),
);

function git(root, args) {
  return execFileSync(GIT, [
    "-C", root,
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    ...args,
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
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
    fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
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

function assertReviewedSource(root) {
  const head = git(root, ["rev-parse", "--verify", "HEAD"]).toLowerCase();
  const tree = git(root, ["rev-parse", "--verify", "HEAD^{tree}"]).toLowerCase();
  const branch = git(root, ["symbolic-ref", "--short", "-q", "HEAD"]);
  const top = path.resolve(git(root, ["rev-parse", "--show-toplevel"]));
  if (top !== path.resolve(root) || !SHA40.test(head) || !SHA40.test(tree) ||
      branch !== "main") {
    throw new Error("epoch2_sealed_source_generation_invalid");
  }
  if (git(root, ["status", "--porcelain=v1", "--untracked-files=no"]) !== "") {
    throw new Error("epoch2_sealed_tracked_worktree_dirty");
  }
  if (gitLocalBoolean(root, "core.sparseCheckout")) {
    throw new Error("epoch2_sealed_sparse_checkout_forbidden");
  }

  const tagged = git(root, ["ls-files", "-v", "--", ...AUTHORITY_PATHS]);
  const tags = new Map();
  for (const line of tagged.split("\n").filter(Boolean)) {
    if (line.length < 3 || line[1] !== " ") {
      throw new Error("epoch2_sealed_index_output_invalid");
    }
    const relative = line.slice(2);
    if (tags.has(relative)) {
      throw new Error("epoch2_sealed_index_duplicate");
    }
    tags.set(relative, line[0]);
  }

  const observed = {};
  for (const relative of AUTHORITY_PATHS) {
    if (tags.get(relative) !== "H") {
      throw new Error("epoch2_sealed_index_flag_unsafe");
    }
    const headBlob =
      git(root, ["rev-parse", "--verify", "HEAD:" + relative]).toLowerCase();
    if (!SHA40.test(headBlob)) {
      throw new Error("epoch2_sealed_head_blob_invalid");
    }
    const bytes = readPinnedRegularFile(
      path.join(root, relative),
      MAX_FILE_BYTES,
    );
    try {
      const worktreeBlob = gitBlob(bytes);
      if (worktreeBlob !== headBlob) {
        throw new Error("epoch2_sealed_worktree_blob_mismatch");
      }
      if (Object.hasOwn(REVIEWED_BLOBS, relative) &&
          REVIEWED_BLOBS[relative] !== headBlob) {
        throw new Error("epoch2_sealed_reviewed_blob_mismatch");
      }
      observed[relative] = headBlob;
    } finally {
      bytes.fill(0);
    }
  }

  for (const [relative, expectedBlob] of
    Object.entries(EPOCH2_SOURCE_TUPLE_BLOBS)) {
    if (observed[relative] !== expectedBlob) {
      throw new Error("epoch2_sealed_source_tuple_drift");
    }
  }
  return Object.freeze({ head, tree, branch, blobs: Object.freeze(observed) });
}

function canonicalAbsolutePath(raw, code) {
  const value = String(raw || "");
  if (!path.isAbsolute(value) || path.normalize(value) !== value ||
      value.length < 2 || value.length >= 4096 || value.includes("\\0")) {
    throw new Error(code);
  }
  return value;
}

function qualifierEnvironment() {
  return Object.freeze({
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
  });
}

function parseQualifierOutput(text) {
  if (typeof text !== "string" || text.length < 2 ||
      text.length > 256 * 1024 || text.includes("\\0")) {
    throw new Error("epoch2_sealed_v2_qualifier_output_invalid");
  }
  const lines = text.split(/\\r?\\n/u).filter((line) => line.length > 0);
  if (lines.filter((line) => line === QUALIFIER_MARKER).length !== 1) {
    throw new Error("epoch2_sealed_v2_qualifier_marker_invalid");
  }
  const rows = lines.filter((line) => line.startsWith("result_json="));
  if (rows.length !== 1) {
    throw new Error("epoch2_sealed_v2_qualifier_result_cardinality_invalid");
  }
  const rawJson = rows[0].slice("result_json=".length);
  let result;
  try {
    result = JSON.parse(rawJson);
  } catch {
    throw new Error("epoch2_sealed_v2_qualifier_result_json_invalid");
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("epoch2_sealed_v2_qualifier_result_shape_invalid");
  }
  const required = Object.freeze({
    marker: QUALIFIER_MARKER,
    version: 1,
    read_only: true,
    root_execution_required: true,
    credential_lock_id: CREDENTIAL_LOCK_ID,
    credential_installed_pair_verified: true,
    credential_installed_generation_stable: true,
    credential_query_preexec_path_verified: true,
    double_credential_query_stable: true,
    credential_metadata_same_generation_as_v6_security: true,
    v6_security_qualification_composed: true,
    credential_contents_read: false,
    load_credential_count: 1,
    load_credential_id: CREDENTIAL_ID,
    query_execution: true,
    host_mutation: false,
    filesystem_write: false,
    service_mutation: false,
    systemd_mutation: false,
    external_network_calls: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    request_or_payment_contents_read: false,
    payment_acceptance: false,
    public_presale_activation: false,
    transaction: false,
    funds_movement: false,
    production_host_evidence_authority: false,
  });
  for (const [key, expected] of Object.entries(required)) {
    if (result[key] !== expected) {
      throw new Error("epoch2_sealed_v2_qualifier_field_invalid:" + key);
    }
  }
  for (const key of [
    "runtime_uid","manager_pid","main_pid","dropin_path_count",
    "dropin_paths_canonical_bytes",
  ]) {
    if (!Number.isSafeInteger(result[key]) || result[key] < 0) {
      throw new Error("epoch2_sealed_v2_qualifier_integer_invalid:" + key);
    }
  }
  for (const key of ["manager_start_ticks","service_start_ticks"]) {
    if (!/^[1-9][0-9]*$/u.test(String(result[key] || ""))) {
      throw new Error("epoch2_sealed_v2_qualifier_ticks_invalid:" + key);
    }
  }
  if (result.runtime_uid !== 1000 || result.main_pid <= 1 ||
      result.manager_pid <= 1 || result.dropin_path_count < 1 ||
      result.dropin_path_count > 32 ||
      result.dropin_paths_canonical_bytes > 16 * 1024) {
    throw new Error("epoch2_sealed_v2_qualifier_runtime_identity_invalid");
  }
  for (const key of [
    "fragment_path","credential_dropin_path","credential_source",
  ]) {
    canonicalAbsolutePath(
      result[key],
      "epoch2_sealed_v2_qualifier_path_invalid:" + key,
    );
  }
  if (path.basename(result.credential_dropin_path) !==
      EPOCH2_CREDENTIAL_DROPIN_BASENAME) {
    throw new Error("epoch2_sealed_v2_credential_dropin_basename_invalid");
  }
  if (!/^[0-9a-f]{16}$/u.test(String(result.v6_kernel_supported_capability_mask || "")) ||
      !/^[0-9a-f]{16}$/u.test(String(result.v6_capability_bounding_set || "")) ||
      !/^[0-9a-f]{16}$/u.test(String(result.v6_kernel_cap_bnd || "")) ||
      result.v6_capability_bounding_set !== result.v6_kernel_cap_bnd ||
      !Number.isSafeInteger(result.v6_kernel_cap_last_cap) ||
      result.v6_kernel_cap_last_cap < 0 ||
      result.v6_kernel_cap_last_cap > 63) {
    throw new Error("epoch2_sealed_v2_v6_security_projection_invalid");
  }
  return Object.freeze({
    result: Object.freeze({...result}),
    canonical_json: rawJson,
    receipt_sha256: sha256Bytes(Buffer.from(rawJson, "utf8")),
  });
}

function runAuthenticatedQualifier(root) {
  if (process.platform !== "linux" || typeof process.getuid !== "function" ||
      typeof process.geteuid !== "function" ||
      process.getuid() !== 0 || process.geteuid() !== 0) {
    throw new Error("epoch2_sealed_v2_root_required");
  }
  const qualifier = path.join(root, QUALIFIER_PATH);
  const expectedBlob = REVIEWED_BLOBS[QUALIFIER_PATH];
  const bytes = readPinnedRegularFile(qualifier, MAX_FILE_BYTES);
  try {
    if (gitBlob(bytes) !== expectedBlob) {
      throw new Error("epoch2_sealed_v2_qualifier_worktree_blob_mismatch");
    }
  } finally {
    bytes.fill(0);
  }
  const output = execFileSync(
    PYTHON3,
    ["-I", "-B", qualifier, "--run"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 60_000,
      maxBuffer: 256 * 1024,
      env: qualifierEnvironment(),
      cwd: root,
    },
  );
  return parseQualifierOutput(output);
}

function trustedConfigNamespace(absolute, runtimeUid, code) {
  const root = path.parse(absolute).root;
  const parts = path.relative(root, path.dirname(absolute))
    .split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    const st = fs.lstatSync(current, { bigint: true });
    const mode = st.mode & 0o7777n;
    const stickyProtected =
      st.uid === 0n && (mode & 0o1000n) !== 0n;
    if (st.isSymbolicLink() || !st.isDirectory() ||
        (st.uid !== 0n && st.uid !== BigInt(runtimeUid)) ||
        ((mode & 0o022n) !== 0n && !stickyProtected)) {
      throw new Error(code);
    }
  }
}

function readStableConfigText(
  absolute,
  runtimeUid,
  { privateToRuntime, namespaceCode, policyCode, changedCode },
) {
  canonicalAbsolutePath(absolute, policyCode);
  trustedConfigNamespace(absolute, runtimeUid, namespaceCode);
  const before = fs.lstatSync(absolute, { bigint: true });
  const mode = before.mode & 0o777n;
  const ownerOk = privateToRuntime
    ? before.uid === BigInt(runtimeUid)
    : (before.uid === 0n || before.uid === BigInt(runtimeUid));
  const modeOk = privateToRuntime
    ? (mode & 0o077n) === 0n
    : (mode & 0o022n) === 0n;
  if (before.isSymbolicLink() || !before.isFile() || !ownerOk ||
      before.nlink !== 1n || before.size < 1n ||
      before.size > BigInt(MAX_DROPIN_BYTES) || !modeOk) {
    throw new Error(policyCode);
  }
  const bytes = readPinnedRegularFile(absolute, MAX_DROPIN_BYTES);
  let text = "";
  try {
    text = bytes.toString("utf8");
  } finally {
    bytes.fill(0);
  }
  const after = fs.lstatSync(absolute, { bigint: true });
  if (!statIdentitySame(before, after)) throw new Error(changedCode);
  return text;
}

function rejectSystemdContinuation(text, code) {
  for (const line of String(text).split(/\\r?\\n/u)) {
    if (/\\\\[ \\t]*$/u.test(line)) throw new Error(code);
  }
}

function activeUnitLines(text) {
  return String(text).split(/\\r?\\n/u)
    .map((line) => line.trim())
    .filter((line) =>
      line.length > 0 && !line.startsWith("#") && !line.startsWith(";")
    );
}

function validateAuthenticatedCredentialFiles(receipt) {
  const r = receipt.result;
  const runtimeUid = r.runtime_uid;
  const fragmentText = readStableConfigText(
    r.fragment_path,
    runtimeUid,
    {
      privateToRuntime: false,
      namespaceCode: "epoch2_sealed_v2_fragment_namespace_untrusted",
      policyCode: "epoch2_sealed_v2_fragment_policy_invalid",
      changedCode: "epoch2_sealed_v2_fragment_changed",
    },
  );
  rejectSystemdContinuation(
    fragmentText,
    "epoch2_sealed_v2_fragment_line_continuation_forbidden",
  );
  const forbiddenCredentialDirective =
    /^(?:LoadCredential|LoadCredentialEncrypted|SetCredential|SetCredentialEncrypted|ImportCredential|ImportCredentialEx)\\s*=/u;
  if (activeUnitLines(fragmentText).some((line) =>
    forbiddenCredentialDirective.test(line))) {
    throw new Error("epoch2_sealed_v2_fragment_credential_directive_present");
  }

  const dropinText = readStableConfigText(
    r.credential_dropin_path,
    runtimeUid,
    {
      privateToRuntime: true,
      namespaceCode: "epoch2_sealed_v2_dropin_namespace_untrusted",
      policyCode: "epoch2_sealed_v2_dropin_policy_invalid",
      changedCode: "epoch2_sealed_v2_dropin_changed",
    },
  );
  rejectSystemdContinuation(
    dropinText,
    "epoch2_sealed_v2_dropin_line_continuation_forbidden",
  );
  const lines = activeUnitLines(dropinText);
  const expected =
    "LoadCredential=" + CREDENTIAL_ID + ":" + r.credential_source;
  if (lines.length !== 2 || lines[0] !== "[Service]" || lines[1] !== expected) {
    throw new Error("epoch2_sealed_v2_dropin_semantics_invalid");
  }
  return Object.freeze({
    fragment_path_sha256:
      sha256Bytes(Buffer.from(r.fragment_path, "utf8")),
    credential_dropin_path_sha256:
      sha256Bytes(Buffer.from(r.credential_dropin_path, "utf8")),
    loadcredential_binding_sha256:
      sha256Bytes(Buffer.from(
        CREDENTIAL_ID + ":" + r.credential_source,
        "utf8",
      )),
  });
}

function procStartTicks(pid) {
  const text = fs.readFileSync(
    "/proc/" + String(pid) + "/stat",
    { encoding: "utf8" },
  );
  const close = text.lastIndexOf(")");
  if (close <= 1 || close + 2 >= text.length) {
    throw new Error("epoch2_sealed_v2_proc_stat_invalid");
  }
  const rest = text.slice(close + 2).trim().split(/\\s+/u);
  const value = rest[19];
  if (!/^[1-9][0-9]*$/u.test(String(value || ""))) {
    throw new Error("epoch2_sealed_v2_proc_start_ticks_invalid");
  }
  return value;
}

function processObservation(receipt, fileEvidence) {
  const r = receipt.result;
  const pid = r.main_pid;
  if (procStartTicks(pid) !== r.service_start_ticks) {
    throw new Error("epoch2_sealed_v2_service_generation_changed_before_proc");
  }
  const environ = fs.readFileSync("/proc/" + String(pid) + "/environ");
  const cgroup = fs.readFileSync(
    "/proc/" + String(pid) + "/cgroup",
    { encoding: "utf8" },
  );
  if (procStartTicks(pid) !== r.service_start_ticks) {
    throw new Error("epoch2_sealed_v2_service_generation_changed_during_proc");
  }
  if (!serviceCgroupBound(cgroup, r.runtime_uid)) {
    throw new Error("epoch2_sealed_v2_service_cgroup_invalid");
  }
  if (!Buffer.isBuffer(environ) || environ.length < 1 ||
      environ.length > 1_048_576) {
    throw new Error("epoch2_sealed_v2_process_environ_invalid");
  }
  const rows = environ.toString("utf8").split("\\0").filter(Boolean);
  const exactEnv = (name) => {
    const prefix = name + "=";
    const values = rows
      .filter((row) => row.startsWith(prefix))
      .map((row) => row.slice(prefix.length));
    if (values.length !== 1) {
      throw new Error("epoch2_sealed_v2_process_env_cardinality:" + name);
    }
    return values[0];
  };
  const invocation = exactEnv("INVOCATION_ID").toLowerCase();
  if (!HEX32.test(invocation)) {
    throw new Error("epoch2_sealed_v2_process_invocation_invalid");
  }
  const credentialsDirectory = exactEnv("CREDENTIALS_DIRECTORY");
  if (!path.isAbsolute(credentialsDirectory) ||
      path.normalize(credentialsDirectory) !== credentialsDirectory ||
      !(
        /^\\/run\\/credentials\\/void-node-live[.]service$/u
          .test(credentialsDirectory) ||
        /^\\/run\\/user\\/[0-9]+\\/credentials\\/void-node-live[.]service$/u
          .test(credentialsDirectory)
      )) {
    throw new Error("epoch2_sealed_v2_credentials_directory_invalid");
  }
  const processCommit = exactEnv("VOID_PROCESS_SOURCE_COMMIT").toLowerCase();
  const processTree = exactEnv("VOID_PROCESS_SOURCE_TREE").toLowerCase();
  const processBranch = exactEnv("VOID_PROCESS_SOURCE_BRANCH");
  if (!SHA40.test(processCommit) || !SHA40.test(processTree) ||
      processBranch !== "main") {
    throw new Error("epoch2_sealed_v2_process_source_invalid");
  }

  return Object.freeze({
    service: SERVICE,
    runtime_uid: r.runtime_uid,
    manager_pid: r.manager_pid,
    manager_start_ticks: String(r.manager_start_ticks),
    main_pid: r.main_pid,
    service_start_ticks: String(r.service_start_ticks),
    invocation_id: invocation,
    credential_id: CREDENTIAL_ID,
    credentials_directory: credentialsDirectory,
    qualifier_receipt_sha256: receipt.receipt_sha256,
    loadcredential_binding_sha256: fileEvidence.loadcredential_binding_sha256,
    credentials_directory_sha256:
      sha256Bytes(Buffer.from(credentialsDirectory, "utf8")),
    main_pid_cgroup_sha256:
      sha256Bytes(Buffer.from(String(cgroup), "utf8")),
    fragment_path_sha256: fileEvidence.fragment_path_sha256,
    credential_dropin_path_sha256:
      fileEvidence.credential_dropin_path_sha256,
    process_source_commit: processCommit,
    process_source_tree: processTree,
    process_source_branch: processBranch,
    public_user_bus_used: false,
    authenticated_private_manager_peer: true,
    same_generation_v6_security_composed: true,
  });
}

function observeAuthenticatedCredential(root) {
  const receipt = runAuthenticatedQualifier(root);
  const files = validateAuthenticatedCredentialFiles(receipt);
  const observed = processObservation(receipt, files);
  return Object.freeze({
    ...observed,
    credential_source: receipt.result.credential_source,
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
  return cgroup.split("\\n").some((line) => {
    const first = line.indexOf(":");
    const second = first < 0 ? -1 : line.indexOf(":", first + 1);
    const cgroupPath = second < 0 ? "" : line.slice(second + 1);
    if (!cgroupPath.startsWith(userPrefix)) return false;
    return cgroupPath.endsWith("/" + SERVICE) ||
      cgroupPath.includes("/" + SERVICE + "/");
  });
}

function observationStable(before, after) {
  for (const key of Object.keys(before)) {
    if (before[key] !== after[key]) return false;
  }
  return Object.keys(before).length === Object.keys(after).length;
}

function readCredentialBytes(directory, runtimeUid) {
  let dirFd = -1;
  let keyFd = -1;
  let scratch = null;
  let result = null;
  try {
    if (process.platform !== "linux" ||
        typeof process.getuid !== "function") {
      throw new Error("epoch2_sealed_linux_required");
    }
    if (!Number.isSafeInteger(runtimeUid) || runtimeUid < 0) {
      throw new Error("epoch2_sealed_v2_runtime_uid_invalid");
    }
    const uid = BigInt(runtimeUid);
    const noFollow = fs.constants.O_NOFOLLOW;
    const directoryFlag = fs.constants.O_DIRECTORY;
    if (!Number.isInteger(noFollow) || noFollow === 0 ||
        !Number.isInteger(directoryFlag) || directoryFlag === 0 ||
        !fs.existsSync("/proc/self/fd")) {
      throw new Error("epoch2_sealed_fd_primitives_unavailable");
    }

    const root = path.parse(directory).root;
    const components = path.relative(root, directory)
      .split(path.sep).filter(Boolean);
    const ancestors = [];
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
    const beforeDir = ancestors[ancestors.length - 1].stat;
    dirFd = fs.openSync(
      directory,
      fs.constants.O_RDONLY | directoryFlag | noFollow,
    );
    const openedDir = fs.fstatSync(dirFd, { bigint: true });
    if (!statIdentitySame(beforeDir, openedDir)) {
      throw new Error("epoch2_sealed_credential_directory_replaced");
    }

    const visiblePath = path.join(directory, CREDENTIAL_ID);
    const beforeKey = fs.lstatSync(visiblePath, { bigint: true });
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
    keyFd = fs.openSync(pinned, fs.constants.O_RDONLY | noFollow);
    const openedKey = fs.fstatSync(keyFd, { bigint: true });
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

    const afterKey = fs.fstatSync(keyFd, { bigint: true });
    const visibleKey = fs.lstatSync(visiblePath, { bigint: true });
    const afterDir = fs.fstatSync(dirFd, { bigint: true });
    const visibleDir = fs.lstatSync(directory, { bigint: true });
    if (!statIdentitySame(beforeKey, afterKey) ||
        !statIdentitySame(beforeKey, visibleKey) ||
        !statIdentitySame(beforeDir, afterDir) ||
        !statIdentitySame(beforeDir, visibleDir)) {
      throw new Error("epoch2_sealed_credential_changed_during_read");
    }
    for (const ancestor of ancestors) {
      const visible = fs.lstatSync(ancestor.name, { bigint: true });
      if (!statIdentitySame(ancestor.stat, visible)) {
        throw new Error("epoch2_sealed_credential_parent_changed");
      }
    }
    result = Buffer.from(scratch.subarray(0, count));
  } finally {
    if (scratch !== null) scratch.fill(0);
    for (const fd of [keyFd, dirFd]) {
      if (fd >= 0) {
        try { fs.closeSync(fd); } catch {
          if (result !== null) result.fill(0);
          result = null;
        }
      }
    }
  }
  if (result === null) {
    throw new Error("epoch2_sealed_credential_fd_close_uncertain");
  }
  return result;
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
      "VOID_BUY_VOID_EPOCH2_CREDENTIAL_CHALLENGE_SEALED_V2",
      source.head,
      source.tree,
      source.branch,
      observation.service,
      String(observation.runtime_uid),
      String(observation.manager_pid),
      observation.manager_start_ticks,
      String(observation.main_pid),
      observation.service_start_ticks,
      observation.invocation_id,
      observation.credential_id,
      observation.qualifier_receipt_sha256,
      observation.loadcredential_binding_sha256,
      observation.credentials_directory_sha256,
      observation.main_pid_cgroup_sha256,
      observation.fragment_path_sha256,
      observation.credential_dropin_path_sha256,
      observation.process_source_commit,
      observation.process_source_tree,
      observation.process_source_branch,
      nonceHex,
    ].join("\\0");
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

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(
      "Run this reviewed file from one pinned current-main Git object on stdin " +
      "with --expected-head <40-hex-sha>. Direct worktree execution is non-authoritative.",
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
  const allowed = new Set(["--probe", "--confirm", "--expected-head"]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--confirm" || argv[i] === "--expected-head") {
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
      authenticated_credential_observation_performed: false,
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
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("epoch2_sealed_linux_x64_required");
  }
  if (typeof process.getuid !== "function" ||
      typeof process.geteuid !== "function" ||
      process.getuid() !== 0 || process.geteuid() !== 0) {
    throw new Error("epoch2_sealed_v2_root_required");
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
  const source = assertReviewedSource(root);
  if (source.head !== expectedHead) {
    throw new Error("epoch2_sealed_expected_head_mismatch");
  }
  const trustedNode = trustedExecutable(
    process.execPath,
    path.basename(fs.realpathSync(process.execPath)),
  );
  if (process.execPath !== trustedNode) {
    throw new Error("epoch2_sealed_node_execution_context_invalid");
  }
  const before = observeAuthenticatedCredential(root);
  if (before.process_source_commit !== source.head ||
      before.process_source_tree !== source.tree ||
      before.process_source_branch !== source.branch) {
    throw new Error("epoch2_sealed_live_process_source_mismatch");
  }

  const credential = readCredentialBytes(
    before.credentials_directory,
    before.runtime_uid,
  );
  let privateKey = null;
  let signature = null;
  let challenge = null;
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
    const after = observeAuthenticatedCredential(root);
    if (!observationStable(before, after)) {
      throw new Error("epoch2_sealed_systemd_invocation_changed");
    }

    const body = {
      marker: MARKER,
      version: 2,
      status: "EPOCH2_AUTHENTICATED_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_GREEN",
      source_head: source.head,
      source_tree: source.tree,
      source_branch: source.branch,
      sealed_probe_git_blob: source.blobs[SEALED_PATH],
      credential_source_binding_id: SOURCE_BINDING_ID,
      credential_id: CREDENTIAL_ID,
      immutable_fulfiller: EXPECTED_ADDRESS,
      authenticated_runtime: {
        service: after.service,
        runtime_uid: after.runtime_uid,
        manager_pid: after.manager_pid,
        manager_start_ticks: after.manager_start_ticks,
        main_pid: after.main_pid,
        service_start_ticks: after.service_start_ticks,
        invocation_id: after.invocation_id,
        qualifier_receipt_sha256: after.qualifier_receipt_sha256,
        loadcredential_binding_sha256:
          after.loadcredential_binding_sha256,
        credentials_directory_sha256:
          after.credentials_directory_sha256,
        main_pid_cgroup_sha256:
          after.main_pid_cgroup_sha256,
        fragment_path_sha256:
          after.fragment_path_sha256,
        credential_dropin_path_sha256:
          after.credential_dropin_path_sha256,
        process_source_commit: after.process_source_commit,
        process_source_tree: after.process_source_tree,
        process_source_branch: after.process_source_branch,
        public_user_bus_used: false,
        authenticated_private_manager_peer: true,
        same_generation_v6_security_composed: true,
        raw_loadcredential_source_path_output: false,
        raw_credentials_directory_output: false,
        raw_fragment_path_output: false,
        raw_dropin_path_output: false,
      },
      challenge: {
        domain:
          "VOID_BUY_VOID_EPOCH2_CREDENTIAL_CHALLENGE_SEALED_V2",
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
    console.log(JSON.stringify({
      ...body,
      evidence_id:
        "voide2sealed2_" +
        sha256Bytes(Buffer.from(JSON.stringify(body), "utf8")),
    }, null, 2));
  } finally {
    credential.fill(0);
    if (privateKey !== null) privateKey.fill(0);
    if (signature !== null) signature.fill(0);
    if (challenge !== null) challenge.message.fill(0);
  }
}

export {
  MARKER,
  CONFIRM,
  EXPECTED_ADDRESS,
  EPOCH2_SOURCE_TUPLE_BLOBS,
  REVIEWED_BLOBS,
  AUTHORITY_PATHS,
  QUALIFIER_PATH,
  CREDENTIAL_LOCK_ID,
  keccak256,
  keyMaterial,
  privateKeyFromCredential,
  buildChallenge,
  assertReviewedSource,
  parseQualifierOutput,
  validateAuthenticatedCredentialFiles,
  processObservation,
  observeAuthenticatedCredential,
  serviceCgroupBound,
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
