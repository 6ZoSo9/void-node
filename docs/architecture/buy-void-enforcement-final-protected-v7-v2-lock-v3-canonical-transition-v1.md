# Protected V7/V2 V3 canonical transition v1

Marker: `VOID_BUY_VOID_PROTECTED_V3_CANONICAL_TRANSITION_V1`.

## Purpose

The accepted V3 lock was produced on the reviewed range-protected stack, where
its historical lock proof intentionally required the exact candidate-to-lock
branch delta. Canonical main later needs to contain the same accepted protected
generation together with the current range/source-generation composition.

Re-running the historical branch-scope proof against a larger canonical main
HEAD would be false: the accepted lock origin is historical evidence, while the
current HEAD is a descendant composition.

This transition therefore preserves those truths separately.

## Required proof

The transition proof requires:

- the reviewed #3287 range head is an ancestor of current HEAD;
- accepted V3 lock head `67ea723b...` is an ancestor of current HEAD;
- the exact accepted lock-head tree remains
  `f373912f46ec72b7743e83768e5b48ebb02d7ec0`;
- the historical lock proof and historical lock workflow remain exact at that
  accepted head;
- current HEAD contains the exact accepted V3 candidate and lock JSON blobs;
- current HEAD contains the exact reviewed V5 census proof, V3 candidate proof,
  predecessor-preservation proof, V3 run-script generation and range
  `src/index.ts` generation;
- V5 census is freshly re-derived on current HEAD and still reports exactly the
  two protected-generation deltas with the accepted 49-path inventory;
- V3 candidate is freshly re-derived on current HEAD and produces the same
  accepted enforcement-set identity;
- frozen V1/V2/V4 evidence remains preserved by the historical-predecessor
  preservation proof;
- the accepted V3 lock remains source/evidence authority only.

The historical V3 lock proof is **not** reinterpreted as a current-HEAD branch
scope proof.

## Authority

This proof does not authorize deployed-artifact acceptance, runtime mount,
service/network mutation, payment acceptance, transaction construction/signing/
broadcast, public presale/WC activation, validator mutation, treasury/liquidity,
or funds movement.
