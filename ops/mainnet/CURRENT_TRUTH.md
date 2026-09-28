# Mainnet-0 Current-Truth Map

Marker: `VOID_MAINNET0_CURRENT_TRUTH_MAP_V1`

Reviewed: 2026-09-25.

## Purpose

The `ops/mainnet/` tree contains older artifacts whose filenames include
`.current` because they were rolling operator inputs at the time they were
created. Several of those paths are now retained for proof compatibility and
historical lineage.

**A `.current` filename is not, by itself, present-tense authority.**

For present-tense claims use this precedence:

1. the operator's newest explicit instruction;
2. fresh live runtime/external evidence;
3. current `main` and applicable repository policy;
4. `docs/public/mainnet0-current-public-status.md`;
5. this map;
6. retained `*.current.*` compatibility/checkpoint artifacts.

## Present-tense network invariants

- Mainnet-0 is publicly visible but guarded.
- Public validator registration is candidate/waiting-oriented; active admission
  is not inferred from registration or old operator checkpoints.
- Any numbered validator count, epoch, total power, next-candidate selector,
  machine readiness value, or hosted-origin reachability claim must be freshly
  observed before operational use.
- Economic readiness, source readiness, deployment, funding, canary success, and
  public activation remain distinct states.
- Public presale intake and production WC/VOID activation are coupled.
- WC/VOID is market-priced; fixed WC-to-VOID redemption is retired.
- Canonical presale/WC market inventory is `VoidToken`; economic contract
  execution currently uses a private loopback Anvil/EVM configured with chain
  ID 2050. The public VOID-node P2P/block runtime is a distinct implementation
  and current source does not prove both histories are identical or anchored.
- EVM transaction gas is paid from a distinct native balance. Do not treat
  retained `VoidToken` or protocol fees as automatic native-gas replenishment.
- Shared use of one settlement EOA requires one cross-lane gas-liability journal
  and one nonce scheduler, with fresh fee checks and terminal-receipt-controlled
  liability release.
- Public economic activation also requires a reviewed participant path to
  independently verify, control, and later transfer/use delivered `VoidToken`;
  a successful operator-side delivery alone is not sufficient product readiness.
- "No hidden minimum" does not mean unbounded microscopic economic obligations.
  Presale/WC activation needs a public, policy-bound gas-grief control such as a
  disclosed minimum, deterministic batching, user-paid gas, or an equivalent
  bounded mechanism.
- Unpaid instructions/intents must not pin gas or inventory indefinitely:
  production requires bounded TTL, per-identity/global outstanding caps, and
  deterministic handling of payments observed after expiry.
- WC/VOID's deterministic reserve-ratio formula is not itself a manipulation
  defense. The opening-window policy is now source-defined: one absolute
  content-addressed window must be committed before opening and the close
  boundary is exclusive. The exact live launch artifact still must supply the
  timestamps. Provenance/eligibility, concentration/Sybil bounds, minimum
  reviewed depth, and exclusion of non-production/test WC remain separate gates.
- Current WC/VOID hardening resolves the participant-consideration math with a
  5M VOID opening-sale tranche and 5M retained VOID reserve. Settled opening WC
  becomes the quote reserve; participant allocations are deterministic pro rata
  with exact atom conservation. Durable WC-debit↔claim/transfer-or-refund binding
  remains a HOLD. The shared post-discovery source model is reconciled by V2:
  WC/VOID uses the coupled launch with a 5M/5M split at canonical 18-decimal
  VoidToken units, while BTC/VOID and ETH/VOID remain post-presale unopened.
- Historical private-EVM state includes standard Anvil prefunded addresses with
  publicly known private keys. Historical receipts are preserved, but public
  economic submission is HOLD until those balances/keys are reconciled or
  neutralized and known dev-key transactions cannot be admitted.
- Epoch-2 static migration summary/reference is source-published under the
  public evidence tree and content-addresses the frozen source archive plus the
  reviewed hashes/identity of the latest nonce-overlay Besu successor. The exact
  client-neutral successor state manifest is now merged and independently
  retrievable through the live Precision public composition/Funnel route with
  file SHA-256
  `affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9`.
  The successor state/genesis public-evidence gate is therefore closed. This is
  still not a public VOID truth-layer state-root anchor; live
  balance/receipt/code verification remains HOLD, and neither migration nor
  public activation is authorized.
- The state-root anchor is now source-defined as one immutable public payload
  intended for the existing `DatanetContentCommitmentRegistryV1`. Its exact
  object-ID SHA-256 is
  `fa6a4ff9a7a25b8ec1888c58d7eb49159a69d84a4021b1365fe1293e868f1f51`;
  its exact payload SHA-256 is
  `e0d6cff588a13315f7a63ff246895440b2d2faf858d8f228912a508ffa88f4d4`.
  Source/public payload readiness is not a Chain-2050 anchor. The anchor gate
  stays HOLD until the exact tuple is committed, finalized under the accepted
  checkpoint policy, its event membership is verified, and canonical commitment
  truth is admitted.
- A fresh dedicated DataNet content-commitment publisher was generated offline
  on Nimo and backed up on encrypted `VOID_AUTHORITY`. The only source-bound
  public identity is
  `0x926aa1d35824e6957fae1a05510e6cc6a0d57be6`, backed by public ceremony
  receipt SHA-256
  `119d634591a324d6b5cd4736ff97d21ad527a69ad6f4a6982fc6ebd360ce701a`.
  This closes publisher selection only. The registry deployer remains explicitly
  unresolved; deployment/signing/broadcast/Chain-2050 write authority remains
  false.
- A fresh dedicated DataNet registry deployer was generated offline on Nimo and
  backed up on encrypted `VOID_AUTHORITY`. The public deployer address is
  `0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb`, bound to public ceremony
  receipt SHA-256
  `81a43d3c245b5badfa975c7ab998094359f62872600d533453df6cab8ed68cb3`.
  It is distinct from the DataNet publisher and does not reuse the historical
  role-authority or presale deployers. Its live Chain-2050 nonce, native balance,
  and predicted CREATE address have not yet been observed. Funding, deployment,
  signing, broadcast, and Chain-2050 write authority remain false.
- The epoch-2 bounded submission **source core** now binds signed intents to
  execution epoch 2 and requires atomic replay-digest consumption before source
  admission. This does not open a public submission route or authorize RPC,
  transaction submission/broadcast, or Chain-2050 writes. Privileged-signer
  replay fencing, the complete pending legacy signed-transaction census,
  durable replay-store runtime binding, and cross-epoch raw-transaction replay
  protection remain HOLD.
- Public economic authority requires complete fee disclosure. WC/VOID now has a
  source-level public quote disclosure contract requiring complete fee
  components, gross/trade/net accounting, slippage/minimum output, expiry,
  market-state binding, and the epoch-2 metered zero-gas-price execution model.
  This does not prove pricing math, reserve custody, live publication, or quote
  execution. Other economic lanes still require their own exact disclosure
  composition before money authority.
- BTC/VOID hardening source currently distinguishes a 50-bps AMM protocol fee
  from a separate 100-bps reserve-recycling/buyback spread. Both exist in source,
  but their combined executable policy remains unapproved/HOLD until explicitly
  reviewed and disclosed.
- Private-EVM selector/checkpoint deployment is still source-only. Its planned
  recovery checkpoint is block 37371, while accepted economic receipt evidence
  reaches at least block 37391. Block 37371 is historical recovery evidence, not
  current launch authority. Public economic activation requires a fresh durable
  checkpoint covering all accepted mutations, selector-driven restart proof, no
  stale fallback, and active mutation-durability debt/checkpoint enforcement.
- PR #1851 merged as `d6bf311291ec66203d2d74922842ee441e67295e` and records the simplified successor architecture: freeze the
  current Anvil EVM as an immutable Economic Genesis Archive and migrate only
  live economic value/obligations into a clean non-Anvil successor. Participant
  balances keep the same address; contract-held value moves only through an
  explicit successor-custody manifest. AdminGate, ConfigGate, legacy relayer,
  default-Anvil authority, and zero-balance bootstrap plumbing do not migrate by
  default. The reconciled 333,333,333 VOID figure is a premine reference;
  migration preserves final live VoidToken totalSupply exactly at freeze time,
  bounded by 666,666,666. No migration has occurred.
- PR #1850 is merged source truth: the mounted participant-wallet module now
  fail-closes wallet mutation by default, retires the legacy WC→VOID relayer
  trade route, removes wildcard CORS from that raw module, and binds canonical
  `VoidToken` directly. Merge is not deployment; a running pre-merge process
  remains old runtime until separately rebuilt/restarted.
- Per-obligation gas admission does not prove lifetime presale capacity, and
  current WC→VOID opening settlement work does not by itself prove a complete
  two-sided WC/VOID market.

## Historical/compatibility paths

The following paths preserve earlier gate/checkpoint state and may contain
`not_go_for_public_mainnet0`, `launch_approval: false`, old validator counts,
old epochs, or old next-candidate selectors:

- `ops/mainnet/mainnet0-launch-approval-plan.current.md`
- `ops/mainnet/mainnet0-launch-approval-artifact-prep.current.md`
- `ops/mainnet/mainnet0-key-ceremony-plan.current.md`
- `ops/mainnet/mainnet0-authority-funding-preflight.current.md`
- `ops/mainnet/mainnet0-validator-policy.current.md`
- `ops/mainnet/mainnet0-public-validator-admission-design.current.md`
- `ops/mainnet/mainnet0-public-validator-admission-decision.current.md`
- `ops/mainnet/mainnet0-validator-candidate-inventory.current.txt`
- `ops/mainnet/mainnet0-validator-live-admission-readiness.current.json`

Those values remain useful as historical evidence and proof inputs. They must
not override later launch promotion or fresh runtime truth.

Retired WC economic artifacts are likewise historical/regression-only:
`ops/private/wc-to-void-*`, `ops/wc-relayer-v1.cjs`, and
`config/obelisk-workcredits-dev.json` may contain fixed 100:1 fixtures,
relayer-fee language, or relayer-default gas assumptions. Those values have no
production WC/VOID price, fee, gas-sponsorship, or activation authority.

## Public-live compatibility paths

Other `.current` files record the May public-launch promotion and therefore
correctly retain `public_mainnet0_live`, but their embedded runtime numbers are
still checkpoint observations rather than a live census:

- `ops/mainnet/mainnet0-status.current.md`
- `ops/mainnet/mainnet0-blockers.current.md`
- `ops/mainnet/mainnet0-current-baseline.current.md`
- `ops/mainnet/mainnet0-final-gonogo-map.current.md`
- `ops/mainnet/mainnet0-final-public-launch-checklist.current.md`
- `ops/mainnet/mainnet0-final-path.current.md`

## Operational rule

Before any validator, deployment, service, signer, transaction, treasury,
liquidity, presale, market, or other sensitive action, resolve fresh current
state. Do not authorize action from a retained checkpoint merely because its
filename contains `.current`.

Historical evidence should be preserved rather than rewritten to manufacture a
continuous present-tense narrative.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
