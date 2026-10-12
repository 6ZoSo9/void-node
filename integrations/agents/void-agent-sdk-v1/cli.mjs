#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  discoverVoidAgentV1,
  verifyVoidAgentReportV1,
} from "./index.mjs";

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = {
    baseUrl: "",
    wanted: undefined,
    timeoutMs: 10_000,
    maxResponseBytes: 1_048_576,
    output: null,
    pretty: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--base") {
      options.baseUrl = argv[++index] ?? "";
    } else if (value === "--want") {
      options.wanted = (argv[++index] ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    } else if (value === "--timeout-ms") {
      options.timeoutMs = Number(argv[++index]);
    } else if (value === "--max-response-bytes") {
      options.maxResponseBytes = Number(argv[++index]);
    } else if (value === "--output") {
      options.output = argv[++index] ?? "";
    } else if (value === "--pretty") {
      options.pretty = true;
    } else if (value === "--help" || value === "-h") {
      process.stdout.write(
        [
          "VOID Agent SDK v1",
          "",
          "Usage:",
          "  void-agent --base https://node.example [options]",
          "",
          "Options:",
          "  --want <id,id>               Requested capability IDs",
          "  --timeout-ms <ms>            Per-request timeout (100..60000)",
          "  --max-response-bytes <bytes> Response bound (1024..8388608)",
          "  --output <report.json>       Create a mode-0600 report file",
          "  --pretty                     Pretty-print JSON",
          "",
          "The client sends anonymous same-origin GET requests only.",
          "",
        ].join("\n"),
      );
      return null;
    } else {
      fail(`unknown_argument:${value}`);
    }
  }

  if (!options.baseUrl) fail("missing_required_argument:--base");
  if (options.output === "") fail("output_path_missing");
  return options;
}

function writeCreateOnly(file, text) {
  const resolved = path.resolve(file);
  fs.writeFileSync(resolved, text, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

export async function runVoidAgentCliV1(argv, dependencies = {}) {
  const options = parseArgs(argv);
  if (options === null) return { exitCode: 0, report: null };

  const report = await discoverVoidAgentV1({
    baseUrl: options.baseUrl,
    wanted: options.wanted,
    timeoutMs: options.timeoutMs,
    maxResponseBytes: options.maxResponseBytes,
    fetchImpl: dependencies.fetchImpl ?? globalThis.fetch,
  });
  verifyVoidAgentReportV1(report);

  const text = `${JSON.stringify(report, null, options.pretty ? 2 : 0)}\n`;
  if (options.output) {
    writeCreateOnly(options.output, text);
  } else {
    (dependencies.stdout ?? process.stdout).write(text);
  }
  return { exitCode: 0, report };
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === invokedUrl) {
  try {
    const result = await runVoidAgentCliV1(process.argv.slice(2));
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`HOLD: ${String(error?.message ?? error)}\n`);
    process.exitCode = 78;
  }
}
