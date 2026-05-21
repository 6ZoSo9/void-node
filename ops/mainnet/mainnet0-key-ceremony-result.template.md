# VOID Mainnet-0 Key Ceremony Result Template

status: template_only
result_status: not_executed
launch_state: not_go_for_public_mainnet0
launch_approval: false
mutation_allowed: false
money_step: last
records_public_addresses_only: true
contains_secret_material: false
operator_label: zoso

## Purpose

This is the template for the future Mainnet-0 key ceremony result artifact.

It is not the completed key ceremony result.
It is not launch approval.
It does not authorize funding.
It does not authorize authority transfer.
It does not authorize validator admission.
It must record public addresses only.

## Required dependency checkpoints

- key_ceremony_plan_commit: ceb1835c
- key_ceremony_plan_tag: ckpt-mainnet0-key-ceremony-plan-green-20260521-023326
- final_gonogo_map_commit: 5e665158
- final_gonogo_map_tag: ckpt-mainnet0-final-gonogo-map-green-20260521-022151
- current_baseline_pointer_commit: bd373e29
- current_baseline_pointer_tag: ckpt-mainnet0-current-baseline-pointer-green-20260521-011107

## Public address result fields

Fill these fields later with public addresses only.

premine_treasury_primary_public_address: TBD_PUBLIC_ADDRESS_ONLY
premine_treasury_network_pool_public_address: TBD_PUBLIC_ADDRESS_ONLY
premine_treasury_bootstrap_liquidity_public_address: TBD_PUBLIC_ADDRESS_ONLY
premine_treasury_grants_public_address: TBD_PUBLIC_ADDRESS_ONLY
premine_treasury_reserve_public_address: TBD_PUBLIC_ADDRESS_ONLY

admingate_master_key_public_address: TBD_PUBLIC_ADDRESS_ONLY

updategate_signer_1_public_address: TBD_PUBLIC_ADDRESS_ONLY
updategate_signer_2_public_address: TBD_PUBLIC_ADDRESS_ONLY
updategate_signer_3_public_address: TBD_PUBLIC_ADDRESS_ONLY
updategate_threshold_policy: TBD_THRESHOLD_POLICY_ONLY

launch_operator_signer_public_address: TBD_PUBLIC_ADDRESS_ONLY
cold_backup_signer_1_public_address: TBD_PUBLIC_ADDRESS_ONLY
cold_backup_signer_2_public_address: TBD_PUBLIC_ADDRESS_ONLY
cold_backup_signer_3_public_address: TBD_PUBLIC_ADDRESS_ONLY

## Required confirmations for completed result

The completed result artifact must confirm:

1. All listed addresses are public addresses only.
2. No signing secrets are present.
3. No recovery words are present.
4. No keystore JSON is present.
5. No passphrases are present.
6. No private signing material was pasted into terminal logs.
7. No private signing material was committed to the repository.
8. No devnet/testnet/Anvil/demo/pasted/logged/repo-exposed key was reused.
9. Encrypted backups were created before funding or authority transfer.
10. Backup restore/open verification was performed.
11. Public role mapping was reviewed.
12. Mainnet-0 remains NO-GO unless a separate explicit launch approval artifact is written and proved.

## Result completion rules

When the real key ceremony is performed later:

1. Copy this template to a timestamped result artifact.
2. Fill in public addresses only.
3. Run secret scanning before commit.
4. Run mainnet0-key-ceremony-result-template-proof before using the template.
5. Add a separate result proof for the completed artifact.
6. Do not combine the result artifact with launch approval.
7. Do not combine the result artifact with funding.
8. Do not combine the result artifact with AdminGate or UpdateGate live authority transfer.

## Current decision

NO-GO.

This template prepares the future result artifact. It is not the result itself.
