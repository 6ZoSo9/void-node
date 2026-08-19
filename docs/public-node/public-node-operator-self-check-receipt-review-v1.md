# Public Node Operator Self-Check Receipt Review v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RECEIPT_REVIEW_V1`

## Purpose

This command independently reviews a JSON receipt produced by:

```text
tools/public-node-operator-self-check-v1.mjs
```

The reviewer is completely **offline**. It performs no HTTP requests, does not
contact a VOID node, and does not modify the supplied receipt.

It checks structural consistency, safety claims, runtime consistency, receipt
status, redaction boundaries, and the exact expected set of nine self-check
results.

## Command

```bash
node tools/public-node-operator-self-check-receipt-review-v1.mjs \
  --receipt ./void-public-node-operator-self-check-v1.json \
  --output ./void-public-node-operator-self-check-receipt-review-v1.json
```

To require an entirely green receipt:

```bash
node tools/public-node-operator-self-check-receipt-review-v1.mjs \
  --receipt ./void-public-node-operator-self-check-v1.json \
  --require-green \
  --output ./void-public-node-operator-self-check-receipt-review-v1.json
```

The receipt input is opened without following symbolic links and is read through
the opened file descriptor under the 4 MiB ceiling. The reviewer rejects a
receipt whose generation changes, truncates, or grows during the bounded read.

The optional output is **create-only**: its parent directory must already exist
and no component of the output path may be a symbolic link. The reviewer never
overwrites an existing output file. A successful output is written through its
new file descriptor, fsynced, and fixed to mode `0600`; the containing directory
is then fsynced before the command reports success.

## Validation

The reviewer verifies:

1. Exact top-level receipt shape
2. Canonical receipt marker and Mainnet-0 network
3. `read_only: true`
4. Valid observation timestamp
5. Redacted target metadata with no raw target
6. Exact nine-check ID set
7. Per-check success/reason consistency
8. Summary counts and failed IDs
9. Runtime field shape
10. Green runtime truth (`ready`, gap, txroot, peers)
11. Exact GET-only safety boundary
12. Absence of embedded absolute URLs, secrets, credentials, or raw bodies
13. Descriptor-bound, no-symlink receipt input under the 4 MiB ceiling
14. Create-only, no-symlink mode-`0600` review output

The receipt SHA-256 is recorded in the review. The raw receipt path and body are
not copied into the review.

## Exit codes

- `0`: structurally valid receipt accepted
- `1`: invocation or unexpected execution error
- `2`: valid hold receipt rejected by `--require-green`
- exit code `3`: malformed, inconsistent, unsafe, or tampered receipt

A valid hold receipt is accepted by default because a hold can be legitimate
diagnostic evidence. Use `--require-green` when a deployment or admission gate
requires every check to pass.

## Proof

```bash
npx --yes tsx \
  scripts/prove_public_node_operator_self_check_receipt_review_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RECEIPT_REVIEW_V1_PROOF_GREEN
```

The fixture proof covers:

- accepted green receipt
- accepted hold receipt
- strict hold rejection
- mutation-claim tampering rejection
- summary-count tampering rejection
- invalid JSON rejection
- mode-0600 review output

The focused operator transport proof additionally exercises fresh output,
pre-existing output preservation, symbolic-link input/output rejection,
missing-parent rejection, and oversized receipt rejection through the real
offline reviewer CLI.

## Authority boundary

The reviewer never:

- performs a network request
- modifies the receipt
- registers a node
- admits or activates a validator
- connects a wallet
- stakes or sends funds
- claims a Work Credit ticket
- writes a ledger
- changes peers
- fulfills a Buy VOID request
- performs any mutation
