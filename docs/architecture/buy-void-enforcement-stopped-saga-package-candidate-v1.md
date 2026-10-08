# Buy VOID V6 saga tool positive stopped-image package candidate

## Narrow source-stage fix

The independently qualified [negative stopped-image census #2646](https://github.com/6ZoSo9/void-node/pull/2646)
proved the current final production Docker image omits
`/app/tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs`
even while shipping the statically reachable compiled runtime module
`/app/dist/economic/buy_void_erc20_execution_composition_v1.js`.
A real code-generated `new Function("specifier","return import(specifier)")`
in that compiled importer names the omitted
`../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs`.

This separate source-only *Draft* is a **sibling** of #2646, stacked on
[original unaccepted dynamic tool candidate #2642](https://github.com/6ZoSo9/void-node/pull/2642)
at the exact parent head `8e1eed313379fec709f7c86695c57a9d01da2edb`.
It does not inherit #2646's intentional *missing-file* negative assertion,
which should naturally fail if used after this proposed positive copy.

The new Dockerfile adds just one reviewed final-stage instruction:

```Dockerfile
COPY --from=build /app/tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs ./tools/
```

The saga source Git blob is
`d6a2d1cd82e5e255f435c1e21d1783774a44b2b1` (58,023 bytes).
The new Dockerfile Git blob is
`eb078d25a588e6ba46d46a93326fe20572d9b7fa`.
No other tool module, including the broadcaster/custodian candidates, is
copied by this proposal. It does NOT add any HTTP route, background service,
signer/broadcast authority, run script, wallet/key, or economic transition.

## Requalification workflow

The new source-only script pins the precise changed Dockerfile, original
saga source and TypeScript source-module Git blobs. Node22/24/26 independently
tests syntactic validity, a *disposable temporary* same-length altered
saga-buffer negative, and the exact single final-stage COPY.

On a hosted Ubuntu runner, an independent Node24 job:
1. builds the exact PR HEAD's production-shaped Docker image;
2. executes `docker create` only, NEVER `docker start/run`;
3. records `State.Status=created`, `State.Running=false`, and
   an empty mount list, before any inspection;
4. extracts `/app/tools` and the compiled importer from the STOPPED image;
5. requires source and extracted saga to be **byte-for-byte identical**,
   including the pinned Git blob and 58,023-byte count;
6. requires the compiled importer to match the previous independent
   86,455-byte, SHA256
   `b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1`;
7. rejects inclusion of unreviewed broadcaster or custodian tools;
8. compares container inspect state before/after to ensure it never ran.

The receipt proves a **local stopped-image copy identity only**, not
code behavior when dynamically loaded by a live process. The script
neither imports nor invokes the actual saga file. It does not read
private customer records or access RPC, signer, wallet or network
transactions. The new image digest is NOT substituted into any
historical V4 enforcement/packaging/deployment manifest.

## Mandatory HOLD after candidate package proof

The source-only candidate's existing V1/V4 enforcement attestation CI is
expected to fail because Dockerfile is a bound compiler/package input.
**Never repin historic V4** to make old checks green. A new independently
reviewed enforcement V5/package successor must bind the new Dockerfile
and compiled module graph, the generated-Function saga resolution and
all imported dependencies, then qualify image/config/layers and
**separately** validate an actual host deployed artifact.

The computed-global/alias P1 in #2641 and ancestor-symlink P1 proof in #2643
remain separate, as does the successful V4 checked-entry sibling #2639.
Native-USDC payment finality, request provenance, operator authentication,
antirollback custody, exactly-once allocations and coupled WC/VOID launch
remain unqualified.

Even on CI success:
```text
stopped_image_saga_byte_identity_verified=true
executed_saga_loader_qualified=false
tool_runtime_side_effects_reviewed=false
image_generation_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
presale_activation=false
funds_movement=false
```

No Ready/merge, deployment, service start, customer ledger, signing/keys,
Chain-2050/Work Credit, presale/market, inventory/treasury/liquidity or funds
action is authorized here.

**PROTECT THE CORE.**
