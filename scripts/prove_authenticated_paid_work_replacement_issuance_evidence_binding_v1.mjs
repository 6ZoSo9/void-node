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

function newTrapCounters() {
  return {
    get: 0,
    getPrototypeOf: 0,
    ownKeys: 0,
    getOwnPropertyDescriptor: 0,
    has: 0,
  };
}

function trappedProxy(target, counters) {
  return new Proxy(target, {
    get(...args) {
      counters.get += 1;
      return Reflect.get(...args);
    },
    getPrototypeOf(...args) {
      counters.getPrototypeOf += 1;
      return Reflect.getPrototypeOf(...args);
    },
    ownKeys(...args) {
      counters.ownKeys += 1;
      return Reflect.ownKeys(...args);
    },
    getOwnPropertyDescriptor(...args) {
      counters.getOwnPropertyDescriptor += 1;
      return Reflect.getOwnPropertyDescriptor(...args);
    },
    has(...args) {
      counters.has += 1;
      return Reflect.has(...args);
    },
  });
}

function assertNoTraps(counters, label) {
  assert.deepEqual(
    counters,
    newTrapCounters(),
    `${label}_proxy_trap_executed`,
  );
}

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

const packetProxyCounters = newTrapCounters();
const packetProxy = trappedProxy(packet, packetProxyCounters);
expectReject(
  "packet_proxy_before_semantic_validation",
  () =>
    verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1(
      packetProxy,
      evidenceInput,
    ),
  /closed_input_proxy_forbidden:\$packet/,
);
assertNoTraps(packetProxyCounters, "packet");

const receiptProxyCounters = newTrapCounters();
const evidenceWithReceiptProxy = {
  ...evidenceInput,
  runtime_receipt: trappedProxy(
    evidenceInput.runtime_receipt,
    receiptProxyCounters,
  ),
};
expectReject(
  "nested_receipt_proxy_before_semantic_validation",
  () =>
    verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1(
      packet,
      evidenceWithReceiptProxy,
    ),
  /closed_input_proxy_forbidden:\$evidence_input\.runtime_receipt/,
);
assertNoTraps(receiptProxyCounters, "runtime_receipt");

let accessorReads = 0;
const evidenceWithReceiptAccessor = {
  ...evidenceInput,
};
Object.defineProperty(evidenceWithReceiptAccessor, "runtime_receipt", {
  enumerable: true,
  configurable: true,
  get() {
    accessorReads += 1;
    return evidenceInput.runtime_receipt;
  },
});
expectReject(
  "nested_receipt_accessor_before_semantic_validation",
  () =>
    verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1(
      packet,
      evidenceWithReceiptAccessor,
    ),
  /closed_input_accessor_forbidden:\$evidence_input\.runtime_receipt/,
);
assert.equal(accessorReads, 0, "runtime_receipt_accessor_executed");

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
console.log("verification_inputs_snapshotted_before_semantic_validation=true");
console.log("verification_proxy_traps_executed=0");
console.log("verification_accessor_getters_executed=0");
console.log("execution_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_EVIDENCE_BINDING_V1_PROOF_GREEN",
);
