#!/usr/bin/env python3
from pathlib import Path

PATH = Path("scripts/prove_buy_void_synthetic_end_to_end_fulfillment_rehearsal_v1.ts")
text = PATH.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{PATH}: expected one E2E anchor, found {count}: {old[:120]!r}"
        )
    text = text.replace(old, new, 1)


replace_once(
    '''    const closeoutDryDecision = {
      ok: true,''',
    '''    const closeoutPlanFingerprint = sha256("e2e:closeout-plan");
    const closeoutDryDecision = {
      ok: true,''',
)

replace_once(
    '''      closeout_id: sha256("e2e-rehearsal:closeout"),
      plan: {},
      required_confirmation:''',
    '''      closeout_id: sha256("e2e-rehearsal:closeout"),
      plan: { plan_fingerprint_sha256: closeoutPlanFingerprint },
      required_confirmation:''',
)

replace_once(
    '''      required_policy_fingerprint_sha256: sha256("e2e:closeout-policy"),
      required_saga_confirmation: "e2e-closeout-saga-confirmation-v1",''',
    '''      required_policy_fingerprint_sha256: sha256("e2e:closeout-policy"),
      required_plan_fingerprint_sha256: closeoutPlanFingerprint,
      required_saga_confirmation: "e2e-closeout-saga-confirmation-v1",''',
)

replace_once(
    '''      assert.equal(
        input.confirmation,
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      );
      return {''',
    '''      assert.equal(
        input.confirmation,
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      );
      assert.equal(
        input.expected_plan_fingerprint_sha256,
        closeoutPlanFingerprint,
      );
      return {''',
)

replace_once(
    '''    assert.equal(closeoutDry.status, 200);
    assert.equal(closeoutDry.body.status, "dry_run");

    const closeoutApplied = await callCloseout(''',
    '''    assert.equal(closeoutDry.status, 200);
    assert.equal(closeoutDry.body.status, "dry_run");
    assert.equal(
      closeoutDry.body.required_terminal_plan_fingerprint_sha256,
      closeoutPlanFingerprint,
    );

    const closeoutApplied = await callCloseout(''',
)

replace_once(
    '''        policy_fingerprint_sha256:
          closeoutDry.body.required_policy_fingerprint_sha256,
        saga_confirmation: closeoutDry.body.required_saga_confirmation,''',
    '''        policy_fingerprint_sha256:
          closeoutDry.body.required_policy_fingerprint_sha256,
        terminal_plan_fingerprint_sha256:
          closeoutDry.body.required_terminal_plan_fingerprint_sha256,
        saga_confirmation: closeoutDry.body.required_saga_confirmation,''',
)

PATH.write_text(text)
print("VOID_BUY_VOID_TERMINAL_CLOSEOUT_PLAN_BINDING_E2E_V1_PATCHED")
