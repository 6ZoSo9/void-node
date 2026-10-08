# Buy VOID stopped-image dynamic saga packaging omission V1

## Why the package boundary matters

The enforcement V5 static census [#2641](https://github.com/6ZoSo9/void-node/pull/2641)
independently identified one **currently reachable** code-generated tool
import in `dist/economic/buy_void_erc20_execution_composition_v1.js`:

```js
const dynamicImport = new Function("specifier", "return import(specifier)");
await dynamicImport("../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs");
```

The runtime-relative resolution from final `/app/dist/economic` points to
`/app/tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs`.
The broader source-only target census [#2642](https://github.com/6ZoSo9/void-node/pull/2642)
pinpoints that saga Git blob as
`d6a2d1cd82e5e255f435c1e21d1783774a44b2b1` and also records
broadcaster/custodian candidates. Their source blobs alone do NOT
authenticate installation into the **final Docker image**.

At exact source head `e9eb32941b1ca2faf22ca812daba688726843193`,
`Dockerfile` Git blob
`e8fec19ebe9b2cbad470983b79f824926aa4bec7` has two stages. The
final stage copies `/app/dist` and **only explicitly enumerated**
`void-wc-void-...` and other market tool files into `./tools/`.
None of the three `buy-void-...` saga/broadcaster/custodian target modules
appears in the final stage's COPY list. Stage-one `COPY . .` does NOT by
itself add files to the final image.

This creates a genuine source-level package risk: a source-correct,
hash-correct compiled dynamic importer may fail to resolve its target in
an installed image. This PR tests the exact image identity **without
running any service or executing actual saga/broadcaster/custodian code**.

## Proof contract

This standalone source-only Draft contains a script with three explicit
modes: `--self-test` uses ONLY OS temporary fixtures; `--source` pins
the original Dockerfile and economic source Git blob and reports a
**source-only omission suspicion** (NOT packaged-image proof); and
`--stopped-extraction <root>` checks evidence extracted from a container
made from the exact checkout's production Dockerfile.

Node 22/24/26 independent source checks compare the same historic
Dockerfile/source SHA and require all authority flags false. On Node 24
a separate hosted job executes `docker build` and `docker create`
against the exact unmerged PR head. It checks the container state is
`created` and `Running=false`, with no mounts, before using
`docker cp` (NEVER `docker start` or `docker run`) to extract
`/app/dist/economic/buy_void_erc20_execution_composition_v1.js`
and `/app/tools/`.

The extracted compiled importer must be **exactly 86,455 bytes** and
SHA-256
`b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1`
from the previously independent Node22/24/26 V5 enforcement derivation.
It must contain the reviewed generated Function import and saga specifier.
The `/app/tools` directory must itself be valid and contain an explicit
COPY-positive control
`void-wc-void-coupled-launch-readiness-v1.mjs`, while the three
`buy-void` target paths must be **absent**. If a later image begins
including any target, this **negative omission proof must FAIL** and
the image must undergo a fresh positive presence/identity qualification.

The script never claims that real host deployment is missing files.
The stopped image is a fresh local CI build, not a registry-loaded or
production-mounted process. Dockerfile baseline changes require a new
review, not an automatic hash repin.

## No acceptance, no semantic bypass

Even if the stopped-image omission is confirmed, this remains an
explicit **production HOLD**, not a fix for the packaging defect.
The next separate source/packaging successor must intentionally add
the reviewed saga target, verify its dependencies and generated-import
context, rederive a new full enforcement/packaged identity and independently
qualify the installed host before presale opening.

The separate computed-global/alias P1, Linux ancestor-symlink P1 (#2643),
checked V4 script-entry sibling (#2639), verified customer payment ancestry,
custody anti-rollback, exactly-once allocation and WC/VOID launch remain
separate. No old V3/V4/V5 manifest or runtime code is edited here.

At all times:
```text
executed_saga_loader_qualified=false
package_generation_accepted=false
deployed_artifact_generation_verified=false
production_source_finality_authority_ready=false
presale_activation=false
funds_movement=false
```

No Ready/merge, host service, wallet/key/signer, customer ledger, RPC
payment, Chain-2050/WC, inventory/treasury/liquidity or funds actions.

**PROTECT THE CORE.**
