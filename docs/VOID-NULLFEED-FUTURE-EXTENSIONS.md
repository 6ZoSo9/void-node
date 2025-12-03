# VOID NullFeed — Future Extensions (Channel Customization Stub)

Status: STUB (post-mainnet roadmap)  
Scope: Design notes for NullFeed v1+ (after VOID mainnet Phase 1/2 are live)

## 0. Baseline NullFeed v0 (what we aim for first)

- Off-chain, encrypted chat overlay hosted by VOID nodes.
- Identity = VOID address (Obelisk Wallet / EVM signer).
- Default channels (pre-defined, always discoverable):
  - #general, #tech, #crypto, #sports, #music, #tv, #movies, #games, #religion
  - Plus dev/meta channels like #void-dev, #ai-lab, #nullfeed-meta
- Custom channels:
  - Users can join/create channels via #<channelname>.
  - Creator becomes channelOwner (admin).
  - Messages are E2E-encrypted, relayed by NullFeed overlay.
  - No on-chain message commits; only channel identity/metadata touches the chain.

This file is a stub for **future** work, not a spec we must implement now.

---

## 1. Channel ownership, admins, and moderation (post-mainnet)

### 1.1 Ownership rules

- On channel creation:
  - `channelOwner = msg.sender` (VOID address from wallet).
  - Channel is registered in a NullFeed channel registry (on-chain or replicated off-chain with on-chain commitments).

- ChannelOwner capabilities (future):
  - Promote/demote admins:
    - `addAdmin(address admin)`
    - `removeAdmin(address admin)`
  - Transfer ownership:
    - `transferOwnership(address newOwner)`
  - Configure policies (see sections below).

### 1.2 Admin powers

Admins (including owner) should be able to:

- Kick users (session-level):
  - Disconnect their current session from this channel.
  - Does not block rejoin unless banned.

- Ban users:
  - Add an address (or derived identity key) to a channel-level ban list.
  - Prevents new sessions from joining this channel until unbanned.

- Delete messages (logically):
  - Mark messages as deleted for future fetches.
  - Exact behavior depends on storage model:
    - Off-chain: delete or tombstone in overlay storage.
    - Clients should respect a “deleted” flag in message metadata.

Implementation detail is deferred, but we must ensure:
- Moderation decisions are **auditable enough** to avoid abuse, but
- No plaintext leakage from encrypted messages.

---

## 2. Channel visibility and access (PUBLIC / HIDDEN / PASSWORD)

Each channel will have a visibility/access mode:

- `PUBLIC`:
  - Channel listed in global/default catalog (e.g. for #general, #tech, etc.).
  - Anyone can join without password.

- `HIDDEN`:
  - Not listed in main catalog.
  - Joinable by typing exact `#<channelname>` or via invite link.
  - Good for invite-only or niche communities.

- `PASSWORD` (or `PROTECTED`):
  - Requires a password or capability token.
  - Flow idea:
    - User enters password locally.
    - Client derives a short-lived capability or joins via an encrypted token.
    - Gateways enforce access based on capability, not raw password.

On-chain view:
- Channel registry stores:
  - `visibility` enum
  - `owner`
  - Optional “requires capability” bit.
- Raw passwords **never** touch chain or nodes; only derived capabilities/tokens do.

---

## 3. Per-channel feature toggles (images, bots, advanced behaviors)

We want channel creators to control features:

- `images_enabled` (bool):
  - If false: no inline images or attachments, text-only.
  - If true: allow image upload/links (still subject to future policy/moderation).

- `bots_allowed` (bool):
  - If false: no automated bot accounts may post.
  - If true: allow whitelisted bots (identified via special bot keys or agent IDs).

- `max_message_length`, `rate_limits`, etc. (future):
  - Optional per-channel limits to prevent spam.
  - Could integrate with Node/agent-level anti-abuse pipelines.

- `ai_assist_enabled` (future):
  - If true, channel can attach a VOID agent (e.g. summarizer, Q&A helper, translator).

We will represent these toggles in a “features” struct or JSON blob, with a schema similar to `docs/NULLFEED-CHANNEL-FEATURES-STUB.json`.

---

## 4. Bots and agent integration (later VOID/agents phase)

Bots should be implemented as VOID agents:

- Bots join channels using:
  - Their own wallet/agent keypair.
  - Capability tokens that allow:
    - Read access to channel messages (decrypted client-side or in a TEE).
    - Write access with rate limits and policy checks.

- Example bot types:
  - Summarizer bot for long threads.
  - Translation bot.
  - Moderation assistant (flagging spam/toxic content, but final decisions by humans).
  - Bridge bot that mirrors messages to other channels or external services.

Channel owners should be able to:
- Attach/detach bots to a channel.
- Configure per-channel bot behavior (which bot, which triggers).

---

## 5. Stubbed data model (high-level only)

**Registry-level (on-chain or committed off-chain):**

- `channelId` (hash of chainId + name).
- `name` (`#general`, `#myguild`, etc.).
- `owner` (address).
- `admins` (set of addresses).
- `visibility` (enum: PUBLIC, HIDDEN, PASSWORD).
- `featureFlags` (bitmask or JSON hash).
- Optional: `policyCommit` (hash of any off-chain policy doc).

**Overlay-level (off-chain, encrypted):**

- Message DAG/log per channel:
  - Encrypted payloads + small metadata.
- Membership/ban lists per channel:
  - Possibly encrypted and stored in overlay with owner/admin control.
- Bot configuration:
  - Mapping of `channelId -> bots` with capabilities.

Exact structs and contract signatures are deferred until after mainnet; this doc exists as a contract with Future Us.

---

## 6. Roadmap / when to implement

**Not before:**
- VOID mainnet Phase 1 launch (solo validator).
- Basic Obelisk Wallet + Node operator UX.
- Agents + JobQueue/Receipts are doing real work on-chain.

**Earliest NullFeed extensions milestone:**
1. NullFeed v0 live as:
   - Node-hosted, encrypted chat overlay.
   - Default + custom channels, no channel-level customization yet.
2. Then:
   - Implement channel registry + owner/admin/visibility.
   - Implement basic bans/kicks and passwords.
3. Later:
   - Feature toggles (images, bots, rate limits).
   - Agent/bot integration.
   - Web embed SDK.

This file is intentionally **non-binding** until we decide to allocate time post-mainnet.
