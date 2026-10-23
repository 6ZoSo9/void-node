# Buy VOID V7/V2 hardened receipt + range composition V1

Status: **source/CI-only composition; no candidate acceptance, deployment, runtime or economic authority**.

## Parents

The immutable composition predecessor `0afc37f3de08b7174d1fb5de1a720718181db4b2` is the exact ordered two-parent composition:

- accepted V3 lock parent: `e6336075802680577f4d3e82ab7384b5c212bb4c` (#3660);
- hardened deployment-receipt parent: `d7a7c27f89c8f9e00806dc49624938274eab699a` (#3386).

The current head is a source-proof/workflow repair successor above that immutable composition predecessor. Every post-composition commit must form one bounded single-parent first-parent chain and may touch only the two historical source-proof workflows plus this composition proof/doc/workflow. It preserves the V3 candidate and accepted V3 lock byte-for-byte while keeping the reviewed current-main/V7 overlay intact.

## Protected inventory consequence

The V3 candidate already binds the reviewed repaired-range router successor at `src/index.ts`.

Among all 49 protected source rows, the #3386/current-main overlay intersects exactly one row:

`ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`

- V3 predecessor Git blob: `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`;
- composed Git blob: `f2d5288d6c1b639df6d9dcb1c174046ec9287f3b`;
- mode remains `100644`.

Therefore this composition does **not** repin historical V3 evidence. It deliberately makes the accepted V3 lock stale against exactly that one hardened source row and requires a separate V4 candidate successor.

## Composition proof

Proof blob: `d315de2997ca3b035f111f81071c5b346f88dbe6`.

The proof:

- requires the immutable composition predecessor to retain the exact ordered V3/receipt parents, then binds a capped single-parent repair chain to HEAD with an exact five-path repair allowlist;
- requires the diff from #3660 to be exactly the 11 reviewed #3386/current-main overlay paths plus this proof/doc/workflow;
- content/mode-pins every overlay path;
- content-binds unchanged V3 candidate and lock blobs;
- reads protected files through bounded `O_NOFOLLOW|O_NONBLOCK` descriptors with generation revalidation;
- includes an inert lstat→FIFO-swap regression;
- derives the composed 49-row inventory and requires exactly one protected drift;
- emits a canonical cross-node composition receipt for the later V4 candidate lane.

The workflow additionally invokes the production deployment-receipt planner against accepted V3 lock and requires a machine-readable HOLD on the hardened deployment-receipt source row, with no `PLAN_GREEN`.

The two historical source-proof workflows carried by the current-main overlay retain their original exact-four-file guards for ordinary PRs. On this exact composition branch/base only, each instead requires the exact 14-path composition scope before continuing to execute its real V4 or full-history source proof. The composition proof content-pins both workflow blobs, so this does not create a branch-name-only scope bypass.

## Authority

All remain false: candidate V4 acceptance, deployed artifact generation, runtime mount, production source-finality, public presale activation and funds movement.

No merge, protected host apply, service mutation, credentials/signing, transaction/payment acceptance, treasury/liquidity action or funds movement is authorized.

PROTECT THE CORE.
