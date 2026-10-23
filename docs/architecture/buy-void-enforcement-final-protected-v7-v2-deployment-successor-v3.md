# Buy VOID protected V7/V2 deployment-generation successor V3

Source/CI candidate only. Base: #3656 `8e0f3c42208a0630b07cd0a64c0bf0b2a2819099`.

V1/V2 candidate and lock remain immutable. V3 re-derives current 49-row source inventory and admits exactly the reviewed repaired-range `src/index.ts` transition `123ec1792a027f93d4c9030749a0e7e136a75a44 -> a09661797aa4295371c036be36d82995e5233269`.

- inventory SHA-256: `65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589`
- candidate set SHA-256: `2bfc8455c09e8cbbaa56ac580ccc5f193b54f95c3e4bec1e2274a068303236ec`
- candidate JSON SHA-256: `eb2be386ecf374bc75d6c10e4d5cfa3ea5fa309acbef5612f74991c6ba311aab`
- candidate Git blob: `5301c32f53c2a82435152e38b36486507a73f906`
- proof Git blob: `96ae15c0a76d4cc463ea64688fa2c5fd119b09fc`

The candidate remains unaccepted. Exact V3 derivation is executed in an independent portable Node 22/24/26 matrix whose jobs use reachable-history-only clones; V3 artifact publication and V3 cross-node equality do not depend on the historical V2 matrix. The historical V2 jobs remain separate regression evidence. A V3 lock may be added only after the portable V3 outputs are byte-identical and their real evidence IDs are recorded. No deployment/apply, service/runtime, credentials/signing, payment/activation, treasury/liquidity or funds authority.

PROTECT THE CORE.


### Portable inventory derivation

The V3 proof does not import the TypeScript deployment installer directly under Node. It derives the current 49-row inventory from the predecessor's frozen path list and independently requires, for every row, stable direct-file bytes, worktree Git-blob equality, exact HEAD tree blob, exact path, and exact 100644/100755 mode. The unchanged deployment installer remains separately pinned and later performs its own authoritative current-source comparison.


### Exact worktree mode parity

The current-row derivation now matches the deployment installer's row semantics exactly for executable identity: the stable visible file mode is captured together with the retained byte generation, reduced to 100644/100755 from the visible executable bits, and required to equal the HEAD tree mode before the candidate row is emitted. Tree mode is no longer accepted as a substitute for the worktree mode.


### Reachable-history portability

V3 no longer executes the historical Dispatch V2 proof. That proof contains frozen historical-generation checks whose Git objects need not be reachable from a minimal clone of the V3 candidate history. V3 now pins the exact reachable Dispatch V2 proof blob as provenance, statically binds its reviewed range-index successor and negative-authority contract, and independently derives the current 49-row inventory from current worktree bytes plus HEAD tree identity. V3 `--self-test` and `--derive` therefore require no mutable remote ref or unreachable historical Git object.


### Independent reachable-history hosted evidence

V3 hosted derivation is isolated from the historical V2 matrix. Each Node 22/24/26 V3 job creates a temporary Git bundle whose only positive ref is the exact V3 HEAD, clones that bundle, verifies historical Dispatch commit `af9646827b25e8103004f96525623ba248b41d2a` is absent, and then runs V3 self-test/derive inside that reachable-history-only clone. The historical V2 jobs remain unchanged and cannot block V3 artifact publication or V3 cross-node equality.
