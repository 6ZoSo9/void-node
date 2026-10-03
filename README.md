# VOID Network / `void-node`

<!-- VOID_PUBLIC_DOCS_CURRENT_STATE_V1 -->

**PROTECT THE CORE.**

VOID Network is a Mainnet-0 blockchain, DataNet, and useful-work network built for verifiable coordination between people, operators, and AI agents.

The repository is public and operational, but it is still an early network. Public discovery and proof surfaces are intentionally broader than public mutation authority.

## Current state

Reviewed: **October 3, 2026**

### Live now

- Mainnet-0 canonical block production and a project-operated three-node mesh.
- Source-pinned public P2P introductions over direct IPv4 and Tor v3 for ordinary public clone/run synchronization, with exact node-identity binding and live N-1 acceptance across independent introduction paths.
- Human-facing `https://voidchain.org` access, with machine/API discovery through the documented public-node surfaces.
- Public node discovery at `/public-node` and `/.well-known/void-public-node.json`.
- Read-only public status, proof, DataNet, Work Credit, and validator-candidate evidence.
- Participant-facing application at `/app/` with Home, Wallet, Earn, Data, Buy, Validate, and Network surfaces.
- DataNet read, verify, mirror, pin, public evidence, and deployment-attestation paths.
- Bounded Work Credit earning through coordinator-issued capability tickets and verified remote-executor receipts.
- Public operator self-checks, offline evidence review, evidence packs, signed attestations, and one-command evidence workflow.
- Positive-readiness evidence for validator registration while active admission remains disabled.
- The client-neutral Epoch-2 successor state manifest is published through the public evidence/composition path; that closes the successor-state evidence gate without claiming migration or public economic activation.

### Guarded or under active proof

- Background follower catch-up is guarded while legacy `proposer.commit-direct.v2fs` compatibility, WAL replay, and exact crash-recovery behavior are being proven. Do not infer global catch-up from a node reporting `ready=true`.
- Public presale intake and production WC/VOID market activation are coupled and remain closed. The checked-in WC/VOID production candidate is `HOLD`; source readiness, funding, signer authority, canary success, and public activation remain separate states.
- The Buy VOID payment policy is source-allowlisted to native USDC on Ethereum mainnet (chain ID `1`) and Base mainnet (chain ID `8453`) only. Bridged USDbC, lookalike tokens, unsupported chains, blind deposits, and exchange/custodial sends are not supported. Public intake is still closed.
- A Precision atomic Buy VOID activation apply gate is merged source, but it does not itself open intake, authorize a signer, move inventory, or enable automatic fulfillment.
- A separate coupled Buy VOID source launch gate is also merged. It requires exact production WC/VOID, successor, inventory/custody/canary, coupled-gate, and authority-key evidence and still classifies the canonical successor as `HOLD`; route/config integration remains separate. Ethereum checkout readiness/finality gating is likewise merged source-only and does not make public intake live.
- Economic activation still requires bounded micro-purchase/micro-trade gas-grief protection. No hidden minimum is authorized; if a minimum is selected later it must be explicit and public, while batching, user-paid gas, or another bounded mechanism may satisfy the same gate.
- Any unpaid payment/trade instruction that reserves gas or inventory must also have bounded expiry plus per-identity/global outstanding caps; stale instructions cannot pin capacity indefinitely.
- WC/VOID's zero-WC-seed opening also needs a fixed price-forming window. The window shape is source-defined as an absolute opening window with an exclusive close boundary, but the exact launch artifact still must supply the live timestamps. Participant provenance, concentration/Sybil limits, minimum real-WC depth, and exclusion of non-production/test WC remain separate gates.
- The private economic EVM contains historical standard Anvil prefunded accounts with publicly known keys. Their historical receipts remain evidence, but those balances/keys must be neutralized/reconciled and blocked from public submission before economic public access.
- Public economic instructions/quotes must disclose every fee component, gas payer/model, gross/net amount, slippage/minimum output, market-state binding, and expiry before money authority.
- BTC/VOID now has merged deterministic Bitcoin HTLC and Chain-2050 hashlock-settlement primitives with exact terminal VOID balance-delta and adversarial preimage checks. That is source-level settlement progress, not a live market; BTC/VOID remains post-presale and separately launch-gated.
- The dedicated DataNet content-commitment registry is deployed and attested on the production Epoch-2 successor execution environment. The separate successor state-root commitment/finality/truth-admission gate remains `HOLD`.
- Private-EVM durability must be current, not merely historically valid: the older planned recovery checkpoint at block 37371 predates accepted economic receipt evidence at block 37391. Launch still requires a fresh durable checkpoint covering accepted economic history plus proven no-stale-fallback restart.
- Public wallet or signer access.
- Unrestricted public ledger writes.
- Permissionless Work Credit issuance or settlement.
- Automatic Buy VOID fulfillment.
- Public validator activation or validator mutation.
- Treasury movement and private operator routes.

Public active validator admission remains disabled. Public validator registration remains candidate/waiting only. Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.

See the [current capability matrix](docs/public/current-capability-matrix.md) and [Mainnet-0 current public status](docs/public/mainnet0-current-public-status.md) for the exact boundary.

## Start here

| You are… | Begin with… |
|---|---|
| Exploring VOID | [Start here](docs/public/start-here.md) |
| Getting a node running quickly | [Quick start](docs/public/quick-start.md) |
| Running on Windows | [Windows WSL2 quick start](docs/public/windows-wsl2-quick-start.md) |
| Checking current status | [Current public status](docs/public/mainnet0-current-public-status.md) |
| Running a node | [Run a node](docs/public/run-a-node.md) |
| Participating or earning Work Credits | [Participant onboarding](docs/public/participant-onboarding.md) |
| Reviewing the original public-live checkpoint | [Public live announcement](docs/public/mainnet0-public-live-announcement.md) |
| Operating a public node | [Operator evidence workflow](docs/public-node/public-node-operator-evidence-workflow-v1.md) |
| Reviewing validator readiness | [Validator positive-readiness release](docs/validators/validator-registration-positive-readiness-public-release-v1.md) |
| Browsing all public docs | [Public documentation index](docs/public/README.md) |

Policy/reference shortcuts: [Support guide](SUPPORT.md), [Security policy](SECURITY.md), [Contributing guide](CONTRIBUTING.md), [Proof cadence](docs/public/proof-cadence.md), [Branch/release policy](docs/public/branch-release-policy.md), [Developer reference](docs/public/developer-reference.md), and [Whitepaper](docs/public/void-network-whitepaper.md).

## What VOID is building

### VOID Chain

The public VOID node runtime uses chain ID `2050`, segmented storage, peer networking, block and transaction APIs, validator truth surfaces, and explicit mutation guards. Current economic contracts and `VoidToken` state also use a **private loopback EVM/Anvil execution layer** configured with chain ID `2050`. Current source does not yet prove those two histories are identical or anchored to one another. Public economic activation remains `HOLD` until that relationship, independent public economic verification, native-gas accounting, and a reviewed participant path to control and transfer delivered `VoidToken` are explicit.

Merged PR #1851 (`d6bf311291ec66203d2d74922842ee441e67295e`) records the chosen successor direction: freeze the current Anvil history as an immutable Economic Genesis Archive and migrate only live economic value/obligations into a clean non-Anvil production successor. Participant balances remain at the same address; contract-held value is explicitly mapped into reviewed successor custody. AdminGate/ConfigGate and other obsolete bootstrap plumbing remain archive-only by default. `333,333,333 VOID` is the reconciled premine reference; migration preserves final live `VoidToken.totalSupply()` exactly, including legitimate emissions already present before freeze.

Since that architecture decision, the frozen-source census and client-neutral Epoch-2 successor state/genesis evidence have been published and the reviewed production successor is validator-set-bound. The dedicated `DatanetContentCommitmentRegistryV1` was also deployed and attested on the production Epoch-2 execution environment in block `5899` at `0xe60b15ed8df7c4ec5334067ead18c924744c2681`. Those are concrete successor/deployment milestones, but no economic migration has occurred and the successor state-root commitment into canonical public truth remains a separate `HOLD` gate.

### DataNet

A decentralized information layer for storing, serving, mirroring, verifying, weighting, and discovering data. DataNet may preserve bounded unverified, conflicting, experimental, low-value, or incorrect information without promoting it to canonical truth. Persistence, replication, or popularity is not Chain-2050 truth.

The current production Epoch-2 DataNet commitment registry is deployed and independently attested, with a dedicated offline-selected deployer distinct from the dedicated publisher. Deployment proves the registry creation/runtime/immutables; it does **not** authorize the separate successor state-root commitment transaction. The corrected successor state-root payload remains behind exact commitment, finality, event-membership, and truth-admission checks.

See the [DataNet → Chain truth membrane and WC exchange doctrine](docs/governance/void-datanet-chain-truth-membrane-wc-exchange-v1.md).

### Work Credits

Work Credits (`WC`) account for useful, verifiable work.

- WC are intended to be unlimited accounting units.
- No fixed WC-to-VOID redemption or conversion ratio exists.
- Current earning is bounded, ticketed, receipt-verified, capped, and duplicate-protected.
- Public self-service issuance and settlement are not enabled.
- The production WC/VOID market is coupled to the presale opening: neither lane may open without the other being ready for the same launch ceremony.
- WC/VOID starts from a `10,000,000 VOID` allocation and `0 WC` seed. Current hardening defines a balanced opening batch: 5M VOID is allocated pro rata to the verified WC opening cohort and 5M VOID remains with all settled WC as the initial two-sided reserve. The fixed presale price is not WC/VOID price authority.
- The opening window is now source-defined as one absolute content-addressed window committed before opening, with an exclusive close boundary. The launch artifact still has to provide the actual live timestamps and satisfy provenance, concentration/Sybil, depth, and production-WC eligibility gates.
- WC/VOID public quote disclosure is source-defined around complete fee components, gross/trade/net accounting, slippage/minimum output, expiry, market-state binding, and the Epoch-2 metered zero-gas-price execution model. That proves disclosure shape, not pricing correctness, custody, publication, or trade execution.
- The current production candidate remains `HOLD` pending vault/runtime verification, inventory funding/lock, durable WC-debit↔claim/transfer-or-refund binding, replay protection, bounded canary, gas/nonce/finality controls, native-gas sustainability, reverse VOID→WC settlement, and explicit resolution/public verification of the private economic EVM versus public VOID-chain relationship.
- A future `SOURCE_READY` classification still grants no funding, signer, transaction, market-activation, or presale-activation authority.
- Retired fixed-rate WC→VOID scripts and the development WC relayer remain historical/regression evidence only. Their old 100:1 fixtures, relayer-fee language, and relayer gas mode have no production pricing, gas-sponsorship, or activation authority.

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

The launcher supports host Node.js **22, 24, and 26**, with Node.js 24 LTS as the repository default. It handles locked dependency installation, local configuration, node-identity creation, build, and startup. If no supported host runtime is available, it downloads the pinned official Node.js `v24.18.0` runtime into the ignored `.runtime/` directory and verifies its exact SHA-256. It does not install Node.js globally or create wallet, validator, treasury, or operator-authority keys.

See the complete [clone-and-run guide](docs/public/clone-and-run-v1.md).

Check readiness from another terminal:

```bash
curl -fsS http://127.0.0.1:4100/__void/ready.json
```

Healthy local readiness should report:

```text
ready=true
gap=0
txroot_live=1
```

Local readiness is not proof that a follower is caught up to the canonical producer. Compare canonical height/source evidence separately when evaluating synchronization.

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
- **Guarded** — implemented or demonstrated, but requires explicit trusted action or an unfinished proof/canary gate.
- **Planned** — not yet available.

Do not share private keys or seed phrases. Never publish wallet files, `.env` contents, operator credentials, or signing material.

For Buy VOID, use the supported participant flow and a self-custody wallet. Blind deposits, exchange sends, and custodial sends are not supported. The allowlisted payment assets are native USDC on Ethereum mainnet and Base mainnet only; bridged USDbC and lookalike tokens are rejected by policy. Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.

Do not send funds based only on an unverified message, page, or address. Payment confirmation is not VOID fulfillment, and a visible UI control does not widen the authority behind it.

## Maintained proof and beta references

Repository guards retain these established verification commands:

```bash
make public-beta-status
make public-beta-preflight
make wc-wallet-proof
```

See the [retired self-hosted beta CI record](ops/SELF_HOSTED_BETA_CI_PLAN.md) and the [refined tracked raw empty-catches public discovery index](docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.md).

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

## Release status

The repository's current package version is `0.1.0`. As of October 2, 2026, GitHub Releases still contains no official stable VOID node distribution.

The published release inventory contains one immutable historical artifact release, **VOID External-Agent Credential Request Packet V1** (July 27, 2026). That packet is not a stable node distribution.

VOID has implemented and proven substantial deterministic build, installer, update-channel, qualification, immutable-publication, canary, promotion, rollback, and solo-operator time-lock infrastructure. Release infrastructure is not itself a published stable release. An official checkpoint must be bound to a clean exact `main` commit and pass the repository's deterministic build, qualification, approval/time-lock, immutable publication, canary, and stable-promotion gates. Do not cut or promote a stable release while a runtime/storage/follower or release-path regression remains unresolved.

See [Release state and published artifacts](RELEASES.md) for the current release inventory and the first-official-release path.
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

## Immutable release publication and promotion

`VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_WALL_V1` adds protected immutable
GitHub Release publication, attested publication and canary receipts,
hash-chained candidate/stable promotion, freeze, revocation, rollback, and
public release-channel state.

No real release is published by merging this infrastructure. See
[release publication and promotion v1](docs/public/release-publication-promotion-v1.md).

## Release qualification and canary matrix

`VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1` requires a complete
fresh-host, WSL2, upgrade, rollback, two-node, and participant-surface matrix,
plus approval by a reviewer who did not run the qualification targets, before
stable promotion.

This infrastructure does not publish a release or deploy a live node. See
[release qualification v1](docs/public/release-qualification-v1.md).

## First official release rehearsal

`VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_WALL_V1` removes tracked Python
bytecode, enforces bytecode-free proofs, normalizes GitHub operations to
non-interactive SSH, and rehearses the complete first official release chain
without publishing a tag or release.

Run:

```bash
make public-python-bytecode-hygiene-v1-proof
make public-first-official-release-rehearsal-v1-proof
```

See [first official release rehearsal v1](docs/public/first-official-release-rehearsal-v1.md).

## First official release launch gate

`VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_WALL_V1` installs the last
non-publishing control plane before an official VOID release. It also repairs
the qualification proof so Python syntax validation cannot leak bytecode into
the repository. The gate freezes an exact clean `main` commit and semantic
version, binds two deterministic builds to the complete release rehearsal,
requires independent approval and an expiring single-use authorization, and
renders an inert publication command.

```bash
make public-first-official-release-launch-gate-v1-proof
```

See [first official release launch gate v1](docs/public/first-official-release-launch-gate-v1.md).

## Solo-operator release time-lock

`VOID_SOLO_OPERATOR_RELEASE_GATE_WALL_V1` preserves the independent-review
release path and adds an explicit `solo_time_lock_v1` path for a project with no
second human reviewer. Solo mode never claims independent review. It requires a
main-only GitHub environment wait of at least twelve hours, a separate explicit
risk acknowledgement, and a 14-24 hour authorization window. The publication
workflow rechecks the live environment after reading the sealed launch record
and before release mutation can become reachable.

```bash
make public-first-official-release-launch-gate-v1-proof
```

See [first official release launch gate v1](docs/public/first-official-release-launch-gate-v1.md).

<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_BEGIN -->
## Public app composition gateway v1

The public node now has a dedicated composition boundary that preserves the
existing Public Earn Gateway while safely serving the VOID App shell and
sanitized network telemetry. Account-scoped Wallet and Earn records remain
local or session-authorized only.

Proof:

```bash
make public-app-composition-repair-wall-v1-proof
```
<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_END -->
