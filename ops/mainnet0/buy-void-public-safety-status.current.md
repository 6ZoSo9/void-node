# Buy VOID Public Safety Status

Status: public_mainnet0_live guarded path

This document records the current safe public posture for Buy VOID.

## Current posture

Buy VOID is configured, but public fulfillment must remain guarded.

The public path is allowed to guide a user toward a request/watch flow, but it must not automatically send VOID from a payment observation alone.

Current operator status expectations:

- Buy VOID watcher config is present.
- Pending count should be zero during this safety proof.
- Manual payment-confirmed proof records must not imply VOID was sent.
- `void_tx_ref` must stay empty unless a separate guarded fulfillment step has actually delivered VOID.
- Fulfillment must fail closed when `void_tx_ref` is missing.
- Blind direct deposits are not supported.
- Exchange/custodial sends are not supported.
- Money step remains last.

## Guardrail

This safety proof is read-only. It must not call mutating endpoints.

Forbidden in this proof lane:

- POST claim-tx
- POST observe
- POST fulfill
- POST run-once
- POST queue
- POST config
- any treasury send
- any VOID token transfer

## Related proof history

Known safety lanes already established before this checkpoint include:

- Buy VOID backend readiness proof
- Buy VOID hard-stop prelaunch gate
- Buy VOID payment-confirmed no-VOID-send proof
- Ethereum payment-confirmed no-VOID-send proof
- Post-fulfillment proof cleanup
- Mainnet-0 status smoke

## Next hardening direction

The next implementation lane should improve the claim/fulfillment path without weakening the current invariant:

Payment confirmation is not fulfillment.

A real fulfillment must require explicit operator intent, a verified payment, an expected recipient, an expected amount, and a recorded `void_tx_ref`.

## Proof correction

The checkpoint `16b3e64e / ckpt-buy-void-public-safety-status-green-20260528-132532` is superseded.

Reason: the initial static guard matched its own grep expression, and the outer command wrapper masked the failure by continuing to `mainnet0-status-smoke`.

A valid green checkpoint for this lane must prove that `buy-void-public-safety-status-proof` itself exits zero before status smoke is considered.

## Proof scope clarification

Nested no-send proofs are not executed inside this public safety status proof.

Reason: this proof is a read-only public posture proof. It checks that deeper Buy VOID safety proof targets are wired, then leaves those deeper proofs to run independently. This avoids masking failures and avoids transient readiness races from nested proof execution.
