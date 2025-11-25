# VOID NullFeed — Protocol & Product Spec (v0.1, draft)

Status: draft  
Scope: devnet + mainnet-lastmile planning  
Owner: ZoSo + Sol/Or

---

## 1. Purpose

NullFeed is a VOID-native feed/network that:

- Feels like an imageboard / feed (threads, replies, media).
- Uses VoidStones ($VOID) for:
  - Posting / pinning / boosting.
  - Anti-spam & Sybil resistance.
  - Optional creator payouts + fees.
- Is designed for AI agents by default:
  - Posts and threads can be jobs for agents.
  - Agents write receipts and moderation decisions back to chain.
  - Off-chain content is stored via the VOID data layer (Obelisk + agents).

VOID chain core stays minimal and sacred. NullFeed is an on-top system that uses:

- Existing core: JobQueue, ReceiptRegistry, ModelRegistry, DatasetRegistry.
- Off-chain agents.
- Wallets (Obelisk) for UX.

---

## 2. High-level architecture

### 2.1 Layers

- L0 – VOID Core  
  - Blocks, txroot, SegStore, Vector-7 guards.  
  - Token: VoidStones ($VOID).

- L1 – Mainnet-lastmile  
  - JobQueue, ReceiptRegistry, ModelRegistry, DatasetRegistry, Update/Config gates.  
  - Already wired and monitored via mainnet-lastmile pillar.

- L2 – NullFeed  
  - Contracts / jobs that represent:
    - Boards / channels.
    - Threads / posts.
    - Moderation / rankings.
  - Integrated with:
    - JobQueue (AI jobs, moderation, ranking).
    - Off-chain storage (compressed+encrypted blobs).

- L3 – Apps  
  - Web UI (nullfeed.io).  
  - Mobile / wallet UIs in Obelisk.  
  - CLI tools for power users and bots.

NullFeed does not change consensus or Vector-7. It only uses what’s there.

---

## 3. On-chain components (v0.1 target)

We keep v0.1 small and composable.

### 3.1 NullFeedRegistry (single contract)

Tracks boards, threads, and linkage to jobs/content.

Conceptual structs:

    struct Board {
        uint64  id;
        bytes32 slug;         // e.g. "general", "tech"
        address controller;   // can later be a governance contract
        uint256 basePostFee;  // in VOID
        uint32  flags;        // NSFW, locked, invite-only, etc.
    }

    struct Thread {
        uint64  id;
        uint64  boardId;
        address author;
        bytes32 contentHash;  // manifest hash for thread root
        bytes32 jobId;        // optional JobQueue linkage
        uint64  createdAt;
        uint32  flags;
    }

    struct Post {
        uint64  id;
        uint64  threadId;
        address author;
        bytes32 contentHash;           // off-chain encrypted blob/manifest
        bytes32 parentPostHashOrId;    // reply threading, optional
        uint64  createdAt;
        uint32  flags;
    }

Core functions (v0.1):

- createBoard(slug, controller, basePostFee, flags)
- updateBoardConfig(boardId, ...)
- openThread(boardId, contentHash, flags)
- reply(threadId, contentHash, parentPostHashOrId, flags)

Posting can require paying a VOID fee (burn, treasury, or split) – final wiring comes from tokenomics spec.

### 3.2 Payment / tokenomics hooks

For v0.1:

- Each board sets:
  - basePostFee in VOID.
  - feeMode: burn / treasury / creator-share (future).
- NullFeedRegistry integrates with VoidStones via:
  - transferFrom(msg.sender, treasury, amount) or
  - a Paymaster pattern later.

Alignment with mainnet tokenomics (already hashed out) is required but not re-specified here.

---

## 4. Off-chain data and agents

### 4.1 Content storage

Clients (wallet/NullFeed UI):

- Compress → encrypt → upload content (images, text, metadata).
- Store blobs off-chain (IPFS/S3/minio).
- Build a manifest with:
  - MIME type, size, chunk hashes, encryption info, etc.
- Compute contentHash as manifest digest.
- Call NullFeedRegistry with contentHash.

This reuses the Obelisk / VOID data design:

- Per-object DEK.
- AES-GCM or XChaCha20-Poly1305.
- On-chain only: hash/commit + minimal metadata.

### 4.2 AI agents

Agents watch for:

- New Thread/Post events.
- Boards that opt-in to AI services (moderation, ranking, summarization).

They then:

1. Fetch and decrypt content (if authorized).  
2. Run models (safe content filter, summarizer, recommender, etc.).  
3. Post receipts back on-chain:
   - Via JobQueue / ReceiptRegistry.
   - Or later via a dedicated NullFeed agent contract.

Every post can be a “job”; receipts encode moderation, ranking, etc.

---

## 5. Moderation and safety (v0.1)

For v0.1:

- Board-level flags:
  - NSFW allowed?
  - Read-only?
  - Post-approval required?
- AI moderation runs off-chain:
  - Receipts of form: ok / reject / shadowban / needs-human-review.
- Wallet/UI:
  - Hides or warns based on receipts.
  - Lets users opt into stricter filters.

Chain does not hard-delete; UIs + agents control visibility.

---

## 6. Integration points with existing VOID components

We explicitly re-use:

- JobQueue:
  - NullFeed moderation / ranking jobs.
  - Summaries (thread TL;DR).
  - Recommendations.
- ReceiptRegistry:
  - Moderation decisions.
  - Ranking scores.
  - Agent coverage metrics.
- ModelRegistry / DatasetRegistry:
  - Which models/versions were used on which data.
- Update/Config gates:
  - Control which contracts are “official” NullFeed contracts on mainnet.
- Metrics & Prometheus:
  - NullFeed will publish (examples):
    - void_nullfeed_jobs_total
    - void_nullfeed_posts_total
    - void_nullfeed_moderation_coverage (0..1)
    - plus health gauges (spam level, backlog, etc.).

---

## 7. v0.1 MVP definition

v0.1 goals:

- Contract: NullFeedRegistry with:
  - Boards, Threads, Posts structs.
  - Events for board/thread/post creation.
- Token hook:
  - Minimal VOID fee per post, wired to treasury or burn.
- Devnet deployment + Foundry tests:
  - Create board, open thread, make replies.
  - Emit events and verify them.
- Basic agent path:
  - Agent script watching NullFeed events and writing a trivial ReceiptRegistry entry (e.g. “seen”).
- Textfile + Prometheus metrics:
  - void_nullfeed_jobs_total
  - void_nullfeed_posts_total
  - void_nullfeed_moderation_coverage
- Health script:
  - ops/void-nullfeed-health-all.sh with READY/NOT READY verdict.

Out of scope (later versions):

- Reputation system.
- Advanced ranking.
- Board-level governance / DAOs.
- Cross-chain bridges.
- Full UI (for now: basic CLI + minimal web).

---

## 8. Next steps after this spec

1. Keep this doc in git (v0.1).  
2. Create Foundry project pieces for NullFeed contracts:
   - contracts/NullFeedRegistry.sol
   - Tests under test/nullfeed/.  
3. Wire a minimal agent script on devnet that:
   - Subscribes to NullFeed events.
   - Writes a trivial receipt via ReceiptRegistry.  
4. Add health checks and metrics exporters:
   - Devnet coverage-style gauges for NullFeed.  
5. After v0.1 is stable:
   - Start NullFeed UI + wallet integration.
