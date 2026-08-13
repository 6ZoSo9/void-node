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

## YAML syntax boundary

The guard recognizes the workflow `uses` mapping key in ordinary block mappings, single- or double-quoted keys, escaped double-quoted keys that decode to `uses`, and flow mappings such as `{ uses: owner/action@ref }`. Quoted scalar action references are decoded before classification.

This matters because YAML representations such as `"uses": actions/checkout@v4`, `'uses': actions/checkout@v4`, or `{ uses: actions/checkout@v4 }` are semantically capable of expressing the same mapping key as bare `uses:`. They must not bypass mutable-reference accounting merely by changing YAML presentation.

If a line is recognized as a `uses` mapping key but its value cannot be parsed into one bounded scalar reference, the guard reports `unparsed_uses_syntax` and holds the change rather than silently ignoring it. Ambiguous `uses` syntax is not grandfathered.

YAML block-scalar bodies such as `run: |` remain ignored so shell text containing the word `uses:` is not misclassified as workflow syntax. Quoted inline text containing flow-looking text is likewise not interpreted as a mapping.

## Delta semantics

For each added, modified, or renamed file under `.github/workflows/`, the tool extracts `uses:` references from the exact base and head commits. It compares mutable-reference multiplicity per workflow file:

- a legacy mutable reference that remains unchanged does not block the PR, including a recognized quoted-key legacy reference;
- removing or replacing a mutable reference with an immutable pin is allowed;
- adding another occurrence of a grandfathered mutable reference is blocked;
- adding a different mutable reference is blocked;
- adding mutable references through quoted keys, escaped quoted keys, or flow mappings is blocked;
- ambiguous or unparsed `uses` syntax is blocked rather than grandfathered;
- a pure rename preserves the old file's baseline; and
- a copied/new workflow receives no grandfathered baseline.

## Operation

```bash
node tools/void-github-actions-ref-guard-v1.mjs --base <base-commit> --head <head-commit>
```

The command exits `0` with `decision=GREEN`, `1` with `decision=HOLD`, and `2` for malformed invocation or unreadable Git evidence. `--json` emits the complete result object.

The focused pull-request workflow materializes the exact base and head commits with plain `git`; it deliberately uses no external GitHub Action, avoiding a self-exemption from the policy it enforces.

## Boundary

This is a source-review and CI guard only. It does not rewrite historical workflows, resolve remote tags, update dependencies, access repository secrets, deploy software, mutate services or networks, use wallets/signers, submit transactions, alter Work Credits, or move funds.

A later migration may progressively pin grandfathered references. v1 only prevents the mutable-reference inventory from expanding while that migration remains separate and reviewable.
