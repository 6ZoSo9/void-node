# Buy VOID source-finality generation provenance V6 — candidate successor

## Why V6 is separate

Draft [#2625](https://github.com/6ZoSo9/void-node/pull/2625) modifies the
pure V2 payment verifier to reject server-selected arbitrary ERC-20 tokens
when a coupled checkout originally names native USDC. The historical reviewed
V5 source identity points to verifier Git blob
`c0e4660bb238e1b718b8a471890901bd5a59badf`, which correctly
**fails closed** against the changed verifier bytes. V5 (and V4) must remain
unchanged; no old source manifest or compiled artifact is repinned.

V6 is a **stacked Draft candidate**, based on the exact #2625 commit
`5cc9022571269bd08176aec8c96cc20884bd4021`, not on current main.
Its V2 verifier's exact Git blob is
`32133e441ccb02bb4786d29e36932fb31399ec87`.
If the parent branch advances or the source changes, its pin is no longer
valid and independent review must start from the new exact bytes.

## Closed source identities

V6 retains the identical four historical V5 source records for:
authenticated composition V3, source-finality authority V2, source-chain
RPC adapter V1, and payment RPC observer V1. Only the fifth record
(`src/economic/buy_void_verified_payment_v2.ts`) rolls to the exact
new commit/blob above. Records cannot come from caller or environment input.

The V6 verifier checks module-derived paths, regular nonsymlink single-link
files, bounded descriptor reads, stable inode/file metadata and Git blob SHA-1
for **all five** before entering the original V3 composition. A canonical
SHA-256 describes the entire V6 reviewed-source candidate record set.
Unlike historical V5, V6 fails closed if Linux `O_NOFOLLOW` is unavailable,
compares the initially visible source pathname's inode/metadata with the
opened descriptor, and rechecks the visible pathname after reading and
hashing the retained descriptor. A renamed/replaced path must HOLD even
when the already-opened file contained the correct reviewed source bytes.
Synthetic proofs forge `lstat` inode observations without writing or
renaming any actual source file. This narrows a source-path race, but does
not attest deployment generation or protect future path changes.

The focused test independently checks commit/blob correspondence, verifies
five source bytes, tamper rejection, and **requires historical V5 to HOLD**
on the new verifier source. It also proves the monotonic total deadline covers
V6 preflight source reads. Only synthetic loopback JSON-RPC is used by the
integration proof. No production payment RPC or operator ledger is read.

## Source proof is not payment, runtime, or deployment authority

The V6 source module explicitly leaves
`source_generation_verified=false`,
`deployed_artifact_generation_verified=false`, and
`production_source_finality_authority_ready=false`.
Authentication of the **first historical** buyer request, verification of
real native-USDC payment/finality, protected rollback-resistant high-water,
serialized duplicate/capacity admission and exactly-once allocation custody
remain separate hard gates. Unqualified legacy request shapes cannot gain
payment authority from a V6 source-file checksum.

The required later lineage is:

```text
independent V2 verifier review + V6 closed-source review
  -> compiled V6 source-finality successor
  -> enforcement-artifact successor
  -> packaged/final-image successor
  -> separately accepted deployment/runtime generation
  -> protected original-request/payment/allocation custody evidence
```

This Draft does not modify `src/index.ts`, V5, historical artifact identities,
the existing execution preflight, Dockerfile, wallet, signing, services,
Chain-2050/WC, presale/market activation, treasury or funds. A GREEN V6
focused workflow is not an endorsement to waive failed historic V5 jobs.
The separately owned [#2626](https://github.com/6ZoSo9/void-node/pull/2626)
operator route remains a distinct source-only review.

**PROTECT THE CORE.**
