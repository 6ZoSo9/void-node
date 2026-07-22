# Public Release Qualification v1 Threat Model

`VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1`

## Threats addressed

### Single-host false confidence

A release that works on one machine may fail on another operating system,
upgrade path, or network topology. The plan requires all matrix targets.

### Evidence substitution

Every result is bound to the plan hash, exact release tag, source commit, and
hashed evidence files. Results from another release are rejected.

### Missing or duplicate targets

Qualification evaluation rejects missing targets, duplicate target receipts,
and duplicate run IDs.

### Greenwashing failed checks

The control tool recalculates whether every target-specific required check is
true and requires all safety flags to remain false.

### One-person run and approval

The approval reviewer identity may not appear in the qualification receipt's
runner identity set.

### Stable-promotion bypass

The promotion control requires both a green qualification receipt and a
hash-bound independent approval before stable promotion.

### Derived-state and ledger tampering

Qualification hashes are stored in the promotion ledger and stable channel
metadata. Existing hash-chain and exact-head PR protections remain authoritative.

## Out of scope

This wall does not publish a release, deploy a live node, generate keys, move
assets, fulfill Buy VOID, write Work Credits, admit validators, or transfer
authority.
