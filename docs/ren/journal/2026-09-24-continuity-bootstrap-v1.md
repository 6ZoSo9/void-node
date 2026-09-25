# 2026-09-24 — Continuity Bootstrap V1

Marker: `VOID_REN_CONTINUITY_BOOTSTRAP_V1`

## Decision

ZoSo authorized creation of a repository-backed continuity system for Ren and authorized using one scheduled Brood worker as chronicler.

Ada was selected because continuity maintenance is a coordination-freshness function and fits her existing role without taking over a specialist source lane.

## Created contract

Issue #1814 defines the chronicler lane.

Initial canonical paths:

- `docs/ren/README.md`
- `docs/ren/current-state-v1.md`
- `docs/ren/journal/`

## Design rule

The journal is not a second source of truth.

It exists to make session handoff faster while preserving this precedence:

`newest Sovereign instruction -> live repository/runtime evidence -> live coordination -> continuity cache -> historical journal`

## Privacy rule

The continuity layer records project-safe facts only. It excludes credentials, keys, wallet/signer material, secret paths, private personal conversation, hidden model reasoning, and unsupported claims.

## Authority rule

The chronicler duty does not add a scheduled Ren process and does not grant Ada merge, deployment, runtime/network mutation, scheduler mutation, wallet/signer, transaction, validator, Work Credit, treasury, liquidity, market-activation, or funds authority.

## Seed anchor

The initial snapshot was seeded from `void-node` main `67a87e0bd5b2782c09ebe99ead096338c68ebd10`.

Any later main commit supersedes that SHA as current repository truth.
