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
- exactly `10,000,000 VOID` of initial protocol-side market inventory
  (`10000000000000000000000000` token atoms);
- exactly `5,000,000 VOID` opening-sale tranche;
- exactly `5,000,000 VOID` post-opening retained reserve;
- deterministic opening allocation policy
  `pro_rata_largest_remainder_v1`;
- exactly `0 WC` protocol quote seed;
- no fixed WC→VOID conversion;
- no fixed opening price;
- one-sided opening discovery from real participant WC;
- machine-readable opening price source
  `settled_wc_over_opening_sale_tranche`;
- WC source domain `void-work-credit-ledger`;
- quote asset form `ledger-credit`;
- WC unit scale of zero decimals; and
- no reuse of the devnet relayer, default private key, or default wallet path.

The candidate's existing JSON key `native_void_token` is retained only for
closed-schema compatibility. Its value is the canonical ERC-20 `VoidToken`
address. The field name must not be interpreted as saying that `VoidToken` is
the EVM native gas currency.

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
25. a participant native-gas acquisition or paymaster/executor model;
26. explicit native-gas currency supply/replenishment accounting; and
27. bounded micro-trade gas-grief protection whenever a shared
    executor/paymaster bears native gas for a trade.
28. bounded TTL plus per-participant/global caps for any pre-settlement intent
    that reserves native gas or market inventory.
29. a fixed opening commitment window with deterministic close;
30. participant provenance/eligibility verification for the price-forming WC
    cohort;
31. policy-bound concentration/Sybil limits so one participant or controlled
    identity set cannot dominate opening price;
32. a minimum aggregate real-WC quote-depth policy before price formation is
    accepted; and
33. explicit exclusion of test, canary, operator-generated, or otherwise
    non-production WC from the price-forming set unless separately approved as
    eligible participant WC.
34. neutralization/reconciliation of standard Anvil prefunded addresses whose
    private keys are publicly known; and
35. rejection of known dev-key signed transactions at any future public
    economic submission boundary until that neutralization is proven.
36. a public executable-quote surface that separately discloses fee components,
    native-gas payer/model, gross and net amounts, slippage/minimum output, and
    expiry with no hidden deduction.
37. deployment of the selector-driven private-EVM durable startup path;
38. a fresh durable checkpoint at or above every accepted economic mutation;
39. restart/recovery proof from that current checkpoint with stale fallback
    impossible; and
40. active mutation-durability debt/checkpoint enforcement before any new
    public economic broadcast.
41. durable binding from every settled opening WC debit to either its exact
    participant VoidToken allocation/claim or a deterministic refund/recovery
    obligation;
42. proof that the 5M participant tranche + 5M retained reserve conserves the
    full 10M initial allocation and that post-opening reserve price equals the
    clearing price; and
43. reconciliation/versioning of the older shared post-discovery inspector,
    whose V1 WC model still assumes the full 10M VOID remains as post-discovery
    reserve.

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
participant opening claim/transfer-or-refund policy, bounded canary, shared
post-discovery reconciliation, and coupled activation readiness also remain
unresolved. The balanced 5M/5M allocation math is source-ready; the value-moving
claim/transfer runtime is not.

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
