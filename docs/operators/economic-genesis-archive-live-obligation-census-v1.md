# Economic Genesis Archive live-obligation census v1

Marker: `VOID_ECONOMIC_GENESIS_ARCHIVE_LIVE_OBLIGATION_CENSUS_V1`

The frozen epoch-1 source snapshot at block `37392` has three nonzero
`VoidToken` holders. All three value buckets are now obligation-classified.

## UpgradeStaking

An isolated replay of the exact frozen state enumerated all 126 validator
records from the staking contract.

Observed:

- 126 validators;
- 126 active;
- 0 pending activation;
- 0 pending exit;
- 0 jailed;
- 0 validators with nonzero unbond;
- `126000000000000000000000` atoms attributed as `stakeVOID`;
- `0` atoms attributed as pending unbond;
- attributed liability equals the staking contract's token balance exactly; and
- every controller-to-reward reverse mapping is exact.

Therefore the entire 126,000 VOID staking balance is a live validator-stake
obligation, not free treasury liquidity.

## PresaleFulfillment

The final snapshot proves:

- 10,000,000 VOID held;
- 10,000,000 VOID remaining inventory;
- 0 VOID fulfilled; and
- no open fulfilled-delivery liability.

The presale balance is therefore fully classified as untouched sale inventory.

## VoidTreasury

The remaining 323,207,333 VOID is core treasury reserve at the final snapshot.
No additional third-party claim against that balance is proven by the frozen
economic state.

## Gate advancement

This evidence closes only the **live-obligation census** gate.

It does not choose successor custody destinations and does not authorize
migration. The contract-holder destination manifest, successor custody review,
offline build, conservation proof, ceremony authority map, replay wall, gas
model, canary, activation, and funds movement remain separate gates.
