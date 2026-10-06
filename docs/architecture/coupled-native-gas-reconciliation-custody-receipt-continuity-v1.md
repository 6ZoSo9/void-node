# Coupled native-gas reconciliation custody receipt continuity v1

Marker:

`VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1`

## Purpose

This source-only contract adds deterministic continuity above the merged #2498
custody source-generation and host-evidence contracts.

It binds one already-produced live collector decision to:

- the exact merged #2503 custody source generation;
- the collector decision's full canonical SHA-256;
- the exact self-hashed custody qualification receipt;
- the qualification ID rederived from the receipt's policy/evidence
  fingerprints and receipt hash;
- one predecessor continuity receipt; and
- exactly one next continuity generation.

It performs no host observation and no filesystem write.

## Input boundary

The planner accepts:

- an existing canonical continuity JSONL journal; and
- one live collector decision whose status is
  `HOST_EVIDENCE_OBSERVED_SOURCE_QUALIFIED_NOT_AUTHORIZED`.

The collector decision must retain every negative authority boundary from the
merged host collector and qualifier. In particular it must **not** claim a
trusted collector, trusted clock, external bootstrap trust, live-host
qualification, storage bootstrap, runtime integration, production readiness or
funds authority.

The qualifier's canonical receipt is independently revalidated. Its
`receipt_sha256` is rederived from the exact receipt body. Its
`qualification_id_sha256` is then rederived from:

```text
domain
qualification_policy_fingerprint_sha256
evidence_snapshot_fingerprint_sha256
receipt_sha256
```

The qualifier decision's host/payer/domain/root, policy fingerprint, evidence
fingerprint and mount fingerprint must equal the receipt.

The collector's observed time, boot identity and supplied evidence-generation
string must also agree with the embedded qualification receipt.

## Canonical continuity record

Each record contains exactly:

- schema / marker / version;
- continuity `generation`;
- `previous_receipt_sha256`;
- exact stable #2503 `source_generation_id`;
- `collector_decision_sha256`;
- `qualification_id_sha256`;
- `qualification_receipt_sha256`;
- host, payer, payer-domain and payer-root identities;
- machine and boot identity digests;
- collector observed/completed timestamps;
- the collector's evidence-generation string; and
- its own `receipt_sha256`.

Records are canonical single-line JSON plus one final newline.

The first record uses:

`sha256:0000000000000000000000000000000000000000000000000000000000000000`

as the predecessor receipt. Every later record requires
`generation = prior + 1` and an exact prior receipt hash.

The journal is bounded to 8 MiB and 8192 records.

## Identity continuity

Within one supplied chain, these must remain exact:

- host ID;
- payer address;
- payer-domain ID;
- payer-root path; and
- machine ID digest.

A changed boot ID is allowed. Reboot is not equivalent to machine replacement.

One exact collector-decision digest may appear only once.

A host/payer/root/machine replacement requires a separately reviewed bootstrap
or migration boundary; this contract does not silently continue across it.

## What "monotonic" means here

Success reports:

`supplied_chain_generation_monotonicity_proven=true`.

That means only that the **supplied canonical receipt chain** has an exact
generation sequence and predecessor hash chain.

It does **not** mean the stored chain cannot be rolled back, or that the
collector's wall-clock/evidence-generation field is trustworthy. Therefore:

```text
collector_clock_used_as_authority=false
collector_evidence_generation_used_as_authority=false
evidence_generation_monotonicity_proven=false
verification_clock_authority_proven=false
rollback_resistance_proven=false
```

The focused proof deliberately accepts a second valid continuity receipt whose
untrusted collector timestamp/evidence-generation is numerically lower than
the first while the continuity generation advances from 1 to 2. That prevents
this pure layer from accidentally laundering caller/host time into authority.

## Source-generation binding

The exact source-generation ID is imported from merged
`void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs`.
This contract does not copy or redefine the 21-blob manifest.

Current reviewed source bytes may be descendants of the #2503 merge only while
that merged source-binding contract continues to emit the same stable
generation identity.

## Deliberately false boundaries

Success does not prove or authorize:

```text
deployed_artifact_generation_verified=false
trusted_collector_proven=false
bootstrap_receipt_external_trust_proven=false
evidence_generation_monotonicity_proven=false
verification_clock_authority_proven=false
rollback_resistance_proven=false
live_host_qualification_performed=false
filesystem_read=false
filesystem_write=false
storage_bootstrap=false
runtime_integration=false
production_gate_ready=false
gas_spend=false
funds_movement=false
```

It also grants no payment, wallet/signer/key, transaction, Chain-2050,
inventory, market, presale, treasury or liquidity authority.

## Focused proof

```bash
node --check tools/void-coupled-native-gas-reconciliation-custody-receipt-continuity-v1.mjs
node --check scripts/prove_coupled_native_gas_reconciliation_custody_receipt_continuity_v1.mjs
node scripts/prove_coupled_native_gas_reconciliation_custody_receipt_continuity_v1.mjs
npm run typecheck
npm run build
git diff --check
```

The proof covers:

- empty canonical genesis;
- first and second exact receipts;
- lower untrusted collector time/evidence-generation on the second receipt;
- changed boot identity;
- duplicate collector-decision replay;
- host, payer, payer-domain, root and machine drift;
- synthetic collector rejection;
- attempted trusted-collector promotion;
- qualification-ID rederivation;
- qualification-receipt self-hash;
- collector/qualification boot binding;
- collector/qualification evidence-generation binding;
- noncanonical JSON;
- skipped generation;
- wrong predecessor;
- wrong source generation;
- changed in-chain identity;
- duplicate collector hash inside a supplied journal;
- wrong receipt hash;
- invalid UTF-8;
- missing final newline; and
- missing journal input.

## Next gate

This is still only a pure continuity contract.

A later separately reviewed writer/custody lane must make the continuity journal
durable and rollback-resistant, define bootstrap/migration authority, bind a
trusted collection/execution environment, and prove live designated-host
evidence before #2498 can promote any production custody flag.
