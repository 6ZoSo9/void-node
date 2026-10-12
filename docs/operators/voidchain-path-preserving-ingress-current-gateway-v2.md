# voidchain.org path-preserving ingress — current Buy VOID gateway V2

**Status: SOURCE-ONLY DRAFT / INERT / HOST ACCEPTANCE HOLD.**

This is a versioned successor to the original reviewed
`VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1` packet generator.
It is stacked on the public checkout gateway PR #2823 at exact source ancestor
`7b4b0e7cd970481ecbd6b92b6f5ef4acdead2dac`.
The currently reviewed composition gateway blob for this candidate is
`ec998138c382196f6b0302c6d6ed665c4553cdcb`.

## Why a new source generation is required

The original ingress packet tool has frozen Git blob
`92d3cfb85596a25e9d1e39dbcf549b3aa7a37ee5` and requires the
historical public composition gateway blob
`850419187facd4a90feeb15aa676b03d785e44b5`.
It correctly **rejects** current Buy VOID checkout gateway source. We do not
change, repin, disable or overwrite that historical V1 packet generator,
proof, workflow or its acceptance artifacts.

The additive `tools/void-voidchain-path-preserving-ingress-current-gateway-v2.mjs`
is a consciously narrow full-behavior successor with a new marker, schema,
`voidvci2_` packet identity and version 2. The only reviewed executable
source-pin change is the gateway blob above; every other pinned source is
unchanged. It preserves V1's Git override exclusion, exact checked-out bytes,
loopback-only frontdoor, original URL path preservation, private operator
route denial, false-by-default activation claims, bounded execution metadata,
create-only private packet, and **no private credential content reads**.
The V2 semantic check additionally requires the narrow public Buy VOID POST
route and explicit uncertain-submission and no-automatic-retry contracts.

## Verification

The isolated proof
`scripts/prove_void_voidchain_path_preserving_ingress_current_gateway_v2.mjs`
first requires the untouched V1 packet tool to **HOLD** on the current gateway
blob. It then executes the full V2 packet preparation and re-verification using
a disposable directory, an inert fake cloudflared executable and opaque
**synthetic** credential bytes. The executable must never run. Proofs include
exact path-preserving ingress shape, deny-by-default catch-all, credential
metadata-only behavior, malicious Git environment overrides, source tampering,
packet tampering and the original V1 source test cases. A dirty source fixture
is restored after the negative proof.

The exact-head GitHub workflow
`.github/workflows/void-voidchain-path-preserving-ingress-current-gateway-v2.yml`
requires the frozen V1 and current gateway Git blobs unchanged, runs the source
and proof on Node 22, 24 and 26, requires no remaining dirty worktree, checks
diff hygiene and compares raw three-Node proof receipts. The V2 proof uses no
real DNS, tunnel, network listener, wallet, chain, transaction or secret.
It does not authorize a tunnel cutover.

## Remaining independent hard HOLDs

The current gateway PR #2823 must receive its own review and lifecycle
decision. This candidate's source pin deliberately rejects **any future**
gateway revision until independently qualified. Its stacked base must be
rebased or recomposed if the parent PR changes.

Precision web recovery host observations, installed process identity,
dedicated immutable source/runtime custody, TLS/DNS/public path acceptance
and physical ingress activation are still separate operator ceremonies.
Likewise Buy VOID request durability #2811, Epoch-2 signer/fulfillment #2821,
canonical producer startup source check-to-load #2822, allocation custody
and **coupled WC/VOID presale opening** remain HOLD.

No service install/restart, credential access, wallet/signing, real buyer
request, payment, Work Credit, public activation or funds movement occurs
from the source-only proposal. **PROTECT THE CORE.**
