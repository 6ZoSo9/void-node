# 2026-10-02 — Launch Convergence, Runtime Hardening, and Truth Preservation V1

Marker: `VOID_REN_2026_10_02_LAUNCH_CONVERGENCE_TRUTH_PRESERVATION_V1`

## Repository anchor

Canonical `main` observed for this continuation:

`c1fb1b29ea9dd7cb1f6aee0b543b678ffd8f41f7`

A newer `main` supersedes this anchor immediately. This journal is continuity
context, not runtime authority. Refresh repository state, open pull requests,
live qualification evidence, and exact deployment receipts before any source or
operational action.

## What materially changed

October 1-2 moved several previously separate launch lanes toward one coherent
boundary without treating source readiness as activation.

The important shift is not the count of merged pull requests. It is that the
network now has stronger executable seams between preparation, proof, apply,
broadcast, observation, and public presentation.

### Epoch-2 / QBFT runtime

The successor-runtime path was hardened around real three-box operation:

- validator cross-box execution gained a transaction-journal executor;
- static user-unit state is distinguished from disabled state instead of being
  misreported;
- activation preflight was repaired for static units;
- Docker CLI size ceilings and generated-shell newline defects were repaired;
- remote activation dependency resolution was corrected; and
- those repairs preserve the rule that tooling may prepare and prove an action
  without silently expanding authority to start, sign, broadcast, or mutate.

This is the operating pattern to keep: make the dangerous step explicit,
single-purpose, inspectable, and independently authorized.

### BTC/VOID settlement

The BTC/VOID lane crossed from mostly structural/evidence work into concrete
settlement primitives:

- deterministic Bitcoin HTLC support landed;
- Chain-2050 BTC/VOID hashlock settlement V1 landed;
- terminal VOID balance-delta checks were tightened to exact values;
- hashlock/preimage adversarial cases were expanded; and
- Phase-1 evidence was explicitly constrained so preview or synthetic material
  cannot masquerade as live execution authority.

The economic rule remains unchanged: fees belong to the trade envelope. There
is no standing BTC fee pot or VOID gas pot implied by these source changes.

### Buy VOID and public launch surface

Buy VOID gained an atomic Precision activation apply gate, but source readiness
still does not equal public activation.

At this observation, the combined public presale / WC-VOID / Earn launch UI is
still an open draft lane. The public surface must continue to state the real
funding and custody boundaries clearly, including the warning against sending
funds from an exchange wallet when the destination asset cannot be returned to
that exchange account.

Presale, WC/VOID, and Earn should converge visibly only where the underlying
runtime and evidence are actually ready. UI completeness must never be used to
paper over an operational HOLD.

### DataNet deployment truth

The DataNet lane made a major truth-preservation advance:

- zero-fee Epoch-2 policy was carried through fee observation, pre-sign proof,
  production-envelope validation, and candidate revalidation;
- canonical production Epoch-2 RPC selection/promotion tooling landed;
- signed deployment verification was bound to the production candidate shape;
- the registry candidate and observer/object preflights were bound to the
  Epoch-2 transaction/call domain;
- an exact single-attempt broadcaster landed; and
- repository current truth was refreshed to record the corrected Epoch-2
  state-root payload tuple and the deployed/attested DataNet registry.

The separate state-root commitment gate remains a HOLD at this anchor. A
deployed registry is not permission to reinterpret an uncommitted state root as
committed.

Historical activation/deployer lineage was also preserved rather than rewritten
to fit the new QBFT schema. That distinction matters: current truth can advance
without falsifying how earlier evidence was produced.

## Open handoffs at observation time

These are point-in-time coordination facts, not permanent ownership:

- PR #2343 — participant role and durable session composition wiring;
- PR #2344 — site-bundle peer persistence crash-atomicity;
- PR #2348 — public presale / WC-VOID / Earn launch UI;
- PR #2355 — exact single-attempt DataNet broadcaster hardening;
- PR #2358 — production Epoch-2 RPC evidence re-execution;
- PR #2362 and PR #2367 — canonical colon-bearing DataNet object IDs through
  Local Data Drop;
- PR #2363 — deployed-registry deployer-proof alignment;
- PR #2368 — WC/VOID market-vault settlement gas census; and
- PR #2369 — WC/VOID related-identity evidence manifest.

Refresh these before touching overlapping paths. Parallel chats and workers can
change the queue quickly.

## Continuity rule

The repo is becoming the institutional memory layer for the project.

That means the journal should preserve decisions, boundaries, and the reason a
gate exists, while executable artifacts and current source remain the authority
for what the network can actually do. Neither human memory nor model context
should be required to reconstruct a safety-critical launch decision.

Prefer:

1. exact source and receipt lineage over recollection;
2. explicit HOLD / READY / APPLIED distinctions over optimistic summaries;
3. one narrow mutation boundary over implicit multi-step authority;
4. current-main collision checks over stale green CI; and
5. durable repo evidence over conclusions that exist only in a chat.

## Launch posture

The project is closer to launch because the remaining work is increasingly
about reconciling exact identities, gas/funding envelopes, public routes,
evidence promotion, and explicit activation gates rather than inventing missing
subsystems.

Do not convert that progress into a premature launch claim.

Presale activation, WC/VOID activation, Earn activation, liquidity, signing,
broadcast, treasury movement, and validator/runtime mutation each remain bound
to their own reviewed authority and live evidence.

## Authority boundary

This journal grants no deployment, restart, scheduler, credential, wallet,
signer, validator, Work Credit, transaction, treasury, liquidity,
market-activation, presale-activation, or funds authority.

Memory for context. Repo for truth. Brood journal for continuity.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
