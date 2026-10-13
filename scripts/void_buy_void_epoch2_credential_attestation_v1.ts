#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const ATTESTATION_MARKER = "ATTESTATION_MARKER";
const ATTESTATION_CONFIRMATION =
  "probeBuyVoidEpoch2InstalledCredentialSigningCapabilityV1";

export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_WORKTREE_PATHS_V1 =
  Object.freeze([
    "scripts/void_buy_void_epoch2_credential_attestation_v1.ts",
    "tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs",
    "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts",
    "src/economic/buy_void_payment_keyed_full_runtime_v1.ts",
    "src/economic/buy_void_epoch2_credential_attestation_v1.ts",
    "src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts",
    "src/economic/buy_void_epoch2_credential_source_binding_v1.ts",
  ] as const);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_QUALIFIER =
  "tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs";
const EXPECTED_BLOBS = Object.freeze({
  [SOURCE_QUALIFIER]: "834f17d99c0351c0f2b10fb024f3ee43afae8a42",
  "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts":
    "5fd9296d10d810b1976c159578f13cca5d1594fe",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
    "af2179651a88a74b158e7f3602fc5b3c30701f87",
  "src/economic/buy_void_epoch2_credential_attestation_v1.ts":
    "6660ca6e4188d49c7fbbf69cec03a2f4c7be2227",
  "src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts":
    "158cbf14fa2b566632c096a22e484b651cd44f6d",
  "src/economic/buy_void_epoch2_credential_source_binding_v1.ts":
    "4de9832a0f8e384e477177b55975e8557ec9147c",
});
const SERVICE = "void-node-live.service";

function help(): string {
  return [
    "Usage:",
    "  node --import tsx scripts/void_buy_void_epoch2_credential_attestation_v1.ts",
    "  node --import tsx scripts/void_buy_void_epoch2_credential_attestation_v1.ts --probe --confirm " +
      ATTESTATION_CONFIRMATION,
    "",
    "Default mode is disabled and performs no systemd, /proc, credential, or signing access.",
    "The explicit probe observes the live user service, reads only its systemd-managed",
    "buy-void-epoch2-fulfiller-v1 credential, signs one non-broadcast capability",
    "probe, verifies it locally, discards the raw transaction, and emits public evidence.",
  ].join("\n");
}

function sanitizedGitEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("GIT_") || value === undefined) continue;
    env[key] = value;
  }
  env.GIT_OPTIONAL_LOCKS = "0";
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = "/dev/null";
  env.GIT_CONFIG_SYSTEM = "/dev/null";
  return env;
}

function sanitizedChildEnvironment(): NodeJS.ProcessEnv {
  const env = sanitizedGitEnvironment();
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return env;
}

function git(args: string[]): string {
  return execFileSync("git", [
    "-C", ROOT,
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

function gitLocalBoolean(name: string): boolean {
  try {
    const value = git(["config", "--local", "--bool", "--get", name]);
    if (value === "true") return true;
    if (value === "false" || value === "") return false;
    throw new Error("epoch2_attestation_git_config_value_invalid");
  } catch (error) {
    if (Number((error as any)?.status) === 1) return false;
    throw error;
  }
}

function worktreeGitBlob(relative: string): string {
  if (!/^[A-Za-z0-9._/-]+$/u.test(relative) ||
      relative.startsWith("/") || relative.split("/").includes("..")) {
    throw new Error("epoch2_attestation_worktree_path_invalid");
  }
  const absolute = path.join(ROOT, relative);
  let fd = -1;
  let bytes: Buffer | null = null;
  try {
    const before = fs.lstatSync(absolute, { bigint: true });
    if (before.isSymbolicLink() || !before.isFile() ||
        before.size < 1n || before.size > 2_000_000n) {
      throw new Error("epoch2_attestation_worktree_file_shape_invalid");
    }
    const noFollow = fs.constants.O_NOFOLLOW;
    if (!Number.isInteger(noFollow) || noFollow === 0) {
      throw new Error("epoch2_attestation_worktree_nofollow_unavailable");
    }
    fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(fd, { bigint: true });
    if (opened.dev !== before.dev || opened.ino !== before.ino ||
        opened.size !== before.size || opened.mtimeNs !== before.mtimeNs ||
        opened.ctimeNs !== before.ctimeNs || !opened.isFile()) {
      throw new Error("epoch2_attestation_worktree_file_replaced");
    }
    bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, null);
      if (!Number.isSafeInteger(count) || count <= 0) {
        throw new Error("epoch2_attestation_worktree_read_invalid");
      }
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(absolute, { bigint: true });
    for (const current of [after, visible]) {
      if (current.dev !== opened.dev || current.ino !== opened.ino ||
          current.size !== opened.size || current.mtimeNs !== opened.mtimeNs ||
          current.ctimeNs !== opened.ctimeNs || !current.isFile()) {
        throw new Error("epoch2_attestation_worktree_file_changed");
      }
    }
    return crypto.createHash("sha1")
      .update(Buffer.from("blob " + bytes.length + "\\0", "utf8"))
      .update(bytes).digest("hex");
  } finally {
    if (bytes !== null) bytes.fill(0);
    if (fd >= 0) fs.closeSync(fd);
  }
}

export type BuyVoidEpoch2CredentialAttestationWorktreeEntryV1 = {
  path: string;
  index_tag: string;
  head_blob: string;
  worktree_blob: string;
};

export function assessBuyVoidEpoch2CredentialAttestationWorktreeV1(input: {
  tracked_status: string;
  sparse_checkout: boolean;
  entries: BuyVoidEpoch2CredentialAttestationWorktreeEntryV1[];
}): { ok: true } | { ok: false; reason: string } {
  if (input.tracked_status !== "") {
    return { ok: false, reason: "epoch2_attestation_tracked_worktree_dirty" };
  }
  if (input.sparse_checkout === true) {
    return { ok: false, reason: "epoch2_attestation_sparse_checkout_forbidden" };
  }
  if (!Array.isArray(input.entries) ||
      input.entries.length !==
        VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_WORKTREE_PATHS_V1.length) {
    return { ok: false, reason: "epoch2_attestation_worktree_entry_cardinality_invalid" };
  }
  const byPath = new Map<string, BuyVoidEpoch2CredentialAttestationWorktreeEntryV1>();
  for (const entry of input.entries) {
    if (!entry || typeof entry.path !== "string" || byPath.has(entry.path)) {
      return { ok: false, reason: "epoch2_attestation_worktree_entry_duplicate_or_invalid" };
    }
    byPath.set(entry.path, entry);
  }
  for (const relative of
      VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_WORKTREE_PATHS_V1) {
    const entry = byPath.get(relative);
    if (!entry) {
      return { ok: false, reason: "epoch2_attestation_worktree_entry_missing" };
    }
    if (entry.index_tag !== "H") {
      return { ok: false, reason: "epoch2_attestation_worktree_index_flag_unsafe" };
    }
    if (!/^[0-9a-f]{40}$/u.test(entry.head_blob) ||
        !/^[0-9a-f]{40}$/u.test(entry.worktree_blob)) {
      return { ok: false, reason: "epoch2_attestation_worktree_blob_invalid" };
    }
    if (entry.head_blob !== entry.worktree_blob) {
      return { ok: false, reason: "epoch2_attestation_worktree_blob_mismatch" };
    }
  }
  return { ok: true };
}

function safeReason(error: unknown): string {
  const raw = String((error as any)?.message || "").trim();
  return /^[a-z0-9_:-]{1,160}$/u.test(raw)
    ? raw
    : "epoch2_credential_attestation_failed";
}

function assertSourceGeneration(): {
  head: string;
  tree: string;
  branch: "main";
  qualifier_blob: string;
  signer_blob: string;
  full_runtime_blob: string;
  attestation_blob: string;
} {
  const head = git(["rev-parse", "--verify", "HEAD"]).toLowerCase();
  const tree = git(["rev-parse", "--verify", "HEAD^{tree}"]).toLowerCase();
  const branch = git(["symbolic-ref", "--short", "-q", "HEAD"]);
  const top = path.resolve(git(["rev-parse", "--show-toplevel"]));
  if (top !== ROOT) throw new Error("epoch2_attestation_git_root_mismatch");
  if (String(process.env.NODE_OPTIONS || "").trim() !== "" ||
      String(process.env.NODE_PATH || "").trim() !== "") {
    throw new Error("epoch2_attestation_node_loader_environment_forbidden");
  }
  const trackedStatus = git(["status", "--porcelain=v1", "--untracked-files=no"]);
  const sparseCheckout = gitLocalBoolean("core.sparseCheckout");
  const tags = new Map<string, string>();
  const tagged = git([
    "ls-files", "-v", "--",
    ...VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_WORKTREE_PATHS_V1,
  ]);
  for (const line of tagged.split("\\n").filter(Boolean)) {
    if (line.length < 3 || line[1] !== " ") {
      throw new Error("epoch2_attestation_worktree_index_output_invalid");
    }
    const relative = line.slice(2);
    if (tags.has(relative)) {
      throw new Error("epoch2_attestation_worktree_index_duplicate");
    }
    tags.set(relative, line[0]);
  }
  const worktreeEntries =
    VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_WORKTREE_PATHS_V1.map(
      (relative) => ({
        path: relative,
        index_tag: tags.get(relative) || "",
        head_blob: git(["rev-parse", "--verify", "HEAD:" + relative])
          .toLowerCase(),
        worktree_blob: worktreeGitBlob(relative),
      }),
    );
  const worktree = assessBuyVoidEpoch2CredentialAttestationWorktreeV1({
    tracked_status: trackedStatus,
    sparse_checkout: sparseCheckout,
    entries: worktreeEntries,
  });
  if (!worktree.ok) throw new Error(worktree.reason);
  if (!/^[0-9a-f]{40}$/u.test(head) || !/^[0-9a-f]{40}$/u.test(tree) ||
      branch !== "main") {
    throw new Error("epoch2_attestation_head_invalid");
  }
  for (const [relative, expected] of Object.entries(EXPECTED_BLOBS)) {
    const entry = worktreeEntries.find((row) => row.path === relative);
    if (!entry || entry.head_blob !== expected || entry.worktree_blob !== expected) {
      throw new Error("epoch2_attestation_source_blob_mismatch");
    }
  }
  const qualifier = execFileSync(process.execPath, [SOURCE_QUALIFIER], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 15_000,
    maxBuffer: 256 * 1024,
    env: sanitizedChildEnvironment(),
  });
  if (!qualifier.includes(
      "status=EPOCH2_SOURCE_TUPLE_REVIEWABLE_CREDENTIAL_AND_ACTIVATION_HOLD") ||
      !qualifier.includes("source_qualification_complete=true")) {
    throw new Error("epoch2_source_qualification_not_green");
  }
  return {
    head,
    tree,
    branch: "main",
    qualifier_blob: EXPECTED_BLOBS[SOURCE_QUALIFIER],
    signer_blob:
      EXPECTED_BLOBS[
        "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts"
      ],
    full_runtime_blob:
      EXPECTED_BLOBS["src/economic/buy_void_payment_keyed_full_runtime_v1.ts"],
    attestation_blob:
      EXPECTED_BLOBS["src/economic/buy_void_epoch2_credential_attestation_v1.ts"],
  };
}

function observeLiveSystemdCredential(
  parseObservation: (input: { systemctl_show: string; process_environ: Buffer }) => any,
) {
  const show = execFileSync("systemctl", [
    "--user", "show", SERVICE, "--no-pager",
    "-p", "ActiveState",
    "-p", "SubState",
    "-p", "MainPID",
    "-p", "InvocationID",
    "-p", "LoadCredential",
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
    maxBuffer: 128 * 1024,
  });
  const match = show.match(/^MainPID=([0-9]+)$/mu);
  if (!match) throw new Error("epoch2_service_main_pid_missing");
  const pid = Number(match[1]);
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error("epoch2_service_main_pid_invalid");
  }
  const environ = fs.readFileSync("/proc/" + pid.toString() + "/environ");
  return parseObservation({
    systemctl_show: show,
    process_environ: environ,
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(help());
    return;
  }
  const probe = argv.includes("--probe");
  const confirmAt = argv.indexOf("--confirm");
  const confirmation =
    confirmAt >= 0 && confirmAt + 1 < argv.length ? argv[confirmAt + 1] : "";
  const recognized = new Set(["--probe", "--confirm"]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--confirm") {
      i += 1;
      continue;
    }
    if (!recognized.has(argv[i])) throw new Error("unknown_argument");
  }

  if (!probe) {
    console.log(JSON.stringify({
      marker: ATTESTATION_MARKER,
      status: "disabled",
      reason: "epoch2_credential_attestation_probe_not_requested",
      systemd_observation_performed: false,
      credential_content_read: false,
      signing_performed: false,
      rpc_call_performed: false,
      transaction_broadcast_performed: false,
      runtime_activation_authorized: false,
      public_payment_acceptance_authorized: false,
      presale_activation_authorized: false,
      funds_movement: false,
    }, null, 2));
    return;
  }
  if (confirmation !==
      ATTESTATION_CONFIRMATION) {
    throw new Error("epoch2_credential_attestation_confirmation_mismatch");
  }
  if (process.platform !== "linux") {
    throw new Error("epoch2_credential_attestation_linux_required");
  }

  const source = assertSourceGeneration();
  const [accessModule, bindingModule, signerModule, attestationModule] =
    await Promise.all([
      import("../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js"),
      import("../src/economic/buy_void_epoch2_credential_source_binding_v1.js"),
      import("../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js"),
      import("../src/economic/buy_void_epoch2_credential_attestation_v1.js"),
    ]);
  if (attestationModule.VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1 !==
        ATTESTATION_MARKER ||
      attestationModule.VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CONFIRMATION_V1 !==
        ATTESTATION_CONFIRMATION) {
    throw new Error("epoch2_attestation_reviewed_module_contract_mismatch");
  }
  const {
    VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  } = accessModule;
  const {
    VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1,
  } = bindingModule;
  const {
    createBuyVoidEpoch2FulfillerCredentialSignerV1,
  } = signerModule;
  const {
    buildBuyVoidEpoch2CredentialCapabilityProbeV1,
    buildBuyVoidEpoch2CredentialAttestationEvidenceV1,
    buyVoidEpoch2SystemdCredentialObservationStableV1,
    observeBuyVoidEpoch2SystemdCredentialBindingV1,
  } = attestationModule;
  const systemd = observeLiveSystemdCredential(
    observeBuyVoidEpoch2SystemdCredentialBindingV1,
  );
  if (systemd.process_source_commit !== source.head ||
      systemd.process_source_tree !== source.tree ||
      systemd.process_source_branch !== source.branch) {
    throw new Error("epoch2_attestation_live_process_source_mismatch");
  }
  const signer = createBuyVoidEpoch2FulfillerCredentialSignerV1({
    credentials_directory: systemd.credentials_directory,
  });
  if (!signer.ok) throw new Error(signer.reason);
  const publicAddress = (await signer.signer.get_address()).toLowerCase();
  if (publicAddress !== VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1) {
    throw new Error("epoch2_attestation_immutable_fulfiller_mismatch");
  }

  const challenge = crypto.randomBytes(32).toString("hex");
  const envelope = buildBuyVoidEpoch2CredentialCapabilityProbeV1({
    source_head: source.head,
    challenge_hex: challenge,
  });
  let raw = await signer.signer.sign_transaction(envelope);
  try {
    const systemdAfter = observeLiveSystemdCredential(
      observeBuyVoidEpoch2SystemdCredentialBindingV1,
    );
    if (!buyVoidEpoch2SystemdCredentialObservationStableV1(
        systemd, systemdAfter)) {
      throw new Error("epoch2_attestation_systemd_invocation_changed_during_probe");
    }
    const evidence = buildBuyVoidEpoch2CredentialAttestationEvidenceV1({
      source_head: source.head,
      source_tree: source.tree,
      source_branch: source.branch,
      source_qualifier_blob: source.qualifier_blob,
      signer_source_blob: source.signer_blob,
      full_runtime_source_blob: source.full_runtime_blob,
      attestation_source_blob: source.attestation_blob,
      expected_signer: VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
      probe: envelope,
      raw_signed_transaction: raw,
      systemd_observation: systemdAfter,
    });
    if ((evidence as any).source_identity?.credential_source_binding_id !==
        VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1) {
      throw new Error("epoch2_attestation_source_binding_mismatch");
    }
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    raw = "";
  }
}

if (process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(JSON.stringify({
      marker: ATTESTATION_MARKER + "_HOLD",
      status: "HOLD",
      reason: safeReason(error),
      raw_private_key_output: false,
      raw_signed_transaction_output: false,
      rpc_call_performed: false,
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
