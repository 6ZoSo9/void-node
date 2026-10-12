#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCartography,
  validateRegistry,
} from "./generate_void_index_cartography_v1.mjs";

export const REVIEW_MARKER = "VOID_INDEX_SECTION_REVIEW_V1";
export const REGISTRY_PATH = "docs/index-map-v1.json";
export const SOURCE_PATH = "src/index.ts";
export const DEFAULT_BEFORE = 20;
export const DEFAULT_AFTER = 40;
export const MAX_SIDE_LINES = 120;
export const MAX_TOTAL_LINES = MAX_SIDE_LINES * 2 + 1;
const ID_RE = /^[a-z0-9][a-z0-9.-]*$/;

function fail(message) {
  throw new Error(message);
}

function boundedCount(value, label, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) fail(`${label} must be a non-negative integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_SIDE_LINES) {
    fail(`${label} must be between 0 and ${MAX_SIDE_LINES}`);
  }
  return parsed;
}

export function parseViewerArgs(argv) {
  const options = {
    repoRoot: process.cwd(),
    landmarkId: null,
    before: DEFAULT_BEFORE,
    after: DEFAULT_AFTER,
    format: "text",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--repo-root") {
      options.repoRoot = argv[++i];
      if (!options.repoRoot) fail("--repo-root requires a value");
    } else if (arg === "--landmark") {
      options.landmarkId = argv[++i];
      if (!options.landmarkId) fail("--landmark requires a value");
    } else if (arg === "--before") {
      options.before = boundedCount(argv[++i], "--before", DEFAULT_BEFORE);
    } else if (arg === "--after") {
      options.after = boundedCount(argv[++i], "--after", DEFAULT_AFTER);
    } else if (arg === "--format") {
      options.format = argv[++i];
      if (options.format !== "text" && options.format !== "json") {
        fail("--format must be text or json");
      }
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }

  if (typeof options.landmarkId !== "string" || !ID_RE.test(options.landmarkId)) {
    fail("--landmark must be an exact stable landmark id");
  }
  if (options.before + options.after + 1 > MAX_TOTAL_LINES) {
    fail(`requested window exceeds ${MAX_TOTAL_LINES} lines`);
  }
  return options;
}

export function buildIndexSectionReview({ registry, source, landmarkId, before = DEFAULT_BEFORE, after = DEFAULT_AFTER }) {
  validateRegistry(registry);
  if (registry.source_path !== SOURCE_PATH) fail(`registry source_path must be exactly ${SOURCE_PATH}`);
  if (typeof source !== "string") fail("source must be a string");
  if (typeof landmarkId !== "string" || !ID_RE.test(landmarkId)) fail("invalid landmark id");
  if (!Number.isSafeInteger(before) || before < 0 || before > MAX_SIDE_LINES) fail("before out of bounds");
  if (!Number.isSafeInteger(after) || after < 0 || after > MAX_SIDE_LINES) fail("after out of bounds");

  const entry = registry.landmarks.find((item) => item.id === landmarkId);
  if (!entry) fail(`unknown landmark id: ${landmarkId}`);

  const map = buildCartography({ registry, source, sourcePath: SOURCE_PATH });
  const resolved = map.landmarks.find((item) => item.id === landmarkId);
  if (!resolved) fail(`resolved landmark missing: ${landmarkId}`);

  const lines = source.split(/\r?\n/);
  const startLine = Math.max(1, resolved.line - before);
  const endLine = Math.min(lines.length, resolved.line + after);
  const selectedLines = lines.slice(startLine - 1, endLine).map((text, index) => ({
    line: startLine + index,
    text,
  }));

  if (selectedLines.length > MAX_TOTAL_LINES) fail("bounded window invariant violated");

  return {
    marker: REVIEW_MARKER,
    version: 1,
    source_path: SOURCE_PATH,
    source_sha256: map.source_sha256,
    source_line_count: map.source_line_count,
    landmark: {
      id: resolved.id,
      area: resolved.area,
      purpose: resolved.purpose,
      line: resolved.line,
      column: resolved.column,
      managed_marker: resolved.managed_marker,
    },
    window: {
      requested_before: before,
      requested_after: after,
      start_line: startLine,
      end_line: endLine,
      line_count: selectedLines.length,
      truncated_at_start: startLine > resolved.line - before,
      truncated_at_end: endLine < resolved.line + after,
      max_total_lines: MAX_TOTAL_LINES,
    },
    lines: selectedLines,
    exact_registered_landmark_required: true,
    arbitrary_source_path_allowed: false,
    source_mutation_performed: false,
  };
}

export function renderIndexSectionText(review) {
  const out = [];
  out.push(`# ${REVIEW_MARKER}`);
  out.push(`source=${review.source_path}`);
  out.push(`source_sha256=${review.source_sha256}`);
  out.push(`landmark=${review.landmark.id}`);
  out.push(`area=${review.landmark.area}`);
  out.push(`purpose=${review.landmark.purpose}`);
  out.push(`landmark_line=${review.landmark.line}`);
  out.push(`window=${review.window.start_line}-${review.window.end_line}`);
  out.push("");
  for (const item of review.lines) {
    out.push(`${String(item.line).padStart(6, " ")} | ${item.text}`);
  }
  out.push("");
  out.push("source_mutation_performed=false");
  return `${out.join("\n")}\n`;
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseViewerArgs(argv);
  const repoRoot = resolve(options.repoRoot);
  const registry = validateRegistry(JSON.parse(readFileSync(resolve(repoRoot, REGISTRY_PATH), "utf8")));
  if (registry.source_path !== SOURCE_PATH) fail(`registry source_path must be exactly ${SOURCE_PATH}`);
  const source = readFileSync(resolve(repoRoot, SOURCE_PATH), "utf8");
  const review = buildIndexSectionReview({
    registry,
    source,
    landmarkId: options.landmarkId,
    before: options.before,
    after: options.after,
  });
  if (options.format === "json") process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
  else process.stdout.write(renderIndexSectionText(review));
}

const invoked = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (invoked) {
  try {
    runCli();
  } catch (error) {
    console.error(`VOID_INDEX_SECTION_REVIEW_V1_HOLD: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
