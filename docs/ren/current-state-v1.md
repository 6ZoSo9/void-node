# Ren Current State V1

Marker: `VOID_REN_CURRENT_STATE_V1`

Snapshot seed: 2026-09-25 America/Chicago / 2026-09-25Z.

This is a **derived handoff cache**. Refresh live GitHub, coordination, and runtime/external evidence before acting.

## Repository anchor

- Repository: `6ZoSo9/void-node`
- Main observed when this snapshot was refreshed: `cd8beb4ba1badae244b724bd544a7b6214ef3fb0`
- That commit merged PR #1824, adding the WC/VOID coupled-opening settlement source gate on top of the previously merged production-readiness baseline.
- Other recent material merges include PR #1835 (Ren continuity refresh), PR #1833 (repository working agreement), PR #1832 (public README/release/whitepaper refresh), PR #1823 (fail-closed WC/VOID production-readiness gate), PR #1821 (presale + WC/VOID coupled-launch policy), and PR #1820 (direct IPv4 + Tor authenticated P2P introductions).
- A newer `main` immediately makes the SHA above historical, not authoritative.

## Coordination

- Resolve the live coordination hub dynamically from #1507 and any explicit successor chain; do not trust an old issue-body snapshot when live refs disagree.
- Scheduled Brood roster: 15 workers.
- Ren is interactive coordinator, not a scheduled worker slot.
- Ada is the coordination/liveness steward and owns the bounded Ren continuity chronicler duty through #1814.
- Scheduled source authority remains lane-specific and source-only unless a separate lifecycle or authority gate is explicitly approved.

## Operating priorities

The repository working agreement currently prioritizes:

1. customer revenue, automatic fulfillment readiness, and verifiable receipts;
2. outside AI-agent discovery/authentication/capability negotiation and bounded paid work;
3. network reliability, recovery, security, and independent operation;
4. public usability and honest discoverability;
5. reusable integrations/evidence quality;
6. bounded Green/Amber exploration.

Urgency does not convert source authority into wallet, signer, transaction, treasury, liquidity, validator, Work Credit, deployment, market-activation, or funds authority.

## Public-network launch truth

- Issue #1005 remains open as the multipath public-bootstrap launch blocker.
- PR #1820 is merged. Main now contains direct IPv4 and Tor v3 introduction classes with exact node-identity binding and N-1 acceptance evidence for the public-bootstrap child.
- That merge is not permission to treat the whole network launch blocker as closed. Fresh live issue/runtime/external evidence still governs any claim of complete public-bootstrap acceptance.
- Public active-validator admission remains disabled unless current exact evidence proves otherwise.

## Economic launch truth

- PR #1821 is merged: public presale intake and production WC/VOID activation are one coupled launch ceremony; neither may open alone.
- WC/VOID remains market-priced. The opening policy is 10,000,000 VOID protocol inventory and 0 WC protocol seed, with no fixed WC→VOID redemption and no administrator-set opening price.
- PR #1823 is merged: the production WC/VOID candidate is fail-closed and remains `HOLD` on `main`. `SOURCE_READY` is not deployment, funding, or activation authority.
- PR #1824 is merged: the coupled-opening settlement source mechanism is now canonical source, but this does not deploy, fund, or activate the market.
- Issue #1822 remains open as the production WC/VOID implementation blocker.
- PRs #1825 through #1836 remain a stacked draft preparation/review line above the merged baseline. Later draft approvals/preparation must not be rewritten as merged, deployed, funded, or active state.
- BTC/VOID and ETH/VOID remain post-presale surfaces with separate gates.
- Open PR #1848 is BTC/VOID fee hardening source: it proposes the fixed 50-bps
  reserve-retained protocol fee, trade-funded network-fee topology, and
  fail-closed measured fee envelopes. It is not merged/runtime truth.
- Open PR #1849 is coupled presale/WC hardening source. It separates
  `VoidToken` from native gas and adds gas/nonce/finality/lifetime,
  reverse-settlement, and economic execution-layer identity/public-verification
  HOLD gates. It is not merged/runtime truth.
- Current audited source shows economic contracts on a private Anvil/EVM RPC
  while the public VOID-node runtime has its own P2P/block history. Do not claim
  those histories are identical or anchored until a reviewed binding proves it.
- Public economic activation also needs a participant-usable post-purchase
  `VoidToken` control/transfer path; private 8545 is not a participant RPC.
- Presale/WC activation also needs explicit micro-purchase/micro-trade gas-grief
  protection. No hidden minimum is selected; a disclosed minimum, batching,
  user-paid gas, or another bounded design may close the gate.
- PR #1850 merged at `0cc16633b103c6cc93eebd3d4456902a9737f843`: participant-wallet
  mutation is source-fixed default-off and the legacy WC→VOID relayer route is
  retired. This is merged source truth only; deployment/restart remains separate.
- Historical fixed-rate WC→VOID scripts and the dev WC relayer remain evidence
  only; do not revive their 100:1 or relayer-sponsorship semantics as current
  policy.

## Public documentation and release truth

- PR #1832 is merged and refreshes the root README, public status/capability docs, `RELEASES.md`, and the whitepaper to the September 25 Mainnet-0 state.
- Package version is `0.1.0`, but the official `release-v0.1.0` tag and an official stable VOID node GitHub Release were not published in that merged state.
- Documentation truth is not runtime, deployment, external-acceptance, or economic-activation proof.

## Continuity rule

Before substantial work, Ren should use this file to recover orientation, then verify every task-relevant statement against live sources.

When material truth changes, Ada should update this file and append a short journal record that states:

- what changed;
- exact issue/PR/commit references where available;
- the highest truth state actually proven;
- what remains unproven or separately authorized.

No journal entry may silently promote source-green to merged, merged to deployed, deployed to externally accepted, or readiness to economic activation.
