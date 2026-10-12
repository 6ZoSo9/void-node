# Public Node Operator Evidence Workflow v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_WORKFLOW_V1`

## Purpose

This tool runs the complete external-operator evidence path in **one command**.
It composes the already merged and independently proven tools for:

1. public-node self-check;
2. self-check receipt review;
3. evidence-pack creation;
4. evidence-pack review;
5. evidence attestation creation;
6. evidence attestation verification.

It does not reimplement those contracts. Before execution, it verifies the
exact SHA-256 of all five merged source tools.

## Command

```bash
node tools/public-node-operator-evidence-workflow-v1.mjs \
  --base http://127.0.0.1:4100 \
  --expected-peer-count 1 \
  --output-dir ./void-operator-evidence-workflow-v1 \
  --operator-id example-operator \
  --node-key example-node \
  --private-key ~/.config/void/operator-keys/example-operator.ed25519
```

Nimo normally uses port `4101` and an expected peer count of `2`.

The private key must already exist as a regular non-symlink Ed25519 file with
mode `0600`. The workflow never copies the private key into its output and
never records the private-key path.

## Output

A complete green or accepted-hold workflow contains:

```text
evidence-pack/
evidence-pack-review-v1.json
evidence-attestation/
evidence-attestation-review-v1.json
operator-evidence-workflow-v1.json
SHA256SUMS.txt
```

The evidence-pack and attestation directories use mode `0700`. Every file,
including the signed attestation ZIP, uses mode `0600`.

`SHA256SUMS.txt` binds every workflow file except itself by relative path.

The workflow manifest records stage exit codes, source-tool contracts,
artifact hashes, pack-to-review agreement, attestation signature verification,
exact pack binding, and the separate evidence-attestation signature domain.

It does not include:

- the raw node URL;
- the raw output path;
- the private-key path or contents;
- wallet information;
- credentials or secrets;
- raw network response bodies.

## Green and hold behavior

A green workflow returns exit code `0` and completes every stage.

A **strict hold** workflow returns exit code `2`. It preserves the evidence
pack, pack review, workflow manifest, and checksums, but deliberately does not
create or sign an attestation.

With `--allow-hold`, a valid hold pack is signed and verified as diagnostic
evidence. The workflow returns exit code `0` with gate
`passed_with_hold`.

The command never overwrites an existing output directory. Output is assembled
in a temporary mode-`0700` directory and atomically renamed only after all
required stages and checksums are complete.

## Proof

```bash
npx --yes tsx \
  scripts/prove_public_node_operator_evidence_workflow_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_WORKFLOW_V1_PROOF_GREEN
```

The fixture proof covers:

- complete green workflow;
- strict hold without an attestation;
- accepted hold with signed attestation;
- exact source-tool contracts;
- signature and pack-hash binding;
- separate signature domain;
- recursive checksums;
- mode `0700` directories and mode `0600` files;
- raw target and private-key-path omission;
- output collision refusal;
- GET-only runtime observation.

## Authority boundary

The workflow proves evidence and key control only. It does not:

- register a node;
- admit or activate a validator;
- connect a wallet;
- stake or send funds;
- issue or claim Work Credit tickets;
- write a ledger;
- change peers;
- fulfill Buy VOID;
- update or restart the live service;
- perform any network mutation.
