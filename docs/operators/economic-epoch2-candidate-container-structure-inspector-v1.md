# Epoch-2 candidate container structure inspector v1

Marker: `VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_V1`

This tool is the next bounded step after the signed-artifact metadata census and
candidate metadata review.

It inspects exactly one operator-approved candidate container.

Supported inputs:

- `.json`
- `.zip`

## JSON behavior

The tool reads and parses the exact JSON file, then emits only structural
metadata:

- key paths;
- value types;
- string lengths;
- array lengths;
- object key counts;
- filename/key-name hints for raw transaction material;
- filename/key-name hints for credential-like material.

It never prints JSON values.

## ZIP behavior

The tool reads the exact ZIP file and parses only the central directory. It emits:

- entry names;
- compressed and uncompressed sizes;
- compression method;
- encrypted-entry flag;
- filename hints for transaction or credential material.

It does not extract or interpret entry contents.

## Bounds

- exact operator file only;
- direct regular non-symlink file;
- current-user ownership required;
- maximum file size: 2 MiB;
- maximum JSON nodes: 10,000;
- maximum ZIP entries: 512;
- ZIP64 and multi-disk archives are rejected.

Apply mode requires:

```text
inspectApprovedVoidCandidateContainerStructure
```

Example:

```bash
node tools/void-economic-epoch2-candidate-container-structure-inspector-v1.mjs \
  --file /absolute/path/to/approved-candidate.json \
  --apply \
  --confirmation inspectApprovedVoidCandidateContainerStructure
```

The tool reports:

```text
candidate_file_content_read=true
candidate_values_printed=false
archive_entry_content_extracted=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
pending_legacy_signed_transaction_census_complete=false
privileged_signer_nonce_or_key_replay_fence_proven=false
cross_epoch_replay_protection_proven=false
```

This is structural review only. It must not be used to inspect private-key,
mnemonic, keystore, wallet, or credential containers. Any exact raw signed
transaction discovered later remains subject to the separate explicit raw
transaction inspector.
