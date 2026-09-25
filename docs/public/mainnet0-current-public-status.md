# VOID Mainnet-0 current public status

<!-- VOID_MAINNET0_CURRENT_PUBLIC_STATUS_V2 -->

Reviewed: **September 25, 2026**

Status: `PUBLIC_MAINNET0_LIVE_WITH_GUARDED_MUTATION`

VOID Mainnet-0 is live as an early public network with real multi-node operation, public discovery, DataNet evidence, Work Credit earning proofs, operator evidence workflows, and validator readiness evidence. Economic `VoidToken` contracts currently use a separate private loopback EVM/Anvil execution layer; public economic activation remains guarded while its relationship to the public block/P2P runtime is explicitly resolved.

It is not yet a permissionless production network. Public visibility is intentionally ahead of public mutation authority.

## Current hosted entry points

- Human-facing site: `https://voidchain.org/`
- Public node/API origin: `https://zoso-alienware-aurora-r7.taila47fd.ts.net/public-node`
- Machine discovery: `/.well-known/void-public-node.json`
- Participant application: `/app/`

The human-facing `voidchain.org` root is live. Path-preserving custom-domain API ingress is still being hardened, so machine clients should use the documented public-node origin until that boundary is explicitly promoted.

The repository and discovery document remain the canonical way to understand routes and capability boundaries. A hosted endpoint may change without changing the protocol.

Hosted-origin strings in this document are operational coordinates, not durable
protocol authority. Treat them as usable only after a fresh reachability and
identity check; historical Tailscale/Funnel coordinates elsewhere in the
repository remain evidence of their own observation windows rather than
automatic present-tense reachability.

## Network and synchronization status

The project-operated mesh currently uses three nodes with separated operating roles. It proves real networking and role separation, but does not by itself prove broad external decentralization.

The merged public-bootstrap path now includes two source-pinned, independently failing introduction classes for ordinary public clone/run synchronization: a direct IPv4 introduction and a Tor v3 introduction. Both are bound to exact expected VOID node identities through the normal HELLO/AUTH protocol. The live N-1 acceptance lane proves that either introduction can continue onboarding when the other path is unavailable. This removes a single required introduction path; it does not turn the project-operated mesh into broad external decentralization.

Canonical production is live. Follower background catch-up remains guarded while exact compatibility for the legacy `proposer.commit-direct.v2fs` canonical envelope, durable WAL replay, and crash recovery is being proven. Follower canaries must remain bounded until that proof wall is green and a real catch-up canary succeeds.

A node reporting `ready=true` proves local readiness only. It is not sufficient evidence that the node is caught up to the canonical producer. Synchronization claims should compare canonical height/source evidence explicitly.

## Capability status

### Live and public read-only

- Source-pinned direct IPv4 + Tor v3 public P2P introductions with exact node-identity binding and N-1 acceptance for the public-bootstrap child.
- Public-node dashboard and route discovery.
- Public runtime, build-map, DataNet, Work Credit, validator-candidate, and proof evidence.
- DataNet read, verify, mirror, pin, and public evidence surfaces.
- Work Credit proof summaries and verifier links.
- Native Voidchain and NullFeed public-site routes.
- Public operator self-check and offline evidence review.
- Evidence-pack creation and offline pack review.
- Signed operator evidence attestation and independent verification.
- One-command operator evidence workflow.
- Validator registration positive-readiness public evidence.

### Live as a bounded pilot

- Coordinator-issued Work Credit earning tickets.
- Remote execution by an outside participant or executor.
- Verified receipt submission.
- Fixed or bounded award policy.
- Per-account and global caps.
- Duplicate-ticket and duplicate-receipt protection.
- Participant command-line workflow.

This is real earning, but it is not unrestricted public issuance.

### Guarded or under active proof

- Public presale intake and production WC/VOID activation are coupled and currently closed; the checked-in WC/VOID production candidate is `HOLD`. Current hardening separates `VoidToken` from native gas and requires explicit identity/public-verification of the private economic EVM versus the public VOID-node chain, plus a reviewed participant post-purchase token-control path, before activation.
- Automatic/background follower catch-up while legacy commit-direct/WAL compatibility is under proof.
- Work Credit award authorization.
- WC-to-VOID settlement.
- Wallet signing and VOID transfer.
- Buy VOID payment verification and fulfillment.
- Validator activation and validator-set mutation.
- Treasury spending.
- Private RPC and operator mutation routes.

### Not enabled

- Public anonymous ledger writes.
- Permissionless WC minting.
- Automatic Buy VOID fulfillment.
- Public active-validator admission.
- Public treasury control.
- Public wallet or signer custody.

## Work Credit policy

Work Credits account for useful, verifiable work.

- WC are intended to be unlimited accounting units.
- A funded settlement tranche is not a lifetime WC supply cap.
- No fixed WC-to-VOID conversion or redemption ratio exists.
- Current public earning remains bounded by capability tickets, verified receipts, per-account/global caps, and duplicate protection.
- The production WC/VOID market is coupled to public presale opening; neither may open alone.
- Opening policy is `10,000,000 VOID` protocol inventory, `0 WC` protocol seed, no administrator-set opening price, and one-sided market discovery from real participant WC.
- The current WC/VOID production candidate is `HOLD` pending vault/code verification, funded-and-locked inventory, settlement review, replay protection, bounded canary, cross-lane gas reservation and nonce scheduling, fresh fee-cap checks, receipt-finality-controlled gas release, an ongoing native-gas model, a reviewed VOID→WC reverse settlement path, and coupled activation readiness.
- `SOURCE_READY` is only a source classification and does not itself authorize wallets, signers, funding, transactions, market activation, presale activation, or funds movement.

## Buy VOID status

The application exposes the fixed-price Buy VOID presale terms and guarded request/receipt boundaries, but public presale intake is not open merely because those surfaces exist.

Canonical presale economics remain finite: `10,000,000 VOID` at `2 VOID per 1 USDC` (`$0.50/VOID`), with exact payment and duplicate/replay protections.

The public opening is now coupled to WC/VOID production readiness: the presale must not open without WC/VOID ready for the same launch ceremony, and WC/VOID must not open independently before or without the presale. The presale price does not set or peg the WC/VOID market price.

Payment verification and `VoidToken` fulfillment remain separately auditable transitions. The delivery inventory is not the fulfiller's native gas balance. Per-payment gas reservation does not prove full-presale lifetime gas capacity, and any future source-chain refund requires its own source-chain fee budget. Automatic fulfillment is not enabled.

"No hidden minimum" remains the current policy truth; it is not a promise to
accept unlimited microscopic purchases. Before public intake, an explicit
anti-grief rule must bound the fixed fulfillment cost per admitted obligation.
A disclosed minimum, batching/amortization, user-paid gas, or another reviewed
bounded mechanism may close that gate.

Unpaid payment instructions also need bounded lifetime and outstanding-count
limits so they cannot lock gas or inventory indefinitely. A source-chain payment
observed after instruction expiry must enter deterministic reconciliation rather
than silently reviving the stale instruction.

## Validator status

Validator registration has positive-readiness public evidence, but registration remains candidate/waiting only.

- Active admission is disabled.
- Stake, identity, readiness, and operator policy remain separate checks.
- A public readiness document does not itself grant validator authority.

See [validator registration positive-readiness public release](../validators/validator-registration-positive-readiness-public-release-v1.md).

## Operator evidence status

The public operator evidence workflow is complete and post-merge proven.

It composes:

1. Public-node self-check.
2. Offline self-check receipt review.
3. Evidence-pack creation.
4. Offline evidence-pack review.
5. Dedicated-domain signed attestation.
6. Independent attestation verification.
7. Recursive checksum verification.

The workflow is read-only. It does not restart a node or mutate chain, DataNet, Work Credit, wallet, Buy VOID, validator, or treasury state.

See [public-node operator evidence workflow](../public-node/public-node-operator-evidence-workflow-v1.md).

## Release status

The source package version is currently `0.1.0`, but there is no `release-v0.1.0` tag and no official stable VOID node GitHub Release as of September 25, 2026.

The only currently published GitHub Release is the immutable **VOID External-Agent Credential Request Packet V1** from July 27, 2026. It is a historical external-agent packet, not a stable node release.

VOID has substantial deterministic build, installer, update, qualification, immutable-publication, canary, and promotion infrastructure in the repository. Those walls do not themselves publish or promote a stable release.

The first official node release must start from an exact clean `main`, pass deterministic asset/checksum/SBOM/provenance checks, the documented qualification and approval/time-lock path, immutable publication, an isolated release canary, and stable-channel promotion.

See [Release state and published artifacts](../../RELEASES.md), [branch and release policy](branch-release-policy.md), and [release publication and promotion v1](release-publication-promotion-v1.md).

## Honest network posture

The project-operated multi-node mesh proves real networking and role separation. It does not by itself prove broad external decentralization.

The next activation goals remain:

- More outside operators and independent public bootstrap/failure domains beyond the project-operated direct+Tor pair.
- More independent public evidence packs.
- More useful-work participation.
- Safer reduction of coordinator dependence.
- Proven follower catch-up with durable legacy/WAL compatibility before enabling continuous synchronization.
- Bounded automatic Buy VOID fulfillment after its payment and replay boundaries are fully proven.
- Candidate-to-active validator admission only after the public policy and runtime gates are ready.

## Safety line

Never share private keys, seed phrases, wallet files, `.env` contents, operator credentials, or unredacted receipts containing secrets.

Do not treat a public page, tester receipt, candidate record, signed evidence pack, or local readiness signal as authority beyond the exact claim it verifies.

For a role-based introduction, see [Start here](start-here.md). For a compact status table, see the [current capability matrix](current-capability-matrix.md).

Legacy operator artifacts whose filenames contain `.current` are classified by
the [Mainnet-0 current-truth map](../../ops/mainnet/CURRENT_TRUTH.md); the filename
alone does not make an old checkpoint present-tense authority.
