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
