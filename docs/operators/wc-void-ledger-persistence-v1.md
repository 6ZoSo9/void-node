# WC/VOID canonical ledger persistence v1

Marker: `VOID_WC_VOID_LEDGER_PERSISTENCE_V1`

Status: source-only read-only verifier for the live WC opening-settlement custody gate.

This gate does not append to the WC ledger, issue or debit WC, fund a market,
access a wallet/signer, sign or broadcast a transaction, activate WC/VOID,
activate the presale, or move funds.

## Purpose

The coupled-opening source gate can verify the exact shape and arithmetic of
caller-supplied WC opening debit events, but source assertions are not durable
ledger custody.

This verifier closes the source mechanism for proving that an exact expected
opening-settlement set has been durably persisted to the canonical WC ledger:

```text
<data_dir>/wc_v1/ledger.jsonl
```

The canonical WC state projector already treats `kind=debit` plus `amount`
as an outflow. The market settlement adapter therefore reuses that accounting
domain rather than introducing a second WC balance system.

## Bounded append-window design

The verifier does not rescan the complete historical WC ledger.

A trusted operator supplies the exact byte length of the canonical ledger before
the bounded opening settlement append:

```text
prestate_bytes
```

The verifier:

1. requires an absolute direct data directory owned by the current process user;
2. requires a direct, non-symlink `wc_v1` directory;
3. requires a direct, non-symlink canonical `ledger.jsonl`;
4. rejects group/world-writable custody paths;
5. requires `prestate_bytes` to land exactly on a prior newline boundary;
6. reads only the bytes appended after that boundary;
7. caps the inspected append window at 64 MiB and one million lines;
8. rejects malformed or partial lines in the new append window;
9. identifies every WC/VOID opening settlement row in that window;
10. requires the observed set to equal the expected settlement-ID set exactly;
11. rejects any extra opening settlement in the window;
12. recomputes the commitment/settlement aggregate through the coupled-opening
    verifier; and
13. requires stable inode/device/size/mtime/ctime while reading.

The entire historical ledger can therefore be much larger than the bounded
opening append window.

## What success proves

A successful result reports:

```text
status=PERSISTENCE_VERIFIED
exact_expected_settlement_set_present=true
no_extra_opening_settlement_in_window=true
canonical_ledger_direct_file=true
canonical_ledger_realpath_exact=true
canonical_ledger_owner_bound=true
canonical_ledger_not_group_or_world_writable=true
prestate_line_boundary_verified=true
stable_file_identity_during_read=true
ledger_persistence_verified=true
quote_reserve_custody_verified=true
```

It also content-addresses the append window and preserves the exact settlement
set root and settled WC total.

## Deliberate launch boundary

Adding this verifier does **not** make the production candidate live-green.

The checked-in candidate records:

```text
wc_ledger_persistence_verifier_implemented=true
wc_ledger_persistence_verified=false
quote_reserve_custody_verified=false
participant_opening_claim_policy_ready=false
```

The live booleans may become true only after a separately authorized opening
settlement/canary actually exists in the canonical ledger and this read-only
verifier observes it.

## Authority boundary

The verifier opens the canonical ledger read-only.

It has no authority for:

- filesystem writes;
- WC issuance;
- WC balance mutation;
- wallet/signer access;
- signing or broadcast;
- Chain-2050 writes;
- inventory funding;
- liquidity movement;
- market activation;
- public presale activation; or
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_ledger_persistence_v1.mjs
```
