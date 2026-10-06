# Buy VOID allocation custody witness runtime bundle evidence v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V1`
is a read-only collector for the exact eight-file installed runtime bundle
defined by the merged
`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1`
contract.

It is deliberately separate from the merged V2 installation-evidence
collector. This lane proves that the files a future witness host presents at
the fixed executable bundle paths match the reviewed runtime manifest. It does
not claim that the host was reached through authenticated SSH or that the
installation-qualification receipt and this bundle receipt came from one
trusted live session.

## Fixed manifest

The caller supplies no file path, digest, owner, mode, or bundle identity.

The collector imports the canonical merged runtime-bundle contract and uses
only its reviewed constants:

- manifest ID
  `voidwfb1_6b9d87d6461c4dcf5c518d88f4cf25b43ecde2062abefe3a4d0d0dc70a56f7e5`;
- manifest SHA-256
  `sha256:32c39da36fc0257abe37882550d75090e784c72f1e689ad136dfabbb914feba8`;
- census source commit
  `e390424c1d31cd87dcf3551cc0d2d610a24e12f8`; and
- the exact eight installed absolute paths and SHA-256 values.

The reviewed source/build provenance behind this successor census is exact:
the repaired V2 handler and the compiled witness-transport module are the
reviewed runtime byte changes. The other six compiled runtime modules,
`package.json`, `package-lock.json`, and `tsconfig.build.json` remain
byte-identical to the reviewed predecessor closure.

Any receipt produced for the predecessor manifest
`voidwfb1_3a680125403ce20ff3f20c37b9f6aae7a3cbf550c2d0b1883a7fc9130e6a7f21`
is historical evidence only. It cannot satisfy this successor bundle
qualification.

## Descriptor-bound evidence

For each reviewed installed path the live collector:

1. requires an absolute fixed path;
2. captures the visible final-file identity;
3. opens the filesystem root with `O_DIRECTORY|O_NOFOLLOW`;
4. walks every ancestor descriptor-relative through
   `/proc/self/fd/<dirfd>/<component>`;
5. requires every ancestor to remain the same directory identity, root-owned
   and not group/world writable;
6. opens the final basename descriptor-relative with `O_NOFOLLOW`;
7. requires UID/GID 0, mode 0444, nlink 1, regular-file/no-symlink, bounded
   positive size, and visible/opened identity equality;
8. reads exactly the accepted descriptor size with positional reads;
9. probes one byte at the accepted EOF and HOLDs on growth;
10. re-`fstat`s and rebinds the visible final path after the read; and
11. requires the exact reviewed SHA-256.

Raw no-follow/path failures are normalized into the
`witness_runtime_bundle_evidence_*` HOLD domain.

## Double census

The collector observes all eight files twice.

The two canonical evidence arrays must be byte-identical before the merged
runtime-bundle qualifier is invoked. A path, digest, identity, ownership,
mode, link-count, symlink, or parent-chain change between passes therefore
HOLDs before qualification.

The canonical qualifier remains authoritative for bundle semantics. The
collector does not reproduce or weaken it.

## Receipt

A successful source receipt binds:

- exact runtime-bundle manifest ID and SHA-256;
- exact census source commit;
- canonical runtime-bundle qualification ID;
- SHA-256 of the exact eight-file evidence array;
- the exact eight observed file records, so a downstream verifier can rerun the
  merged #2515 classifier rather than trusting the receipt's qualification ID;
- the canonical normalized #2515 qualification object;
- runtime file count;
- successful double-census equality; and
- the collector authority boundary.

`collector_receipt_sha256` is derived from canonical receipt-body bytes.

The receipt is deterministic for identical evidence. No clock or
caller-selected generation is included, because trusted live time and
monotonic generation remain a later gate.

## Authority boundary

Even a successful receipt reports:

- `filesystem_write=false`;
- `live_evidence_origin_proven=false`;
- `live_nimo_installed=false`;
- `live_ssh_execution_performed=false`;
- `installation_qualification_composed=false`;
- `external_transport_authenticated=false`;
- `external_witness_storage_proven=false`;
- `protected_high_water_custody_proven=false`;
- `independent_custody_proven=false`;
- `runtime_integration=false`;
- `production_gate_ready=false`; and
- `funds_movement=false`.

This source lane performs no SSH and does not install/copy files, create users,
alter permissions, keys, `authorized_keys`, sshd, config, witness storage,
services or mounts. It does not accept payments, access signers, construct or
broadcast transactions, mutate Chain-2050, activate the presale/market, move
inventory, treasury/liquidity, or funds.

## Focused proof

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build
node --check tools/void-buy-allocation-custody-witness-runtime-bundle-evidence-v1.mjs
node --check scripts/prove_void_buy_allocation_custody_witness_runtime_bundle_evidence_v1.mjs
node scripts/prove_void_buy_allocation_custody_witness_runtime_bundle_evidence_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts
git diff --check
```

The synthetic proof uses injected bundle observations for qualification and a
temporary local file only for descriptor-read adversaries. It performs no live
Nimo/SSH/runtime/economic mutation.

## Next gate

After merge, the next live-evidence boundary requires fresh receipts collected
from the exact repaired installation. A later conjunctive qualification packet
must bind:

1. a fresh V2 installation-evidence receipt that pins the repaired handler;
2. a fresh receipt for this exact successor runtime-bundle manifest;
3. trusted live evidence origin and client-side host-key material; and
4. authenticated external read/append qualification.

The predecessor #2516 receipts remain historical and are not reusable. Neither
fresh receipt alone closes #2452, and this source lane does not authorize the
reinstall or collection ceremony.
