# voidchain.org path-preserving ingress — current Buy VOID gateway V2

**Status: SOURCE-ONLY DRAFT / INERT / HOST ACCEPTANCE HOLD.**

This is a versioned successor to the original reviewed
`VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1` packet generator.
It is stacked on the public checkout gateway PR #2823 at exact source ancestor
`2f5a8d98ab3cefafe04286b271552b501dd96704`.
The currently reviewed composition gateway blob for this candidate is
`0f7b7ccec7aecbcfe6a48df1cd28063dc6550131`.

## Why a new source generation is required

The original ingress packet tool has frozen Git blob
`92d3cfb85596a25e9d1e39dbcf549b3aa7a37ee5` and requires the
historical public composition gateway blob
`850419187facd4a90feeb15aa676b03d785e44b5`.
It correctly **rejects** current Buy VOID checkout gateway source. We do not
change, repin, disable or overwrite that historical V1 packet generator,
proof, workflow or its acceptance artifacts.

The additive `tools/void-voidchain-path-preserving-ingress-current-gateway-v2.mjs`
is a consciously narrow source-generation successor with a new marker, schema,
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

## Interrupted private packet publication and exact-path recovery

The V2-only packet publisher closes a packet preparation recovery gap found
during security review. A power/process/fsync interruption may occur after
creating the private 0700 output directory but before all generated file
names are durable. V1 correctly rejects a previously used output name and
remains unchanged. V2 is **create-only per leaf**, but permits an exact
same-path continuation under a retained O_DIRECTORY|O_NOFOLLOW descriptor:

- Require the same private directory inode, POSIX owner and mode **0700**;
  no symlink/alias, no unexpected child name, no unreviewed file mutation.
- Compute all expected packet bytes and metadata from **fresh current source
  and the same reviewed input** before touching a partially published path.
- Existing child names must form an exact subset of the three reviewed 0600
  generated leaves plus `packet.json`. Each present file must be single-link
  private regular 0600, owned by the current UID, exact canonical bytes,
  exact size, and stable dev/ino/uid/gid/mode/mtime/ctime across its bounded
  descriptor read. Conflicting/ambiguous artifacts HOLD without overwrite.
- Create only missing leaves with O_CREAT|O_EXCL|O_NOFOLLOW; fsync each,
  verify it, and publish `packet.json` **last**, followed by directory fsync.
  A packet present with a missing predecessor leaf is **HOLD**, not repaired.
- An exact fully completed packet can be requalified at the same path with
  no rewrite; an incomplete but exact prefix can be safely completed.

The inert proof injects one **post-fsync failure at each of five boundaries**:
config, systemd unit, REVIEW.txt, packet.json, and parent directory. Each
must preserve exact existing bytes and complete at the same output path on
retry. Four corrupt-partial negatives (different bytes, unreviewed extra
leaf, insecure mode, symlink) each HOLD without overwriting any existing
bytes. A missing predecessor alongside an existing packet.json also HOLDS.

This is not a same-UID lifetime tamper-proof lease, not a rollback or
deletion authority, and not evidence of production installed ingress. No
existing nonmatching output directory may be silently repaired.

## Independent packet verifier custody and nested-contract proof

The V2 **verify** path now independently opens both `packet.json` and
each generated leaf via `O_RDONLY|O_NOFOLLOW` descriptors. It requires
single-link regular 0600 files, current UID ownership, exact visible/held
dev+inode identity, bounded byte content and unchanged metadata
(size, uid/gid, mode, nlink, mtime/ctime) before and after the read.
A hard link outside the private packet directory is an ownership HOLD,
even when all checksums and packet bytes still match.

The verifier also reconstructs the **entire** expected source-bound
packet body from the qualified repository, metadata-only credential,
cloudflared executable and deterministic rendered files. It refuses
unknown or rehashed nested fields (especially additional
`activation_authorized` claims) before returning a positive inert
review result. A self-consistent SHA-256 plan ID is no substitute for
this exact reviewed schema.

The focused Node22/24/26 proof hard-links both a generated configuration
and `packet.json` into the disposable surrounding temp directory, and
requires verified admission to fail until each alias is removed. Three
additional negative cases add unknown nested fields under `activation`,
`frontdoor` and the Precision recovery prerequisite, recompute each
`plan_id`, and require the exact nested-contract HOLD. These synthetic
tests do not prove installed packet ownership or confer ingress activation
authority.

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
