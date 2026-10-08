# Buy VOID V4 compiled-artifact candidate — independent evidence audit

## Scope and authority

This source-only, unaccepted review package is stacked on Draft PR #2633
(65b67d1df3b2e8995081f0c2c8f6902c8d737644) and the V6 source
candidate #2630 (649ebe88f4f1e69731b64756849b8dcd9828f501).

The new V2 source Git blob is 32133e441ccb02bb4786d29e36932fb31399ec87;
the new V6 source Git blob is d642723385136e9f0382bd77efdb34948221f380.
Historical V5 reviewed-source and V3 compiled manifests are NOT altered.

This review evidence is deliberately NOT a locked, accepted or deployed V4
compiled attestation. Compiled generation verified, deployed generation verified,
runtime mount authority, and production source-finality ready all remain FALSE.

## Original CI evidence independently retrieved

At exact PR #2633 head 65b67d1df3b2e8995081f0c2c8f6902c8d737644,
GitHub Actions run 37803316186 finished 15/15 successful workflows,
including independent Node 22/24/26 derivations and exact three-way comparison:
https://github.com/6ZoSo9/void-node/actions/runs/37803316186

Downloaded the THREE workflow artifact archives (IDs 11561369776,
11560884704 and 11561877820). Each contains an identically serialized
4,032-byte JSON body. The raw SHA-256 is:

d03761f2c4cae8388fcee50bb953c85062d5d58d653c79451f0bf097069a28e8

The corresponding exact Git blob SHA-1 is:

44b7aac6189dbf64ed7a8c3d185995b6fda1a646

The reviewed-candidate evidence JSON in this branch contains those EXACT
same original bytes, not a recreated summary. Independently recomputing
the canonical sorted generation digest gives:

b35302ca60ea5e9f8a278fd67143e182a5dc49ceb838b8f85060322686d3e06d

The JSON records all six compiled artifact lengths and SHA-256 digests.
Four predecessor-common compiled artifacts match the immutable historical
V3 manifest. The new V6 entry and native-USDC V2 verifier are the two
changed candidate compiled artifacts.

## Independent verification

The new proof (scripts/prove_buy_void_source_finality_compiled_artifact_v4_evidence_v1.mjs)
checks exact raw manifest bytes, SHA-256, Git blob SHA-1, source and compiler
inputs, Git ancestry, immutable historical V3 provenance, the four unchanged
compiled artifacts, closed six-file artifact paths, exact compiled byte hashes,
and an independently recomputed canonical generation SHA-256.

The source and artifact reader requires O_RDONLY | O_NOFOLLOW, regular
single-link files, matching visible path and retained descriptor identities
before/after read, and a fixed pre-size + one-byte read bound. Its negative
tests mutate each of the six compiled buffers in memory and corrupt eight
evidence fields/authority claims; all must HOLD.

The new exact-head CI independently builds with Node 22/24/26, compares a
fresh derivation byte-for-byte to the archived manifest, and checks six
fresh compiled artifact identities on all three Node versions. On Node 24,
it also inspects the same files from a STOPPED Docker production image
using docker create and docker cp (without starting any runtime process).

## Independent acceptance remains separate

Even if this focused review test is GREEN, external/manual independent
semantic review is still needed before creating an accepted locked V4
manifest. New enforcement, packaged-image and deployed-artifact identities
must be separately qualified. The original buyer request, real payment,
source finality, protected high-water and exactly-once allocation custody
remain unqualified. The WC/VOID presale launch remains HOLD.

No operator host, service, customer record, wallet, signer, credentials,
transaction, Chain-2050, Work Credit, market, inventory, treasury, liquidity
or funds movement is authorized here. Leave Draft/unmerged.

PROTECT THE CORE.
