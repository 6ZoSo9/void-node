import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const nodeCorePath = "src/node_core.ts";
const source = fs.readFileSync(nodeCorePath, "utf8");
const lines = source.split(/\r?\n/);

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

const literalCatchCount = lines.filter((line) => line.includes("} catch {}")).length;

const requiredMarkers = [
  "VOID_MEMPOOL_BEST_EFFORT_FAILURE_VISIBLE",
  "VOID_PEER_HEAD_PROBE_BEST_EFFORT_FAILURE_VISIBLE",
  "VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_FAILURE_VISIBLE",
  "VOID_REMAINING_RUNTIME_BEST_EFFORT_FAILURE_VISIBLE",
  "VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_FAILURE_VISIBLE",
];

const requiredProofs = [
  "scripts/prove_mempool_best_effort_silent_catch_visibility.ts",
  "scripts/prove_peer_head_probe_best_effort_silent_catch_visibility.ts",
  "scripts/prove_import_head_advance_best_effort_silent_catch_visibility.ts",
  "scripts/prove_remaining_runtime_best_effort_silent_catch_visibility.ts",
  "scripts/prove_silent_catch_classification_registry.ts",
  "scripts/prove_peer_import_side_effect_write_error_visibility_preflight.ts",
  "scripts/prove_peer_import_side_effect_write_error_visibility_closure.ts",
  "scripts/prove_repo_work_runtime_quiescence_preflight.ts",
];

const findings: Finding[] = [
  {
    id: "literal-catch-zero",
    status: literalCatchCount === 0 ? "PASS" : "FAIL",
    detail: `literal catch {} count=${literalCatchCount}, expected=0`,
  },
  ...requiredMarkers.map((marker): Finding => ({
    id: `marker-present-${marker}`,
    status: source.includes(marker) ? "PASS" : "FAIL",
    detail: source.includes(marker) ? "marker present" : "marker missing",
  })),
  ...requiredProofs.map((proofPath): Finding => ({
    id: `proof-present-${proofPath}`,
    status: fs.existsSync(proofPath) ? "PASS" : "FAIL",
    detail: fs.existsSync(proofPath) ? "proof present" : "proof missing",
  })),
];

const failures = findings.filter((finding) => finding.status === "FAIL");

console.log(`VOID_SILENT_CATCH_ZERO_TERMINAL_FINAL_SEAL_NODE_CORE_SHA256=${sha256(source)}`);
console.log(`VOID_SILENT_CATCH_ZERO_TERMINAL_FINAL_SEAL_LITERAL_CATCH_COUNT=${literalCatchCount}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_SILENT_CATCH_ZERO_TERMINAL_FINAL_SEAL_V1_FAIL");
  process.exit(1);
}

console.log("VOID_SILENT_CATCH_ZERO_TERMINAL_FINAL_SEAL_V1_GREEN");
