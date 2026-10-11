# Buy VOID current first-original crash matrix V6

## Purpose

V6 is the source-only crash/replay successor for the final first-original JSONL
generation reviewed at `df7ad33671b8c47a350c1d3ebfc87c59d69d580a`.

It binds the exact current source tuple:

- allocation reservation ledger: `57a14a782549eb6c64d0a8f977f10e33d9e6bcda`;
- verified allocation replay binding: `d873533dbe60f2efff2fefc19470ee963b4fead0`;
- preappend plain-input boundary: `945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f`.

The V1 through V5 crash proof files remain immutable historical artifacts. V6
authenticates their Git blobs and does not repin or rewrite them.

## Scope

The proof exercises deterministic source-only replay, allocation planning,
idempotent retry, malformed/orphan rejection, buyer-wallet lineage, oversell
rejection, and the intent-only / ledger-committed / complete recovery phases
against the actual freshly compiled current modules.

The workflow runs the same proof on Node 22, 24 and 26 and requires the complete
JSON receipts to be byte-identical.

This is not production authority. It does not prove live payment fsync,
cross-UID custody, protected high-water custody, deployment, signer access,
presale activation, or funds movement. Those remain separate gates.

`presale_activation=false`, `funds_moved=false`.

**PROTECT THE CORE.**
