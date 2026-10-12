#!/usr/bin/env node
// Explicitly isolate the historical enforcement V1 closure's reviewed
// node:util dependency without altering any locked historical manifest.
import assert from "node:assert/strict";
import {
  imports, SOURCE_HEAD, SOURCE_TREE,
} from "./prove_buy_void_enforcement_artifact_attestation_v1.mjs";

assert.equal(SOURCE_HEAD, "26983cd89a30bcd09c52004c7f45bb968c470122");
assert.equal(SOURCE_TREE, "6061038e977622acafd8db70c937eb190743621f");
const p="dist/economic/buy_void_verified_payment_v2.js";
const accepted=imports(p, Buffer.from(
  'import { types as utilTypes } from "node:util";\n',
  "utf8",
));
assert.deepEqual(accepted.externals, ["node:util"]);
assert.deepEqual(accepted.imports, []);
for (const forbidden of [
  'import { execFileSync } from "node:child_process";',
  'import vm from "node:vm";',
  'import { createRequire } from "node:module";',
  'import("../../outside.js");',
  'import(process.env.UNTRUSTED);',
  'require("node:util");',
]) {
  assert.throws(() => imports(p, Buffer.from(forbidden+"\n")),
    /unknown external|escaping\/unknown import|nonliteral import|unsupported loader\/eval/u,
    forbidden);
}
console.log("historical_v1_provenance_pins_unchanged=true");
console.log("reviewed_node_util_import_only=true");
console.log("child_process_vm_module_and_dynamic_imports_rejected=true");
console.log("historical_manifest_mutation=false");
console.log("production_source_finality_authority_ready=false");
console.log("funds_moved=false");
console.log("VOID_BUY_VOID_ENFORCEMENT_V1_UTIL_BOUNDARY_GREEN");
