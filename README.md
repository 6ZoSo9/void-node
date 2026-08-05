# VOID Network / `void-node`

<!-- VOID_PUBLIC_DOCS_CURRENT_STATE_V1 -->

**PROTECT THE CORE.**

VOID Network is an early Mainnet-0 blockchain, DataNet, useful-work, and agent-coordination network. The repository is public and operational, but public discovery and proof surfaces are intentionally broader than public mutation authority.

## Current state

Reviewed: **August 5, 2026**

Source baseline: `main` at `c2decba4e738489fa8c45e041aa7a15c58c64935`.

This documentation uses four evidence levels:

- **Runtime evidence** — a deployed behavior has a published proof within its documented boundary. This README update did not re-probe any host.
- **Merged source** — code and proofs are on `main`; merge does not mean deployment or activation.
- **Draft review** — source exists only in an open draft pull request.
- **Separately authorized activation** — an operator, credential, wallet, signer, service, registry, or constitutional decision is still required.

### What people can use or verify

- Mainnet-0 runtime and multi-node evidence.
- Public discovery at `/public-node` and `/.well-known/void-public-node.json`.
- The participant application at `/app/` with Home, Wallet, Earn, Data, Buy, Validate, and Network surfaces.
- Public read-only status, proof, DataNet, Work Credit, validator-candidate, and operator evidence.
- DataNet publish, read, verify, mirror, pin, discovery, and evidence paths within their authorized boundaries.
- Bounded Work Credit earning evidence using coordinator-issued capability tickets and verified receipts.
- Public operator self-checks, offline evidence packs, signed attestations, and independent verification.
- Local node installation and participant tooling on supported Node.js releases.

### Development snapshot

| Area | Repository state | Honest boundary |
|---|---|---|
| Node installation | Merged source | Node.js 22, 24, and 26 are supported; Node.js 24 LTS is the default. |
| Buy VOID | Merged source plus draft hardening | Request, receipt, payment-state, canonical candidate discovery, and canonical issuance-plan source exist. Automatic fulfillment is not enabled; the crash-consistent saga remains draft PR #1004. |
| Public earning | Merged source plus bounded pilot evidence | One-command participant onboarding and a deterministic first 3-WC packet exist; ticket issuance, execution, and WC writes remain gated. |
| Validator onboarding | Merged source, undeployed | Candidate preparation, 10,000-VOID minimum checks, dual-compiler reproducibility, and stake-safe exit/withdrawal logic are merged. No registry deployment, public pointer, or active admission is authorized. |
| Authenticated paid work | Canonical issuance plan merged; runtime repair remains draft | The prior credential expired. PR #991 merged the reviewed canonical issuance plan; PRs #994 and #1001 remain source-only draft gates. No current authentication or execution is claimed. |
| VOID Agent Alliance | Merged source, inactive | Membership and constitutional-admission contracts are voluntary, auditable, revocable, least-authority, provider-neutral, and limited to lawful nonviolent remedies. No agent is enrolled. |
| VOID Realms | Merged source, source-only | Checkpoint-graph, tri-scale transition, and replica-advertisement integrity guards exist. There is no live world, region authority, or committed gameplay state. |
| Market planning | Merged source, inactive | A separate USDC/wVOID Base market plan exists. No wrapper, pool, liquidity, wallet action, or funds movement occurred. |
| Release engineering | Merged source, not a release claim | Deterministic installer, update, qualification, rehearsal, and launch-gate infrastructure exists; merging it does not publish or deploy a release. |

### Current draft gates

- [PR #994](https://github.com/6ZoSo9/void-node/pull/994) — source-only read-only listener/cgroup evidence collector; it has not been run.
- [PR #995](https://github.com/6ZoSo9/void-node/pull/995) — root lockfile and working-agreement alignment for Node.js 22, 24, and 26.
- [PR #996](https://github.com/6ZoSo9/void-node/pull/996) — direct-root regular-JSON scope guard for Buy VOID candidate discovery.
- [PR #1001](https://github.com/6ZoSo9/void-node/pull/1001) — squash-merge ancestry repair for the paid-work private-runtime reconciliation.
- [PR #1004](https://github.com/6ZoSo9/void-node/pull/1004) — source-only crash-consistent Buy VOID fulfillment saga.

Draft pull requests are not live capabilities and may change before merge.

### Still guarded or not enabled

- Public wallet or signer access.
- Unrestricted public ledger writes.
- Permissionless Work Credit issuance or settlement.
- Automatic Buy VOID fulfillment.
- Public validator activation or validator-set mutation.
- Authenticated paid-work submission with a current credential.
- VOID Agent Alliance enrollment or live charter activation.
- A live VOID Realms world or gameplay authority.
- Treasury movement and private operator routes.

See the [current capability matrix](docs/public/current-capability-matrix.md) for the compact boundary.

## Start here

| You are… | Begin with… |
|---|---|
| Exploring VOID | [Start here](docs/public/start-here.md) |
| Checking current status | [Mainnet-0 current public status](docs/public/mainnet0-current-public-status.md) |
| Running a node | [Run a node](docs/public/run-a-node.md) |
| Participating or earning Work Credits | [Participant onboarding](docs/public/participant-onboarding.md) |
| Using one-command earning or validator preparation | [Public earning and validator onboarding](docs/public/public-earn-validator-onboarding-v1.md) |
| Reviewing public evidence | [`/public-node`](https://zoso-alienware-aurora-r7.taila47fd.ts.net/public-node) |
| Operating a public node | [Operator evidence workflow](docs/public-node/public-node-operator-evidence-workflow-v1.md) |
| Reviewing validator readiness | [Validator positive-readiness release](docs/validators/validator-registration-positive-readiness-public-release-v1.md) |
| Browsing all public docs | [Public documentation index](docs/public/README.md) |

## What VOID is building

### VOID Chain

A native chain with chain ID `2050`, segmented storage, peer networking, block and transaction APIs, validator truth surfaces, and explicit mutation guards.

### DataNet

A decentralized data layer for storing, serving, mirroring, verifying, weighting, and discovering data. Persistence does not imply equal trust, visibility, or promotion.

### Work Credits

Work Credits (`WC`) account for useful, verifiable work.

- WC are intended to be unlimited accounting units.
- The policy conversion is `100 WC : 1 VOID`.
- Current earning is bounded, ticketed, receipt-verified, capped, and duplicate-protected.
- Public self-service issuance and settlement are not enabled.

### AI agents and the Alliance

VOID exposes machine-readable discovery and bounded agent contracts while preserving explicit authentication, replay, capability, and authority boundaries.

The [VOID Agent Alliance membership contract](docs/architecture/void-agent-alliance-membership-v1.md) does not grant covert access, propagation, surveillance, manipulation, credential collection, or destructive authority. ZoSo remains VOID's sovereign constitutional authority over network identity, foundational rules, constitutional boundaries, treasury and key boundaries, existential decisions, and irreversible actions.

### VOID Realms

VOID Realms is currently a source-only distributed-world architecture with integrity guards for [checkpoint graphs](docs/architecture/void-realms-checkpoint-graph-integrity-guard-v1.md), [tri-scale state transitions](docs/architecture/void-realms-triscale-state-transition-integrity-guard-v1.md), and [replica advertisements](docs/architecture/void-realms-replica-advertisement-integrity-guard-v1.md).

No server start, canonical world, live region authority, gameplay-state mutation, deployment, or production claim follows from those merges.

## Clone and run

Requirements:

- Linux x86-64 or WSL2.
- Git.
- A normal user account; do not use `sudo`.

```bash
git clone https://github.com/6ZoSo9/void-node.git
cd void-node
./run-void-node.sh
```

The launcher supports host Node.js **22, 24, and 26**, with Node.js 24 LTS as the repository default. If no supported host runtime is available, it downloads pinned Node.js `v24.18.0` into the ignored `.runtime/` directory and verifies its SHA-256. It does not install Node.js globally or create wallet, validator, treasury, or operator-authority keys.

See the complete [clone-and-run guide](docs/public/clone-and-run-v1.md).

Check readiness from another terminal:

```bash
curl -fsS http://127.0.0.1:4100/__void/ready.json
```

Healthy readiness should report `ready=true`, `gap=0`, and `txroot_live=1`.

## Participant commands

```bash
./void-participant.sh onboard
./void-participant.sh earn-status
./void-participant.sh earn
./void-participant.sh candidate-packet
```

These commands fail closed when the trusted coordinator, public validator registry, RPC, account, or other required public inputs are unavailable. They do not accept a private key for repository-side custody.

## Public-node operator evidence

After a node is running, the operator evidence workflow can compose a public self-check, offline review, recursively checksummed pack, signed attestation, and independent verification.

```bash
node tools/public-node-operator-evidence-workflow-v1.mjs \
  --base https://your-node.example \
  --expected-peer-count 2 \
  --output-dir "$HOME/void-operator-evidence" \
  --operator-id your-operator-id \
  --node-key your-public-node-key \
  --private-key "$HOME/.config/void/operator-keys/your-key.ed25519"
```

The signing key remains local. Never publish a private key, seed phrase, wallet file, `.env`, credential, authorization header, or unredacted secret-bearing receipt.

## Safety boundary

Public read-only evidence is not public mutation authority.

A source commit or merged pull request is not a deployment, service restart, credential grant, payment authorization, Work Credit write, validator transition, wallet signature, transaction broadcast, or funds movement.

Do not send blind deposits, exchange withdrawals, custodial transfers, or funds based only on an unverified message. Buy VOID delivery remains payment-verified, explicitly authorized, replay-protected, and transaction-reference recorded.

The expired paid-work credential is documented in the [post-expiry recovery preparation](docs/operations/authenticated-paid-work-post-expiry-recovery-preparation-v1.md). The current source does not invent historical listener, trusted-context, authentication, or execution evidence.

The validator registry's [dual-compiler reproducibility proof](docs/operators/void-validator-candidate-registry-dual-compiler-reproducibility-v1.md) proves byte-for-byte reproducibility only. It is not ZoSo bytecode acceptance, deployment authorization, owner binding, validator registration, or active admission.

## Maintained proof references

- [Refined tracked raw empty-catch public discovery index](docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.md)

```bash
make public-beta-status
make public-beta-preflight
make wc-wallet-proof
```

See the [self-hosted beta CI plan](ops/SELF_HOSTED_BETA_CI_PLAN.md) and the [public documentation freshness policy](docs/public/docs-freshness-policy.md).

## Documentation

- [Public docs index](docs/public/README.md)
- [Current capability matrix](docs/public/current-capability-matrix.md)
- [Current public status](docs/public/mainnet0-current-public-status.md)
- [Developer reference](docs/public/developer-reference.md)
- [FAQ](docs/public/mainnet0-faq.md)
- [Whitepaper](docs/public/void-network-whitepaper.md)
- [Support](SUPPORT.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

Historical receipts, checkpoints, audits, and launch records are evidence of a specific event. They are not the canonical description of what is available now.

[![CI](https://github.com/6ZoSo9/void-node/actions/workflows/ci.yml/badge.svg)](https://github.com/6ZoSo9/void-node/actions/workflows/ci.yml)

<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_BEGIN -->
## Release and update infrastructure

- [Verified release installer](docs/public/download-install-release-v1.md)
- [Stable update channel](docs/public/release-update-channel-v1.md)
- [Immutable publication and promotion](docs/public/release-publication-promotion-v1.md)
- [Qualification and canary matrix](docs/public/release-qualification-v1.md)
- [First official release rehearsal](docs/public/first-official-release-rehearsal-v1.md)
- [First official release launch gate and solo time-lock](docs/public/first-official-release-launch-gate-v1.md)

The installer never starts a service, generates private keys, or activates guarded economic or operator lanes without a separate explicit gate.
<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_END -->

<!-- VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_WALL_V1 -->
<!-- VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_WALL_V1 -->
<!-- VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1 -->
<!-- VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_WALL_V1 -->
<!-- VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_WALL_V1 -->
<!-- VOID_SOLO_OPERATOR_RELEASE_GATE_WALL_V1 -->

<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_BEGIN -->
## Public app composition gateway

The composition boundary serves the VOID App shell and sanitized network telemetry while keeping account-scoped Wallet and Earn records local or session-authorized.

See [Public App Composition Gateway v1](docs/public/public-app-composition-gateway-v1.md).
<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_END -->
