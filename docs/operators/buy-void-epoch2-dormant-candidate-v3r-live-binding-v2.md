# Buy VOID Epoch-2 dormant candidate V3R live binding V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V2`.

Status: **source/test/CI only**. Live binding remains separately authorized.

## Purpose

V1 of this binder was written against the historical V4 installed
qualification. After the V6R2 upgrader publication-truth repair, V5 is the
current-positive installed qualification. V2 preserves the dormant-candidate
and native V3 semantics while binding that V5 qualification generation.

V2 also closes the outer binder's privileged first-instruction boundary. The
reviewed JavaScript is no longer trusted merely because Node received it on
stdin; a separate native preentry source authenticates the exact binder bytes
and Node generation before evaluation and provides a private kernel-bound
parent proof.

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

Fixed installed credential-composition native live entry remains:

`/opt/void-buy-void-epoch2-live-composition-v3/void_buy_void_epoch2_live_composition_native_preentry_v3`.

The accepted V3 live-composition runner/native identities remain unchanged.

The outer binder now has a separate source-only native preentry candidate:

`ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c`.

Future reviewed installed paths are fixed under
`/opt/void-buy-void-epoch2-dormant-v3r-binding-v2`. The preentry binds exact
binder Git blob `9c29eb4716077e459b9154f39d0f30cf2e56729f`, 39391 bytes,
SHA-256 `afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e`.
It binds its actual running `/proc/self/exe` inode to the fixed preentry path,
verifies fixed Node against the protected V3 policy, streams only the
digest-verified binder source over a private pipe, and retains a separate
private parent-proof pipe binding parent/child start ticks and preentry/binder/
Node inode generations.

This PR defines that native source but does not install, materialize or accept a
native preentry binary.

## Future live sequence

A future separately authorized root run, only after a separate native-preentry
candidate/acceptance/install/qualification lineage exists:

1. invokes the fixed installed binder native preentry with `/dev/null` stdin,
   exact V2 confirmation and exact expected HEAD;
2. the native preentry verifies its own running/fixed generation, the exact
   root-custodied binder source bytes, and fixed Node against the protected V3
   policy before Node evaluates the binder;
3. it forks and enters the retained Node descriptor with `fexecve()`, feeds
   only the verified binder bytes over a private source pipe, and supplies a
   separate private parent-proof pipe;
4. the binder validates parent/child PID+start generations, the actual running
   parent/Node inodes, retained binder FD and fixed visible paths before any
   root/live action;
5. it verifies clean exact `main`, loads exact dormant candidate V4 from Git,
   and executes exact installed qualification V5 from its Git object;
6. it invokes the fixed installed credential-composition native V3 preentry
   with `/dev/null` stdin and validates the directly returned content-addressed
   `voide2livecomp3_...` receipt;
7. it executes installed qualification V5 again, requires before/after
   qualification records to be identical, revalidates clean exact `main`,
   and revalidates the outer private parent proof;
8. only then may it emit content-addressed binding receipt
   `voide2candbind3r2_...`.

Caller-set markers are insufficient. Direct worktree or arbitrary stdin
JavaScript `--run` cannot become the reviewed live binding flow.

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

Hosted CI runs JavaScript syntax/self-test/inert plan, native-source
`-Werror` compilation/self-test, direct-invocation negatives, adversarial proof
and diff hygiene only. It does not install anything under `/opt`.

Even GREEN leaves the outer native first-entry binary unaccepted/uninstalled and
`production_host_evidence_authority=false`. A separate native candidate,
acceptance/materialization, protected installation and installed qualification
are required before live binding can be considered.

No protected upgrade, native live composition, credential/private-key access,
signing, RPC, transaction, payment/presale/WC action or funds movement.

PROTECT THE CORE.
