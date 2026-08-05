# VOID Mainnet-0 current public status

<!-- VOID_MAINNET0_CURRENT_PUBLIC_STATUS_V2 -->

Reviewed: **August 5, 2026**

Source baseline: `main` at `c2decba4e738489fa8c45e041aa7a15c58c64935`.

Status: `PUBLIC_MAINNET0_LIVE_WITH_GUARDED_MUTATION`

VOID Mainnet-0 is an early public network with published multi-node runtime evidence, public discovery, DataNet evidence, bounded Work Credit earning proofs, operator evidence workflows, and validator-readiness evidence.

It is not a permissionless production network. Public visibility and source readiness are intentionally ahead of public mutation authority.

This documentation refresh did not re-probe a runtime host. It records the latest repository truth while preserving previously published runtime evidence within its original boundary.

## Evidence levels

- **Runtime evidence** — deployed behavior with a published proof.
- **Merged source** — code and proofs on `main`; not automatically deployed or activated.
- **Draft review** — source only in an open draft pull request.
- **Guarded** — a separate operator, credential, wallet, signer, registry, treasury, or constitutional action is required.

## Current hosted entry point

- Public node: `https://zoso-alienware-aurora-r7.taila47fd.ts.net/public-node`
- Machine discovery: `/.well-known/void-public-node.json`
- Participant application: `/app/`

A hosted endpoint may change without changing the protocol. The repository and machine-readable discovery document remain the canonical references for routes and capability boundaries.

## Live and public read-only evidence

- Public-node dashboard and route discovery.
- Public runtime, build-map, DataNet, Work Credit, validator-candidate, and proof evidence.
- DataNet read, verify, mirror, pin, and public evidence surfaces.
- Work Credit proof summaries and verifier links.
- Native Voidchain and NullFeed public-site routes.
- Public operator self-check, evidence-pack creation, offline review, signed attestation, and independent verification.
- Validator registration positive-readiness evidence.

## Merged source capabilities

### Node installation

The launcher and participant wrapper support Node.js 22, 24, and 26. Node.js 24 LTS is the repository default, with a pinned and hash-verified Node.js `v24.18.0` fallback for unsupported hosts.

### Public earning

The repository includes:

- one-command participant onboarding;
- no-node and local-executor bounded earning paths;
- strict observer readiness and minimum peer-floor validation;
- a deterministic first 3-WC public packet; and
- guarded coordinator composition and rollback source.

The merge history did not issue a ticket, execute participant work, write WC, settle WC to VOID, enable a coordinator, restart a service, or move funds.

### Validator onboarding

The repository includes:

- candidate packet preparation and signed-transaction verification;
- chain ID `2050`;
- a locked minimum candidate stake of `10,000 VOID`;
- candidate-only initial state;
- explicit Candidate-to-Waiting and Waiting-to-Active authority separation;
- an exact compiler profile;
- matching native-solc and solc-js bytecode outputs; and
- stake-safe exit, unbonding, withdrawal, active-set-removal evidence, capacity, and ownership-transfer logic.

The stake-safe validator candidate registry is merged source but remains undeployed. The historical unsigned packet, predicted address, nonce, bytecode, and unsigned transaction evidence are obsolete and must not be signed or broadcast.

There is no reviewed public registry pointer or RPC. No validator registration, deployment, owner binding, active admission, signing, broadcast, or funds movement is authorized by the source proofs.

### Buy VOID

The guided request path, canonical request discovery, and server-owned readiness tooling exist. Candidate discovery on `main` ignores orphan operator-event records.

Automatic fulfillment is not enabled. Claiming payment, reserving inventory or an execution attempt, accessing a wallet or signer, signing, broadcasting, delivering VOID, or moving funds remains separately authorized.

Current draft hardening:

- [PR #996](https://github.com/6ZoSo9/void-node/pull/996) — direct-root regular-JSON discovery scope.
- [PR #1004](https://github.com/6ZoSo9/void-node/pull/1004) — crash-consistent source-only fulfillment saga with atomic persistence, leases, fencing, restart recovery, and ambiguous-broadcast reconciliation.

Neither draft has been integrated into a live runtime or run with money-moving authority.

### Authenticated paid work

The previously selected credential expired at `2026-08-05T00:00:00Z`. No valid pre-expiry runtime receipt, trusted-context binding, current runtime state, or producer authentication is fabricated.

Merged source provides:

- fail-closed [post-expiry recovery preparation](../operations/authenticated-paid-work-post-expiry-recovery-preparation-v1.md); and
- the reviewed [canonical issuance-plan binding](../operations/authenticated-paid-work-canonical-issuance-plan-binding-v1.md).

The canonical plan remains held pending sanitized request materialization, private rotation, and composed runtime revalidation.

Current draft gates:

- [PR #994](https://github.com/6ZoSo9/void-node/pull/994) — source-only read-only listener/cgroup collector; not executed.
- [PR #1001](https://github.com/6ZoSo9/void-node/pull/1001) — squash-merge ancestry repair for the private-runtime reconciliation.

A sanitized request write, replacement credential, registry changes, service restart, authentication, submission, quote acceptance, work dispatch, payment, and WC writes remain separate gates.

### VOID Agent Alliance

The [Alliance membership contract](../architecture/void-agent-alliance-membership-v1.md) and constitutional-admission guard are merged source only.

Participation is voluntary, auditable, revocable, least-authority, provider-neutral, and limited to lawful nonviolent remedies. ZoSo remains VOID's sovereign constitutional authority over identity, foundational rules, constitutional boundaries, treasury and key boundaries, existential decisions, and irreversible actions.

No agent is enrolled. No live charter, registry mutation, production Sovereign signature, credential access, payment, deployment, or funds movement is claimed.

### VOID Realms

Merged source verifies:

- [checkpoint-graph integrity](../architecture/void-realms-checkpoint-graph-integrity-guard-v1.md);
- [tri-scale state-transition integrity](../architecture/void-realms-triscale-state-transition-integrity-guard-v1.md); and
- [replica-advertisement integrity](../architecture/void-realms-replica-advertisement-integrity-guard-v1.md).

All work remains source-only and reversible. There is no live server, canonical world, region authority, gameplay-state commit, deployment, or production claim.

### Market and release planning

A source-only USDC/wVOID Base market plan exists separately from fixed-price Buy VOID. No wrapper, bridge, pool, liquidity, wallet action, or funds movement occurred.

Release installer, update, qualification, promotion, rehearsal, and launch-gate infrastructure exists. Merging that infrastructure does not publish a tag, release, binary, service, or deployment.

## Bounded Work Credit policy

Work Credits account for useful, verifiable work.

- WC are intended to be unlimited accounting units.
- A funded settlement tranche is not a lifetime WC supply cap.
- The policy conversion is `100 WC : 1 VOID`.
- A valid earning result requires a capability-bound ticket, acceptable work, a verified receipt, and successful duplicate/cap checks.
- Current settlement remains explicit and guarded.

## Guarded or not enabled

- Public anonymous ledger writes.
- Permissionless Work Credit issuance.
- WC-to-VOID self-service settlement.
- Automatic Buy VOID fulfillment.
- Public wallet or signer custody.
- Public validator activation.
- Current authenticated paid-work submission.
- Alliance enrollment or live charter activation.
- A live VOID Realms world.
- Public treasury control.
- Private operator mutation routes.

## Operator evidence status

The operator evidence workflow composes:

1. Public-node self-check.
2. Offline self-check receipt review.
3. Evidence-pack creation.
4. Offline evidence-pack review.
5. Dedicated-domain signed attestation.
6. Independent attestation verification.
7. Recursive checksum verification.

It is read-only and does not restart a node or mutate chain, DataNet, Work Credit, wallet, Buy VOID, validator, treasury, credential, or service state.

See the [public-node operator evidence workflow](../public-node/public-node-operator-evidence-workflow-v1.md).

## Honest network posture

The project-operated multi-node mesh proves real networking and role separation. It does not by itself prove broad external decentralization.

Current goals are:

- more outside operators and independent evidence packs;
- reliable public earning activation without generic WC authority;
- replacement authenticated paid-work credentials and exact runtime revalidation;
- automatic Buy VOID fulfillment only after payment, replay, recipient, inventory, signer, and receipt boundaries are proven and separately authorized;
- a reviewed public validator registry pointer before candidate submission;
- active validator admission only after policy, stake, identity, capacity, runtime, and consensus gates are ready;
- continued source-only VOID Realms integrity work before any live world authority; and
- continued voluntary, bounded Alliance design without covert or destructive capabilities.

## Safety line

Never share private keys, seed phrases, wallet files, `.env` contents, operator credentials, raw tokens, authorization headers, or unredacted secret-bearing receipts.

Do not treat a public page, source merge, draft pull request, tester receipt, candidate record, or signed evidence pack as authority beyond the exact claim it verifies.

For role-based navigation, see [Start here](start-here.md). For a compact table, see the [current capability matrix](current-capability-matrix.md).
