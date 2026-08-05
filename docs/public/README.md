# VOID public documentation

<!-- VOID_PUBLIC_DOCS_INDEX_CURRENT_STATE_V1 -->

This directory contains the canonical public documentation for the current VOID Mainnet-0 network.

Reviewed: **August 5, 2026**

Source baseline: `main` at `c2decba4e738489fa8c45e041aa7a15c58c64935`.

## How to read status claims

- **Runtime evidence** means a deployed behavior has a published proof within its documented boundary.
- **Merged source** means the capability and proof are on `main`; it does not mean deployment or activation.
- **Draft review** means the source exists only in an open draft pull request.
- **Guarded** means a separate trusted or sovereign action is still required.

The August 5 documentation refresh did not re-probe a runtime host, start a service, access a credential, submit work, write Work Credits, sign a transaction, deploy a contract, or move funds.

## Begin here

1. [Start here](start-here.md)
2. [Current public status](mainnet0-current-public-status.md)
3. [Current capability matrix](current-capability-matrix.md)
4. [Quick start](quick-start.md)
5. [Run a node](run-a-node.md)
6. [Participant onboarding](participant-onboarding.md)
7. [Public earning and validator onboarding](public-earn-validator-onboarding-v1.md)

Windows users can use the [WSL2 quick start](windows-wsl2-quick-start.md).

## August 5 development snapshot

### Node compatibility

The launcher and participant wrapper support Node.js 22, 24, and 26, with Node.js 24 LTS as the default and a verified pinned Node.js 24 fallback.

- [Clone and run](clone-and-run-v1.md)
- [Run a node](run-a-node.md)

### Buy VOID

Request, payment-state, receipt, canonical candidate discovery, and server-owned readiness tooling are merged source. Automatic fulfillment remains disabled.

- [Buy VOID candidate-readiness CLI](../operators/buy-void-observe-and-claim-candidate-readiness-cli-v1.md)
- [Current capability matrix](current-capability-matrix.md)
- Draft direct-root scope hardening: [PR #996](https://github.com/6ZoSo9/void-node/pull/996)
- Draft crash-consistent fulfillment saga: [PR #1004](https://github.com/6ZoSo9/void-node/pull/1004)

The saga draft adds append-only hash-chained events, atomic filesystem persistence, leases with fencing tokens, restart recovery, and a prohibition on automatic rebroadcast after an ambiguous submission. It remains source-only and is not runtime integration or money-moving authority.

### Public earning and validators

The repository includes one-command participant onboarding, bounded earning clients, a deterministic first 3-WC public packet, candidate transaction preparation, a locked 10,000-VOID minimum stake, validator-registry dual-compiler reproducibility, and stake-safe exit and withdrawal source.

Current public earning remains a bounded, coordinator-issued, capability-ticket pilot.

The validator candidate registry source is merged but undeployed. The historical unsigned packet, predicted address, nonce, bytecode, and unsigned transaction evidence are obsolete and must not be signed or broadcast. No coordinator activation, ticket issuance, participant execution, WC write, registry deployment, public pointer, validator registration, or active admission follows from these source merges.

The participant-facing candidate path remains read-only until reviewed public registry inputs exist.

- [Public earning and validator onboarding](public-earn-validator-onboarding-v1.md)
- [Participant onboarding](participant-onboarding.md)
- [Validator positive-readiness release](../validators/validator-registration-positive-readiness-public-release-v1.md)
- [Validator registry dual-compiler reproducibility](../operators/void-validator-candidate-registry-dual-compiler-reproducibility-v1.md)
- [Validator registry stake safety v2](../operators/void-validator-candidate-registry-stake-safety-v2.md)

### Authenticated paid work

The previously selected credential expired on August 5, 2026. The repository preserves the missing pre-expiry evidence honestly and contains source-only recovery preparation.

Merged source:

- [Post-expiry recovery preparation](../operations/authenticated-paid-work-post-expiry-recovery-preparation-v1.md)
- [Canonical issuance-plan binding](../operations/authenticated-paid-work-canonical-issuance-plan-binding-v1.md)

Current draft gates:

- [PR #994](https://github.com/6ZoSo9/void-node/pull/994) — source-only read-only listener/cgroup collector; not executed.
- [PR #1001](https://github.com/6ZoSo9/void-node/pull/1001) — private-runtime reconciliation squash-merge ancestry repair.

No sanitized request materialization, replacement credential generation, registry mutation, service restart, current authentication, submission, work dispatch, WC write, or payment execution is claimed.

### VOID Agent Alliance

The source-only Alliance contracts define voluntary, auditable, revocable, least-authority, provider-neutral membership and constitutional admission limited to lawful nonviolent remedies.

- [Alliance membership v1](../architecture/void-agent-alliance-membership-v1.md)
- [Constitutional charter admission guard](../architecture/void-agent-alliance-constitutional-charter-admission-guard-v1.md)

No agent is enrolled and no live charter or production Sovereign signature is claimed.

### VOID Realms

VOID Realms currently consists of source-only architecture and integrity guards.

- [Checkpoint graph integrity](../architecture/void-realms-checkpoint-graph-integrity-guard-v1.md)
- [Tri-scale state-transition integrity](../architecture/void-realms-triscale-state-transition-integrity-guard-v1.md)
- [Replica-advertisement integrity](../architecture/void-realms-replica-advertisement-integrity-guard-v1.md)

There is no live world, canonical region authority, gameplay-state mutation, server deployment, or production claim.

## Public node and operator evidence

- [Public-node operator evidence workflow](../public-node/public-node-operator-evidence-workflow-v1.md)
- Public discovery route: `/public-node`
- Machine discovery route: `/.well-known/void-public-node.json`

The workflow is read-only with respect to chain, wallet, Work Credit, Buy VOID, validator, and treasury state.

## Work Credits

Work Credits are useful-work accounting units.

- WC are intended to be unlimited.
- The policy conversion is `100 WC : 1 VOID`.
- Current earning is bounded, coordinator-issued, receipt-verified, capped, and duplicate-protected.
- Public self-service WC issuance and WC-to-VOID settlement are not enabled.

Participant paths:

- [Participant onboarding](participant-onboarding.md)
- [Public Earn No-Node Client v1](void-public-earn-no-node-client-v1.md)
- [Local-executor participant CLI release pack](wc-public-earning-participant-cli-release-pack-v1.md)
- [Read-only participant preflight](wc-participant-cli-preflight-v1.md)

## DataNet

DataNet provides publish, read, verify, mirror, pin, discovery, evidence, and weighting paths within explicit authorization boundaries.

Public read-only DataNet evidence does not expose private operator APIs. Persistence does not imply equal trust, visibility, or promotion.

## Economics and guarded actions

- Wallet sends require explicit local unlock and signing.
- Buy VOID fulfillment remains payment-verified, explicitly authorized, replay-protected, and transaction-reference recorded.
- WC-to-VOID settlement remains guarded.
- Treasury movement remains separately guarded.
- The separate USDC/wVOID Base market plan is source-only; no wrapper, pool, liquidity, or funds movement is live.

## Help and project policy

- [Support guide](../../SUPPORT.md)
- [Security policy](../../SECURITY.md)
- [Contributing guide](../../CONTRIBUTING.md)
- [Proof cadence](proof-cadence.md)
- [Branch and release policy](branch-release-policy.md)
- [Documentation freshness policy](docs-freshness-policy.md)
- [Whitepaper](void-network-whitepaper.md)

## Current docs versus historical evidence

Receipts, checkpoints, closeouts, launch announcements, audits, and dated proof results are historical records. Do not rewrite them merely because the network moved forward.

The canonical current-state files are:

- `README.md`
- `docs/public/README.md`
- `docs/public/start-here.md`
- `docs/public/mainnet0-current-public-status.md`
- `docs/public/current-capability-matrix.md`
- `docs/public/run-a-node.md`
- `docs/public/participant-onboarding.md`

When a public claim changes, update the relevant current-state files instead of appending another disconnected status section.

<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_BEGIN -->
## Release documentation

- [Verified release install](download-install-release-v1.md)
- [Release process](release-process-v1.md)
- [Stable update channel](release-update-channel-v1.md)
- [Publication and promotion](release-publication-promotion-v1.md)
- [Qualification](release-qualification-v1.md)
- [First official release rehearsal](first-official-release-rehearsal-v1.md)
- [First official release launch gate](first-official-release-launch-gate-v1.md)
<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_END -->

<!-- VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_WALL_V1 -->
<!-- VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1 -->
<!-- VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_WALL_V1 -->
<!-- VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_WALL_V1 -->
<!-- VOID_SOLO_OPERATOR_RELEASE_GATE_WALL_V1 -->

<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_BEGIN -->
- [Public App Composition Gateway v1](public-app-composition-gateway-v1.md) serves the app shell and sanitized network telemetry without exposing account-scoped data.
<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_END -->
