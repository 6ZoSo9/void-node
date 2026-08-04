import assert from "node:assert/strict";
import fs from "node:fs";

import {
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1,
} from "../integrations/agents/authenticated-paid-work-runtime-revalidation-v1/index.mjs";
import {
  buildAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1,
  computeAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingIdV1,
  validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1,
  verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1,
  VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_EXPECTED,
} from "../integrations/agents/authenticated-paid-work-runtime-revalidation-v1/trusted-context-binding-guard-v1.mjs";

const receiptPath =
  "fixtures/agents/authenticated-paid-work-runtime-revalidation-receipt-v1.example.json";
const bindingPath =
  "fixtures/agents/authenticated-paid-work-runtime-revalidation-trusted-context-binding-v1.example.json";

function clone(value) {
  return structuredClone(value);
}

function reseal(binding) {
  binding.binding_id =
    computeAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingIdV1(
      binding,
    );
  return binding;
}

function expectReject(label, operation, pattern) {
  try {
    operation();
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!pattern.test(message)) {
      throw new Error(`${label}_wrong_error:${message}`);
    }
    return;
  }
  throw new Error(`${label}_did_not_reject`);
}

const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const bindingFixture = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(receipt);
validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
  bindingFixture,
);
assert.equal(
  verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(
    receipt,
    bindingFixture,
  ),
  true,
);

const expected =
  VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_EXPECTED;
const buildInput = {
  receipt_id: receipt.receipt_id,
  observation: {
    evaluated_at_utc: receipt.observation.evaluated_at_utc,
  },
  trusted_context: {
    ...expected,
    reference_metadata_verified: true,
    bundle_contract_verified: true,
    bundle_sha256_verified: true,
    bundle_path_fingerprint_verified: true,
    provider_binding_verified: true,
    private_bundle_read_performed: true,
    private_path_disclosed: false,
    bundle_contents_disclosed: false,
    secret_material_disclosed: false,
  },
  authority: {
    activation_authorized: false,
    deployment: false,
    service_restart: false,
    live_authentication: false,
    payment_execution: false,
    work_dispatch: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_broadcast: false,
    signing: false,
    fund_movement: false,
  },
};
const rebuilt =
  buildAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
    buildInput,
  );
assert.deepEqual(
  rebuilt,
  bindingFixture,
  "checked-in trusted-context binding must rebuild deterministically",
);

const wrongReceipt = clone(bindingFixture);
wrongReceipt.receipt_id = `voidapwrr1_${"f".repeat(64)}`;
reseal(wrongReceipt);
expectReject(
  "wrong_receipt_link",
  () => verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(
    receipt,
    wrongReceipt,
  ),
  /trusted_context_binding_receipt_id_mismatch/,
);

const wrongTime = clone(bindingFixture);
wrongTime.observation.evaluated_at_utc = "2026-08-04T16:50:10.250Z";
reseal(wrongTime);
expectReject(
  "wrong_observation_time",
  () => verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(
    receipt,
    wrongTime,
  ),
  /trusted_context_binding_observation_time_mismatch/,
);

const wrongMetadataCommit = clone(bindingFixture);
wrongMetadataCommit.trusted_context.trusted_context_metadata_commit =
  "0".repeat(40);
reseal(wrongMetadataCommit);
expectReject(
  "wrong_metadata_commit",
  () =>
    validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
      wrongMetadataCommit,
    ),
  /trusted_context_trusted_context_metadata_commit_mismatch/,
);

const wrongBundleDigest = clone(bindingFixture);
wrongBundleDigest.trusted_context.bundle_sha256 = "0".repeat(64);
reseal(wrongBundleDigest);
expectReject(
  "wrong_bundle_digest",
  () =>
    validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
      wrongBundleDigest,
    ),
  /trusted_context_bundle_sha256_mismatch/,
);

const bundleNotRead = clone(bindingFixture);
bundleNotRead.trusted_context.private_bundle_read_performed = false;
reseal(bundleNotRead);
expectReject(
  "bundle_not_read",
  () =>
    validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
      bundleNotRead,
    ),
  /trusted_context_private_bundle_read_performed_must_be_true/,
);

const pathDisclosed = clone(bindingFixture);
pathDisclosed.trusted_context.private_path_disclosed = true;
reseal(pathDisclosed);
expectReject(
  "private_path_disclosed",
  () =>
    validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
      pathDisclosed,
    ),
  /trusted_context_private_path_disclosed_must_be_false/,
);

const contentsDisclosed = clone(bindingFixture);
contentsDisclosed.trusted_context.bundle_contents_disclosed = true;
reseal(contentsDisclosed);
expectReject(
  "bundle_contents_disclosed",
  () =>
    validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
      contentsDisclosed,
    ),
  /trusted_context_bundle_contents_disclosed_must_be_false/,
);

const activationGranted = clone(bindingFixture);
activationGranted.authority.activation_authorized = true;
reseal(activationGranted);
expectReject(
  "activation_granted",
  () =>
    validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
      activationGranted,
    ),
  /authority_activation_authorized_must_be_false/,
);

const tamperedId = clone(bindingFixture);
tamperedId.binding_id = `voidapwrtcb1_${"f".repeat(64)}`;
expectReject(
  "binding_id_tamper",
  () =>
    validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
      tamperedId,
    ),
  /binding_id_derivation_mismatch/,
);

console.log(`binding_id=${bindingFixture.binding_id}`);
console.log(`receipt_id=${bindingFixture.receipt_id}`);
console.log(
  `trusted_context_metadata_commit=${bindingFixture.trusted_context.trusted_context_metadata_commit}`,
);
console.log(
  `trusted_context_reference_id=${bindingFixture.trusted_context.trusted_context_reference_id}`,
);
console.log(
  `trusted_context_bundle_sha256=${bindingFixture.trusted_context.bundle_sha256}`,
);
console.log("trusted_context_receipt_link_exact=true");
console.log("trusted_context_observation_time_exact=true");
console.log("trusted_context_metadata_binding_exact=true");
console.log("trusted_context_bundle_digest_exact=true");
console.log("private_bundle_read_performed=true");
console.log("private_path_disclosed=false");
console.log("bundle_contents_disclosed=false");
console.log("activation_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_V1_PROOF_GREEN",
);
