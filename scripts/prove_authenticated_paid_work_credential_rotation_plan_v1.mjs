import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildAuthenticatedPaidWorkCredentialRotationPlanV1,
  computeCredentialRotationPlanIdV1,
  validateAuthenticatedPaidWorkCredentialRotationPlanV1,
} from "../integrations/agents/authenticated-paid-work-credential-rotation-v1/index.mjs";

function expectReject(label, mutate, pattern) {
  const candidate = structuredClone(plan);
  mutate(candidate);
  try {
    validateAuthenticatedPaidWorkCredentialRotationPlanV1(candidate);
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!pattern.test(message)) {
      throw new Error(`${label}_wrong_error:${message}`);
    }
    return;
  }
  throw new Error(`${label}_did_not_reject`);
}

const fixture = JSON.parse(
  fs.readFileSync(
    "fixtures/agents/authenticated-paid-work-credential-rotation-plan-v1.example.json",
    "utf8",
  ),
);
const plan = buildAuthenticatedPaidWorkCredentialRotationPlanV1();
assert.deepEqual(plan, fixture, "fixture must equal deterministic plan");
assert.equal(validateAuthenticatedPaidWorkCredentialRotationPlanV1(plan), plan);
assert.equal(plan.plan_id, computeCredentialRotationPlanIdV1(plan));
assert.equal(plan.ordered_gates.length, 14);
assert.ok(
  plan.ordered_gates.indexOf("retire_old_wc_binding_with_exact_confirmation") <
    plan.ordered_gates.indexOf(
      "bind_replacement_credential_to_same_wc_account_with_exact_confirmation",
    ),
);

expectReject(
  "early_retirement",
  (candidate) => {
    candidate.lifecycle_contract.old_binding_retirement_not_before_utc =
      "2026-08-04T23:59:59Z";
    candidate.plan_id = computeCredentialRotationPlanIdV1(candidate);
  },
  /old_binding_retirement_boundary_mismatch|old_binding_retirement_precedes_binding_expiry/,
);

expectReject(
  "same_credential_preselected",
  (candidate) => {
    candidate.replacement_contract.replacement_credential_id =
      candidate.current_credential.credential_id;
    candidate.plan_id = computeCredentialRotationPlanIdV1(candidate);
  },
  /replacement_credential_id_must_be_unresolved/,
);

expectReject(
  "destination_substitution",
  (candidate) => {
    candidate.replacement_contract.replacement_destination_wc_account =
      "void-other-account";
    candidate.plan_id = computeCredentialRotationPlanIdV1(candidate);
  },
  /replacement_destination_wc_account_mismatch/,
);

expectReject(
  "binding_before_retirement",
  (candidate) => {
    const retire = candidate.ordered_gates.indexOf(
      "retire_old_wc_binding_with_exact_confirmation",
    );
    const bind = candidate.ordered_gates.indexOf(
      "bind_replacement_credential_to_same_wc_account_with_exact_confirmation",
    );
    [candidate.ordered_gates[retire], candidate.ordered_gates[bind]] = [
      candidate.ordered_gates[bind],
      candidate.ordered_gates[retire],
    ];
    candidate.plan_id = computeCredentialRotationPlanIdV1(candidate);
  },
  /ordered_gate_sequence_mismatch|replacement_binding_must_follow_retirement/,
);

expectReject(
  "authority_key_replaced",
  (candidate) => {
    delete candidate.authority.payment_execution_authorized;
    candidate.authority.payment_execution_reviewed = false;
    candidate.plan_id = computeCredentialRotationPlanIdV1(candidate);
  },
  /authority_keys_mismatch/,
);

expectReject(
  "authority_granted",
  (candidate) => {
    candidate.authority.credential_registry_write_authorized = true;
    candidate.plan_id = computeCredentialRotationPlanIdV1(candidate);
  },
  /authority_credential_registry_write_authorized_mismatch/,
);

expectReject(
  "raw_token_injected",
  (candidate) => {
    candidate.decision.status =
      "voidapwc1.agent.synthetic.ABCDEFGHIJKLMNOPQRSTUVWX";
    candidate.plan_id = computeCredentialRotationPlanIdV1(candidate);
  },
  /decision_status_mismatch|raw_token_material_detected/,
);

expectReject(
  "plan_id_tamper",
  (candidate) => {
    candidate.plan_id =
      "voidapwcrp1_0000000000000000000000000000000000000000000000000000000000000000";
  },
  /plan_id_derivation_mismatch/,
);

console.log(`plan_id=${plan.plan_id}`);
console.log(`reviewed_source_main=${plan.reviewed_source_main}`);
console.log(`current_credential_id=${plan.current_credential.credential_id}`);
console.log(`rotation_boundary_utc=${plan.lifecycle_contract.rotation_boundary_utc}`);
console.log(`ordered_gates=${plan.ordered_gates.length}`);
console.log("fixture_exact=true");
console.log("replacement_credential_id_unresolved=true");
console.log("replacement_credential_must_differ=true");
console.log("replacement_may_be_preissued=true");
console.log("old_binding_retirement_before_rebinding_required=true");
console.log("early_binding_retirement_rejected=true");
console.log("binding_before_retirement_rejected=true");
console.log("authority_map_exact=true");
console.log("raw_token_generation_authorized=false");
console.log("credential_registry_write_authorized=false");
console.log("receiver_restart_authorized=false");
console.log("old_binding_retirement_authorized=false");
console.log("replacement_binding_authorized=false");
console.log("live_canary_authorized=false");
console.log("VOID_AUTHENTICATED_PAID_WORK_CREDENTIAL_ROTATION_PLAN_V1_PROOF_GREEN");
