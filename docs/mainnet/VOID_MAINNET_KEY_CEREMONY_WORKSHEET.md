# VOID Mainnet Key Ceremony Worksheet

Status: PRE-LIVE / STUB ONLY  
Chain ID: 2050

## Rules
- Never reuse devnet keys for mainnet.
- Generate fresh keys only.
- Store backups on LUKS-encrypted media and/or hardware wallets.
- Premine key is one-shot only and should be retired after bootstrap.
- Do not broadcast until every role below is filled and verified.

## Role Map

| Role | Purpose | Address | Key Source | Backup Location | Status |
|---|---|---|---|---|---|
| deployer | bootstrap signer | TBD | TBD | TBD | OPEN |
| treasuryAdmin | controls VoidTreasury | TBD | TBD | TBD | OPEN |
| opsTreasuryAdmin | controls OpsTreasury | TBD | TBD | TBD | OPEN |
| validatorAdmin | controls ValidatorSet admin actions | TBD | TBD | TBD | OPEN |
| adminGateOwner | AdminGate owner/master | TBD | TBD | TBD | OPEN |
| updateGateOwner | UpdateGate owner | TBD | TBD | TBD | OPEN |
| configGateOwner | ConfigGate owner | TBD | TBD | TBD | OPEN |
| treasuryOwner | treasury-level owner role | TBD | TBD | TBD | OPEN |
| opsTreasuryOwner | ops treasury owner role | TBD | TBD | TBD | OPEN |
| rewardEngineOwner | RewardEngine owner | TBD | TBD | TBD | OPEN |
| validatorSetOwner | ValidatorSet owner | TBD | TBD | TBD | OPEN |

## Validator 0
- reward address: TBD
- consensus key: TBD
- stake VOID (raw 18-dec): TBD

## Preconditions before live bootstrap
- [ ] all roles filled with fresh mainnet addresses
- [ ] validator0 finalized
- [ ] template JSON copied to live JSON with real values
- [ ] keys stored on encrypted backup media
- [ ] no placeholder / zero / joke addresses remain
- [ ] PLAN output reviewed
- [ ] RUN path still stub-only unless explicitly flipped later
