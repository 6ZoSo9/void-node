# VOID UI visual unification v1

Marker: `VOID_UI_VISUAL_UNIFICATION_V1`

## Outcome

VOID should read as one product instead of a collection of Wave-era admin screens. The public website, participant application, and node-hosted public surface must share one visual grammar while keeping different information densities for different jobs.

The existing production-bound tokens remain canonical:

- canvas `#050506`
- surface `#0b0b0e`
- primary text `#f2f2f4`
- muted text `#9898a3`
- hairline `#2a2a31`
- 32px grid
- monospace-first typography
- square geometry
- semantic state colors only

This lane does not introduce another palette or theme. It tightens the composition of the theme already merged through the `voidchain.org` binding.

## Participant information hierarchy

Normal participant navigation should converge on:

1. Home
2. Wallet
3. Earn
4. DataNet
5. Buy VOID
6. Validate

Network evidence, receipts, proofs, diagnostics, raw contracts, runner state, and operator mechanics are secondary system information. They remain reachable, but they do not compete with the normal participant journey.

The Home route should answer three questions quickly:

1. What do I have?
2. What can I do next?
3. Is the network ready?

Exhaustive safety evidence stays in proofs/system surfaces. Safety still shapes controls and state; it does not dominate normal-user copy.

## Phase A — participant presentation

The first slice is intentionally presentation-only and path-disjoint from current runtime repairs:

- remove the Wave prototype banner from presentation;
- identify the application as `VOID / Participant` through the shared shell;
- rename presentation labels to `DataNet`, `Buy VOID`, and `System`;
- demote Network from primary desktop navigation while preserving the existing route and header access;
- remove the internal UI Foundation route from normal navigation while preserving the route itself;
- flatten and narrow the shell;
- reduce Home to participant-level balance/readiness evidence instead of duplicated infrastructure detail;
- demote the production-WC tile and duplicate Home source-state panel from the main Home presentation;
- demote repeated Wallet no-authority copy while preserving the actual read-only implementation and advanced source status;
- retain mobile access to Buy VOID, Validate, Network, and System.

No JavaScript, adapter, route, endpoint, account semantics, wallet behavior, Work Credit behavior, validator behavior, P2P behavior, economic behavior, or runtime behavior changes in Phase A.

## Phase B — public node home candidate

The path-disjoint public-node renderer now exists at:

- `public/public-node/void-public-node-home-v1.html`
- `public/public-node/void-public-node-home-v1.js`
- `scripts/prove_void_public_node_home_v1.mjs`

Its human-facing hierarchy is deliberately small:

1. `Enter VOID`
2. `Participate`
3. DataNet
4. Earn
5. Agents
6. `System / Proofs` as the secondary evidence escape hatch

The page consumes only the existing sanitized `GET /__void/public-app/network.json` composition endpoint. The browser client rejects redirects and final-URL drift, omits credentials, applies a five-second request deadline, caps retained response bytes at 64 KiB, uses fatal UTF-8 decoding, validates the public composition marker and numeric evidence, and renders dynamic values through `textContent` only.

This is a **candidate renderer**, not a live-route claim. `src/index.ts`, the current composition gateway routing, DNS/TLS, Funnel/Tor, and the deployed `/public-node/` root are unchanged by Phase B. Switching the canonical node-hosted root to this renderer remains a later serialized integration after collision-sensitive runtime work clears.

## Worker integration slices

The umbrella lane owns end-state visual consistency, but source ownership stays serialized.

### Participant semantic cleanup

A worker may simplify static participant markup and labels only after a fresh collision check. It must not touch active #1256 Validate lifetime work, #1250 DataNet request ownership, #1307 Home adapter lifetime work, or any source currently owned by another open repair.

### Public node presentation

The path-disjoint public-node presentation module/proof is now present. Do not edit `src/index.ts` while the live CPU/runtime and public-edge work still makes that file collision-prone. Wiring the new renderer into the live node is a later explicit integration step after the runtime seam clears.

### Public website

The WordPress/public-domain surface should consume the same visual language but remain a sparse public website, not a copy of the participant console. Production WordPress writes and domain-edge activation remain separate lifecycle actions.

## Definition of Done

Source DoD for visual unification requires:

- one shared token system, not multiple competing skins;
- desktop and mobile participant presentation with no Wave/prototype framing;
- normal-user primary navigation reduced to participant jobs;
- system/proof/debug material demoted without being destroyed;
- no regression of existing read-only adapters or safety/economic authority boundaries;
- a node-hosted public presentation that is visibly related to the participant app but materially simpler;
- rendered evidence before lifecycle promotion; and
- fresh collision/review checks before every occupied-file integration.

## Authority boundary

Source, CSS, documentation, proof, CI, draft PR metadata, and later path-disjoint worker branches only. No ready transition, merge, deployment, service restart, public-domain mutation, WordPress write, credential/key access, wallet/signer use, Work Credit or validator mutation, transaction, treasury/liquidity action, or funds movement is granted by this lane.
