# VOID NullFeed — Future Features Stub (Post-Mainnet)

This document describes **future** NullFeed features that will be implemented
after VOID mainnet Phase 1 is live and stable. It is intentionally *non-binding*
for mainnet launch, but should guide later design work.

## 1. Per-channel configuration

Each channel will have a config object (on-chain or in a replicated registry)
with at least:

- `id`: channel name (e.g. `#general`, `#tech`, `#mysecretguild`)
- `visibility`: `PUBLIC | HIDDEN | INVITE_ONLY`
- `password?`: optional shared password for joining (for private channels)
- `owner`: address of the creator (Obelisk / EVM address)
- `admins[]`: list of promoted admins (addresses)

Feature flags (per channel):

- `allowImages: bool` — if true, channel allows image posting/previews
- `allowBots: bool` — if true, channel can attach bots/agents
- `allowEmbeds: bool` — if true, rich previews for links (optional, future)

## 2. Ownership and moderation

- The **channel creator becomes `owner`**.
- Owner powers:
  - Promote/demote admins.
  - Configure feature flags (images, bots, embeds, etc.).
  - Set/change channel password for invite-only channels.
- Owner + admins:
  - Kick/ban users from the channel.
  - Delete messages (off-chain moderation actions).
  - Optionally mark messages as “flagged” and emit evidence for future on-chain anchoring.

All identity is rooted in VOID addresses (Obelisk wallets), but actual message
content remains off-chain and encrypted.

## 3. Bots and agents

Channels that set `allowBots = true` can register bots:

- Bots are tied to VOID identities (wallets or agent contracts/registries).
- Examples:
  - Moderation bot (spam filters, auto-mute).
  - Price/feed bot.
  - AI assistant bot (backed by VOID agents + JobQueue).
  - NullFeed meta bot (channel stats, tips, welcome messages).

Bot registration will be configurable per channel and stored alongside the
channel config, so UI and nodes can render the correct controls.

## 4. Roadmap position

- **NOT required for VOID mainnet Phase 1.**
- Depends on:
  - Obelisk Wallet identity being stable.
  - Basic NullFeed chatroom working (default channels + custom channels).
- This stub exists so:
  - We do not lose the design.
  - We can wire JSON/contract schemas later without refactoring the core UI.

