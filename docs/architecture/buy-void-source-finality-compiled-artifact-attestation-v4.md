# Buy VOID source-finality compiled artifact attestation V4

## Purpose

V4 is the locked compiled-artifact successor for the reviewed V6 source
generation and the native-USDC V2 payment verifier. Historical V3 remains
immutable predecessor evidence and is not repinned.

The derive-only candidate in #2633 produced byte-identical candidate JSON on
Node 22, 24 and 26. Its exact candidate SHA-256 is
`d03761f2c4cae8388fcee50bb953c85062d5d58d653c79451f0bf097069a28e8`;
the closed compiled-generation digest is
`b35302ca60ea5e9f8a278fd67143e182a5dc49ceb838b8f85060322686d3e06d`.

## Acceptance contract

The locked proof executes the exact reviewed candidate derivation helper,
Git-blob pins that helper, and requires its complete JSON bytes to equal the
reviewed candidate digest above. It then changes exactly one authority field:
`compiled_artifact_generation_verified=true`.

The six compiled artifacts are fixed by exact byte length and SHA-256. The
four common predecessor artifacts remain identical to V3. The two changed
artifacts are:

- V6 source-finality generation module:
  15,937 bytes,
  `sha256:1a80772df43a5a39ac041faf093dd3da58d0bd587499237dd51fb18a4b0915db`.
- V2 verified-payment module:
  10,023 bytes,
  `sha256:e2cc47627e1aa2d1094145745f86cd928a72ebd1103c8ca82f66f5f515112efc`.

The reviewed V6 source identity remains Git blob
`d642723385136e9f0382bd77efdb34948221f380`; the V2 verifier source remains
`32133e441ccb02bb4786d29e36932fb31399ec87`. The reviewed-source generation
digest is
`6a2493b269919be87273eb9bcfc959ab601aab9c16689c54a813db619d1b980f`.

## Bound candidate execution and hostile-environment exclusion

The original V4 locked proof checked the candidate helper's Git blob from a
pinned descriptor, then spawned Node with that helper's **pathname**. This
left a source-verification-to-execution race: a different inode could replace
the checked file while emitting the same JSON, potentially running unrelated
code before the stdout digest check.

This guarded successor instead passes the **captured, Git-blob-verified
script bytes** to a new Node ESM `--eval` process and never opens the
candidate pathname to execute it. It assigns the reviewed candidate's
`import.meta.url`/argument vector within that isolated evaluation and
starts the process with the scripts directory as its cwd so the vetted
`../dist/economic` dynamic import still resolves correctly. The child uses
an explicit minimal environment, excluding ambient `NODE_OPTIONS`,
`NODE_PATH`, user-controlled preload hooks, and injected Git configuration.

An inert synthetic proof extracts the **real helper implementation** from
the locked-proof source, creates only disposable OS-temp ESM fixtures,
captures reviewed helper bytes, replaces the pathname with a new malicious
inode after capture, and verifies the unreviewed source is not executed.
The proof separately injects hostile `NODE_OPTIONS=--import` and
`NODE_PATH`, requiring no executed ambient preload. This closes the
narrow source-checked-entry race in this controlled CI path. It does not
claim that mutable compiled dependencies are safe to execute on an
untrusted live host: review the six-artifact compiled closure and deploy
from an independently qualified immutable packaged generation.

The candidate's descriptor-bound reader is re-run before every locked
derivation. It retains `O_NOFOLLOW` descriptors, binds visible path identity
before and after bounded positional reads, and detects one-byte growth beyond
the preflight size without unbounded buffering.

## Cross-version proof

The focused workflow rebuilds on Node 22, 24 and 26, derives the locked
manifest independently, requires each result to equal the committed manifest,
and then requires all three outputs to be byte-identical.

## Authority boundary

`compiled_artifact_generation_verified=true` is only a reviewed
source/build identity statement. It does not establish a deployed or mounted
runtime. The manifest therefore requires:

- `deployed_artifact_generation_verified=false`
- `runtime_mount_authority=false`
- `production_source_finality_authority_ready=false`

A separately reviewed enforcement successor, packaged/final-image successor,
runtime/deployment identity, original-request provenance, payment finality,
anti-rollback custody, duplicate/capacity serialization, and exactly-once
allocation recovery remain required.

No live RPC, service deployment, wallet/private-key/signer access,
transaction construction/signing/broadcast, Chain-2050/WC mutation,
presale/market activation, treasury/liquidity action, or funds movement is
performed by this lane.

**PROTECT THE CORE.**
