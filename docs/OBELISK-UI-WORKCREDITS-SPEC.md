# Obelisk Wallet + WorkCredits UI — v1 Spec (Stub)

## Tabs

- Home
- Wallet
- Trading View
- NullFeed
- NFTs
- Dashboard

## Home (summary + CTA)

- Show mainnet/devnet/safeboot status.
- Show WorkCredits pillar status (health 0/1).
- Quick buttons: Open Wallet, Trading View, NullFeed, Collect pending WC (disabled while WC pillar red).

## Wallet (VOID + WC, relayer toggle)

- Show VOID balance, WC balance (or N/A if WC not live).
- Show relayer toggle (on/off).
- Show "Pending WC" value (0 / stub until RewardEngine wiring exists).
- Actions:
  - Send VOID / Send WC (ERC-20 transfer).
  - Collect pending WC (only enabled when WC pillar health == 1).

## Trading View (WC/VOID pool)

- Show pool reserves and prices (WC per VOID, VOID per WC).
- Show simple slippage warning.
- Swap VOID->WC and WC->VOID via WorkCreditsPool (only when WC pillar health == 1).
- While WC pillar health == 0, show read-only "not wired yet" message and disable trading.

## NullFeed (mIRC-style channels, stub)

- Default channels: #general, #tech, #crypto, #sports, #music, #tv, #movies, #games, #religion, #void-dev, #ai-lab, #nullfeed-meta.
- Support hidden channel join via "/join #channel" or direct name.
- Per-channel options (later): password, images on/off, bots.
- Channel metadata on-chain; messages ephemeral on nodes.

## NFTs (avatars + cosmetics, stub)

- Show placeholder avatar.
- Show "Owned NFTs" empty state.
- Note: future avatar/cosmetic NFTs purchasable with WC.

## Dashboard (metrics + health)

- Surface mainnet pillars:
  - core, lastmile, keys, validators, plan, overall.
- Show safeboot overall + head gap.
- Show WorkCredits pillar gauges:
  - spec_present, spec_nonempty, health, health_last_5m.
- Show devnet AI stack health:
  - devnet_overall, coverage, receipts, AgentRegistry/ModelRegistry/DatasetRegistry gauges.
- All read-only; no write actions from Dashboard.

