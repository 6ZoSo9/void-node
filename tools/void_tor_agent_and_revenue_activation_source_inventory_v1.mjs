#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const VOID_TOR_STAGE1_SOURCE_INVENTORY_MARKER =
  "VOID_TOR_STAGE1_MCP_ONION_BRIDGE_SOURCE_INVENTORY_V1";

export const VOID_TOR_STAGE1_SOURCE_PATHS = Object.freeze([
  ".github/workflows/tor-agent-and-revenue-activation-v1.yml",
  "docs/operations/tor-agent-and-revenue-activation-v1.md",
  "examples/tor-agent-and-revenue-activation-v1.example.json",
  "schemas/tor-agent-and-revenue-activation-v1.schema.json",
  "scripts/prove_tor_agent_and_revenue_activation_v1.mjs",
  "tools/void-tor-onion-public-node-v1.mjs",
  "tools/void_tor_agent_and_revenue_activation_source_inventory_v1.mjs",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function inspectTrackedSource(repoRootValue, relativePath) {
  const repoRoot = resolve(repoRootValue);
  const path = resolve(repoRoot, relativePath);
  if (
    path !== repoRoot
    && !path.startsWith(`${repoRoot}/`)
  ) {
    throw new Error(`source escapes repository root: ${relativePath}`);
  }
  if (!existsSync(path)) {
    throw new Error(`source is missing: ${relativePath}`);
  }
  const metadata = lstatSync(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(
      `source must be a regular non-symlink file: ${relativePath}`,
    );
  }
  const body = readFileSync(path);
  return Object.freeze({
    path: relativePath,
    bytes: body.byteLength,
    sha256: sha256(body),
    executable: (metadata.mode & 0o111) !== 0,
  });
}

export function inventoryVoidTorStage1SourcesV1(repoRootValue) {
  const sources = VOID_TOR_STAGE1_SOURCE_PATHS.map(
    (relativePath) =>
      inspectTrackedSource(repoRootValue, relativePath),
  );
  return Object.freeze({
    marker: VOID_TOR_STAGE1_SOURCE_INVENTORY_MARKER,
    version: 1,
    stage: "signed-machine-discovery-and-read-only-mcp-over-onion",
    sources,
    runtime_boundary: Object.freeze({
      tor_public_path: "/mcp",
      tor_descriptor_paths: Object.freeze([
        "/.well-known/void-agent-mcp-onion-v1.json",
        "/public-node/agents/mcp-tor-v1.json",
      ]),
      upstream_host: "127.0.0.1",
      upstream_port: 4114,
      upstream_path: "/mcp",
      generic_proxy: false,
      application_authority: "read_only",
      paid_work_submission: false,
      tor_configuration_change: false,
      hidden_service_key_change: false,
    }),
  });
}

function parseArgs(argv) {
  const options = {
    repoRoot: process.cwd(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repo-root") {
      index += 1;
      if (index >= argv.length) {
        throw new Error("missing value for --repo-root");
      }
      options.repoRoot = argv[index];
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      "Usage: node tools/void_tor_agent_and_revenue_activation_source_inventory_v1.mjs [--repo-root PATH]",
    );
    return;
  }
  console.log(
    JSON.stringify(
      inventoryVoidTorStage1SourcesV1(options.repoRoot),
      null,
      2,
    ),
  );
  console.log("VOID_TOR_STAGE1_MCP_ONION_BRIDGE_SOURCE_INVENTORY_V1_EXACT_GREEN");
}

const directInvocation = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (directInvocation === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error("VOID_TOR_STAGE1_MCP_ONION_BRIDGE_SOURCE_INVENTORY_V1_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
