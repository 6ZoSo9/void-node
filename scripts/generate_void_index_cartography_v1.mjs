#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const CARTOGRAPHY_MARKER = "VOID_INDEX_CARTOGRAPHY_V1";
export const MANAGED_PREFIX = "// VOID-INDEX-LANDMARK:";
const ID_RE = /^[a-z0-9][a-z0-9.-]*$/;
const MANAGED_RE = /^\s*\/\/\s*VOID-INDEX-LANDMARK:\s*([a-z0-9][a-z0-9.-]*)\s*$/;

function fail(message) {
  throw new Error(message);
}

export function validateRegistry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("registry must be an object");
  }
  if (value.marker !== CARTOGRAPHY_MARKER || value.version !== 1) {
    fail("registry marker/version mismatch");
  }
  if (typeof value.source_path !== "string" || value.source_path.length === 0) {
    fail("source_path missing");
  }
  if (value.managed_landmark_prefix !== MANAGED_PREFIX) {
    fail("managed_landmark_prefix mismatch");
  }
  if (!Array.isArray(value.landmarks) || value.landmarks.length === 0) {
    fail("landmarks must be a non-empty array");
  }

  const ids = new Set();
  const anchors = new Set();
  for (const item of value.landmarks) {
    if (!item || typeof item !== "object" || Array.isArray(item)) fail("invalid landmark");
    if (typeof item.id !== "string" || !ID_RE.test(item.id)) fail(`invalid landmark id: ${item.id}`);
    if (ids.has(item.id)) fail(`duplicate landmark id: ${item.id}`);
    ids.add(item.id);
    if (typeof item.area !== "string" || item.area.length === 0) fail(`area missing: ${item.id}`);
    if (typeof item.purpose !== "string" || item.purpose.length === 0) fail(`purpose missing: ${item.id}`);
    if (typeof item.anchor !== "string" || item.anchor.length === 0) fail(`anchor missing: ${item.id}`);
    if (anchors.has(item.anchor)) fail(`duplicate landmark anchor: ${item.id}`);
    anchors.add(item.anchor);
    if (!Number.isSafeInteger(item.expected_occurrences) || item.expected_occurrences !== 1) {
      fail(`expected_occurrences must be exactly 1 in v1: ${item.id}`);
    }
  }
  return value;
}

export function extractManagedMarkers(lines) {
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.includes("VOID-INDEX-LANDMARK:")) continue;
    const match = line.match(MANAGED_RE);
    if (!match) fail(`malformed managed landmark at line ${index + 1}`);
    found.push({ id: match[1], line: index + 1, anchor: `${MANAGED_PREFIX} ${match[1]}` });
  }
  return found;
}

function findOccurrences(source, anchor) {
  const occurrences = [];
  let offset = 0;
  while (true) {
    const index = source.indexOf(anchor, offset);
    if (index === -1) break;
    occurrences.push(index);
    offset = index + Math.max(anchor.length, 1);
  }
  return occurrences;
}

function lineColumnAt(source, offset) {
  const prefix = source.slice(0, offset);
  const lastNewline = prefix.lastIndexOf("\n");
  const line = (prefix.match(/\n/g) || []).length + 1;
  const column = offset - lastNewline;
  return { line, column };
}

export function buildCartography({ registry, source, sourcePath = "src/index.ts" }) {
  validateRegistry(registry);
  if (typeof source !== "string") fail("source must be a string");

  const lines = source.split(/\r?\n/);
  const managed = extractManagedMarkers(lines);
  const byId = new Map(registry.landmarks.map((item) => [item.id, item]));

  const managedIds = new Set();
  for (const marker of managed) {
    if (managedIds.has(marker.id)) fail(`duplicate managed source marker: ${marker.id}`);
    managedIds.add(marker.id);
    const entry = byId.get(marker.id);
    if (!entry) fail(`unregistered managed source marker: ${marker.id}`);
    if (entry.anchor !== marker.anchor) {
      fail(`managed source marker anchor mismatch: ${marker.id}`);
    }
  }

  const landmarks = registry.landmarks.map((item) => {
    const occurrences = findOccurrences(source, item.anchor);
    if (occurrences.length !== item.expected_occurrences) {
      fail(
        `landmark ${item.id} occurrence mismatch: expected ${item.expected_occurrences}, got ${occurrences.length}`,
      );
    }
    const position = lineColumnAt(source, occurrences[0]);
    return {
      id: item.id,
      area: item.area,
      purpose: item.purpose,
      line: position.line,
      column: position.column,
      managed_marker: item.anchor.startsWith(`${MANAGED_PREFIX} `),
    };
  });

  landmarks.sort((a, b) => a.line - b.line || a.column - b.column || a.id.localeCompare(b.id));

  return {
    marker: CARTOGRAPHY_MARKER,
    version: 1,
    source_path: sourcePath,
    source_sha256: createHash("sha256").update(source, "utf8").digest("hex"),
    source_line_count: lines.length,
    landmark_count: landmarks.length,
    managed_marker_count: managed.length,
    line_numbers_are_generated: true,
    source_mutation_performed: false,
    landmarks,
  };
}

export function renderMarkdown(map) {
  const out = [];
  out.push("# VOID index cartography v1");
  out.push("");
  out.push(`- Source: \`${map.source_path}\``);
  out.push(`- SHA-256: \`${map.source_sha256}\``);
  out.push(`- Lines: ${map.source_line_count}`);
  out.push(`- Landmarks: ${map.landmark_count}`);
  out.push("");
  out.push("| Landmark | Area | Line | Column | Purpose |");
  out.push("|---|---|---:|---:|---|");
  for (const item of map.landmarks) {
    const purpose = item.purpose.replace(/\|/g, "\\|");
    out.push(`| \`${item.id}\` | ${item.area} | ${item.line} | ${item.column} | ${purpose} |`);
  }
  return `${out.join("\n")}\n`;
}

function parseArgs(argv) {
  const options = {
    repoRoot: process.cwd(),
    registryPath: "docs/index-map-v1.json",
    sourcePath: null,
    format: "json",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--repo-root") options.repoRoot = argv[++i];
    else if (arg === "--registry") options.registryPath = argv[++i];
    else if (arg === "--source") options.sourcePath = argv[++i];
    else if (arg === "--format") options.format = argv[++i];
    else fail(`unknown argument: ${arg}`);
  }
  if (!options.repoRoot) fail("--repo-root requires a value");
  if (!options.registryPath) fail("--registry requires a value");
  if (options.format !== "json" && options.format !== "markdown") {
    fail("--format must be json or markdown");
  }
  return options;
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repoRoot = resolve(options.repoRoot);
  const registryAbs = resolve(repoRoot, options.registryPath);
  const registry = validateRegistry(JSON.parse(readFileSync(registryAbs, "utf8")));
  const sourcePath = options.sourcePath || registry.source_path;
  const sourceAbs = resolve(repoRoot, sourcePath);
  const source = readFileSync(sourceAbs, "utf8");
  const map = buildCartography({ registry, source, sourcePath });
  if (options.format === "markdown") process.stdout.write(renderMarkdown(map));
  else process.stdout.write(`${JSON.stringify(map, null, 2)}\n`);
}

const invoked = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (invoked) {
  try {
    runCli();
  } catch (error) {
    console.error(`VOID_INDEX_CARTOGRAPHY_V1_HOLD: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
