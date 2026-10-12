import assert from "node:assert/strict";
import fs from "node:fs";
import { performance } from "node:perf_hooks";

import {
  observeBuyVoidSourceFinalityGenerationProvenanceV6,
} from "../src/economic/buy_void_source_finality_generation_provenance_v6.js";

const originalReadSync = fs.readSync;
let delayedReads = 0;

try {
  (fs as any).readSync = (...args: unknown[]) => {
    delayedReads += 1;
    const until = performance.now() + 10;
    while (performance.now() < until) {
      // Deliberately consume the bounded V6 descriptor-read preflight budget
      // without network activity or source-file mutation.
    }
    return (originalReadSync as any).apply(fs, args);
  };

  const result = await observeBuyVoidSourceFinalityGenerationProvenanceV6({
    request: {} as any,
    policy: {
      source_finality_policy: {} as any,
      authority_policy_generation: {} as any,
      total_timeout_ms: "5",
    },
  });

  assert.equal(result.ok, false);
  if (result.ok !== false) {
    throw new Error("V6 preflight deadline unexpectedly produced success");
  }
  assert.equal(result.reason, "source_finality_total_deadline_exceeded");
  assert.ok(delayedReads >= 1);
} finally {
  (fs as any).readSync = originalReadSync;
}

console.log(JSON.stringify({
  marker: "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6_PREFLIGHT_DEADLINE_GREEN",
  preflight_uses_original_total_deadline: true,
  delayed_source_reads: delayedReads,
  external_rpc_executed_by_proof: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
}, null, 2));
console.log("VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6_PREFLIGHT_DEADLINE_GREEN");
