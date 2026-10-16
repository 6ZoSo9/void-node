# Buy VOID Epoch-2 dormant candidate V3R live binding V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V2`.

Status: **source/test/CI only**. Live binding remains separately authorized.

## Purpose

V1 of this binder was written against the historical V4 installed
qualification. After the V6R2 upgrader publication-truth repair, V5 is the
current-positive installed qualification. V2 preserves the dormant-candidate
and native V3 semantics while binding that V5 qualification generation.

## Exact source inputs

Dormant candidate V4 remains unchanged:

- path:
  `ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v4.json`;
- Git blob:
  `e569c9211e01f14c7c00dd1c5041d4dfb0817609`;
- `signer_offchain_control_proven=true`;
- runtime/apply enable flags remain `0`.

Current V6R2 installed qualification:

- source:
  `ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`;
- Git blob:
  `a04c2e7665294cdd142426e9eb01ee27c5292b8d`;
- marker:
  `VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V5`;
- accepted V6R2 lock:
  `voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`.

Fixed installed native live entry remains:

`/opt/void-buy-void-epoch2-live-composition-v3/void_buy_void_epoch2_live_composition_native_preentry_v3`.

The accepted V3 live-composition runner/native identities remain unchanged.

## Future live sequence

A future separately authorized root run:

1. requires this binder from its exact Git object on stdin;
2. verifies clean exact `main`;
3. loads exact dormant candidate V4 from Git;
4. executes exact installed qualification V5 from its Git object;
5. invokes the fixed installed native V3 preentry with `/dev/null` stdin;
6. validates the directly returned content-addressed
   `voide2livecomp3_...` receipt;
7. executes installed qualification V5 again;
8. requires before/after qualification records to be identical;
9. revalidates clean exact `main`;
10. emits content-addressed binding receipt
    `voide2candbind3r2_...`.

No caller-supplied receipt path, stdin receipt, CLI receipt, or environment
receipt is accepted.

## Facts promoted only after future GREEN live evidence

Candidate V4 already proves signer off-chain control. The live binding may add
only:

- systemd credential identity proven;
- active signing capability proven;
- runtime source generation bound;
- authenticated private-manager generation bound;
- protected V6R2 generation verified;
- retained V4 predecessor verified.

## Remaining launch gates

Exactly three remain after a GREEN V2 binding receipt:

1. exact Chain-2050 receipt plus either a verified zero-fee envelope or
   separately proven per-payment native-gas funding;
2. current Chain-2050 one-payment/one-fulfillment canary;
3. coupled presale + WC/VOID Sovereign activation.

The exact chain receipt is mandatory in both fee branches. Standing fulfiller
balance is not funding authority.

Still false:

- `customer_safe_to_pay=false`;
- transaction signing/broadcast;
- payment acceptance;
- public presale activation;
- WC/VOID activation;
- funds movement;
- production host authority.

## Authority

Hosted CI runs syntax, self-test, inert plan, adversarial proof and diff hygiene
only. No protected upgrade, native live composition, credential/private-key
access, signing, RPC, transaction, payment/presale/WC action or funds movement.

PROTECT THE CORE.
