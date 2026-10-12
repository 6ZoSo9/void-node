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

The pack's stored receipt-review artifact is not accepted as a self-attested
claim. The evidence-pack reviewer executes the locally reviewed canonical
receipt reviewer again over the exact packed receipt, under the pack's recorded
`allow_hold` policy and deterministic review timestamp, and requires the stored
review to match that recomputed semantic result exactly.

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

## Local path authority

On Linux, the evidence-pack directory and the optional review-output parent are
bound component-by-component through already-open directory descriptors. Each
next component is opened relative to the previous descriptor with no-follow
directory semantics before the prior descriptor is released. The reviewer does
not accept a pathname precheck followed by a later full-path open as authority.

The final pack directory must be owned by the current operator UID, use mode
`0700`, and remain the same opened generation through review. The final output
parent must likewise be current-UID-owned and not group/world writable. Parent
components must be owned by the current UID or root and must not be
unreviewably writable; a root-owned sticky shared parent such as `/tmp` remains
supported. Pack artifacts and review publication stay descriptor-relative to
those bound directory generations.

This prevents an intermediate directory from being replaced with a symlink
after a clean pathname observation and redirecting either pack admission or the
create-only review output into another tree.

## Validation

The reviewer verifies:

1. Descriptor-bound real mode-`0700` pack-directory generation
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
14. Manifest source-tool hashes against the local reviewed tools
15. Independent canonical receipt-review replay over the exact packed receipt
16. Exact semantic equality between that replay and the stored review artifact
17. False mutation and authority boundaries
18. Public sanitization with no absolute URLs, keys, credentials, or bearer data
19. Exact pack-directory generation remains bound through review
20. Optional output remains create-only under the reviewed parent generation

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
node scripts/prove_public_node_operator_evidence_pack_parent_namespace_v1.mjs
```

Expected markers:

```text
VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_REVIEW_V1_PROOF_GREEN
VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_PARENT_NAMESPACE_V1_PROOF_GREEN
```

The fixture proofs cover:

- accepted green pack produced with the real canonical receipt reviewer
- accepted hold pack
- strict hold rejection
- checksum tampering rejection
- source-contract tampering rejection
- extra-artifact rejection
- permission-boundary rejection
- mode-`0600` review output
- a forged acceptance-critical receipt plus forged `accepted:true` review with
  recomputed hashes/checksums, which must fail canonical semantic replay
- an intermediate pack-parent replacement with a symlink after the old
  pathname-check boundary, which must not redirect admission into a valid
  alternate pack
- an intermediate review-output parent replacement with a symlink, which must
  not create or modify a review in the alternate tree

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
- performs any runtime or network mutation
