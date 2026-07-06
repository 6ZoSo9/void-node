#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { execSync } from "node:child_process";
import { hostname } from "node:os";

const MARKER = "VOID_FIELD_REPORT_V1_READY";
const FAIL_MARKER = "VOID_FIELD_REPORT_V1_FAIL";
const ROOT = process.cwd();

const maxArtifacts = Number(process.env.VOID_FIELD_REPORT_MAX_ARTIFACTS || "500");
const maxDepth = Number(process.env.VOID_FIELD_REPORT_MAX_DEPTH || "12");
const hashMaxBytes = Number(process.env.VOID_FIELD_REPORT_HASH_MAX_BYTES || String(2 * 1024 * 1024));

const defaultRoots = [
  ".void-field-trial",
  "public/public-node/datanet/field-objects",
  "public/public-node/datanet/field-object-mirrors",
];

const roots = (process.env.VOID_FIELD_REPORT_ROOTS || defaultRoots.join(":"))
  .split(":")
  .map((item) => item.trim())
  .filter(Boolean);

const skipDirNames = new Set([
  ".git",
  "node_modules",
  ".void-field-reports",
]);

function fail(message) {
  console.error(FAIL_MARKER);
  console.error(message);
  process.exit(1);
}

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeRel(path) {
  const rel = relative(ROOT, path);
  return rel && !rel.startsWith("..") && !rel.startsWith(sep) ? rel : path;
}

function gitInfo() {
  const out = {};
  try {
    out.head = execSync("git rev-parse --short HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    out.head = null;
  }

  try {
    out.branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    out.branch = null;
  }

  try {
    out.status_short = execSync("git status --short", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 50);
  } catch {
    out.status_short = [];
  }

  return out;
}

function maybeSha256(path, size) {
  if (size > hashMaxBytes) return null;

  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return null;
  }
}

function walk(rootPath, depth, state) {
  if (depth > maxDepth) {
    state.skipped_depth++;
    return;
  }

  let entries;
  try {
    entries = readdirSync(rootPath, { withFileTypes: true });
  } catch (err) {
    state.errors.push({ path: safeRel(rootPath), error: err.message });
    return;
  }

  for (const entry of entries) {
    const path = join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (skipDirNames.has(entry.name)) {
        state.skipped_dirs++;
        continue;
      }
      walk(path, depth + 1, state);
      continue;
    }

    if (!entry.isFile()) continue;

    let st;
    try {
      st = statSync(path);
    } catch (err) {
      state.errors.push({ path: safeRel(path), error: err.message });
      continue;
    }

    state.total_candidates++;

    if (state.artifacts.length >= maxArtifacts) {
      state.truncated_candidates++;
      continue;
    }

    const artifact = {
      path: safeRel(path),
      bytes: st.size,
      mtime_ms: Math.round(st.mtimeMs),
    };

    const sha = maybeSha256(path, st.size);
    if (sha) artifact.sha256 = sha;
    else if (st.size > hashMaxBytes) artifact.sha256_omitted_reason = "file_too_large_for_report_hash_bound";

    state.artifacts.push(artifact);
  }
}

function makeReport() {
  const state = {
    roots: [],
    artifacts: [],
    total_candidates: 0,
    truncated_candidates: 0,
    skipped_dirs: 0,
    skipped_depth: 0,
    errors: [],
  };

  for (const root of roots) {
    const rootPath = resolve(ROOT, root);
    const exists = existsSync(rootPath);
    state.roots.push({ root, exists });

    if (!exists) continue;
    walk(rootPath, 0, state);
  }

  state.artifacts.sort((a, b) => (b.mtime_ms - a.mtime_ms) || a.path.localeCompare(b.path));

  const generatedAt = new Date().toISOString();
  const report = {
    marker: MARKER,
    status: "ready",
    generated_at: generatedAt,
    host: hostname(),
    git: gitInfo(),
    bounds: {
      max_artifacts: maxArtifacts,
      max_depth: maxDepth,
      hash_max_bytes: hashMaxBytes,
      total_candidates: state.total_candidates,
      included_artifacts: state.artifacts.length,
      truncated_candidates: state.truncated_candidates,
      truncated: state.truncated_candidates > 0,
      skipped_dirs: state.skipped_dirs,
      skipped_depth: state.skipped_depth,
      error_count: state.errors.length,
    },
    roots: state.roots,
    artifacts: state.artifacts,
    errors: state.errors.slice(0, 50),
  };

  const outDir = join(ROOT, ".void-field-reports");
  mkdirSync(outDir, { recursive: true });

  const stamp = isoStamp();
  const jsonPath = join(outDir, `void-field-report-${stamp}.json`);
  const mdPath = join(outDir, `void-field-report-${stamp}.md`);

  writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

  const md = `# VOID field report v1

${MARKER}

Generated: ${generatedAt}

Host: \`${report.host}\`

Git head: \`${report.git.head || ""}\`

Git branch: \`${report.git.branch || ""}\`

Artifacts included: ${report.bounds.included_artifacts}

Total candidates: ${report.bounds.total_candidates}

Truncated: ${report.bounds.truncated ? "true" : "false"}

Max artifacts: ${report.bounds.max_artifacts}

Max depth: ${report.bounds.max_depth}

Hash max bytes: ${report.bounds.hash_max_bytes}

This report is bounded to avoid recursive growth and oversized JSON output.
`;
  writeFileSync(mdPath, md);

  return { report, jsonPath, mdPath };
}

try {
  const { report, jsonPath, mdPath } = makeReport();

  console.log(MARKER);
  console.log(`json=${safeRel(jsonPath)}`);
  console.log(`md=${safeRel(mdPath)}`);
  console.log(`artifacts=${report.bounds.included_artifacts}`);
  console.log(`total_candidates=${report.bounds.total_candidates}`);
  console.log(`truncated=${report.bounds.truncated}`);
} catch (err) {
  fail(err && err.stack ? err.stack : String(err));
}
