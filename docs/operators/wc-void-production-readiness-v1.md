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
- canonical Chain-2050 `VoidToken`
  `0x470075B85352Eb86F7d089FB9ba88945f12AAd94`;
- explicit separation between that `VoidToken` inventory and the executor's
  Chain-2050 native gas balance;
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
12. coupled activation readiness;
13. coupled native-gas reservation journal integration;
14. presale native-gas reserve protection integration;
15. deployed WC/VOID `settleVoid` production gas-ceiling observation;
16. proof that the shared settlement gas payer cannot double-promise native
    balance across presale and WC/VOID obligations;
17. one shared nonce scheduler for presale and WC/VOID transaction construction;
18. fresh fee-cap admission checks;
19. terminal-receipt-finality-controlled gas-reservation release;
20. a sustainable native-gas replenishment or user-paid native-gas model for
    ongoing WC/VOID operation; and
21. a separately reviewed VOID -> WC reverse-settlement adapter before WC/VOID
    is represented as a complete two-sided market.
22. explicit resolution of the public VOID-chain versus private EVM economic
    execution-layer relationship;
23. an independently verifiable public `VoidToken` balance/receipt/state path;
24. participant post-purchase control and a reviewed `VoidToken` transfer
    submission path;
25. a participant native-gas acquisition or paymaster/executor model; and
26. explicit native-gas currency supply/replenishment accounting.

Even when those fields are satisfied, the classifier returns only
`SOURCE_READY`. Its authority object keeps market activation, presale activation,
wallet/signer access, signing, broadcast, treasury transfer, liquidity movement,
and funds movement false.

## Current candidate

Canonical candidate:

`ops/mainnet0/wc-void-production-candidate-v1.json`

Current expected decision:

`HOLD`

Current source now includes the WC-specific coupled opening mechanism, the
canonical WC ledger debit settlement verifier, a bounded read-only
canonical-ledger persistence verifier, and the locked `WCVoidMarketVaultV1`
source contract. The candidate still records live persistence/custody as false
until a separately authorized opening settlement or canary is actually appended
and observed. The vault source/lock semantics and dual-authority terminal recovery path are
now proven in `WCVoidMarketVaultV2`. The deterministic solc 0.8.24 / Paris dual-compiler gate is implemented and
locked, and the exact deployment-relevant compiled identity is now committed
with original workflow/artifact provenance. The coupled launch identity is deterministically committed. The exact launch
controller, settlement executor, and closeout controller bindings are now
separately authorized and attested by
`VOID_WC_VOID_MARKET_VAULT_ROLE_BINDING_AUTHORIZATION_V1`.
Deployment, independent runtime verification, funding, and live lock evidence
remain HOLD. Independent settlement-adapter review,
participant opening claim policy, bounded canary, and coupled activation
readiness also remain unresolved.

Native-gas readiness is now an explicit additional HOLD. `VoidToken` inventory
is not the executor's native gas balance. The current shared presale/WC
settlement payer therefore requires one cross-lane gas-liability reservation
journal and one cross-lane nonce scheduler. The deployed `settleVoid` path must
receive a production gas census, fee observations must be fresh at admission,
and unresolved gas reservations must remain reserved until terminal receipt
finality.

The current fee envelope covers the opening WC -> VoidToken settlement path
only. A long-running market also needs a sustainable native-gas replenishment
or user-paid gas model. A `VoidToken` protocol fee may compensate the market
economically, but does not replenish native gas by itself. The reverse
VOID -> WC settlement adapter is also not yet production-ready. These facts
remain HOLD conditions rather than being hidden behind the generic
`coupled_activation_ready` flag.

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
