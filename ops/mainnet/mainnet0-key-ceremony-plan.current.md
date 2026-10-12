# VOID Mainnet-0 Key Ceremony Plan

status: planned_not_executed
launch_state: not_go_for_public_mainnet0
mutation_allowed: false
launch_approval: false
money_step: last
operator_label: zoso

## Purpose

This document records the required Mainnet-0 key ceremony plan.

It is not a key file.
It is not a wallet file.
It is not a launch approval artifact.
It does not authorize any live mutation.
It does not contain private keys, mnemonic phrases, seed material, keystore JSON, passphrases, or signing secrets.

## Current baseline dependency

- current_baseline_pointer_commit: 8be2636f
- current_baseline_pointer_tag: ckpt-current-blocker-sweep-green-20260523-112429
- final_gonogo_map_commit: 8be2636f
- final_gonogo_map_tag: ckpt-current-blocker-sweep-green-20260523-112429
- current_decision: NO_GO

## Mainnet-only fresh key requirement

Before public Mainnet-0 launch, fresh never-used keys must be created for:

1. Premine treasury wallets.
2. AdminGate masterKey.
3. UpdateGate signer set.
4. Any launch-critical operator signer.
5. Any cold backup signer used for governance, recovery, or emergency authorization.

Devnet, testnet, demo, Anvil, throwaway, previously pasted, or previously committed keys must never be reused for Mainnet-0.

## Premine treasury requirements

The premine treasury must use the segmented treasury model already planned for Mainnet-0.

Required operator confirmations before launch:

1. Fresh treasury addresses created.
2. Treasury addresses recorded as public addresses only.
3. No private key material is committed to the repository.
4. No private key material is pasted into terminal logs.
5. No private key material is copied into public proof artifacts.
6. Backup locations are verified before funding.
7. Funding procedure is dry-run/reviewed before live funding.
8. Network pool seeding and bootstrap liquidity, if used, comes from premine allocation procedure.

## AdminGate masterKey requirements

Required operator confirmations before launch:

1. Fresh AdminGate masterKey address created.
2. The address has never been used for devnet, testnet, Anvil, demos, or public experiments.
3. The private signing material remains offline/cold where possible.
4. The public address is recorded in the launch artifact.
5. The live assignment action is separately proof-gated.
6. The live assignment action is not performed by this plan.

## UpdateGate signer requirements

Required operator confirmations before launch:

1. Fresh UpdateGate signer addresses created.
2. Signer set is separated from devnet/testnet/anvil signers.
3. Signer public addresses are recorded.
4. Signer threshold and recovery policy are reviewed.
5. Update notification/install lanes remain fail-closed until explicitly approved.
6. No update signer secret material is stored in the repository.

## Backup/storage requirements

Backups must be stored before any launch-critical funding or authority transfer.

Required backup options:

1. LUKS-encrypted USB backup.
2. Optional hardware wallet backup for signer roles that support it.
3. Offline written recovery inventory for public addresses and role mapping.
4. Separate physical storage location for at least one backup copy.
5. Verification that backups can be opened before funds or authority are transferred.

## Prohibited

The following are prohibited:

1. Reusing devnet keys for Mainnet-0.
2. Reusing Anvil default keys for Mainnet-0.
3. Reusing keys pasted in old logs.
4. Reusing any key that appeared in a repo, screenshot, chat, terminal transcript, artifact, or public proof.
5. Storing key material under ops/, .runtime/, cache/, out/, logs, or committed docs.
6. Printing private key material in a proof script.
7. Combining launch approval with key generation.

## Required before this plan can move from planned_not_executed to completed

1. Fresh public addresses are created for each role.
2. Public addresses only are recorded in a separate key ceremony result artifact.
3. Backups are verified.
4. Secret scan is run against the public release tree.
5. Mainnet-0 current baseline proof passes.
6. Mainnet-0 final go/no-go map proof passes.
7. Launch remains NO-GO unless a separate launch approval artifact is written and proved.

## Current decision

NO-GO.

This plan records what must happen later. It does not perform the key ceremony.
