# DataNet executed-byte source inventory v1

This gate binds the executed-byte evidence lane to an exact, contract-defined set
of repository files. It closes the omission gap where otherwise-valid receipts
could all agree on a self-selected source inventory that left out relevant
experiment, validator, workflow or documentation bytes.

The canonical path list is `SOURCE_PATHS` in
`scripts/lib/void_datanet_executed_byte_receipt_dag_v1.mjs`. The proof reads
the exact checked-out `HEAD` and tree, resolves every required path through
`git ls-tree`, verifies the working byte stream reproduces the committed Git
blob, records Git mode, blob SHA-1, byte count and SHA-256, and derives the
canonical `source_inventory_sha256`.

This is repository provenance only. It does not prove that a runtime executed
those files, does not substitute for the 144-attack/144-recovery natural
campaign, and grants no Chain-2050, DataNet, deployment, wallet, market or funds
authority.
