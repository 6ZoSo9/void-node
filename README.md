# VOID Network / `void-node`

<!-- VOID_PUBLIC_DOCS_CURRENT_STATE_V1 -->

**PROTECT THE CORE.**

VOID Network is a Mainnet-0 blockchain, DataNet, and useful-work network built for verifiable coordination between people, operators, and AI agents.

The repository is public and operational, but it is still an early network. Public discovery and proof surfaces are intentionally broader than public mutation authority.

## Current state

Reviewed: **July 20, 2026**

### Live now

- Mainnet-0 block production and multi-node runtime operation.
- Public node discovery at `/public-node` and `/.well-known/void-public-node.json`.
- Read-only public status, proof, DataNet, Work Credit, and validator-candidate evidence.
- Participant-facing application at `/app/` with Home, Wallet, Earn, Data, Buy, Validate, and Network surfaces.
- DataNet publish, read, verify, mirror, pin, and public evidence paths.
- Bounded Work Credit earning through coordinator-issued capability tickets and verified remote-executor receipts.
- Public operator self-checks, offline evidence review, evidence packs, signed attestations, and one-command evidence workflow.
- Positive-readiness evidence for validator registration while active admission remains disabled.

### Still guarded

- Public wallet or signer access.
- Unrestricted public ledger writes.
- Permissionless Work Credit issuance or settlement.
- Automatic Buy VOID fulfillment.
- Public validator activation or validator mutation.
- Treasury movement and private operator routes.

See the [current capability matrix](docs/public/current-capability-matrix.md) for the exact boundary.

## Start here

| You are… | Begin with… |
|---|---|
| Exploring VOID | [Start here](docs/public/start-here.md) |
| Checking current status | [Mainnet-0 current public status](docs/public/mainnet0-current-public-status.md) |
| Running a node | [Run a node](docs/public/run-a-node.md) |
| Participating or earning Work Credits | [Participant onboarding](docs/public/participant-onboarding.md) |
| Reviewing public evidence | [`/public-node`](https://zoso-alienware-aurora-r7.taila47fd.ts.net/public-node) |
| Operating a public node | [Operator evidence workflow](docs/public-node/public-node-operator-evidence-workflow-v1.md) |
| Reviewing validator readiness | [Validator positive-readiness release](docs/validators/validator-registration-positive-readiness-public-release-v1.md) |
| Browsing all public docs | [Public documentation index](docs/public/README.md) |

## What VOID is building

### VOID Chain

A native chain with chain ID `2050`, segmented storage, peer networking, block and transaction APIs, validator truth surfaces, and explicit mutation guards.

### DataNet

A decentralized data layer for storing, serving, mirroring, verifying, weighting, and discovering data. Data can remain persistent without every object receiving equal trust, visibility, or promotion priority.

### Work Credits

Work Credits (`WC`) account for useful, verifiable work.

- WC are intended to be unlimited accounting units.
- The policy conversion is `100 WC : 1 VOID`.
- Current earning is bounded, ticketed, receipt-verified, capped, and duplicate-protected.
- Public self-service issuance and settlement are not enabled.

### Participant and operator surfaces

The application and public-node interfaces expose capability status honestly. A visible button or page does not imply unrestricted authority behind it.

The operator evidence workflow composes:

1. Public-node self-check.
2. Offline receipt review.
3. Evidence-pack creation.
4. Offline evidence-pack review.
5. Signed operator attestation.
6. Independent attestation verification.

It is read-only with respect to chain, wallet, Work Credit, Buy VOID, and validator state.

## Local quick start

Requirements:

- Linux or WSL2.
- Node.js 22.
- Git.

```bash
git clone https://github.com/6ZoSo9/void-node.git
cd void-node
npm ci
cp .env.example .env
npm run build
npm start
```

Check readiness:

```bash
curl -fsS http://127.0.0.1:4100/__void/ready.json
```

Healthy readiness should report:

```text
ready=true
gap=0
txroot_live=1
```

Configuration starts in [`.env.example`](.env.example). Common settings include `DATA_DIR`, `HTTP_PORT`, `P2P_PORT`, and `BOOTSTRAP_ADDRS`.

## Public-node operator evidence

After a node is running, use the one-command evidence workflow with your own values:

```bash
node tools/public-node-operator-evidence-workflow-v1.mjs \
  --base https://your-node.example \
  --expected-peer-count 2 \
  --output-dir "$HOME/void-operator-evidence" \
  --operator-id your-operator-id \
  --node-key your-public-node-key \
  --private-key "$HOME/.config/void/operator-keys/your-key.ed25519"
```

The output is locally permission-restricted, recursively checksummed, signed in a dedicated SSHSIG namespace, and independently reviewable offline.

Never publish a private key, seed phrase, wallet file, `.env`, or operator secret.

## Safety boundary

Public read-only evidence is not public mutation authority.

VOID currently distinguishes between:

- **Live** — deployed and usable within the documented boundary.
- **Bounded pilot** — real and proven, but rate-limited or coordinator-gated.
- **Guarded** — implemented or demonstrated, but requires explicit trusted action.
- **Planned** — not yet available.

Do not send blind deposits, exchange withdrawals, custodial transfers, or funds based only on an unverified message. Buy VOID delivery remains payment-verified and transaction-reference recorded.

## Maintained proof and beta references

Repository guards retain these established verification commands:

```bash
make public-beta-status
make public-beta-preflight
make wc-wallet-proof
```

See the [self-hosted beta CI plan](ops/SELF_HOSTED_BETA_CI_PLAN.md) and the [refined tracked raw empty-catches public discovery index](docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.md).

## Documentation

- [Public docs index](docs/public/README.md)
- [Current capability matrix](docs/public/current-capability-matrix.md)
- [Documentation freshness policy](docs/public/docs-freshness-policy.md)
- [Developer reference](docs/public/developer-reference.md)
- [FAQ](docs/public/mainnet0-faq.md)
- [Whitepaper](docs/public/void-network-whitepaper.md)
- [Proof cadence](docs/public/proof-cadence.md)
- [Branch and release policy](docs/public/branch-release-policy.md)

Historical receipts, checkpoint files, launch records, and audit evidence remain immutable. They are evidence of what happened at a specific time, not the canonical description of what is available now.

## Support, security, and contributing

- [Support](SUPPORT.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

[![CI](https://github.com/6ZoSo9/void-node/actions/workflows/ci.yml/badge.svg)](https://github.com/6ZoSo9/void-node/actions/workflows/ci.yml)

<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_BEGIN -->
## Verified release installer

The public download lane now has a deterministic Linux x64 archive, stable
manifest, outer and inner SHA-256 verification, SPDX SBOM, user-scoped
installer, atomic update/rollback, and CI/tag publishing proof. Start at
[`docs/public/download-install-release-v1.md`](docs/public/download-install-release-v1.md).

The installer never starts the service, generates private keys, or activates
guarded economic/operator lanes unless a separate explicit lane does so.
<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_END -->

## Verified stable update channel

`VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_WALL_V1` adds a stable channel manifest,
anti-downgrade update checks, SHA-256 and GitHub-attestation verification,
explicit restart controls, and health-gated automatic rollback.

```bash
void-node update check --channel https://github.com/6ZoSo9/void-node/releases/latest/download/stable-v1.json
```

See [release update channel v1](docs/public/release-update-channel-v1.md).
