# Public Node Operator Ledger Write Runbook Pre-Mutation Backup Execute v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-pre-mutation-backup-execute-v1.json`

Execute script: `ops/mainnet0/public-node-operator-ledger-write-runbook-pre-mutation-backup-execute-v1.sh`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.sh`

## Purpose

This gate executes the pre-mutation backup/snapshot step.

The only allowed write is a backup/snapshot under:

`/tmp/void-operator-ledger-write-runbook/pre-mutation-backup-v1`

This is still not a real WC ledger write.

## Still blocked

The following remain false:

- live runtime write
- ledger write allowed now
- ledger record created now
- ledger entry created now
- WC ledger write
- WC ledger mutation
- WC credit award
- WC credit delta now
- WC-to-VOID swap
- wallet send
- validator mutation
- automatic ledger write allowed

## Next gate

`operator_ledger_write_runbook_duplicate_guard_recheck_v1`
