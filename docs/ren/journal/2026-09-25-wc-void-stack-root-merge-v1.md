# 2026-09-25 — WC/VOID Stack Root Merge V1

Marker: `VOID_REN_WC_VOID_STACK_ROOT_MERGE_V1`

## Material change

PR #1824 merged to `main` at `cd8beb4ba1badae244b724bd544a7b6214ef3fb0`.

That makes the WC/VOID coupled-opening settlement source gate canonical source
above the already merged fail-closed production-readiness baseline.

## Highest proven state

The highest proven state is **merged source**.

This merge does not prove or authorize:

- a deployed WC/VOID production vault;
- inventory funding;
- transaction construction, signing, or broadcast;
- Chain-2050 deployment or mutation;
- a live market;
- public presale activation; or
- funds movement.

The checked-in production candidate remains fail-closed until the remaining
production gates are satisfied.

## Stack consequence

The remaining implementation/review line starts at PR #1825 and continues
through the later stacked WC/VOID preparation PRs, currently including #1836.

Each descendant must be reconciled against the new canonical `main` in
dependency order. A green descendant on an obsolete parent is not by itself
merge authority.

## Continuity rule

Preserve the distinction:

`source-green -> merged -> deployed -> funded -> canary-proven -> economically active`.

No later state may be inferred from an earlier one.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
