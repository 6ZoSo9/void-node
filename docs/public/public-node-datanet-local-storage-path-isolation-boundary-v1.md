# DataNet Local Storage Path Isolation Boundary v1 (Mainnet-0)

<!-- MARKER: VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_DOC_V1 -->

This document establishes the Mainnet-0 boundary for DataNet local storage path isolation.

The public node may expose public identifiers and verification metadata.

The public node must not expose operator-local filesystem paths.

## Public-safe references

- dataset IDs
- route paths
- content hashes
- object hashes
- manifest hashes
- object counts
- proof markers
- challenge markers
- offline verification markers

## Forbidden public references

- absolute filesystem paths
- operator home paths
- local DataNet storage roots
- environment variables
- shell commands
- private keys
- secrets

## Invariants

- `dataset_ids_are_filesystem_paths=false`
- `request_dataset_id_used_to_build_filesystem_path=false`
- `local_storage_root_publicly_disclosed=false`
- `absolute_filesystem_path_publicly_disclosed=false`
- `private_home_path_publicly_disclosed=false`
- `operator_env_publicly_disclosed=false`
- `shell_command_publicly_disclosed=false`
- `private_path_disclosure=false`
- `storage_root_disclosure=false`
- `ledger_write=false`
- `wc_credit_award=false`

## Why this matters

VOID DataNet should scale outward through public identifiers, hashes, manifests, mirrors, challenges, and offline verification.

It should not require outside testers to see or trust an operator's local machine paths.

Public challenge receipts should reference public IDs and content hashes, not `/home/...` paths.

PROTECT THE CORE.
