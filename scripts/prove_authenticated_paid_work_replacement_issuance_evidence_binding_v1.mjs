import assert from "node:assert/strict";
import fs from "node:fs";

import {
  computeReplacementIssuancePreparationPacketIdV1,
  validateAuthenticatedPaidWorkReplacementIssuancePreparationV1,
} from "../integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/index.mjs";
import {
  verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1,
} from "../integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/evidence-binding-guard-v1.mjs";

const readJson = (pathname) => JSON.parse(fs.readFileSync(pathname, "utf8"));
const clone = (value) => structuredClone(value);
const reseal = (packet) => {
  packet.packet_id = computeReplacementIssuancePreparationPacketIdV1(packet);
  return packet;
};
const expectReject = (label, operation, pattern) => {
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
};

const packet = readJson(
  "fixtures/agents/authenticated-paid-work-replacement-issuance-preparation-v1.example.json",
);
const evidenceInput = {
  rotation_plan: readJson(
    "fixtures/agents/authenticated-paid-work-credential-rotation-plan-v1.example.json",
  ),
  rotation_runtime_binding: readJson(
    "fixtures/agents/authenticated-paid-work-credential-rotation-runtime-revalidation-binding-v1.example.json",
  ),
  runtime_receipt: readJson(
    "fixtures/agents/authenticated-paid-work-runtime-revalidation-receipt-v1.example.json",
  ),
  trusted_context_binding: readJson(
    "fixtures/agents/authenticated-paid-work-runtime-revalidation-trusted-context-binding-v1.example.json",
  ),
};

assert.equal(
  verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1(
    packet,
    evidenceInput,
  ),
  true,
);

const forgedReceiptLink = clone(packet);
forgedReceiptLink.evidence.runtime_receipt_id =
  `voidapwrr1_${"f".repeat(64)}`;
reseal(forgedReceiptLink);
assert.equal(
  validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(
    forgedReceiptLink,
  ),
  forgedReceiptLink,
  "standalone validator is intentionally only a closed packet-shape primitive",
);
expectReject(
  "forged_runtime_receipt_link",
  () =>
    verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1(
      forgedReceiptLink,
      evidenceInput,
    ),
  /packet_runtime_receipt_id_mismatch/,
);

const forgedTrustedContextLink = clone(packet);
forgedTrustedContextLink.evidence.trusted_context_binding_id =
  `voidapwrtcb1_${"e".repeat(64)}`;
reseal(forgedTrustedContextLink);
assert.equal(
  validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(
    forgedTrustedContextLink,
  ),
  forgedTrustedContextLink,
);
expectReject(
  "forged_trusted_context_link",
  () =>
    verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1(
      forgedTrustedContextLink,
      evidenceInput,
    ),
  /packet_trusted_context_binding_id_mismatch/,
);

const forgedObservationLink = clone(packet);
forgedObservationLink.evidence.evaluated_at_utc =
  "2026-08-04T16:50:08.250Z";
reseal(forgedObservationLink);
assert.equal(
  validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(
    forgedObservationLink,
  ),
  forgedObservationLink,
);
expectReject(
  "forged_observation_link",
  () =>
    verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1(
      forgedObservationLink,
      evidenceInput,
    ),
  /packet_evaluated_at_utc_mismatch/,
);

const extraEvidenceInput = {
  ...evidenceInput,
  execution_authority: false,
};
expectReject(
  "unknown_evidence_input_key",
  () =>
    verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1(
      packet,
      extraEvidenceInput,
    ),
  /evidence_input_keys_mismatch/,
);

console.log(`packet_id=${packet.packet_id}`);
console.log(`runtime_receipt_id=${packet.evidence.runtime_receipt_id}`);
console.log(
  `trusted_context_binding_id=${packet.evidence.trusted_context_binding_id}`,
);
console.log("standalone_packet_validation_is_shape_only=true");
console.log("runtime_receipt_link_revalidated=true");
console.log("trusted_context_link_revalidated=true");
console.log("observation_time_link_revalidated=true");
console.log("rotation_identity_links_revalidated=true");
console.log("credential_agent_scope_links_revalidated=true");
console.log("execution_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_EVIDENCE_BINDING_V1_PROOF_GREEN",
);
