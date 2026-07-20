# Public Node Operator Evidence-Pack Review v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_REVIEW_V1`

## Purpose

This command independently reviews a complete public-node operator evidence
pack. The review is entirely **offline**: it performs no HTTP request, does not
contact a VOID node, and never modifies the pack.

It verifies the exact four-artifact set created by:

```text
tools/public-node-operator-evidence-pack-v1.mjs
```

## Command

```bash
node tools/public-node-operator-evidence-pack-review-v1.mjs \
  --pack-dir ./void-public-node-operator-evidence-pack-v1 \
  --output ./void-public-node-operator-evidence-pack-review-v1.json
```

To require a green pack:

```bash
node tools/public-node-operator-evidence-pack-review-v1.mjs \
  --pack-dir ./void-public-node-operator-evidence-pack-v1 \
  --require-green \
  --output ./void-public-node-operator-evidence-pack-review-v1.json
```

The review output must be outside the evidence-pack directory and is written
with mode `0600`.

## Validation

The reviewer verifies:

1. Real mode-`0700` pack directory
2. Exactly four canonical artifacts
3. Regular non-symlink mode-`0600` files
4. Strict `SHA256SUMS.txt` member set and format
5. Artifact checksum binding
6. JSON parsing
7. Self-check receipt contract
8. Offline receipt-review contract
9. Evidence-pack manifest contract
10. Receipt-to-review SHA-256 and status binding
11. Manifest artifact metadata binding
12. Cross-artifact status and timestamp alignment
13. Green/hold gate and exit-code alignment
14. Manifest source-tool hashes against the local merged tools
15. False mutation and authority boundaries
16. Public sanitization with no absolute URLs, keys, credentials, or bearer data

The review records artifact SHA-256 values but does not copy the raw pack path
or artifact bodies.

## Exit codes

- `0`: structurally valid pack accepted
- `1`: invocation or unexpected execution error
- `2`: valid hold pack rejected by `--require-green`
- exit code `3`: malformed, inconsistent, unsafe, or tampered pack

A valid hold pack is accepted by default because it can represent legitimate
diagnostic evidence.

## Proof

```bash
npx --yes tsx \
  scripts/prove_public_node_operator_evidence_pack_review_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_REVIEW_V1_PROOF_GREEN
```

The fixture proof covers:

- accepted green pack
- accepted hold pack
- strict hold rejection
- checksum tampering rejection
- source-contract tampering rejection
- extra-artifact rejection
- permission-boundary rejection
- mode-`0600` review output

## Authority boundary

The reviewer never:

- performs a network request
- modifies the evidence pack
- registers a node
- admits or activates a validator
- connects a wallet
- stakes or sends funds
- claims a Work Credit ticket
- writes a ledger
- changes peers
- fulfills Buy VOID
- performs any mutation
