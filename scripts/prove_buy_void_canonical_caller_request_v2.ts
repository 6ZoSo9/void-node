import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const WRITER="src/economic/buy_void_verified_payment_capacity_admission_v1.ts";
const EXPECTED_WRITER="d1320be22fe55af24017b84f0655fbcde82dbee9";
const V1="scripts/prove_buy_void_canonical_caller_request_v1.ts";
const EXPECTED_V1="2815613e1c6fa54ee2d89eb5dc70338a68c7fcb3";
function gitBlob(bytes:Buffer):string{
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
assert.equal(gitBlob(fs.readFileSync(WRITER)),EXPECTED_WRITER,
  "current_fifo_safe_writer_source_required");
assert.equal(gitBlob(fs.readFileSync(V1)),EXPECTED_V1,
  "immutable canonical caller V1 proof changed");
await import("./prove_buy_void_canonical_caller_request_v1.js");
console.log("VOID_BUY_VOID_CANONICAL_CALLER_REQUEST_V2_SOURCE_BINDING_GREEN");
console.log("fifo_safe_writer_source_bound=true");
console.log("canonical_caller_v1_semantics_preserved=true");
console.log("production_payment_authority=false");
console.log("funds_moved=false");
