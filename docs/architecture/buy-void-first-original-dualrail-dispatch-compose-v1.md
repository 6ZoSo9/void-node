# Buy VOID: first-original dual-rail payment handoff + guarded operator dispatch

## Reviewed source composition (source only)

This Draft combines two **disjoint**, independently successful workstreams
without moving either owner branch or modifying live services:

- [#2746](https://github.com/6ZoSo9/void-node/pull/2746) exact
  `9f8925719aa72f210052ebe03de076d4fbb43592`:
  hardened outer operator dispatcher and first-original buyer V2 crash/handoff
  composition. Dedicated source workflow green, full suite 30/31 with the
  frozen Nimo witness V1 identity HOLD.
- [#2747](https://github.com/6ZoSo9/void-node/pull/2747) exact
  `7dfc45375d8feaefa0b52efc1959a845832204e8`:
  Base and Ethereum native-USDC first-original real OS-temp
  payment-to-allocation handoff. Dedicated Node22/24/26 + cross-node workflow
  green, full suite 18/19 with the same historical witness HOLD.

Both own distinct changes relative to common [#2744](https://github.com/6ZoSo9/void-node/pull/2744)
source head `5b33a6b5937912753de486d863af06c97a11e9c2`.
The composition uses a non-force **two-parent review commit** (not a merge into
main), whose output tree starts from exact #2746 and adds the exact three
newly reviewed #2747 files, plus this workflow and note. The new workflow
requires both parents as Git ancestors and exact source Git blobs.

## Proof contract

The combined Node 22/24/26 matrix independently:

1. Builds/types-checks the unchanged reviewed source and pins the exact
   dispatcher, first-original replay, payment capacity writer, V2 original
   handoff and dual-rail proof Git blobs.
2. Requires the original historical V1 crash proof to keep rejecting the
   newly reviewed V2 replay-source bytes. No retroactive V1 repin.
3. Re-runs current first-original wallet hypothetical crash/replay V2 and
   refuses absent/null/empty first-original wallet backfill.
4. Exercises the **actual** hardened dispatcher planning source with inert
   hostile outer Proxy/getter/toJSON and required branch selection; the
   dispatcher remains unmounted.
5. Calls the **actual** payment-to-allocation handoff against disposable
   private OS-temp ledgers and verifies original buyer wallet continuity.
6. Exercises both native-USDC rails. Base/Ethereum use distinct canonical
   `voidpay1` identities even with the same 0x transaction hash/log-index;
   duplicate replays are idempotent; changed chain, nonnative token and
   unqualified first-original wallets HOLD without mutating fixture ledgers.
7. Requires byte-identical no-funds/no-activation receipts across all three
   Node versions. No real RPC, wallet, Nimo service or sale launch is used.

## What still prevents presale

This is review/test **coexecution**, not an online payment pipeline:

- `src/index.ts` still routes operator `payment_verified` through the
  legacy payment-only writer; the verified→allocation dispatcher is
  deliberately UNMOUNTED.
- The web process has no authority to write the independently protected
  private allocation/high-water custody roots. A reviewed cross-UID
  custody-service AF_UNIX reserve/recover successor, authenticated
  server-owned roots, installed witness V2, and durable cross-process fence
  are separate gates.
- Original first **actually fsynced** buyer request ancestry, production
  Base/Ethereum USDC provider quorum/finality, post-crash exactly-once
  allocation recovery, treasury liquidity and coupled WC/VOID market depth
  remain unresolved.
- The prior frozen Nimo witness V1 mismatch is **historical evidence** and
  must not be hidden or rewritten to obtain whole-PR CI green.

All production authority in this composition remains false, including
`actual_operator_dispatch_mounted=false`,
`accepted_cross_uid_custody_verified=false`,
`real_payment_provider_finality_verified=false`,
`protected_high_water_custody_verified=false`,
`installed_nimo_witness_v2_verified=false`,
`production_allocation_mutation_ready=false`,
`presale_activation=false`, `funds_movement=false`.

No Ready/merge, deployment, host/service, public sale, customer/private
ledger, credential, key/signer, transaction, Chain2050/WC or funds action.
This does not grant permission to send buyers payment instructions.

**PROTECT THE CORE.**
