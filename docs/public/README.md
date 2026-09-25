# VOID public documentation

<!-- VOID_PUBLIC_DOCS_INDEX_CURRENT_STATE_V1 -->

This directory contains the canonical public documentation for the current VOID Mainnet-0 network.

Reviewed: **September 25, 2026**

## Begin here

1. [Start here](start-here.md)
2. [Current public status](mainnet0-current-public-status.md)
3. [Current capability matrix](current-capability-matrix.md)
4. [Quick start](quick-start.md)
5. [Run a node](run-a-node.md)
6. [Participant onboarding](participant-onboarding.md)

Windows users can use the [WSL2 quick start](windows-wsl2-quick-start.md).

## Current capability documentation

- [Current capability matrix](current-capability-matrix.md)
- [Mainnet-0 current public status](mainnet0-current-public-status.md)
- [Participant onboarding](participant-onboarding.md)
- [Run a node](run-a-node.md)
- [Developer reference](developer-reference.md)
- [Mainnet-0 FAQ](mainnet0-faq.md)

## Public node and operator evidence

- [Public-node operator evidence workflow](../public-node/public-node-operator-evidence-workflow-v1.md)
- Public discovery route: `/public-node`
- Machine discovery route: `/.well-known/void-public-node.json`
- Operator evidence is read-only and does not grant wallet, ledger, Work Credit, Buy VOID, validator, or treasury mutation authority.

The one-command operator workflow creates and reviews a public-node evidence pack, signs an exact pack binding, and verifies the attestation offline.

## Work Credits

Work Credits are useful-work accounting units.

Current policy and boundary:

- WC are intended to be unlimited.
- No fixed WC-to-VOID redemption or conversion ratio exists.
- Real remote-executor earning has been proven.
- Current public earning remains a bounded, coordinator-issued, capability-ticket pilot.
- Awards require verified receipts and are protected by caps and duplicate controls.
- Public self-service WC issuance and WC-to-VOID settlement are not enabled.
- The production WC/VOID market and public presale intake are coupled: neither may open alone.
- WC/VOID is defined with `10,000,000 VOID` of protocol-side `VoidToken` opening inventory, a `0 WC` protocol seed, no fixed opening price, and one-sided market discovery from real participant WC.
- `VoidToken` inventory is distinct from native gas. Current economic contracts use a private loopback EVM/Anvil layer; its relationship to the public VOID-node block history and an independent public verification path must be resolved before economic activation.
- A successful delivery is not enough for public sale readiness: participants must also have a reviewed way to verify, control, and later transfer/use delivered `VoidToken` under the approved gas model.
- Public economic admission also needs bounded protection against microscopic purchases/trades creating disproportionate shared native-gas liabilities. Any minimum, if chosen, must be disclosed rather than hidden.
- The current production candidate is `HOLD`; source readiness, once achieved, will still not grant funding or activation authority.

Participant paths:

- [Participant onboarding](participant-onboarding.md)
- [Public Earn No-Node Client v1](void-public-earn-no-node-client-v1.md)
- [Local-executor participant CLI release pack](wc-public-earning-participant-cli-release-pack-v1.md)
- [Read-only participant preflight](wc-participant-cli-preflight-v1.md)
- [Current capability matrix](current-capability-matrix.md)

The no-node client supports one bounded, server-selected useful-work attempt at a time. It does not grant generic WC issuance, settlement, wallet, Buy VOID, validator, or operator authority.

## DataNet

DataNet provides data publish, read, verify, mirror, pin, discovery, evidence, and weighting paths.

Public read-only DataNet evidence can be reviewed without exposing private operator APIs. DataNet may contain unverified, conflicting, experimental, low-value, or incorrect information. Persistence, replication, or popularity does not imply equal trust, equal visibility, automatic promotion, or Chain-2050 truth.

See the [DataNet → Chain truth membrane and WC exchange doctrine](../governance/void-datanet-chain-truth-membrane-wc-exchange-v1.md).

## Validators

- [Validator registration positive-readiness public release](../validators/validator-registration-positive-readiness-public-release-v1.md)

Positive-readiness evidence does not activate a validator. Public registration remains candidate/waiting only, and active validator admission remains disabled and operator-governed.

## Economics and guarded actions

The participant application exposes Wallet, Earn, Data, Buy, and Validate surfaces, but each action retains its own trust boundary.

- Wallet sends require explicit local unlock and signing.
- Buy VOID requests may be created, but fulfillment remains payment-verified and transaction-reference recorded.
- WC-to-VOID exchange and settlement remain guarded; no fixed redemption ratio exists.
- Treasury movement remains separately guarded.
- Public internet callers do not receive private mutation authority.

## Help and project policy

- [Support guide](../../SUPPORT.md)
- [Security policy](../../SECURITY.md)
- [Contributing guide](../../CONTRIBUTING.md)
- [Proof cadence](proof-cadence.md)
- [Branch and release policy](branch-release-policy.md)
- [Documentation freshness policy](docs-freshness-policy.md)
- [Whitepaper](void-network-whitepaper.md)
- [Release state and published artifacts](../../RELEASES.md)

## Current docs versus historical evidence

Files named as receipts, checkpoints, closeouts, launch announcements, audits, proof results, or dated evidence are historical records. They should not be rewritten merely because the network moved forward.

The canonical current-state files are:

- `README.md`
- `docs/public/README.md`
- `docs/public/start-here.md`
- `docs/public/mainnet0-current-public-status.md`
- `docs/public/current-capability-matrix.md`
- `docs/public/run-a-node.md`
- `docs/public/participant-onboarding.md`

When a current-state claim changes, update these files instead of appending another status section to the root README.

<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_BEGIN -->
- [Verified release install](download-install-release-v1.md)
- [Release process](release-process-v1.md)
<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_END -->

- [Verified release update channel v1](release-update-channel-v1.md) — stable-channel discovery, anti-downgrade apply, attestation verification, and health-gated rollback.

- [Release publication and promotion v1](release-publication-promotion-v1.md) — immutable releases, canary-gated candidate/stable promotion, freeze, revocation, and rollback. <!-- VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_WALL_V1 -->

- [Release qualification v1](release-qualification-v1.md) — complete canary matrix and independent approval required before stable promotion. <!-- VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1 -->

- [First official release rehearsal v1](first-official-release-rehearsal-v1.md) — deterministic no-publish rehearsal of immutable publication, qualification, canary, promotion, freeze, revocation, and rollback. <!-- VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_WALL_V1 -->

- [First official release launch gate v1](first-official-release-launch-gate-v1.md) — exact-source, deterministic-asset, independently approved, expiring pre-publication gate. <!-- VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_WALL_V1 -->

- [First official release launch gate v1](first-official-release-launch-gate-v1.md) — exact-source gate supporting either real independent review or an explicitly weaker twelve-hour solo time-lock. <!-- VOID_SOLO_OPERATOR_RELEASE_GATE_WALL_V1 -->

<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_BEGIN -->
- [Public App Composition Gateway v1](public-app-composition-gateway-v1.md)
  repairs the public UI/backend contract without exposing account-scoped data.
<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_END -->
