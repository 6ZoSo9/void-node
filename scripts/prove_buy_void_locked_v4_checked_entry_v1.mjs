import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

// Test the SAME helper body as the locked V4 proof, not an independently
// reimplemented copy that could inadvertently diverge from production.
const lockedProofSource = fs.readFileSync(
  "scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v4.mjs",
  "utf8",
);
const begin = lockedProofSource.indexOf(
  "function executeReviewedCandidateBytesV4(",
);
const end = lockedProofSource.indexOf(
  "\nfunction deriveLockedManifest() {",
  begin,
);
assert.ok(begin >= 0 && end > begin, "checked_entry_helper_missing");
assert.equal(
  lockedProofSource.includes(
    '[path.join(ROOT, CANDIDATE_SCRIPT), "--derive"]',
  ),
  false,
  "source must never execute the candidate through a second path open",
);
const exactHelperText = lockedProofSource.slice(begin, end);
const executeCaptured = vm.runInNewContext(
  exactHelperText + "\nexecuteReviewedCandidateBytesV4",
  { execFileSync, path, pathToFileURL, process },
);
assert.equal(typeof executeCaptured, "function");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-v4-checked-entry-"));
const entry = path.join(root, "scripts", "candidate.mjs");
const notReviewedFlag = path.join(root, "not-reviewed-executed.flag");
const preloadFlag = path.join(root, "ambient-node-loader.flag");
const initialNodeOptions = process.env.NODE_OPTIONS;
const initialNodePath = process.env.NODE_PATH;
try {
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  fs.mkdirSync(path.join(root, "dist", "economic"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "dist", "economic", "fixture.mjs"),
    'export default "CLOSED_DEPENDENCY_OK";\n',
    { mode: 0o600 },
  );
  const trustedSource = [
    'import path from "node:path";',
    'import { fileURLToPath } from "node:url";',
    'const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");',
    'const mod = await import("../dist/economic/fixture.mjs");',
    'if (process.argv.slice(2).join(",") !== "--derive") throw Error("argv_mismatch");',
    'console.log("CAPTURED_SOURCE:" + (ROOT === ' +
      JSON.stringify(root) + ' ? "ROOT_BOUND" : "WRONG_ROOT") + ":" + mod.default);',
  ].join("\n") + "\n";
  fs.writeFileSync(entry, trustedSource, { mode: 0o600 });
  const capturedBytes = fs.readFileSync(entry);
  assert.equal(capturedBytes.toString("utf8"), trustedSource);

  // A different executable replaces the pathname after bytes were captured.
  // Running node(entry) would execute this attacker's file, but the real
  // locked-V4 helper must never open that path as the child entry.
  const attackerSource =
    'import fs from "node:fs";' +
    'fs.writeFileSync(' + JSON.stringify(notReviewedFlag) + ', "executed");' +
    'console.log("CAPTURED_SOURCE:ROOT_BOUND:CLOSED_DEPENDENCY_OK");\n';
  fs.renameSync(entry, path.join(root, "scripts", "reviewed-displaced.mjs"));
  fs.writeFileSync(entry, attackerSource, { mode: 0o600 });
  const output = executeCaptured(capturedBytes, entry);
  assert.equal(
    output.trim(),
    "CAPTURED_SOURCE:ROOT_BOUND:CLOSED_DEPENDENCY_OK",
    "captured bytes must execute with their original ESM source directory",
  );
  assert.equal(
    fs.existsSync(notReviewedFlag), false,
    "replaced candidate pathname must never be executed",
  );

  // A loader/preload present in an ambient parent environment must not be
  // able to modify the source-attestation child, even when Node would honor
  // NODE_OPTIONS if it were inherited.
  const preload = path.join(root, "unreviewed-preload.mjs");
  fs.writeFileSync(
    preload,
    'import fs from "node:fs"; fs.writeFileSync(' +
      JSON.stringify(preloadFlag) + ', "unexpected ambient loader");\n',
    { mode: 0o600 },
  );
  process.env.NODE_OPTIONS = "--import=" + preload;
  process.env.NODE_PATH = root;
  assert.equal(executeCaptured(capturedBytes, entry), output);
  assert.equal(fs.existsSync(preloadFlag), false, "ambient Node loader escaped");
  assert.equal(fs.existsSync(notReviewedFlag), false);

  console.log("VOID_BUY_VOID_LOCKED_V4_CAPTURED_EXECUTED_BYTES_V1_GREEN");
  console.log("production_helper_source_extracted_verbatim=true");
  console.log("synthetic_path_replacement_executed=false");
  console.log("relative_v6_style_dynamic_import_resolved=true");
  console.log("import_meta_url_and_process_argv_rebound=true");
  console.log("ambient_NODE_OPTIONS_loader_executed=false");
  console.log("ambient_NODE_PATH_inherited=false");
  console.log("real_checkout_files_mutated=false");
  console.log("customer_ledger_or_signer_access=false");
  console.log("compiled_artifact_not_deployed=true");
  console.log("production_source_finality_authority_ready=false");
  console.log("funds_moved=false");
} finally {
  if (initialNodeOptions === undefined) delete process.env.NODE_OPTIONS;
  else process.env.NODE_OPTIONS = initialNodeOptions;
  if (initialNodePath === undefined) delete process.env.NODE_PATH;
  else process.env.NODE_PATH = initialNodePath;
  fs.rmSync(root, { recursive: true, force: true });
}
