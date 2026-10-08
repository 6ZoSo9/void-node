# Buy VOID source-finality compiled artifact attestation V4

## Purpose

V4 is the locked compiled-artifact successor for the finalized V6 reviewed
source generation and hardened native-USDC V2 verifier. Historical V3/V5
evidence remains immutable and is not repinned.

The independently audited current candidate is the exact 4,032-byte JSON
archived from #2633 run 37820150421 and rechecked in #2637:

- candidate SHA-256:
  `27279497f9a3bc2b93da59facb6a44d01ba7ba74342d6db6b0521867f1aa8128`;
- candidate Git blob:
  `4c95426572e6b019822f3ae6422aacad6287e562`;
- compiled generation:
  `45bb17e864579bb59f3b31f63260ce43b1cf85b8e3143d1fa31760e7122f9a87`;
- reviewed-source digest:
  `95cf8959cfef04accc4715cb310f9b975f1011d27bf9ef0b0d7aefaaeb17a426`.

The lock changes exactly one candidate authority field:
`compiled_artifact_generation_verified=false` becomes `true`.
Deployment, runtime mount and production source-finality authority remain false.

## Exact changed compiled artifacts

The four predecessor-common artifacts remain byte-identical to immutable V3.
The two changed artifacts are:

- V6 source-finality generation:
  15,937 bytes,
  `sha256:2f4af845031530ca3bad0fa3c17512cf659219b32aa0137f58c48d242bf84b5a`;
- V2 verified-payment verifier:
  12,161 bytes,
  `sha256:7d419bafa54c5a004416e224ee03131455a073600ca2c8d423d9fa40ab431ef2`.

Reviewed source identities:

- V6 blob `7266c03d8874207ed3fda0f814d0a7a53d429c25`;
- V2 blob `c77bb6144b27eb8fdaff168200cea24d9c0ee9ac`;
- source-generation anchor
  `47cbb1d4c7fb667a7accdf1089edb11072f3e631`.

## Checked-entry execution

The locked proof includes the #2639 P2 repair. It does not verify candidate
helper bytes and then reopen the candidate pathname as executable source.
Instead it executes the already-read, Git-blob-bound candidate bytes in an
isolated Node ESM `--eval` child with:

- expected candidate `import.meta.url` and argv;
- `scripts/` cwd so the reviewed relative V6 dynamic import resolves;
- fixed child environment excluding ambient `NODE_OPTIONS`, `NODE_PATH`
  and user Git/preload configuration.

The dedicated synthetic test extracts the exact production helper, replaces the
candidate path after byte capture, and proves the replacement never executes.
It separately injects hostile ambient Node preload settings and requires they
remain absent from the child.

This closes the reviewed helper check→execute race for this CI attestation
path. It does not claim a mutable live host's complete compiled dependency
closure is trusted.

## Cross-version lock

Node 22, 24 and 26 independently:

1. install locked dependencies;
2. build exact repository artifacts;
3. rerun the candidate descriptor/path/growth adversaries;
4. run the checked-entry adversary;
5. derive the locked manifest;
6. require byte equality with the committed manifest.

The downstream job then requires all three locked outputs byte-identical.

## Authority boundary

A successful lock may state
`compiled_artifact_generation_verified=true` only.

It must continue to state:

- `deployed_artifact_generation_verified=false`;
- `runtime_mount_authority=false`;
- `production_source_finality_authority_ready=false`.

Enforcement, packaged/final-image, deployed runtime identity, authenticated
original-request chronology, real payment finality, protected high-water
custody, exactly-once allocation recovery and operator principal deployment
remain separate gates.

No live RPC, service deployment, wallet/private-key/signer access, customer
ledger, transaction construction/signing/broadcast, Chain-2050/WC mutation,
presale/market activation, treasury/liquidity or funds movement is performed.

**PROTECT THE CORE.**
