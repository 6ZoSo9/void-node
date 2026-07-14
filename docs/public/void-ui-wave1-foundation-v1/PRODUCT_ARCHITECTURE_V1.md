# VOID Unified Application UI — Product Architecture and Migration Charter v1

**Status:** Proposed architecture for approval
**Date:** 2026-07-14
**Scope:** Public site, participant application, public-node/network views, wallet, Work Credits, DataNet, Buy VOID, validation, proofs, operator tooling, and diagnostics
**Implementation status:** **UI feature freeze. No route replacement or feature UI work is authorized until this architecture and the shell are visually approved.**

---

## 0. Standing project directive

This document is the controlling UI charter for VOID.

1. Stop adding isolated cards, panels, warnings, and feature-specific CSS to the existing participant renderer.
2. Treat the current `/participant` page as a compatibility surface to be migrated, not a visual foundation to preserve.
3. Keep the public marketing site separate from the participant application.
4. Build one route-based participant application with a persistent shell and at most seven primary destinations.
5. Use the recovered VOID Public UI V5 work as the starting visual language, not as the complete product architecture.
6. Keep existing HTTP APIs and authority boundaries stable while views migrate one at a time.
7. Do not replace `/participant`, `/public-node`, `/`, or any live route until the replacement has functional parity, visual approval, accessibility validation, and mutation-boundary proof.
8. No UI lane is complete because TypeScript compiled or a marker proof passed. Desktop and mobile visual review are mandatory before commit.

---

## 1. Diagnosis

### 1.1 What exists today

The current participant experience already contains most of the product:

- local participant identities and account switching
- native or execution wallet setup and state
- VOID, local WC, on-chain WC, redeemable and redeemed accounting
- wallet sends and guarded trade or swap paths
- work-runner controls, jobs, receipts, and reward detail
- DataNet publish, retrieve, verify, browse, share, and replication paths
- Buy VOID request, payment, delivery, and status flows
- staking readiness, candidate registration, validator truth, and operator plans
- public-node topology, blocks, route discovery, proofs, link health, and public data
- settings, raw records, diagnostics, upgrade status, and operator controls

The problem is not a lack of functionality. The problem is that unrelated jobs, roles, trust levels, and detail depths are rendered together inside a very large page.

### 1.2 What V5 contributes

VOID Public UI V5 is the design seed. It contributes:

- black/graphite, cyan, violet, and status-color visual direction
- a modular CSS design system
- ES-module frontend separation
- content and configuration outside page markup
- responsive and mobile navigation behavior
- topology, block comparison, proof feed, route catalog, timeline, and public narrative
- CSP, anti-framing, visible focus, skip-link, live-region, and reduced-motion baselines
- an exact GET-only public-data model

V5 is **not** the finished application. It is a polished public gateway and network dashboard. Wallet, earning, buying, DataNet participant actions, and validation still need a proper application architecture.

### 1.3 Product architecture decision

VOID will have two products sharing one design system:

1. **Public site** — concise marketing, public network truth, documentation, and a clear “Open App” entry.
2. **VOID App** — authenticated/local participant functionality in a persistent route-based shell.

Operator and diagnostic functionality is a third **access level**, not a third public product. It lives inside an Advanced area and is never mixed into normal participant navigation.

---

## 2. Users and access levels

| Audience | Primary need | Surface | Authority |
|---|---|---|---|
| Visitor | Understand VOID and verify public network truth | Public site | Read-only public routes |
| Participant | Manage wallet, earn, use data, buy, validate | VOID App | Participant-scoped actions with existing guards |
| Node operator | Maintain node, review proofs, execute guarded operations | Advanced area | Loopback/private/operator-only |
| Auditor or tester | Inspect routes, receipts, proofs, and safety claims | Public Network or Advanced Records | Read-only unless separately authorized |
| Developer | Debug APIs and runtime internals | Advanced Diagnostics | Local development only |

A single view must never present controls from more than one authority level without a clear mode boundary.

---

# Deliverable 1 — Complete feature inventory

This is the product-level inventory of the currently evidenced UI capability. Individual machine JSON endpoints remain implementation details and will be attached to this inventory in a generated route manifest before migration begins.

## 3.1 Shell, identity, and global state

| Feature | Existing behavior | Target destination | Exposure |
|---|---|---|---|
| Participant identity | Local app identity used for WC, receipts, and history | Global account switcher | Participant |
| Account creation | Create local participant identity | Account switcher modal | Participant |
| Account switching | Select current local participant account | Global header | Participant |
| Account deletion | Remove identity and possibly local wallet/password state | Advanced → Accounts | Destructive, confirmed |
| Execution/native wallet identity | Distinguish participant identity from signing wallet | Header summary + Wallet | Participant |
| Environment | Mainnet-0/public-live/preview truth | Header environment badge | All |
| Current node | Local node identity, role, port, connectivity | Header node control | Participant/operator |
| Global readiness | Ready, chain gap, head, relayer, runner, update | Header status + Home | Participant |
| Notifications | Updates, failed jobs, action results, node warnings | Notification center | Participant |
| Settings | User preferences, display, refresh, advanced access | Header settings | Participant |
| Advanced mode | Records, diagnostics, operator and developer tools | Right-side drawer or dedicated nested area | Restricted |

## 3.2 Home

| Feature | Existing behavior | New placement | Notes |
|---|---|---|---|
| First-run onboarding | Wallet-first sequence with Earn, Buy, and staking preview | Home onboarding checklist | Hide after completion; restore from Help |
| Account summary | Current account and wallet state | Home overview | One compact identity card |
| Balance summary | VOID, spendable WC, on-chain WC | Home balance strip | Production WC shown separately and read-only |
| Network summary | Ready state, head, peer status | Home network health | One status card, no raw JSON |
| Recent activity | Wallet, work, data, buy, validation events | Home activity feed | Unified event model |
| Recommended next action | Contextual next step based on readiness | Home hero | Maximum one primary CTA |
| News and updates | Recent product/runtime changes | Notification center or Home compact feed | No permanent large panel |
| Update availability | Refresh/update/remind state | Header notification | Advanced details in drawer |
| Trust boundary summary | Guarded versus available actions | Contextual status banner | One sentence plus details link |

## 3.3 Wallet

| Feature | Existing behavior | New route | Authority |
|---|---|---|---|
| Wallet overview | Account wallet address and lock state | `/app/wallet` | Read-only summary |
| Create wallet | Generate local wallet | `/app/wallet/setup` | Sensitive action |
| Import wallet | Import supported wallet material | `/app/wallet/setup` | Sensitive action |
| Unlock/lock | Control local signing availability | Wallet header/control | Sensitive action |
| Export wallet | Export protected wallet material | Advanced → Wallet security | Highest-friction action |
| VOID balance | Native balance | Wallet overview | Read-only |
| Spendable local WC | Participant-ledger balance | Wallet overview | Read-only |
| On-chain WC | Connected/on-chain state where available | Wallet overview | Read-only |
| Production WC | Verified production ledger balance | Wallet overview, separate group | Read-only; never mixed into spendable WC |
| Earned/debited/redeemed detail | Accounting breakdown | Wallet → WC details | Secondary detail |
| Redeemable WC | Legacy/current redeemability state | Wallet → WC details | Existing authority only |
| Send VOID | Guarded signed transfer | `/app/wallet/send` | Explicit sign/confirm |
| Send local WC | Guarded participant-ledger transfer | `/app/wallet/send` | Existing confirmation and loopback rules |
| Trade/swap readiness | Market/helper/relayer status | `/app/wallet/swap` | Read-only until authority is available |
| WC→VOID action | Guarded conversion lane | `/app/wallet/swap` | Never implied by production WC |
| Wallet history | Sends, receives, trades, credits, debits | `/app/wallet/activity` | Read-only |
| Payout/relayer summary | Relayer and payout accounting | Wallet details or Advanced | Read-only by default |

## 3.4 Earn / Work Credits

| Feature | Existing behavior | New route | Authority |
|---|---|---|---|
| Earn overview | Earning state, eligibility, recent result | `/app/earn` | Participant |
| Available work | Approved task classes and selection reason | `/app/earn/work` | Read-only catalog |
| Manual Run Once | Submit one bounded work cycle | `/app/earn/work` | Explicit participant action |
| Runner enable/disable | Existing runner state | `/app/earn/settings` | Guarded; not automatic by default |
| Runner resource controls | Limits and safe-mode configuration | Advanced → Earn settings | Advanced participant/operator |
| Job queue | Queued/running/completed/failed jobs | `/app/earn/jobs` | Read-only plus allowed cancellation if supported |
| DataNet publish job | Work task that publishes useful data | Earn task detail; results link to Data | Explicit |
| DataNet fetch/verify job | Work task that retrieves and verifies data | Earn task detail; results link to Data | Explicit |
| Task mix and selection reason | Publish vs fetch/verify steering | Earn details | Explain briefly; raw counters in Advanced |
| Reward estimate | Expected or policy-derived WC | Job detail | Never promise guaranteed reward |
| Reward result | Credited/not credited and reason | Job result | Read-only |
| Receipts | Work and verification receipts | `/app/earn/receipts` | Read-only |
| Production canary | Capped production award state | Advanced → WC production | Read-only and clearly experimental |
| Production WC visibility | Separate verified balance and ledger | Wallet + Earn result | Non-spendable unless policy later changes |

## 3.5 Data / DataNet

| Feature | Existing behavior | New route | Authority |
|---|---|---|---|
| Dataset browser | Browse local datasets and objects | `/app/data` | Read-only |
| Dataset details | ID, size, hashes, availability, metadata | `/app/data/datasets/:id` | Read-only |
| Publish data | Create a DataNet dataset/object | `/app/data/publish` | Explicit participant action |
| Retrieve data | Fetch by dataset/object ID | `/app/data/retrieve` | Explicit participant action |
| Verify data | Hash and receipt verification | Dataset detail or retrieve result | Read-only computation |
| Decrypt authorized data | Decrypt when credentials permit | Dataset detail | Sensitive; explicit |
| Open by ID | Direct object/dataset navigation | Global search + Data | Read-only |
| Share/open links | Generate or copy participant-safe links | Dataset detail | No authority escalation |
| Import from peer | Existing peer import lane | Advanced → Data operations | Operator/local only unless productized |
| Mirror dataset | Mirror or replicate content | Data operations | Guarded participant/operator |
| Replication status | Runner, mirror, and peer state | Dataset detail | Read-only |
| Chunks and manifests | Low-level object structure | Advanced → Data inspector | Technical detail |
| DataNet receipts | Publish/retrieve/verify receipts | Data activity | Read-only |
| Public data quality | Scores, link health, intelligence | Network → Data health | Public read-only |
| Local data drop/import | Operator-local verified import | Advanced → Data import | Not a public upload surface |

## 3.6 Buy

| Feature | Existing behavior | New route | Authority |
|---|---|---|---|
| Buy overview | Rail readiness, pool state, current status | `/app/buy` | Read-only |
| Quote/pool availability | Price, inventory, limits, sold-out state | Buy overview | Read-only |
| Delivery wallet | Participant wallet receiving VOID | Buy request | Participant-controlled |
| Create request | Record amount, rail, wallet, policy acknowledgment | `/app/buy/request` | Explicit participant action |
| Payment instructions | Supported chain/asset and safety rules | Request detail | Short, precise copy |
| Payment reference | User-provided or observed transaction reference | Request detail | Guarded data entry |
| Request status | Draft, awaiting payment, verifying, fulfilled, rejected | `/app/buy/status/:id` | Read-only |
| Request history | Prior requests and outcomes | `/app/buy/history` | Read-only |
| Fulfillment readiness | Public-safe proof that authority remains gated | Buy status details | Read-only |
| Manual fulfillment | Operator verification and VOID transfer | Advanced → Buy operations | Operator-only; never public |
| Automatic payment/delivery status | Public status where available | Network/Public buy status | Read-only; no automatic authority implied |

## 3.7 Validate

| Feature | Existing behavior | New route | Authority |
|---|---|---|---|
| Validation overview | Current participant eligibility and role | `/app/validate` | Read-only |
| Stake readiness | Wallet, minimum stake, chain and policy checks | `/app/validate/readiness` | Read-only preflight |
| Candidate registration | Candidate/waiting registration path | `/app/validate/candidate` | Explicit participant action |
| Candidate status | Candidate, waiting, selected, active | `/app/validate/status` | Read-only |
| Active validator truth | Active set and loaded epoch truth | Validate + Network | Read-only |
| Stake amount/minimum | Registry or policy minimum | Readiness | Read-only |
| Registration proof | Safety and policy proof | Status detail | Read-only |
| Epoch/schedule/proposer | Runtime validation schedule | Network → Consensus | Read-only |
| Next-onboard plan | Guarded operator selection plan | Advanced → Validation operations | Operator-only |
| Active admission | Actual active-set mutation | Advanced → Validation operations | Operator-only and separately authorized |
| Offline/demotion state | Validator health and policy result | Validate status | Read-only |

## 3.8 Network, public node, and proofs

| Feature | Existing behavior | New route | Exposure |
|---|---|---|---|
| Public node profile | Node identity and public capabilities | Public `/network` and App Network | Public read-only |
| Three-node topology | Precision, Nimo, Alienware status and links | `/app/network/nodes` | Read-only |
| Node health/readiness | Health, ready, head, drift | Network nodes | Read-only |
| Peer list | Connections and known addresses | Network nodes | Read-only |
| Block explorer | Latest block and block details | `/app/network/blocks` | Read-only |
| Exact block comparison | Compare three-box block fingerprints | Network blocks | Read-only |
| Route catalog | Public route registry | `/app/network/routes` | Read-only |
| Proof feed/index | Public proofs and receipts | `/app/network/proofs` | Read-only |
| Triad seal | Public proof of Fund/Earn/Data boundaries | Network proofs | Read-only |
| Link health | Public URL reachability | Network health | Read-only |
| Node intelligence | Public node summary | Network health | Read-only |
| Public data quality | Quality and verification score | Network data health | Read-only |
| Status export | Export current public snapshot | Network actions | Client-side/read-only |
| Session timeline | Changes observed during session | Network timeline | Client-side/read-only |
| Tester quickstart/share packs | Public tester handoff material | Network → Test/Integrate | Public read-only |
| Public buy-pool status | Quote and fulfillment safety status | Public Buy and Network | Public read-only |
| External base URL | Public-node discovery helper | Network Advanced | Read-only |

## 3.9 Advanced, operator, and diagnostics

| Feature | New location | Visibility rule |
|---|---|---|
| Raw JSON and machine responses | Advanced → Records | Never in default view |
| Receipts and proof inspector | Advanced → Records | Search/filter/copy; no mutation |
| Runtime diagnostics | Advanced → Diagnostics | Loopback/private |
| Metrics and health internals | Advanced → Diagnostics | Operator/developer |
| Runner configuration | Advanced → Earn | Explicit confirmation |
| Worker run-once controls | Advanced → Earn | Loopback + confirmation |
| Wallet export/security | Advanced → Wallet security | High-friction confirmation |
| Buy fulfillment tools | Advanced → Buy operations | Operator-only |
| Validator admission tools | Advanced → Validation operations | Operator-only |
| Data import/mirror controls | Advanced → Data operations | Operator or explicit participant authority |
| Upgrade stage/apply | Advanced → Node maintenance | Operator-only |
| Route index and test packs | Advanced → Integration | Read-only |
| Logs and traces | Advanced → Diagnostics | Local only; redact secrets |
| Developer flags and fixtures | Advanced → Developer | Development builds only |

---

# Deliverable 2 — Proposed sitemap

## 4.1 Public site

The public site explains and proves VOID. It does not expose participant or operator controls.

```text
/
├── /how-it-works
├── /network
│   ├── /network/nodes
│   ├── /network/blocks
│   ├── /network/proofs
│   └── /network/routes
├── /data
├── /work-credits
├── /buy
├── /validate
├── /docs
└── /app                 → Open VOID App
```

Existing machine-readable `/public-node/*` and `/proofs` routes remain stable. The public site links to them or renders their data; it does not replace them immediately.

## 4.2 VOID App

Exactly seven primary destinations:

```text
/app
├── /app/home
├── /app/wallet
│   ├── /overview
│   ├── /setup
│   ├── /send
│   ├── /swap
│   └── /activity
├── /app/earn
│   ├── /work
│   ├── /jobs
│   ├── /receipts
│   └── /settings
├── /app/data
│   ├── /datasets
│   ├── /datasets/:id
│   ├── /publish
│   ├── /retrieve
│   └── /activity
├── /app/buy
│   ├── /request
│   ├── /status/:id
│   └── /history
├── /app/validate
│   ├── /readiness
│   ├── /candidate
│   └── /status
└── /app/network
    ├── /nodes
    ├── /blocks
    ├── /proofs
    ├── /routes
    └── /data-health
```

Advanced is accessed from the header, not counted as an eighth primary destination:

```text
/app/advanced
├── /accounts
├── /records
├── /diagnostics
├── /wallet-security
├── /earn-operations
├── /data-operations
├── /buy-operations
├── /validation-operations
├── /node-maintenance
└── /developer
```

## 4.3 Navigation rules

- Desktop: persistent left navigation with all seven destinations.
- Tablet: collapsible side navigation.
- Mobile: bottom bar with **Home, Wallet, Earn, Data, More**. More opens Buy, Validate, Network, Settings, and Advanced.
- Page-level tabs are allowed for second-level navigation.
- No third-level side navigation. Use page tabs, a detail page, or an Advanced drawer.
- Back/forward, deep links, and refresh must preserve the current view.

---

# Deliverable 3 — Application-shell wireframe

## 5.1 Desktop shell

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ VOID  MAINNET-0   ● Network healthy      Account: zoso ▾   🔔  ?  ⚙  ADV  │
├──────────────────┬───────────────────────────────────────────────────────────┤
│                  │  Page title                         Context actions       │
│  Home            │  One-sentence purpose / status                           │
│  Wallet          ├───────────────────────────────────────────────────────────┤
│  Earn            │                                                           │
│  Data            │  Primary task area                                        │
│  Buy             │  ┌──────────────────────┐  ┌───────────────────────────┐  │
│  Validate        │  │ Main summary/action  │  │ Supporting state          │  │
│  Network         │  └──────────────────────┘  └───────────────────────────┘  │
│                  │                                                           │
│                  │  Activity / data / secondary detail                       │
│                  │  ┌─────────────────────────────────────────────────────┐  │
│                  │  │ Table, timeline, list, or focused workflow         │  │
│                  │  └─────────────────────────────────────────────────────┘  │
│                  │                                                           │
│                  │  Advanced detail is closed by default                     │
├──────────────────┴───────────────────────────────────────────────────────────┤
│ Connection: Precision • Head 1,856,587 • Synced              Build / Help   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Mobile shell

```text
┌──────────────────────────────┐
│ VOID   MAINNET-0   ●   🔔  ⚙ │
├──────────────────────────────┤
│ Page title                   │
│ Short status or purpose      │
├──────────────────────────────┤
│                              │
│ Primary action / summary     │
│                              │
│ Focused content              │
│                              │
│ Lists and details            │
│                              │
├──────────────────────────────┤
│ Home  Wallet  Earn  Data More│
└──────────────────────────────┘
```

## 5.3 Page template

Every primary view follows the same order:

1. Breadcrumb only when deeper than one level.
2. Page title, one-line purpose, and at most two contextual actions.
3. Blocking alert or trust warning, only when relevant.
4. Primary workflow or summary.
5. Secondary state or activity.
6. Empty/loading/error state.
7. Advanced details collapsed.

No page begins with a wall of explanatory copy. No page contains more than one primary CTA competing for attention.

---

# Deliverable 4 — Component inventory

## 6.1 Foundation tokens

| Token family | Required tokens |
|---|---|
| Color | canvas, surface, elevated, border, text, muted, cyan accent, violet accent, success, warning, danger, info, focus |
| Typography | display, page title, section title, body, label, caption, monospace identifier |
| Spacing | 4px base scale: 4, 8, 12, 16, 24, 32, 48, 64 |
| Radius | 4, 8, 12; no random per-feature radii |
| Shadow | none, subtle, overlay; avoid glowing every card |
| Layout | content max widths, sidebar width, header height, page gutters |
| Breakpoints | mobile, large mobile, tablet, desktop, wide |
| Motion | fast, standard, slow; reduced-motion alternatives |
| Z-index | header, drawer, dropdown, toast, modal, tooltip |
| Density | comfortable default; compact only for data-heavy tables |

### Visual direction

- Near-black canvas and graphite surfaces.
- Cyan for interactive focus and network/data context.
- Violet for product identity and selected navigation.
- Green only for confirmed healthy/success states.
- Amber only for actionable warning.
- Red only for destructive or failed state.
- Monospace reserved for addresses, hashes, IDs, block numbers, and code—not normal prose.
- Avoid constant neon borders, gradients, and glowing panels. The interface should look controlled, not like every element is shouting.

## 6.2 Primitive components

- AppLink
- Button: primary, secondary, quiet, danger
- IconButton
- TextInput
- AmountInput
- TextArea
- Select
- Checkbox
- RadioGroup
- Switch
- SearchField
- CopyField
- AddressField
- FormField with label, hint, error
- Badge/Tag
- StatusDot
- Tooltip
- Popover
- Divider
- Skeleton
- Spinner
- ProgressBar
- Tabs
- Breadcrumbs
- Pagination

## 6.3 Structural components

- AppShell
- GlobalHeader
- DesktopSideNav
- MobileBottomNav
- MobileMoreDrawer
- AccountSwitcher
- NodeSwitcher/NodeStatus
- NotificationCenter
- AdvancedDrawer
- PageHeader
- PageTabs
- ContentGrid
- SplitPane
- DetailDrawer
- Modal/Dialog
- ConfirmationDialog
- ToastRegion

## 6.4 Data and feedback components

- Metric
- BalanceGroup
- StatusBanner
- Alert
- InlineError
- EmptyState
- LoadingState
- ErrorState
- DataTable
- StructuredList
- ActivityFeed
- Timeline
- ReceiptCard
- ProofCard
- JSONViewer — Advanced only
- HashLink/Identifier
- NodeCard
- TopologyGraph
- BlockSummary
- RouteCard

## 6.5 Domain components

### Wallet

- WalletIdentityCard
- WalletLockControl
- BalanceSummary
- SendForm
- TransactionReview
- TransactionResult
- WalletActivityTable
- WCAccountingBreakdown

### Earn

- WorkAvailabilityCard
- RunnerStatus
- RunOnceAction
- JobCard
- JobProgress
- RewardResult
- ReceiptTimeline

### Data

- DatasetCard
- DatasetTable
- DatasetDetails
- PublishForm
- RetrieveForm
- VerificationResult
- ReplicationStatus

### Buy

- PoolStatus
- QuoteSummary
- BuyRequestForm
- PaymentInstructions
- RequestStatusTimeline
- FulfillmentStatus

### Validate

- ValidatorReadiness
- StakeRequirement
- CandidateRegistration
- ValidatorStatus
- EpochSchedule

### Network

- NetworkSummary
- NodeTopology
- PeerTable
- BlockExplorer
- BlockComparison
- ProofFeed
- RouteCatalog
- DataHealthSummary

## 6.6 Content rules

- Page title: ideally 1–4 words.
- Page description: one sentence, normally under 120 characters.
- Card title: 1–4 words.
- Card helper copy: no more than two short sentences.
- Button labels begin with a verb: Send, Publish, Verify, Create request.
- Avoid repeating the same safety disclaimer on every card. Use a status banner, confirmation step, or contextual help.
- Raw endpoint names, markers, and policy booleans appear only in Advanced.
- Do not use “maybe,” “future,” “planned,” and “preview” interchangeably. Every feature has a canonical state vocabulary.

Canonical states:

- Available
- Unavailable
- Preview
- Guarded
- Waiting
- Verifying
- Completed
- Failed
- Operator action required

---

# Deliverable 5 — Migration map

## 7.1 Legacy-to-new route mapping

| Existing surface | New destination | Compatibility plan |
|---|---|---|
| `/participant#overview` | `/app/home` | Keep legacy hash; redirect only after parity |
| `/participant#wallet` | `/app/wallet` | Preserve existing wallet APIs |
| `/participant#work` | `/app/earn` | Preserve runner/job/receipt APIs |
| `/participant#datanet` | `/app/data` | Preserve DataNet APIs and object links |
| `/participant#buy` | `/app/buy` | Preserve request and status APIs |
| `/participant#staking` | `/app/validate` | Preserve candidate/readiness APIs |
| `/participant#trading` | `/app/wallet/swap` | Keep out of primary nav |
| `/participant#receipts` | `/app/earn/receipts` plus Advanced records | Contextualize receipts by domain |
| `/participant-dashboard` | `/app/home` | Keep alias during migration |
| `/welcome` | `/app/home` | Keep alias during migration |
| `/public-node` | Public `/network` and App `/app/network` | Keep machine routes unchanged |
| `/public-node/route-index.json` | App Network → Routes | Never remove machine route |
| `/proofs` | Public `/network/proofs` | Preserve public URL as alias |
| `/buy-void` | Public `/buy`; execution in `/app/buy` | Separate explanation from participant action |
| `/funding` | Public funding/about page | No participant controls |
| `/datanet-demo` | `/app/data` | Keep route for compatibility/testing |
| `/__void/*` diagnostics | `/app/advanced/*` | Do not expose private routes publicly |

## 7.2 Implementation architecture

New UI code must live outside the giant server renderer.

Recommended structure:

```text
src/ui/void-app/
├── app/
│   ├── router
│   ├── state
│   ├── api
│   └── authority
├── design-system/
│   ├── tokens
│   ├── primitives
│   ├── components
│   └── patterns
├── shell/
├── views/
│   ├── home
│   ├── wallet
│   ├── earn
│   ├── data
│   ├── buy
│   ├── validate
│   ├── network
│   └── advanced
├── content/
└── tests/
```

The server should mount compiled static assets and a narrow adapter layer. It should not contain page markup, per-feature CSS, or frontend application logic in `src/index.ts`.

### Technology decision

Use a standalone **TypeScript client application** with a real router and component model. V5 tokens and styling are migrated into the design-system layer. The exact framework can be chosen in a short foundation spike, but it must satisfy:

- route-based code splitting
- accessible component primitives
- typed API clients
- deterministic builds
- screenshot testing
- no dependence on server-rendered string concatenation

Do not postpone the shell waiting for every API to be perfect; adapters can normalize existing APIs while the backend remains stable.

## 7.3 Migration waves

| Wave | Deliverable | Legacy impact | Exit gate |
|---|---|---|---|
| 0 | This architecture, route manifest, UI freeze | None | Written approval |
| 1 | Design tokens, primitives, Storybook/component preview, empty AppShell | None | Desktop/mobile shell approval |
| 2 | Typed read-only API adapters and authority manifest | None | Contract and security proof |
| 3 | Home | None | Parity for summary and onboarding |
| 4 | Wallet | None | Create/import/unlock/send/history parity |
| 5 | Earn | None | Runner, jobs, reward, receipt parity |
| 6 | Data | None | Browse/publish/retrieve/verify parity |
| 7 | Buy | None | Request/status/history parity; fulfillment remains operator-only |
| 8 | Validate | None | Readiness/candidate/status parity |
| 9 | Network | None | Public-node, blocks, routes, proofs parity |
| 10 | Advanced | None | Records/diagnostics/operator separation complete |
| 11 | `/participant` cutover | Alias old page | Full regression, visual and authority approval |
| 12 | Public-site cutover | Alias old `/` and `/public-node` | External public-route verification |
| 13 | Monolith retirement | Remove obsolete renderer only | No unmatched feature or route |

## 7.4 Per-view migration contract

Every view migration must include:

1. Current feature checklist.
2. Existing API and mutation inventory.
3. New wireframe and final visual design.
4. Desktop and mobile review screenshots.
5. Empty/loading/error/success states.
6. Keyboard and screen-reader review.
7. Functional parity proof.
8. Authority-boundary proof.
9. Legacy route still operational.
10. Explicit approval before merge.

---

# Deliverable 6 — Acceptance criteria

## 8.1 Visual quality

A view fails visual review if any of these are true:

- it looks like a different product from another view
- it contains feature-specific inline styles
- it has more than one dominant primary CTA
- every data point is wrapped in a separate card
- the first screen contains raw JSON, route names, or implementation markers
- explanatory copy overwhelms the task
- spacing or typography varies without a token
- status colors are used decoratively rather than semantically
- the page has horizontal overflow at supported sizes

Required review sizes:

- 1440 × 900 desktop
- 1280 × 800 desktop
- 768 × 1024 tablet
- 390 × 844 mobile
- 320 × 568 minimum-width smoke

Required visual evidence:

- full-page screenshot for each required size
- focused screenshot of every modal/drawer
- loading, empty, error, success, and disabled states
- before/after comparison against the legacy view
- explicit human approval, not only automated diff acceptance

## 8.2 Responsive behavior

- No horizontal page scroll at 320 CSS pixels.
- Desktop side navigation becomes a drawer or bottom navigation at the defined breakpoint.
- Critical actions are never hidden only because the layout is narrow.
- Tables either reflow, scroll within a labeled region, or switch to structured cards.
- Touch targets are at least 44 × 44 CSS pixels for primary controls; no control may fall below the WCAG 2.2 AA minimum target requirement.
- Sticky headers and bottom navigation must not obscure keyboard focus.
- Modal and drawer content must fit the viewport and retain a visible close action.

## 8.3 Accessibility

Target: **WCAG 2.2 AA**.

Required:

- semantic landmarks and one clear page heading
- skip link
- complete keyboard operation
- visible focus that is not obscured
- logical focus order
- no keyboard trap
- current navigation item announced
- labels and instructions for every field
- validation errors linked to fields
- status changes announced through polite live regions
- meaningful link and button labels
- color contrast compliant for text and non-text controls
- no information conveyed by color alone
- reduced-motion support
- accessible dialogs with focus management and return
- consistent navigation and component identification across routes

## 8.4 Functional quality

- Deep links load the correct view.
- Refresh preserves route and selected entity.
- Browser back/forward works.
- Account switching updates all participant-scoped data.
- Node switching or node loss has a clear state.
- All requests have loading, empty, error, timeout, and retry behavior.
- No duplicate mutation caused by double click or retry.
- Mutation results include a durable reference or receipt when the backend provides one.
- Existing APIs remain backward compatible during migration.
- Legacy route regression suite stays green until cutover.
- Every migrated feature has a parity row with “matched,” “intentionally changed,” or “retired with approval.”

## 8.5 Authority and safety quality

Every route and control is assigned one authority class:

1. Public read-only
2. Participant read-only
3. Participant mutation
4. Operator read-only
5. Operator mutation
6. Developer-only

Required:

- Public views call only exact public GET allowlists.
- Participant mutations retain loopback, wallet-signing, explicit-confirmation, or existing policy gates.
- Operator controls never appear in ordinary participant navigation.
- No client view invents authority that the server does not possess.
- Production WC remains separate from spendable/redeemable WC until a separately approved policy changes it.
- Buy VOID execution and fulfillment remain distinct from public quote/status views.
- Candidate registration remains distinct from active validator admission.
- DataNet public import/read surfaces never imply trusted network truth without verification.
- No secret, signer, wallet export, private RPC, or raw operator packet reaches a public bundle.
- Destructive and financial actions use a review screen showing account, asset, amount, destination, fees, and authority source.
- Mutation tests prove a read-only view cannot write by changing HTTP method, casing, slash, query, or remote origin.

## 8.6 Copy quality

- No paragraph in the primary task area exceeds three short lines at desktop width.
- Safety language is canonical and reused from content definitions.
- “Available,” “Preview,” “Guarded,” and “Operator action required” have distinct meanings.
- Do not expose implementation markers as user copy.
- Avoid repeating network name, product name, and status in every card.
- Use details disclosure for technical explanation.
- Never use investment, guaranteed-return, automatic-yield, or guaranteed-reward language.

## 8.7 Performance and reliability

Initial budgets:

- critical application shell JavaScript: ≤ 200 KB gzip
- per-view lazy chunk: ≤ 150 KB gzip unless reviewed
- critical CSS: ≤ 75 KB gzip
- no unbounded polling
- one shared request cache per endpoint/account/node combination
- static shell renders before noncritical dashboard data
- target Lighthouse or equivalent lab score: ≥ 90 for accessibility and best practices, ≥ 85 performance on the approved test machine
- no console errors in normal operation

## 8.8 Merge gate

A UI pull request cannot merge unless all are present:

- scope and parity checklist
- desktop screenshots
- mobile screenshots
- keyboard test evidence
- accessibility smoke evidence
- functional regression evidence
- authority-boundary proof
- copy review
- human visual approval
- no unreviewed inline style or one-off component

---

## 9. Governance

### 9.1 Feature freeze rule

Until Wave 1 is approved:

- backend and security work may continue
- UI bug fixes that prevent use may continue
- no new participant cards, panels, navigation items, or copy blocks
- no new feature-specific inline CSS
- no public-route replacement
- no commit of the V5 preview as the final app shell

### 9.2 Design decision record

Every visual or navigation decision that affects multiple views must be recorded in the design system, not rediscovered in feature code.

Required decision records:

- navigation model
- account and node context
- status vocabulary
- authority display model
- balance taxonomy
- table versus card rules
- confirmation model
- advanced disclosure model
- mobile navigation model

### 9.3 Balance taxonomy

The UI must consistently distinguish:

- VOID
- Spendable local WC
- On-chain WC
- Production WC
- Redeemable WC
- Redeemed WC
- Pending or estimated reward

These values must never be silently added together.

### 9.4 Public versus app content

Public site:

- explains
- demonstrates public truth
- provides public-safe status and proofs
- links into the app

VOID App:

- identifies the current participant and wallet
- performs participant actions
- shows private/local history
- enforces participant authority

Advanced:

- inspects internals
- performs operator/developer work
- never presents itself as normal user flow

---

## 10. Final architecture decision

The approved end state is:

- **one concise public website**
- **one route-based VOID participant application**
- **one shared V5-derived design system**
- **seven primary destinations**
- **one Advanced area**
- **zero new feature UI in the participant monolith**
- **legacy routes preserved until measured parity and approval**
- **visual review treated as a release gate, not a courtesy**

The next deliverable after approval of this document is **Wave 1 only**: design tokens, component preview, and an empty responsive application shell with no migrated feature functionality.

It is specifically **not** another feature card, another public dashboard, or another large patch inside `src/index.ts`.
