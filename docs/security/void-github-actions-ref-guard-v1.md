# VOID GitHub Actions reference guard v1

## Purpose

The repository contains historical GitHub Actions workflows that reference external actions by mutable tags such as `actions/checkout@v4`. Rewriting the entire workflow fleet in one change would create a broad, collision-prone migration.

This guard takes an incremental fail-closed approach: existing mutable references are grandfathered only at their existing per-file occurrence count, while a pull request is rejected if it introduces an additional mutable external `uses:` reference in a changed workflow.

## Immutable references

The v1 classifier accepts these `uses:` forms without a finding:

- repository-local actions such as `./.github/actions/example`;
- remote actions or reusable workflows pinned to a complete 40-hex or 64-hex commit object identifier; and
- Docker actions pinned to a complete `sha256:` digest.

Tags, branches, dynamic expressions, malformed remote references, Docker tags, and other non-digest Docker references are mutable for this policy.

## Delta semantics

For each added, modified, or renamed file under `.github/workflows/`, the tool extracts `uses:` references from the exact base and head commits. It compares mutable-reference multiplicity per workflow file:

- a legacy mutable reference that remains unchanged does not block the PR;
- removing or replacing a mutable reference with an immutable pin is allowed;
- adding another occurrence of a grandfathered mutable reference is blocked;
- adding a different mutable reference is blocked;
- a pure rename preserves the old file's baseline; and
- a copied/new workflow receives no grandfathered baseline.

YAML block-scalar bodies such as `run: |` are ignored so shell text containing the word `uses:` is not misclassified as workflow syntax.

## Operation

```bash
node tools/void-github-actions-ref-guard-v1.mjs --base <base-commit> --head <head-commit>
```

The command exits `0` with `decision=GREEN`, `1` with `decision=HOLD`, and `2` for malformed invocation or unreadable Git evidence. `--json` emits the complete result object.

The focused pull-request workflow materializes the exact base and head commits with plain `git`; it deliberately uses no external GitHub Action, avoiding a self-exemption from the policy it enforces.

## Boundary

This is a source-review and CI guard only. It does not rewrite historical workflows, resolve remote tags, update dependencies, access repository secrets, deploy software, mutate services or networks, use wallets/signers, submit transactions, alter Work Credits, or move funds.

A later migration may progressively pin grandfathered references. v1 only prevents the mutable-reference inventory from expanding while that migration remains separate and reviewable.
