# VOID External Opportunity Paper Classification Journal V1

Marker: `VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1`

## Purpose

This lane defines the append-only durability boundary for sanitized external
opportunity classifications. It consumes the already-merged paper
classification adapter output and prepares deterministic JSONL journal entries.

The module does not read or write a file directly. A caller must:

1. load and validate existing journal entries;
2. call the pure plan function;
3. supply the exact confirmation string;
4. inject one append-only JSON-line dependency.

This separation lets the journal contract be tested without touching live
runtime state and makes any future filesystem integration an explicit,
auditable action.

## Entry binding

Each entry binds:

- classification ID;
- source-record SHA-256;
- provider, quote, and opportunity identifiers;
- classification status;
- source-validation status;
- provider-risk decision status and reasons;
- paper notional, gross revenue, total cost, net profit, margin, and projected
  loss;
- deterministic entry-fingerprint SHA-256;
- recorded timestamp and UTC journal date.

No credential value, raw API response, transaction payload, wallet data, or
private key is stored.

## Append decisions

The planner returns:

- `ready`: one new entry may be appended;
- `duplicate`: the exact classification and fingerprint already exist;
- `held`: validation, policy, conflict, or journal-integrity checks failed.

The journal holds when:

- the classification is malformed or unsanitized;
- a positive or negative classification lacks adapter append authorization;
- a held classification is supplied while held-entry policy is disabled;
- an existing journal entry is invalid;
- the same classification ID has a different fingerprint;
- the same source record is bound to another classification;
- the existing-entry scan exceeds its explicit bound.

## Held entries

Held classifications can be retained for analysis only when
`allow_held_entries=true`. This does not override the adapter’s execution
boundary. It only permits an append-only record of why the opportunity was
held.

## Explicit confirmation and injected append

The write function requires:

`appendPaperClassificationJournalV1`

It then serializes exactly one compact JSON object plus one newline and calls the
injected append dependency. The dependency must report the exact byte count.
Duplicate and held plans never invoke the dependency.

The module itself imports no filesystem API and performs no direct filesystem
read or write.

## Daily summary

The pure daily summary projects:

- counts by positive, negative, risk-held, and source-held status;
- unique providers and opportunities;
- total paper notional;
- total gross revenue;
- total modeled costs;
- total net paper profit;
- total projected paper loss.

Invalid entries are excluded rather than treated as trusted journal truth.

## Authority boundary

This lane does not:

- modify the Across observer or its stored observations;
- install or alter a scheduled runner, service, or timer;
- access or retain an API credential;
- make a network or RPC request;
- read a wallet, key, mnemonic, or signer;
- construct, sign, or submit a transaction;
- authorize live execution;
- mutate Buy VOID, Work Credits, validators, or releases;
- perform a real journal append during repository proof or build.

## Six-file boundary

1. `src/external_opportunity/paper_classification_journal_v1.ts`
2. `scripts/prove_external_opportunity_paper_classification_journal_v1.ts`
3. `fixtures/external-opportunity/paper-classification-journal-v1.example.json`
4. `schemas/external-opportunity-paper-classification-journal-v1.schema.json`
5. `.github/workflows/external-opportunity-paper-classification-journal-v1.yml`
6. this architecture record
