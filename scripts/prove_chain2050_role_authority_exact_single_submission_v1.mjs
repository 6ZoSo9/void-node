#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  runRoleAuthorityExactSingleSubmissionSelfTestV1,
} from "../tools/chain2050-role-authority-exact-single-submission-v1.mjs";

const result =
  await runRoleAuthorityExactSingleSubmissionSelfTestV1();

assert.equal(result.ok, true);
assert.equal(result.first.ok, true);
assert.equal(result.first.rpc_send_invocation_count, 1);
assert.equal(
  result.first.classification,
  "RECEIPT_SUCCESS_RUNTIME_BYTECODE_VERIFICATION_REQUIRED",
);
assert.equal(
  result.first.rpc_send_result_matches_expected_hash,
  true,
);
assert.equal(result.first.automatic_retry_performed, false);
assert.equal(result.first.replacement_transaction_created, false);
assert.equal(result.duplicate.ok, false);
assert.equal(
  result.duplicate.reason,
  "submission_attempt_already_recorded",
);
assert.equal(result.send_count_after_duplicate, 1);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-exact-single-submission-v1.mjs",
  "utf8",
);

for (const forbidden of [
  "eth_sendTransaction",
  "signTransaction(",
  "signMessage(",
  "privateKey",
  "mnemonic",
  "setInterval(",
  "setTimeout(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

assert.equal(
  source.includes(
    "voidcraba1_66779fab9c8657d7f038585525dfc2ac688adfe33cf10a5d5827abb140e04c85",
  ),
  true,
);
assert.equal(
  source.includes(
    "0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4",
  ),
  true,
);
assert.equal(
  source.includes(
    "96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d",
  ),
  true,
);
assert.equal(
  source.includes(
    "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  ),
  true,
);
assert.equal(
  source.includes("submission_attempt_already_recorded"),
  true,
);
assert.equal(
  source.includes("automatic_retry_performed: false"),
  true,
);

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_EXACT_SINGLE_SUBMISSION_V1_GREEN",
);
console.log("durable_consumption_record_required=true");
console.log("signed_file_sha256_reverified_after_consumption=true");
console.log("durable_submission_intent_before_rpc=true");
console.log("eth_sendRawTransaction_maximum_invocations_per_attempt=1");
console.log("duplicate_invocation_rpc_send_count=0");
console.log("automatic_retry=false");
console.log("replacement_transaction=false");
console.log("post_attempt_reconciliation=read_only");
console.log("runtime_bytecode_verification_required_after_receipt_success=true");
