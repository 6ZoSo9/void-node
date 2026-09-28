#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_NIMO_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1";
const EXPECTED_HOST = process.env.VOID_EXPECTED_NIMO_HOSTNAME || "Nimo";
const HOME = os.homedir();
const REPO = process.env.VOID_REPO || path.join(HOME, "dev", "void-node");
const DOWNLOADS = process.env.VOID_DOWNLOADS || path.join(HOME, "Downloads");
const AUTHORITY_MOUNT =
  process.env.VOID_AUTHORITY_MOUNT || "/mnt/void-authority";
const AUTHORITY_BACKUPS = path.join(AUTHORITY_MOUNT, "backups");
const EXPECTED_AUTHORITY_UUID = "fb57fcbe-83b1-4a69-9701-7aec4cf5396f";
const TOOL = path.join(
  REPO,
  "tools",
  "void-economic-epoch2-signed-artifact-metadata-census-v1.mjs",
);
const STAMP =
  process.env.VOID_CENSUS_STAMP ||
  new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const OUTDIR = path.join(
  DOWNLOADS,
  "void_epoch2_nimo_signed_artifact_metadata_census_v1_" + STAMP,
);

const MAX_TOP_LEVEL_ROOTS = 1024;
const MAX_EXPLICIT_FILES = 4096;
const EXPLICIT_BATCH = 256;

class Hold extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.reason = reason;
    this.detail = detail;
  }
}
function hold(reason, detail = null) {
  throw new Hold(reason, detail);
}
function run(command, args, { cwd = REPO } = {}) {
  const cp = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
  if (cp.error) hold("command_spawn_failed", { command });
  if (cp.status !== 0) {
    hold("command_failed", {
      command,
      status: cp.status,
      stderr: (cp.stderr || "").trim().slice(0, 2000),
    });
  }
  return (cp.stdout || "").trim();
}
function owned(stat) {
  return typeof process.getuid !== "function" || stat.uid === process.getuid();
}
function lstatDirect(target, reason) {
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch {
    hold(reason, { path: target });
  }
  if (stat.isSymbolicLink()) hold("symlink_path_rejected", { path: target });
  return stat;
}
function isVoidOwnedName(name) {
  const lower = name.toLowerCase();
  return (
    lower === "void" ||
    lower.startsWith("void-") ||
    lower.startsWith("void_") ||
    lower.startsWith("void.") ||
    lower.startsWith(".void")
  );
}
function readDir(target, reason) {
  try {
    return fs.readdirSync(target, { withFileTypes: true });
  } catch {
    hold(reason, { path: target });
  }
}
function walkAuthorityBackupFiles(root) {
  const out = [];
  const visit = (dir) => {
    const entries = readDir(dir, "authority_backup_directory_read_failed")
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const child = path.join(dir, entry.name);
      const stat = lstatDirect(child, "authority_backup_metadata_read_failed");
      if (!owned(stat)) {
        hold("authority_backup_owner_mismatch", { path: child });
      }
      if (stat.isDirectory()) {
        visit(child);
      } else if (stat.isFile()) {
        out.push(child);
        if (out.length > MAX_EXPLICIT_FILES) {
          hold("too_many_authority_backup_files");
        }
      } else {
        hold("authority_backup_special_file_requires_review", { path: child });
      }
    }
  };
  visit(root);
  return out;
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function createReceipt(args, out) {
  const cp = spawnSync(process.execPath, [
    TOOL,
    ...args,
    "--out",
    out,
    "--apply",
    "--confirmation",
    "discoverVoidSignedArtifactCandidates",
  ], {
    cwd: REPO,
    encoding: "utf8",
    env: process.env,
  });
  if (cp.error || cp.status !== 0) {
    hold("metadata_census_child_failed", {
      output: out,
      status: cp.status,
      stderr: (cp.stderr || "").trim().slice(0, 2000),
    });
  }
}
function summarize(receiptDir) {
  const names = fs.readdirSync(receiptDir)
    .filter((name) => /^(?:root|file)_batch_[0-9]{4}\.json$/.test(name))
    .sort();
  if (names.length === 0) hold("receipt_set_empty");

  let discovered = 0;
  let hints = 0;
  let symlinks = 0;
  let generated = 0;
  let depth = 0;
  const candidateBasenames = [];
  const receiptRows = [];

  for (const name of names) {
    const file = path.join(receiptDir, name);
    const bytes = fs.readFileSync(file);
    const value = JSON.parse(bytes.toString("utf8"));
    if (
      value?.marker !==
        "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1" ||
      value?.status !== "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED" ||
      value?.scanned_file_content_read !== false ||
      value?.authority?.credential_content_access !== false ||
      value?.authority?.wallet_access !== false ||
      value?.authority?.private_key_access !== false ||
      value?.authority?.transaction_signing !== false ||
      value?.authority?.transaction_broadcast !== false ||
      value?.authority?.authoritative_chain2050_write !== false
    ) {
      hold("receipt_safety_contract_mismatch", { receipt: name });
    }
    discovered += value.discovered_file_count;
    hints += value.candidate_name_hint_count;
    symlinks += value.symlink_descendant_count;
    generated += value.skipped_generated_subtree_count;
    depth += value.skipped_depth_subtree_count;
    for (const row of value.files) {
      if (row.candidate_name_hint === true) {
        candidateBasenames.push(row.basename);
      }
    }
    receiptRows.push(sha256(bytes) + "\t" + name);
  }

  candidateBasenames.sort();
  return {
    receipt_count: names.length,
    discovered_file_count: discovered,
    candidate_name_hint_count: hints,
    candidate_basenames: candidateBasenames,
    symlink_descendant_count: symlinks,
    skipped_generated_subtree_count: generated,
    skipped_depth_subtree_count: depth,
    receipt_set_sha256: sha256(
      Buffer.from(receiptRows.join("\n") + "\n", "utf8"),
    ),
  };
}

try {
  if (os.hostname() !== EXPECTED_HOST) hold("wrong_host");
  if (!fs.statSync(REPO).isDirectory()) hold("repository_missing");
  if (run("git", ["branch", "--show-current"]) !== "main") {
    hold("main_branch_required");
  }
  if (run("git", ["status", "--porcelain"]) !== "") {
    hold("clean_worktree_required");
  }
  if (!fs.statSync(TOOL).isFile()) hold("metadata_census_tool_missing");

  const downloadsStat = lstatDirect(DOWNLOADS, "downloads_directory_missing");
  if (!downloadsStat.isDirectory() || !owned(downloadsStat)) {
    hold("downloads_directory_invalid");
  }

  run("findmnt", [AUTHORITY_MOUNT]);
  const source = run("findmnt", ["-no", "SOURCE", AUTHORITY_MOUNT])
    .split(/\r?\n/)[0]
    .trim();
  const uuid = run("lsblk", ["-no", "UUID", source])
    .split(/\r?\n/)[0]
    .trim();
  if (uuid !== EXPECTED_AUTHORITY_UUID) {
    hold("authority_uuid_mismatch", { observed_uuid: uuid });
  }
  const mountStat = lstatDirect(
    AUTHORITY_MOUNT,
    "authority_mount_metadata_read_failed",
  );
  if (!mountStat.isDirectory()) hold("authority_mount_not_directory");
  const backupsStat = lstatDirect(
    AUTHORITY_BACKUPS,
    "authority_backups_directory_missing",
  );
  if (!backupsStat.isDirectory()) hold("authority_backups_not_directory");

  const roots = [];
  const files = [];
  for (const entry of readDir(DOWNLOADS, "downloads_metadata_read_failed")
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (
      entry.name.startsWith(
        "void_epoch2_nimo_signed_artifact_metadata_census_v1_",
      )
    ) continue;
    if (!isVoidOwnedName(entry.name)) continue;
    const candidate = path.join(DOWNLOADS, entry.name);
    const stat = lstatDirect(candidate, "downloads_entry_metadata_read_failed");
    if (!owned(stat)) hold("downloads_entry_owner_mismatch", { path: candidate });
    if (stat.isDirectory()) roots.push(candidate);
    else if (stat.isFile()) files.push(candidate);
  }
  if (roots.length > MAX_TOP_LEVEL_ROOTS) hold("too_many_download_roots");
  if (files.length > MAX_EXPLICIT_FILES) hold("too_many_download_files");

  const authorityFiles = walkAuthorityBackupFiles(AUTHORITY_BACKUPS);
  if (files.length + authorityFiles.length > MAX_EXPLICIT_FILES) {
    hold("too_many_explicit_files");
  }

  fs.mkdirSync(OUTDIR, { mode: 0o700 });
  fs.chmodSync(OUTDIR, 0o700);

  let rootIndex = 0;
  for (const root of roots) {
    rootIndex += 1;
    const out = path.join(
      OUTDIR,
      "root_batch_" + String(rootIndex).padStart(4, "0") + ".json",
    );
    createReceipt(["--root", root], out);
  }

  const explicitFiles = [...files, ...authorityFiles].sort();
  let fileBatch = 0;
  for (let offset = 0; offset < explicitFiles.length; offset += EXPLICIT_BATCH) {
    fileBatch += 1;
    const args = [];
    for (const file of explicitFiles.slice(offset, offset + EXPLICIT_BATCH)) {
      args.push("--file", file);
    }
    const out = path.join(
      OUTDIR,
      "file_batch_" + String(fileBatch).padStart(4, "0") + ".json",
    );
    createReceipt(args, out);
  }

  const summary = summarize(OUTDIR);
  console.log(MARKER);
  console.log("host=" + os.hostname());
  console.log("repository_head=" + run("git", ["rev-parse", "HEAD"]));
  console.log("downloads=" + DOWNLOADS);
  console.log("authority_mount=" + AUTHORITY_MOUNT);
  console.log("authority_uuid=" + uuid);
  console.log("download_root_count=" + roots.length);
  console.log("download_top_level_file_count=" + files.length);
  console.log("authority_backup_file_count=" + authorityFiles.length);
  for (const [key, value] of Object.entries(summary)) {
    console.log(
      key + "=" + (Array.isArray(value) ? JSON.stringify(value) : String(value)),
    );
  }
  console.log("scanned_file_content_read=false");
  console.log("credential_content_access=false");
  console.log("wallet_access=false");
  console.log("private_key_access=false");
  console.log("transaction_signing=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("pending_legacy_signed_transaction_census_complete=false");
  console.log("receipt_dir=" + OUTDIR);
  console.log(MARKER + "_GREEN");
} catch (error) {
  const reason = error instanceof Hold ? error.reason : String(error?.message || error);
  const detail =
    error instanceof Hold && error.detail !== null
      ? " detail=" + JSON.stringify(error.detail)
      : "";
  console.error(MARKER + "_HOLD reason=" + reason + detail);
  process.exitCode = 2;
}
