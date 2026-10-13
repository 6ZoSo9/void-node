# Buy VOID source-finality compiled artifact attestation V5

## Purpose

This source-only successor locks the exact current V6 compiled-artifact
candidate independently derived on Node 22, 24 and 26 by GitHub Actions run
`38480325092` at repository head
`568702db1ab1266645603b51b501fa4fddbb6c6d`.

The three archived candidate artifacts were each exactly 4,101 bytes and
byte-identical:

- Node 22 artifact `11856733790`;
- Node 24 artifact `11856923447`;
- Node 26 artifact `11855863238`;
- candidate SHA-256
  `6c59717f5121ab5545b9d2f3995ca31d7ca2a493c779a2c501ca15b7b9fa0544`;
- candidate Git blob SHA-1
  `b96ab0dea91151f590300f3a43331273820ec1e4`;
- compiled generation
  `18758f6563f9a96aea0d55e293a4c10da8de349ba12ecc90fdebd82f486b944c`.

The committed candidate evidence is those exact archived bytes. The locked V5
manifest differs from that evidence in exactly one authority field:

```text
compiled_artifact_generation_verified=false -> true
```

No deployment, runtime mount or production source-finality authority is
promoted.

## Current reviewed generation

The lock binds source-finality anchor
`22a30e3ffad6047a472488104c769140bd050878` and reviewed source digest
`35691ec1fe0c19f08e9d1c256ce160c1f47139877832b97c0686d93ab42560f8`.

The current six compiled artifacts are:

- V6 provenance: 15,937 bytes,
  `1994ebb8ca3b6152a44fc5527f120f418c48f6c262911e4f0e9c9d54aee87fec`;
- authenticated composition V3: 18,892 bytes,
  `0d023868f4a4ab95fe1276c8d1a7e891dd5c419844e0ed2aac8d3bce15b72f42`;
- authority V2: 19,002 bytes,
  `239bfb3a8c0d2fa986986e961512660c6212818aa5769753d90f592490502c4b`;
- source-chain RPC adapter V1: 19,804 bytes,
  `3c5bb3d9952d1b5a537e74ebb759320d1c134c6a9b49dd242edb41c23cab7fe2`;
- payment RPC observer V1: 15,167 bytes,
  `9f4f5ee85972777e639dea89abf0c8337576525335ed982be3eb1bfe86c93db3`;
- verified-payment V2: 19,594 bytes,
  `619177302a195bacd424c9e49f93b15108946fa52cc5b1b4c15829ac32f5c2e6`.

The predecessor locked V4 manifest remains immutable at Git blob
`a07f2e9b03958a58280c4d940fe49097a9413af5` and generation
`7e767d9e8977052220c60ab1e0e4c6411259aa3cfeadb7f073270ce4d2d7af06`.
The three predecessor-common compiled artifacts remain byte-identical.

## Independent lock verification

The V5 lock proof does not make the archived candidate helper an authority
surface. It:

1. reads the exact archived candidate evidence with bounded `O_NOFOLLOW`
   retained-descriptor checks;
2. validates a closed candidate schema and independently recomputes the compiled
   generation digest;
3. pins the frozen V5 derivation script by Git blob without using it to promote
   acceptance;
4. checks every reviewed source/build Git blob and source-stack ancestry;
5. checks the immutable V4 predecessor manifest;
6. hashes all six freshly built compiled artifacts itself;
7. derives the expected lock by changing only
   `compiled_artifact_generation_verified` to `true`; and
8. requires the committed locked manifest to equal those derived bytes exactly.

The focused workflow additionally reruns the original V5 candidate derivation
on Node 22/24/26 and requires exact byte equality with the archived evidence
before the lock proof can pass. The derived locked manifest and proof receipt
must then be byte-identical across all three Node versions.

## Coordination with dependency successor #2865

Open dependency Draft #2865 is an Amber semantic neighbor. It intentionally
changes `package.json` / `package-lock.json` and treats this frozen V5 derivation
as historical refusal under the audited package generation.

Therefore this lock is specifically for the current pre-#2865 package/source
generation. If #2865 lands, this V5 lock remains historical evidence and must
not be relabeled as current compiled authority. The audited dependency generation
requires its own reviewed current-positive compiled successor.

## Authority boundary

This lock may establish only:

```text
compiled_artifact_generation_verified=true
```

It must continue to state:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
presale_activation=false
funds_movement=false
```

Enforcement/package closure, deployed-runtime identity, production Base/Ethereum
provider/finality authority, protected payment/allocation custody and the actual
one-payment/one-fulfillment canary remain separate gates.

No live RPC, service deployment/restart, credential/key/wallet/signer access,
customer/payment mutation, transaction construction/signing/broadcast,
Chain-2050/WC mutation, inventory/treasury/liquidity action, presale/market
activation or funds movement is authorized or performed.

**PROTECT THE CORE.**
