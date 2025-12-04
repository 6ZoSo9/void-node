# VOID Network — NullFeed v0 Spec (Roadmap Snapshot)

Status: roadmap stub (no on-chain deployment yet)  
Version: v0 (off-chain, encrypted chat; on-chain mapping later)  
Scope: design + interfaces only. No contracts deployed on mainnet yet.

---

## 1. Goals

NullFeed v0 is an mIRC-style channel system mapped onto VOID:

- Channels are created and discovered via VOID (on-chain mapping later).
- Messages are encrypted and hosted off-chain across VOID nodes.
- Obelisk Wallet is the primary client; later, lightweight web clients can connect.
- Channel creators are admins with per-channel moderation powers.
- Future versions integrate Work Credits (WC) rewards and sinks around channels.

For v0, we do not persist messages forever or write them on-chain. We want
fast, cheap, encrypted chat first; anchoring and history come later.

---

## 2. Channel Model

### 2.1 Namespaces

Default public channels (always present in the catalog):

- #general
- #tech
- #crypto
- #sports
- #music
- #tv
- #movies
- #games
- #religion
- #void-dev
- #ai-lab
- #nullfeed-meta

Hidden channels:

- Any user can request #<name> directly (for example: #trading-den).
- Hidden channels are not listed in the default catalog unless promoted.
- Channel creators can later promote a hidden channel into the catalog.

### 2.2 Identity

- Users are identified by their Obelisk Wallet address (VOID chain address).
- Optional username / display name is stored off-chain in Obelisk profile.
- Clients display nicknames as: nickname (short_address).

### 2.3 Mapping (v0 vs future)

v0 mapping:

- Channels live in a per-node registry (config + gossip).
- Nodes accept a signed "channel create" request from a wallet and replicate
  minimal metadata to peers (name, creator, flags).

Future mapping (on-chain):

- A NullFeedRegistry contract will hold:
  - channel id (hash)
  - canonical name
  - creator address
  - flags (public/hidden/passworded, WC hooks, etc.)
- Nodes will sync registry from chain and map IDs to channel configs.

This spec focuses on v0 (off-chain mapping) but keeps the registry model
compatible with the future contract.

---

## 3. Encryption & Transport

### 3.1 Encryption model (v0)

- Messages are encrypted end-to-end using wallet keys or derived chat keys.
- Minimum design:
  - Each channel has a symmetric Channel Key (CK).
  - Creator generates CK and distributes it to members via encrypted DM or
    per-channel invite messages.
- Nodes never see plaintext; they only relay encrypted frames.

### 3.2 Transport

v0 transport is a simple WebSocket / HTTP streaming API exposed by nodes:

- WebSocket endpoint: ws://node:PORT/nullfeed/v0/ws
- Publish endpoint:   POST /nullfeed/v0/publish
- Optional history:   GET  /nullfeed/v0/history?channel=#name (short rolling buffer)

Messages before encryption are small JSON objects with fields such as:

- channel: string (for example "#general")
- nonce: opaque string
- ciphertext: encrypted payload
- author: wallet address (not trusted without sig)
- ts: unix timestamp

Clients sign frames with their wallet key. Nodes may:

- discard obviously invalid frames,
- rate-limit by address / IP,
- later attach VOID-node receipts when integrated with JobQueue.

### 3.3 Message retention

v0 does not guarantee persistence:

- Nodes maintain small rolling buffers in memory or short-lived disk segments.
- Joining a channel may return the last N messages if available.
- Long-term archives (if any) are operator-specific and not part of the spec.

---

## 4. Channel Controls & Permissions

### 4.1 Roles

Per channel:

- Creator / Owner
  - Wallet that first created the channel.
  - Can transfer ownership in future versions.
- Admins
  - Promoted by owner or existing admins.
  - Manage bans, passwords, and moderation flags.
- Members
  - Any user present in the channel (subject to access rules).

### 4.2 Access controls (v0)

- public:
  - No password.
  - Listed or hidden based on catalog flag.
- passworded:
  - Creator sets a password; clients must provide it to join.
  - Password never leaves the client in plaintext; nodes only see hashed forms
    if they enforce policies.
- banned:
  - Ban list enforced by nodes for that channel:
    - list of wallet addresses, optional IP hints.
    - nodes drop frames and ignore join attempts from banned identities.

### 4.3 Future moderation controls

Not implemented in v0, but we want the model to allow:

- Per-channel options:
  - Allow / disallow images.
  - Allow / disallow bots.
  - Slow mode / rate limits.
  - WC-backed spam shields (small WC fee to speak in high-signal channels).
- Evidence:
  - Nodes may store encrypted moderation evidence off-chain and later anchor
    commitments (hashes) on VOID.

---

## 5. Work Credits Integration (Roadmap)

NullFeed will be an important Work Credits (WC) sink and source.

Earn WC by:

- Running a NullFeed-capable node with healthy uptime and low abuse.
- Doing moderation work (flagging abuse, curating channels) via RewardEngine.
- Providing bot / agent services that add value to channels (later).

Spend WC for:

- Boosting messages or channels (priority or spotlight).
- Renting vanity channel names or featured catalog slots.
- Paying for high-bandwidth options (images, heavy media) if enforced by
  operators.

v0 only documents this; no WC hooks are wired yet.

---

## 6. UI / UX Requirements

### 6.1 Obelisk / NullFeed shell

Obelisk Wallet should expose a NullFeed tab:

- Left: channel list.
- Right: chat view.
- Bottom: input bar with basic markdown / monospace and inline warnings when
  encryption or node connectivity is broken.

Default visible channels are those listed in section 2.1.

Core commands:

- /join #channel
- /create #channel
- /topic <text>        (owner/admin only)
- /ban <address>       (admin only)
- /mod <address>       (promote to admin)

### 6.2 Web / site integration

- Lightweight JS client can connect to any public node using the same APIs.
- Sites can embed read-only or interactive chats using channel tokens.

Future:

- Signed "embed tokens" letting sites host public mirrors without having full
  moderation rights.

---

## 7. Node Responsibilities

For v0, a NullFeed-enabled node must:

- Expose NullFeed endpoints (disabled by default on mainnet; opt-in only).
- Maintain:
  - channel registry (off-chain),
  - rolling message buffers per channel,
  - basic rate limiting and DoS protection,
  - encryption-agnostic relaying (no plaintext inspection).

Logging guidelines:

- No plaintext message logging.
- Only minimal metadata (channel plus anonymized stats) should be logged.

---

## 8. Future On-Chain Upgrade Path

Later versions will introduce:

1. NullFeedRegistry contract
   - Single source of truth for channels and roles.
   - On-chain promotion / demotion of channels (hidden to catalog).

2. On-chain anchoring
   - Optional periodic commitments of channel activity hashes.
   - Proof-of-history for moderation and abuse investigations.

3. Agent integration
   - Bots and AI agents registered via AgentRegistry / JobQueue.
   - Channels can opt into specific agents (price bots, news bots, VOID analytics).

4. Per-channel policy manifests
   - Stored as VOID manifests describing:
     - allowed content types,
     - WC pricing rules,
     - moderation policy.

These are explicitly out of scope for v0 implementation but must remain
compatible with this spec.

---

## 9. Implementation Notes (for later)

- First implementation will live behind a feature flag:
  - NULLFEED_V0_ENABLED in node config.
- Devnet-only at first to test encryption, channel management, and abuse controls.
- Only after:
  - mainnet is stable,
  - validators are earning VOID,
  - Work Credits flows are proven,

do we consider enabling NullFeed on mainnet nodes.
