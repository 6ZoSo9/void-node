#!/usr/bin/env node

import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_ROOT_SCOPE_GUARD_V1";
export const SOURCE_SCOPE = "direct_regular_json_files_only";

function fail(message) {
  throw new Error(message);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

function parseArgs(argv) {
  let output = null;
  let repoRoot = process.cwd();
  let requireExactOne = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--repo-root") {
      const next = argv[index + 1];
      assertCondition(next, "--repo-root requires a path");
      repoRoot = resolve(next);
      index += 1;
      continue;
    }
    if (value === "--output") {
      const next = argv[index + 1];
      assertCondition(next, "--output requires a path");
      output = resolve(next);
      index += 1;
      continue;
    }
    if (value === "--require-exact-one") {
      requireExactOne = true;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  node tools/buy-void-observe-and-claim-candidate-readiness-root-scope-guard-v1.mjs [options]",
        "",
        "Options:",
        "  --repo-root PATH       Repository root containing .runtime request records",
        "  --output PATH          Write the guarded JSON report to this operator-selected file",
        "  --require-exact-one    Exit 3 for no candidate or 4 for multiple candidates",
        "  --help                 Show this help",
      ].join("\n"));
      process.exit(0);
    }
    fail(`unknown argument: ${value}`);
  }

  return { output, repoRoot, requireExactOne };
}

function isJsonName(name) {
  return name.toLowerCase().endsWith(".json");
}

function countNestedJsonEntries(directory) {
  if (!existsSync(directory)) return 0;
  let count = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      count += countNestedJsonEntries(absolute);
      continue;
    }
    if (isJsonName(entry.name)) count += 1;
  }
  return count;
}

function preparePrivateDirectory(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
}

function writePrivateJson(file, value) {
  const parent = dirname(file);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true, mode: 0o700 });
    chmodSync(parent, 0o700);
  }
  const metadata = lstatSync(parent);
  assertCondition(
    metadata.isDirectory() && !metadata.isSymbolicLink(),
    "output parent must be a direct directory",
  );
  if (typeof process.getuid === "function") {
    assertCondition(metadata.uid === process.getuid(), "output parent owner mismatch");
  }
  assertCondition(
    (metadata.mode & 0o077) === 0,
    "output parent must deny group and other access",
  );
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(file, 0o600);
}

function localTsxPath(sourceRoot) {
  const configured = String(process.env.VOID_REPO_TSX_PATH || "").trim();
  const candidate = configured || join(
    sourceRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsx.cmd" : "tsx",
  );
  assertCondition(existsSync(candidate), `repository-local tsx not found: ${candidate}`);
  return candidate;
}

function copyDirectRegularJsonFiles(sourceDirectory, mirrorDirectory) {
  let directRegularJsonFileCount = 0;
  let directSpecialJsonEntryCount = 0;
  let nestedJsonEntryCount = 0;

  if (!existsSync(sourceDirectory)) {
    return {
      directRegularJsonFileCount,
      directSpecialJsonEntryCount,
      nestedJsonEntryCount,
    };
  }

  const sourceMetadata = lstatSync(sourceDirectory);
  assertCondition(
    sourceMetadata.isDirectory() && !sourceMetadata.isSymbolicLink(),
    "request directory must be a direct directory",
  );

  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    const source = join(sourceDirectory, entry.name);
    if (entry.isDirectory()) {
      nestedJsonEntryCount += countNestedJsonEntries(source);
      continue;
    }
    if (!isJsonName(entry.name)) continue;
    if (!entry.isFile()) {
      directSpecialJsonEntryCount += 1;
      continue;
    }

    const metadata = lstatSync(source);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      directSpecialJsonEntryCount += 1;
      continue;
    }
    assertCondition(metadata.size <= 32 * 1024 * 1024, "direct JSON file exceeds size bound");

    const destination = join(mirrorDirectory, entry.name);
    copyFileSync(source, destination);
    chmodSync(destination, 0o600);
    directRegularJsonFileCount += 1;
  }

  return {
    directRegularJsonFileCount,
    directSpecialJsonEntryCount,
    nestedJsonEntryCount,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const innerCli = join(
    sourceRoot,
    "scripts",
    "buy_void_observe_and_claim_candidate_readiness_v1.ts",
  );
  assertCondition(existsSync(innerCli), "maintained candidate readiness CLI missing");

  const requestDirectory = join(
    args.repoRoot,
    ".runtime",
    "public-buy-void-requests-v1",
  );
  const temporaryRoot = mkdtempSync(join(
    tmpdir(),
    "void-buy-void-root-scope-guard-",
  ));
  chmodSync(temporaryRoot, 0o700);

  try {
    const mirrorRequestDirectory = join(
      temporaryRoot,
      ".runtime",
      "public-buy-void-requests-v1",
    );
    preparePrivateDirectory(mirrorRequestDirectory);

    const discovery = copyDirectRegularJsonFiles(
      requestDirectory,
      mirrorRequestDirectory,
    );
    const innerReportPath = join(temporaryRoot, "inner-readiness-report-v1.json");
    const result = spawnSync(
      localTsxPath(sourceRoot),
      [
        innerCli,
        "--repo-root",
        temporaryRoot,
        "--output",
        innerReportPath,
      ],
      {
        cwd: sourceRoot,
        encoding: "utf8",
        env: { ...process.env },
        timeout: 120_000,
      },
    );

    assertCondition(!result.error, `maintained CLI spawn failed: ${String(result.error || "")}`);
    assertCondition(
      result.status === 0,
      [
        "maintained CLI failed",
        `status=${String(result.status)}`,
        `stdout=${String(result.stdout || "").slice(0, 4096)}`,
        `stderr=${String(result.stderr || "").slice(0, 4096)}`,
      ].join("\n"),
    );
    assertCondition(existsSync(innerReportPath), "maintained CLI report missing");

    const innerReport = JSON.parse(readFileSync(innerReportPath, "utf8"));
    assertCondition(
      innerReport.request_json_file_count === discovery.directRegularJsonFileCount,
      "mirrored direct JSON count mismatch",
    );
    assertCondition(innerReport.activation_performed === false, "inner CLI performed activation");
    assertCondition(
      innerReport.runtime_mutation_performed === false,
      "inner CLI performed runtime mutation",
    );
    assertCondition(
      innerReport.authority?.wallet_access === false
        && innerReport.authority?.signing === false
        && innerReport.authority?.transaction_broadcast === false
        && innerReport.authority?.money_movement === false,
      "inner CLI authority boundary mismatch",
    );

    const payload = {
      ...innerReport,
      repository_root: args.repoRoot,
      request_directory: requestDirectory,
      root_scope_guard_marker: MARKER,
      root_scope_guard_version: 1,
      candidate_source_scope: SOURCE_SCOPE,
      direct_regular_json_file_count:
        discovery.directRegularJsonFileCount,
      direct_special_json_entry_count:
        discovery.directSpecialJsonEntryCount,
      nested_json_entry_count:
        discovery.nestedJsonEntryCount,
      nested_json_entries_ignored: true,
      special_json_entries_ignored: true,
      root_scope_discovery_complete: true,
      private_temporary_mirror_used: true,
      private_temporary_mirror_path_disclosed: false,
      runtime_request_state_write_performed: false,
      network_request_performed: false,
      activation_performed: false,
      runtime_mutation_performed: false,
    };

    const rendered = `${JSON.stringify(payload, null, 2)}\n`;
    if (args.output) {
      writePrivateJson(args.output, payload);
      console.log(`report=${args.output}`);
    } else {
      process.stdout.write(rendered);
    }

    console.log(`root_scope_guard_marker=${MARKER}`);
    console.log(`candidate_source_scope=${SOURCE_SCOPE}`);
    console.log(`direct_regular_json_file_count=${discovery.directRegularJsonFileCount}`);
    console.log(`direct_special_json_entry_count=${discovery.directSpecialJsonEntryCount}`);
    console.log(`nested_json_entry_count=${discovery.nestedJsonEntryCount}`);
    console.log("nested_json_entries_ignored=true");
    console.log("runtime_request_state_write_performed=false");
    console.log("network_request_performed=false");
    console.log("activation_performed=false");
    console.log("money_movement=false");

    if (args.requireExactOne) {
      if (payload.readiness_status === "none") process.exitCode = 3;
      if (payload.readiness_status === "multiple") process.exitCode = 4;
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
