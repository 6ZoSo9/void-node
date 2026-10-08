# Buy VOID enforcement V5 source-only derivation candidate

## Purpose and lineage

This branch is an **unaccepted V5 enforcement compiled-closure candidate**,
stacked on [Draft #2638](https://github.com/6ZoSo9/void-node/pull/2638)
at exact runtime-bridge source commit
`320ab95af3998a9dcfddd44d62c394c19ba7ea2c`.

The runtime preflight now imports reviewed source-finality **V6**, not
historical V4 or V5. Therefore the old enforcement V4 manifest's
23-module source/compiled identity cannot attest the changed dependency
graph. It must remain immutable. A new closed-runtime graph, separately
reviewed compiled generation, enforcement/packaged successors and accepted
host runtime are required before any live authority.

The candidate pins these exact Git blob identities:
- V6 runtime preflight source: `b61615c8b928a95c33100878ca70aa147abad103`.
- V6 generation source: `d642723385136e9f0382bd77efdb34948221f380`.
- Native-USDC V2 verifier source: `32133e441ccb02bb4786d29e36932fb31399ec87`.
- Historical enforcement V1 source-closure JSON: `b9d8a57f8a67f2e9180b15a608c178bc95bf84b5`.
- Immutable historical enforcement V4 envelope: `d9e391bb058132b83a4eeaec00797e41dab9fa26`, closed enforcement set `854fa637d25f0931c37d5d35fda641adb38ad1f55ca23b2662fb97d42a262a7b`.
- Reviewed source-finality compiled V4 source/build manifest: `dda86b558fe98f7647ca8b126da4a3c868c5231d`, generation `b35302ca60ea5e9f8a278fd67143e182a5dc49ceb838b8f85060322686d3e06d`.

The script independently builds a **closed execution import graph** from the
delivery runtime `dist/economic/buy_void_delivery_runtime_integration_v1.js`
using TypeScript AST. It rejects unrecognized nonliteral, external or escaping
imports, require/eval/Function execution and missing canonical V6 preflight.
It records every reachable module byte length, SHA-256, import edge and limited
package external boundary. It independently fingerprints all mapped source
files, the build scripts, TypeScript/compiler input modules, lockfile,
tsconfig files and Dockerfile. Every read uses a retained O_NOFOLLOW
descriptor, last-component+ancestor path checks, stable inode metadata,
at most the preflight size+one sentinel byte, and postread identity checks.

## Synthetic proofs and three-node identity check

The `--self-test` first rejects nonliteral dynamic import, escaping import,
unexpected builtin, require/eval/Function, then uses **only disposable OS
temporary files** to prove a same-sized filename replacement and a 3 MiB file
growth after preflight cannot yield accepted bytes or exceed the fixed bound.
The source files/compiled repo artifacts are never edited by the adversary.

The workflow rebuilds Node 22, 24, and 26 independently from the exact
unmerged PR head and outputs three separate derive-only JSON receipts.
The final job requires complete byte equality, not merely equal parsed hashes.
The V6 preflight's own synthetic signer/broadcast fail-closed proof runs on
each node.

The candidate includes a delta from the **historical V1 full compiled
enforcement closure**, verifying that V4 leaves the active import graph and V6
enters it, with exact additions/removals/changed SHA-256 records. This V1
comparison is a *review aid*, not permission to modify predecessor manifests.

## What has NOT been authorized

**Only** `--derive` and `--self-test` are supported. No V5 locked manifest is
accepted or minted here. JSON explicitly sets all of the following false:

```text
candidate_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
presale_activation=false
funds_movement=false
```

The separate locked-V4 checked-entry fix [Draft #2639](https://github.com/6ZoSo9/void-node/pull/2639)
remains a required sibling source-ancestry dependency. This derive-only
candidate is **not** a replacement for integrating #2639 before any locked V5
acceptance. Current runtime V6 source authority and provider quorum are
still unqualified; the original historical buyer request and real payment
source/finality, duplicate/capacity serialization, protected custody
high-water, exactly-once allocation, and coupled WC/VOID presale/market remain
independently HOLD.

This branch will not edit V3/V4/V5 historical source/compiled manifests,
production routes, Dockerfile, app server, wallet/signing code, treasury
ledger or services. No Ready/merge, production RPC, customer record, keys,
signing, transaction, Chain-2050, Work Credit, inventory/liquidity,
presale/market activation or funds movement occurs.

**PROTECT THE CORE.**
