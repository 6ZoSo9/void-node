# Public Node Operator Evidence Pack v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1`

## Purpose

This command composes the merged public-node operator self-check and its offline
receipt reviewer into one evidence-producing workflow.

It does not duplicate either contract. It invokes:

```text
tools/public-node-operator-self-check-v1.mjs
tools/public-node-operator-self-check-receipt-review-v1.mjs
```

The result is an atomic directory containing the original self-check receipt,
its independently generated review, a binding manifest, and deterministic
SHA-256 checksums.

## Command

```bash
node tools/public-node-operator-evidence-pack-v1.mjs \
  --base http://127.0.0.1:4100 \
  --expected-peer-count 1 \
  --output-dir ./void-public-node-operator-evidence-pack-v1
```

Nimo normally uses:

```bash
node tools/public-node-operator-evidence-pack-v1.mjs \
  --base http://127.0.0.1:4101 \
  --expected-peer-count 2 \
  --output-dir ./void-nimo-operator-evidence-pack-v1
```

By default, a valid hold receipt creates a complete evidence pack but returns
exit code `2`. Use `--allow-hold` to accept a structurally valid hold as a
successful diagnostic pack.

## Artifacts

The pack contains exactly:

```text
operator-self-check-v1.json
operator-self-check-receipt-review-v1.json
operator-evidence-pack-v1.json
SHA256SUMS.txt
```

The output directory is created atomically with mode `0700`. Every artifact is
written with mode `0600`.

The manifest binds:

- the self-check receipt SHA-256
- the review SHA-256
- receipt and review status agreement
- the review's hash binding to the receipt
- source-tool SHA-256 contracts
- self-check and reviewer exit codes
- false mutation and authority boundaries

The manifest does not include the raw target URL or raw output directory path.

## Exit codes

- `0`: green pack, or accepted hold with `--allow-hold`
- `1`: invocation, source-tool, filesystem, or unexpected execution error
- `2`: complete valid hold pack produced under the default strict gate

The command never overwrites an existing output directory.

## Proof

```bash
npx --yes tsx scripts/prove_public_node_operator_evidence_pack_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1_PROOF_GREEN
```

The fixture proof covers:

- green evidence pack
- strict hold evidence pack
- accepted hold evidence pack
- atomic directory and file permissions
- exact artifact set
- checksum verification
- receipt-to-review hash binding
- raw target and output-path omission
- existing-output collision refusal
- GET-only runtime observation

## Authority boundary

The evidence pack workflow does not:

- register a node
- admit or activate a validator
- connect a wallet
- stake or send funds
- issue or claim Work Credit tickets
- write a ledger
- change peers
- fulfill Buy VOID
- modify the live service
- perform any network mutation
