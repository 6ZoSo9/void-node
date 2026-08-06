import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { assertPlainObject } from "./void_public_seed_common_v1.mjs";

export const PUBLICATION_PACKET_SCHEMA =
  "void_public_bootstrap_manifest_publication_packet_v1";
export const PUBLICATION_PACKET_PREFIX = "voidpbp1_";
export const PUBLICATION_DESTINATION = "public/bootstrap/v1.json";

export const MAX_JSON_BYTES = 4 * 1024 * 1024;
export const MAX_TEXT_BYTES = 1024 * 1024;
export const ARTIFACT_FILES = Object.freeze([
  "qualification.json",
  "public-bootstrap-v1.json",
  "source.txt",
]);
export const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);
export const HOLD_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "status",
  "generated_at",
  "sync_endpoints",
  "onion_endpoints",
  "private_tailnet_endpoints_published",
  "authority",
  "notes",
  "manifest_id",
]);
export const PACKET_KEYS = Object.freeze([
  "schema",
  "version",
  "prepared_at",
  "source_sha",
  "destination",
  "predecessor",
  "qualification",
  "candidate",
  "rollback",
  "authority",
  "files",
  "publication_authorized",
  "packet_id",
]);
export const PREDECESSOR_KEYS = Object.freeze([
  "source_sha",
  "git_blob_sha",
  "sha256",
  "manifest_id",
  "status",
]);
export const QUALIFICATION_KEYS = Object.freeze([
  "qualification_id",
  "artifact_sha256s_sha256",
  "qualification_sha256",
  "candidate_sha256",
  "source_sha256",
]);
export const CANDIDATE_KEYS = Object.freeze([
  "manifest_id",
  "sha256",
  "generated_at",
  "expires_at",
  "endpoint",
  "qualification_id",
  "precondition_manifest_id",
]);
export const ROLLBACK_KEYS = Object.freeze([
  "manifest_id",
  "sha256",
  "generated_at",
  "status",
  "precondition_manifest_id",
]);
export const PACKET_FILE_PATHS = Object.freeze([
  "REVIEW.txt",
  "candidate/public/bootstrap/v1.json",
  "evidence/SHA256SUMS",
  "evidence/public-bootstrap-v1.json",
  "evidence/qualification.json",
  "evidence/source.txt",
  "rollback/public/bootstrap/v1.json",
]);

export function exactKeys(value, expected, label) {
  const object = assertPlainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    const unexpected = actual.filter((key) => !wanted.includes(key));
    const missing = wanted.filter((key) => !actual.includes(key));
    throw new Error(
      `${label} keys mismatch; unexpected=${unexpected.join(",") || "none"}; missing=${missing.join(",") || "none"}`,
    );
  }
  return object;
}

export function assertAuthorityFalse(value, label) {
  const authority = exactKeys(value, AUTHORITY_KEYS, label);
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) throw new Error(`${label} ${key} must be false`);
  }
  return authority;
}

export function assertHex(value, length, label) {
  const text = String(value || "");
  if (!new RegExp(`^[0-9a-f]{${length}}$`).test(text)) {
    throw new Error(`${label} must be ${length} lowercase hexadecimal characters`);
  }
  return text;
}

export function parseTime(value, label) {
  const time = Date.parse(String(value));
  if (!Number.isFinite(time)) throw new Error(`${label} is invalid`);
  return time;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

export function assertOutsideRepository(repoRoot, candidatePath, label) {
  const root = fs.realpathSync(String(repoRoot));
  const parent = fs.realpathSync(path.dirname(path.resolve(String(candidatePath))));
  const candidate = path.join(parent, path.basename(path.resolve(String(candidatePath))));
  if (isInside(root, candidate)) {
    throw new Error(`${label} must remain outside the repository`);
  }
  return candidate;
}

function assertRegularFile(filePath, label, maxBytes) {
  const absolute = path.resolve(String(filePath));
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be one regular non-symlink file`);
  }
  if (stat.size <= 0 || stat.size > maxBytes) {
    throw new Error(`${label} size must be from 1 through ${maxBytes} bytes`);
  }
  return absolute;
}

export function readBytes(filePath, label, maxBytes = MAX_JSON_BYTES) {
  return fs.readFileSync(assertRegularFile(filePath, label, maxBytes));
}

export function readJson(filePath, label) {
  const bytes = readBytes(filePath, label, MAX_JSON_BYTES);
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

export function fileSha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function git(repoRoot, args, label) {
  const result = childProcess.spawnSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(
      `${label} failed: ${String(result.stderr || result.stdout || "unknown git error").trim()}`,
    );
  }
  return String(result.stdout || "").trim();
}

export function assertCleanExactRepository(repoRoot, expectedSourceSha) {
  const root = fs.realpathSync(String(repoRoot));
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("repository root must be one real directory");
  }
  const sourceSha = assertHex(expectedSourceSha, 40, "expected source SHA");
  const actual = git(root, ["rev-parse", "HEAD"], "read repository HEAD");
  if (actual !== sourceSha) {
    throw new Error(`repository HEAD ${actual} does not match expected source ${sourceSha}`);
  }
  const status = git(
    root,
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "inspect repository status",
  );
  if (status !== "") throw new Error("repository must be completely clean");
  return { root, sourceSha };
}
