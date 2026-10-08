# Buy VOID saga import-initialization source audit

This source-only unaccepted successor is stacked on Draft #2647,
exact head 5a38cc34ca497b8b39a299aba09ce012d9d3c181.

Draft #2647 has a dedicated GREEN stopped-image byte-identity check
showing that the 58,023-byte reviewed fulfillment saga is now present
in a candidate Docker image. It does not establish safe module
execution or operator payment authority.

This new proof does NOT import the real saga. It reads the same pinned
tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs through the
Linux descriptor-relative reader inherited from the reviewed lineage.
It requires saga Git blob d6a2d1cd82e5e255f435c1e21d1783774a44b2b1
and Dockerfile Git blob 15375dfb34bc457ac57865ae07642b5602f9e958.

The TypeScript JS AST must identify only three Node builtin imports,
50 named function declarations, and 32 immutable top-level constants.
Only previously observed literal/regex/arithmetic initializers and
three Object.freeze literals, one Set literal, and one fixed four-byte
SharedArrayBuffer-backed Int32Array are permitted. Unknown top-level
function calls, dynamic import, file writes, getters, computed global
access, object spreads, new constructors, mutable declarations and
other import-time effects must HOLD.

The self-test starts with the COMPLETE true source as a positive,
then appends eleven distinct synthetically unsafe top-level changes
in memory. It requires each negative to fail for its actual policy
reason, and confirms a comment-only change remains accepted.
No actual saga module or exported function is invoked.

Exact-head Node 22/24/26 CI reads the same source bytes, runs the
adversaries, then emits three byte-identical, unaccepted reports.
The source-only review is separate from #2647's stopped Docker image
verification and from any future safe execution of the saga tool.

A GREEN result establishes at most that the exact source's top-level
syntax has no unreviewed operations under this AST grammar; it is NOT
a proof that the function bodies are safe to call, that the generated
Function importer is immutable, or that a deployed process has the
same files. In particular these required report flags stay FALSE:

- packaged_file_identity_verified_by_this_proof
- actual_saga_module_imported
- saga_runtime_behaviour_reviewed
- injected_adapters_or_wallet_signer_access_verified
- executed_saga_loader_qualified
- accepted_enforcement_generation
- deployed_artifact_generation_verified
- production_source_finality_authority_ready
- presale_activation
- funds_movement

Historical V3/V4/V5 source/compiled attestations remain unchanged.
Runtime tool resolution, enforcement and packaged-image identities,
first durable buyer request, native-USDC source finality, payment-to-
allocation exactly-once durability, operator principal authentication,
custody antirollback and coupled WC/VOID presale are still HOLD.

No Ready/merge/deployment, real VOID saga invocation, host/service,
wallet/key/signer, customer ledger, transaction, Chain2050/WC,
inventory/treasury/liquidity or funds operation.

PROTECT THE CORE.

## Composed-lineage requalification

This successor is derived from #2667 rather than inheriting the historical
#2652 result. Source reads use the current ancestor-safe descriptor-relative
helper and Git ancestry/diff checks use the reviewed absolute-`/usr/bin/git`
helper with its closed environment. The real saga remains unimported and
unexecuted; this is only import-initialization syntax policy evidence.
