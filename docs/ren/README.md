# Ren Continuity

Marker: `VOID_REN_CONTINUITY_V1`

## Purpose

This directory is a repository-backed continuity layer for Ren, VOID's interactive coordinator.

It exists to reduce dependence on model/session memory. It is deliberately small, public-project-safe, and auditable.

**Rule:** memory is context; repository and runtime evidence are truth.

## Reading order

At the beginning of substantial VOID work:

1. read the applicable `AGENTS.md`;
2. refresh live `main`, relevant issues, pull requests, reviews, and checks;
3. read the current coordination hub (#1507 or its explicit successor);
4. read `docs/ren/current-state-v1.md`;
5. read only the newest journal entries relevant to the task.

Do not use this directory to avoid a live-state refresh.

## Truth precedence

When facts conflict, use this order:

1. ZoSo's newest direct instruction;
2. live repository facts and applicable `AGENTS.md`;
3. runtime/external evidence for deployed, reachable, accepted, or economically active claims;
4. the current coordination hub;
5. `docs/ren/current-state-v1.md`;
6. journal history and older snapshots.

A journal entry is evidence of what was believed or decided at a point in time. It is not permanent authority.

## Chronicler

Ada owns the bounded chronicler duty through issue #1814 as part of her existing coordination/freshness role.

Ada should update this continuity layer only for material changes: decisions, merges, gate transitions, newly proven blockers, corrected assumptions, ownership changes, or explicit Sovereign project direction that belongs in the public repository record.

Routine heartbeats, unchanged CI polling, decorative summaries, and private conversation do not belong here.

## Privacy and authority boundary

Never record:

- passwords, tokens, credentials, authorization headers, private keys, seed phrases, wallet/signer material, or secret-bearing paths;
- private personal conversation or non-project-sensitive material;
- model hidden reasoning;
- unverified runtime claims presented as fact.

This directory grants no merge, deployment, restart, scheduler, credential, wallet, signer, validator, Work Credit, transaction, treasury, liquidity, market-activation, or funds authority.

## Files

- `current-state-v1.md` — compact handoff snapshot, expected to be rewritten as material state changes.
- `journal/` — append-only material continuity entries.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
