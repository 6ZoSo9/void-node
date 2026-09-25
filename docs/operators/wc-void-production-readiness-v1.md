# WC/VOID production readiness v1

Marker: `VOID_WC_VOID_PRODUCTION_READINESS_V1`

Status: source-only, fail-closed production candidate. The committed candidate is
intentionally `HOLD`. It does not authorize a vault deployment, inventory
funding, signer use, transaction, market activation, presale activation, or funds
movement.

## Launch relationship

WC/VOID is coupled to the presale launch policy tracked in #1821 and production
implementation blocker #1822.

The coupled rule is:

- presale public intake must not open without WC/VOID ready for the same launch
  ceremony;
- WC/VOID must not open independently before or without the presale;
- BTC/VOID and ETH/VOID remain separate post-presale markets.

## Static production policy

The classifier requires:

- Chain ID `2050`;
- pair `WC_VOID`;
- canonical native VOID token
  `0x470075B85352Eb86F7d089FB9ba88945f12AAd94`;
- exactly `10,000,000 VOID` of protocol-side opening inventory
  (`10000000000000000000000000` token atoms);
- exactly `0 WC` protocol quote seed;
- no fixed WC→VOID conversion;
- no fixed opening price;
- opening price source `one_sided_market_discovery`;
- WC source domain `void-work-credit-ledger`;
- quote asset form `ledger-credit`;
- WC unit scale of zero decimals; and
- no reuse of the devnet relayer, default private key, or default wallet path.

The old devnet WC relayer remains historical/development evidence only. It is not
production authority and is explicitly excluded from the candidate.

## Gates required for SOURCE_READY

The candidate remains HOLD until all of the following are concrete and reviewed:

1. final market-vault address;
2. exact runtime bytecode SHA-256;
3. independent vault verification;
4. exact 10,000,000-VOID inventory funding;
5. inventory-lock proof;
6. one-sided opening discovery implementation;
7. exact WC settlement-adapter identity;
8. settlement adapter implementation;
9. independent settlement-adapter review;
10. duplicate/replay protection;
11. bounded production canary; and
12. coupled activation readiness.

Even when those fields are satisfied, the classifier returns only
`SOURCE_READY`. Its authority object keeps market activation, presale activation,
wallet/signer access, signing, broadcast, treasury transfer, liquidity movement,
and funds movement false.

## Current candidate

Canonical candidate:

`ops/mainnet0/wc-void-production-candidate-v1.json`

Current expected decision:

`HOLD`

Current source now includes the WC-specific coupled opening mechanism and the
canonical WC ledger debit settlement verifier. The candidate remains HOLD on
live-ledger persistence/custody, independent settlement-adapter review, the
final vault/deployment, inventory funding/lock, bounded canary, and coupled
activation readiness.

## Verification

Run:

```bash
node scripts/prove_void_wc_void_production_readiness_v1.mjs
```

The proof also demonstrates that a fully populated synthetic source candidate can
reach `SOURCE_READY` without gaining activation or funding authority, and that
fixed pricing, nonzero protocol WC seed, devnet relayer reuse, default secret
paths, or wrong WC source semantics fail closed.

No value-bearing action follows from this document or proof.
