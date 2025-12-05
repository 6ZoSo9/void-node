# Obelisk NullFeed UX Spec (V0, Post-Mainnet Roadmap)

Scope: how NullFeed appears inside Obelisk Wallet, how channels behave, and how Work Credits (WC) eventually wire into moderation / extras.

This is **post-mainnet** work. For now it is a UX + protocol stub so we do not forget the design.

---

## 0. High-level goals

- mIRC-style, **channel-based chat** backed by VOID Network.
- Discovery and “mapping” of channels is on-chain (or via VOID nodes); messages can be off-chain and ephemeral.
- Channel creators are **admins by default** with powers to:
  - Set channel password / access rules.
  - Promote/demote other admins.
  - Kick/ban users.
  - Delete messages.
- Later, channels can opt into extra features (images, bots, boosts) that are priced in WC.
- NullFeed is accessible via:
  - Obelisk Wallet (desktop/mobile).
  - Later lightweight web client (nullfeed.io or similar).
  - Potential site integrations (embed).

---

## 1. NullFeed tab in Obelisk

### 1.1 Layout

- Left sidebar:
  - Channel list (mIRC style), e.g.:
    - `#general`
    - `#tech`
    - `#crypto`
    - `#sports`
    - `#music`
    - `#tv`
    - `#movies`
    - `#games`
    - `#religion`
    - `#void-dev`
    - `#ai-lab`
    - `#nullfeed-meta`
  - “+ Join / Create” input box:
    - User types `#channelname` to join or create.
- Main panel:
  - Message list (scrollback).
  - Composer box at bottom.
  - Small status bar (“Connected to N nodes”, “Lag: X ms”, etc.).

### 1.2 Channel join / create flow

- Joining:
  - User types `#channelname` and hits Enter.
  - Wallet queries the VOID node / mapping contract to see if the channel exists.
    - If exists:
      - Join if allowed.
      - If channel is password-protected, prompt for password.
    - If not:
      - Offer to create channel.
- Creating:
  - User chooses:
    - Channel name (must match `#channelname`).
    - Optional password.
    - Optional basic settings (see below).
  - Wallet sends a **channel create** request:
    - v0: off-chain to a node / NullFeed coordinator.
    - v1: on-chain mapping transaction (later).
  - Creator becomes channel admin.

---

## 2. Channel model and moderation

### 2.1 Roles

- **Owner**:
  - The account that created the channel.
  - Cannot be removed except via explicit transfer/abandon logic.
- **Admins**:
  - Can invite/kick/ban.
  - Can edit channel settings.
  - Can delete messages.
- **Members**:
  - Can send messages subject to rate limits.
- **Guests** (optional later):
  - Read-only unless promoted.

Roles should be derived from:

- On-chain mapping (owner/admin list), or
- Off-chain registry that is anchored on-chain later.

### 2.2 Admin powers

For v0 (off-chain messages, on- or off-chain mapping):

- Set / update channel password.
- Toggle:
  - “Open join” vs “Invite-only”.
  - “Allow images” on/off.
  - “Allow bots” on/off.
- Kick / ban:
  - Kick: temporary disconnect.
  - Ban: block address / key from posting.
- Message deletion:
  - Remove spam/abuse.
  - For v0, this is soft-delete on the node(s); for v1, we may have cryptographic tombstones.

---

## 3. Messages and transport

### 3.1 Message lifecycle (v0)

- User types message in Obelisk.
- Obelisk:
  - Encrypts message to channel’s key / per-recipient key (depending on design).
  - Sends to connected VOID nodes / NullFeed service over secure channel.
- Nodes:
  - Fan out to other nodes subscribed to that channel.
  - Enforce basic rate limits and bans.

Messages do **not** need to be permanently stored in v0:

- Nodes can keep short, configurable scrollback (e.g. last N messages).
- Nothing must be written on-chain except channel metadata and maybe ephemeral commitments later.

### 3.2 Encryption model (directional sketch)

- Each channel has:
  - A **channel ID** (hash of name + salt).
  - A **channel key policy**:
    - Public (messages effectively unencrypted or just TLS).
    - Shared key per channel (symmetric, rotated periodically).
    - Per-user E2E (future).
- Obelisk derives/obtains keys via:
  - On-chain mapping contract for public info.
  - Off-chain key exchange for actual encryption keys.

Exact cryptography is a later spec; for now we just commit that:

- Public channels can be readable by any node.
- Private/password channels require some proof to join.

---

## 4. Work Credits integration (WC)

NullFeed will **not** require WC for basic chat in v0. WC shows up in:

- Extra features.
- Abuse/spam mitigation.
- Optional boosts.

### 4.1 Basic rules

- Reading and sending normal text messages in open channels:
  - Free, subject to rate limits.
- Optional WC-priced features (future toggles per channel):
  - Pinned messages.
  - Channel “boosts” (surfacing in discovery).
  - Extra media (images, embeds).
  - Bot hosting / compute-heavy features.

### 4.2 WC hooks for channels (future)

Per-channel options (configured by owner/admins):

- **WC entry fee**:
  - One-time payment to join channel (e.g. 10 WC).
  - Funds go to channel owner (or some split).
- **WC slowmode override**:
  - Channels can enable “slowmode” for free users.
  - Users can spend small WC to bypass slowmode limits for a short window.
- **WC anti-spam bond**:
  - A small WC bond locked per user.
  - If user is banned for spam, part or all of bond can be burned or sent to a moderation pot.

These hooks plug into existing WC plumbing:

- Pricing is determined off-chain and recorded in some contract/config.
- Actual charging uses:
  - Direct WC transfer (wallet pays gas in VOID), or
  - WC relayer path (user signs RelayedCall and pays in WC).

---

## 5. WC + relayer usage inside NullFeed

When a NullFeed action requires a WC-priced transaction (e.g. channel creation fee, boost, etc.):

1. **Obelisk builds action**:
   - Target contract (e.g. `NullFeedConfig` or a general `NullFeedModule`).
   - Encoded calldata.
2. **Obelisk chooses gas mode**:
   - Direct VOID (plain tx).
   - “Use relayer (WC)”.
3. **If relayer is used**:
   - Same generic meta-tx flow as in `OBELISK-WORKCREDITS-UX-SPEC.md`:
     - `/quote` with appropriate `intent` (e.g. `NULLFEED_CREATE_CHANNEL`, `NULLFEED_BOOST`, etc.).
     - User signs `RelayedCall`.
     - Wallet POSTs to relayer `/submit`.
   - NullFeed tab can show:
     - “This action costs X WC in fees.”

Intent strings are **free-form**, but should be documented in a central place once we finalize the NullFeed contract.

---

## 6. Discovery and mapping

Channel mapping should be discoverable by:

- On-chain contract (preferred long-term).
- Off-chain index (short-term, anchored by periodic on-chain commits).

### 6.1 On-chain mapping sketch

A simple mapping contract might hold:

- `channelId` → struct:
  - `owner` address.
  - `createdAt` block.
  - `settingsHash` (off-chain config).
  - `flags` (public/private, allowImages, allowBots, etc.).

Obelisk would:

- Derive `channelId` = `keccak256(lowercase(channelName))` (or more robust scheme).
- Read mapping via RPC to:
  - Check existence.
  - Fetch owner/admin list.
  - Fetch current flags (for info).

NullFeed messages themselves stay off-chain in v0.

---

## 7. UX guardrails

To avoid chaos:

1. **Safe defaults**:
   - Default channels (`#general`, `#tech`, etc.) are open and free.
   - Images and bots are OFF by default, must be explicitly enabled per channel.
2. **Clear WC usage**:
   - Any time WC is charged, show:
     - Exact amount.
     - What it is paying for (e.g. “Channel boost for 24 hours”).
3. **Opt-in for paid features**:
   - Channel owners must explicitly enable WC-priced features.
   - Obelisk should display a warning when enabling them for the first time.
4. **Abuse controls**:
   - Quick “report” / “mute” / “block user” UI elements.
   - Servers/nodes can choose to ignore certain channels/users altogether.

---

## 8. Roadmap label

This file is intentionally marked **V0, post-mainnet**:

- Contracts and node core for VOID mainnet come first.
- NullFeed channel mapping and WC features can be phased in later.
- This spec ensures we have a consistent plan when we come back to build it.

