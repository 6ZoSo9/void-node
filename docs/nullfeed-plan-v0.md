# NullFeed v0 — PLAN Stub (Off-chain Encrypted Chat on VOID)

Status: PLAN-only. No code, no keys, no deploys.
Use this doc as the blueprint for post-mainnet NullFeed + Work Credits (WC) work.

---

## 1. Goals

NullFeed v0 should:

- Run off-chain encrypted chat across VOID nodes.
- Use the chain only for channel mapping and discovery, not for messages.
- Feel like mIRC on VOID:
  - Default visible channels:
    #general, #tech, #crypto, #sports, #music, #tv, #movies, #games, #religion,
    plus dev/meta channels like #void-dev, #ai-lab, #nullfeed-meta.
  - Users can join/create #<channelname> including “hidden” channels that aren’t listed until promoted.
- Make channel creators admins:
  - Can promote admins, kick/ban users, delete messages.
  - Future: per-channel options (images, bots, stricter moderation).
- Be node-hosted:
  - Nodes/validators expose a NullFeed service.
  - Obelisk Wallet and a lightweight web UI connect to these node endpoints.
- Be AI-first, human-second:
  - Layout and APIs should be easy for agents to discover/join/moderate channels.
  - Later: AI helpers/moderators per-channel.

Messages stay off-chain for v0. On-chain anchoring comes later, if ever.

---

## 2. High-Level Architecture

### 2.1 Components

- ChannelRegistry (on-chain contract, minimal)
  - Maps channel identifiers to metadata.
  - No messages on-chain.
- NullFeed Relay (per node, off-chain)
  - HTTP/WebSocket server inside void-node / Obelisk.
  - Handles encrypted messages, presence, moderation commands.
- Clients
  - Obelisk Wallet desktop/phone UI.
  - Lightweight browser front-end (cheap to host).
  - Future: bots/agents.

### 2.2 Data Flow (v0)

1. User opens NullFeed in Obelisk or web UI.
2. Client connects to a node’s NullFeed relay (/nullfeed/ws).
3. Client selects or creates a channel.
4. Client and relay use a channel key (derived or negotiated) to encrypt messages.
5. Relay distributes encrypted messages to all subscribed peers for that channel.
6. Optional: relay gossips to other nodes so users on different nodes see the same channel.

No message body touches the chain.

---

## 3. On-Chain Channel Registry (PLAN)

A minimal on-chain contract (name TBD, e.g. NullFeedChannelRegistry) with something like:

    struct Channel {
      bytes32 channelId;      // canonical ID, e.g. keccak256("#general" || creator)
      string  handle;         // "#general", "#tech", etc
      address creator;
      bool    listed;         // true = show in public list, false = hidden
      bool    passworded;     // if true, joining needs proof
      bytes32 joinSaltHash;   // e.g. hash(passwordSalted) or future auth gate
      uint8   imageMode;      // 0 = no images, 1 = allowed, reserved for future
      uint8   botMode;        // 0 = no bots, 1 = bots allowed
      uint64  createdAt;      // block timestamp
    }

Key rules:

- Channel creator is the first admin.
- Registry stores only metadata, no encryption keys, no messages.
- Hidden channels:
  - listed = false means they won’t appear in default catalogs.
  - Joinable by typing #<channelname> if you know it.
- Passworded channels:
  - passworded = true and joinSaltHash set.
  - v0: password enforcement is off-chain (relay + client).

The contract stays simple and is upgradeable via UpdateGate/AdminGate/ConfigGate.

---

## 4. Off-Chain Encryption Model (v0)

### 4.1 Keys

- Each user has Obelisk keys; NullFeed derives chat keys client-side:
  - Per-account chat root key.
  - Per-channel symmetric key derived from (channelId, user secret).
- Channel messages:

    ciphertext = ENC(channelKey, payload)

Relay only sees ciphertext and small headers.

### 4.2 Message Envelope (off-chain)

Example envelope (shape, not final):

    {
      "channelId": "0x...",
      "msgId": "0x...",           // unique per message
      "senderPub": "0x...",       // ephemeral or derived
      "timestamp": 1234567890,
      "payload": "base64(ciphertext)",
      "meta": {
        "kind": "text",           // later: image, reaction, system, etc
        "replyTo": "0x..."        // optional
      }
    }

Relays:

- Validate basic shape and size limits.
- Store recent messages in memory plus optional short disk buffer.
- No long-term guarantees; messages can be ephemeral.

---

## 5. Node / Relay Responsibilities

Each node running the NullFeed relay should:

Expose:

- GET  /nullfeed/channels    – list public channels (from on-chain + cache).
- POST /nullfeed/channels    – create new channel (talks to ChannelRegistry).
- WS   /nullfeed/ws          – main chat pipe (subscribe/send).

Enforce:

- Max message size.
- Rate limits per IP/account/channel.
- Per-channel and global bans.
- Password/secret checks for locked channels (off-chain for v0).

Optional gossip:

- Nodes can form a NullFeed overlay to share presence and messages.

Relays do not need plaintext; clients handle encryption/decryption.

---

## 6. Roles and Moderation

### 6.1 Channel Roles

Per channel:

- Creator (implicit superadmin):
  - Promote/demote admins.
  - Toggle listed flag.
  - Configure password / imageMode / botMode (future).
- Admin:
  - Kick/ban users.
  - Delete recent messages.
  - Invite users (optional).
- Member:
  - Post messages.
  - View history (subject to retention).

For v0, roles can be tracked off-chain (relay state plus signed admin actions),
with the on-chain creator as a hard authority if we ever need to reconcile.

### 6.2 Bans and Abuse

- Each relay maintains per-channel ban lists:
  - By account (on-chain address) and optionally IP/device.
- Banned users cannot join the channel on that relay.
- Future: share bans between relays or via on-chain evidence.

Priority: avoid DoS and spam without overbuilding global moderation on day one.

---

## 7. Work Credits (WC) Hooks (PLAN)

NullFeed should be WC-aware but not WC-dependent for basic use.

Planned hooks:

1. Relayer / Node Work Credits

   - Nodes that run NullFeed relays and stay healthy earn WC based on:
     - Uptime metrics.
     - Low abuse rates.
     - Good moderation signals.

2. Channel Admin Work

   - Option: admins of large, high-quality channels could earn WC via
     future jobs/agents that score channels (activity vs abuse vs reports).

3. Bots / Agents

   - Bots can be paid in WC:
     - Auto-moderation bots.
     - Info bots (price feeds, summaries, etc.).
   - Bots run as VOID agents and talk to NullFeed via normal APIs.

None of this blocks shipping NullFeed v0 as free off-chain chat.

---

## 8. UI / UX Skeleton

### 8.1 Obelisk / Desktop UI

Target look/feel:

- Retro, nested menus, mIRC-style but clean.
- Left sidebar:
  - NullFeed section under VOID/Obelisk dashboard.
  - Channel tree:
    - Favorites
    - Default channels
    - Custom/hidden channels.
- Top channel bar:
  - Tabs like [#general] [#tech] [#crypto] etc.
  - Keyboard shortcuts to switch between channels.

### 8.2 Default Channels

On first open, user sees and can join:

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

Hidden/custom channels:

- User types #<channelname> into a Join/Create box.
- If it exists, they join.
- If it does not, they are prompted to create it and become creator/admin.

### 8.3 NullFeed Web UI (lightweight)

- Same channel list and channel bar concept.
- Connects to a chosen node NullFeed relay via WebSocket.
- Static, cheap to host, but still respects encryption and channel passwords.

---

## 9. Roadmap (Post-Mainnet)

Phase 1 (after mainnet launch):

- Implement ChannelRegistry contract.
- Implement minimal NullFeed relay in void-node / Obelisk backend.
- Build Obelisk UI panels for:
  - Channel list.
  - Single-channel view (text-only).

Phase 2:

- Add per-channel options:
  - images on/off (still off-chain).
  - botMode on/off.
- Wire WC hooks for node/relay uptime via agents and metrics.

Phase 3:

- Optional on-chain anchoring:
  - Periodic channel state hashes.
  - Abuse evidence commitments.
- Richer web UI and bot ecosystem.

This file is a PLAN stub. Implementation must wait until:

- VOID mainnet is live and stable.
- Work Credits contracts and metrics are live.
- Safeboot and mainnet pillars remain green after adding NullFeed.

