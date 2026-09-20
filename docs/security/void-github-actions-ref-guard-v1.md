# VOID GitHub Actions reference guard v1

## Purpose

The repository contains historical GitHub Actions workflows that reference external actions by mutable tags such as `actions/checkout@v4`. Rewriting the entire workflow fleet in one change would create a broad, collision-prone migration.

This guard takes an incremental fail-closed approach: existing mutable references are grandfathered only at their existing per-file occurrence count, while a pull request is rejected if it introduces an additional mutable external `uses:` reference in a changed workflow.

## Immutable references

The v1 classifier accepts these `uses:` forms without a finding:

- repository-local actions such as `./.github/actions/example`;
- remote actions or reusable workflows pinned to a complete 40-hex or 64-hex commit object identifier; and
- Docker actions pinned to a complete `sha256:` digest.

Tags, branches, dynamic expressions, malformed remote references, Docker tags, and other non-digest Docker references are mutable for this policy. Docker digest pins must use the canonical lowercase `sha256:<64 lowercase hexadecimal characters>` spelling; uppercase algorithm or hexadecimal spellings remain a HOLD.

A Docker digest is accepted only when its image target is a literal canonical
lowercase repository path. Dynamic expressions, URL-shaped targets, backslashes,
empty or traversal segments, uppercase names, embedded credentials, extra
`@` delimiters, whitespace, zero, leading-zero, or out-of-range registry
ports, empty registry labels,
registry labels with leading or trailing hyphens, registry labels longer than
the DNS 63-octet ceiling, and a bare registry endpoint without a following
repository/image path remain a HOLD even when the final
digest is a complete SHA-256. A dotted or `localhost` first component is
classified as a registry with or without an explicit port, so portless
hostnames cannot bypass the same DNS-label validation.

A full revision does not make a dynamic target immutable. Remote targets must be
literal canonical `owner/repository` paths, optionally followed by canonical
action or reusable-workflow path segments. Expressions, empty segments,
backslashes, traversal segments, URL-shaped targets, and other noncanonical
target syntax are held even when the final revision is a full hexadecimal SHA.

## YAML syntax boundary

The guard recognizes the workflow `uses` mapping key in ordinary block mappings, single- or double-quoted keys, escaped double-quoted keys that decode to `uses`, flow mappings such as `{ uses: owner/action@ref }`, and compact flow-sequence mapping entries such as `[ uses: owner/action@ref ]`, including the first entry after the sequence opener. YAML anchors and tags that precede a mapping key, such as `[ &step !str uses: owner/action@ref ]`, are consumed before key parsing. Quoted scalar action references are decoded before classification.

This matters because YAML representations such as `"uses": actions/checkout@v4`, `'uses': actions/checkout@v4`, or `{ uses: actions/checkout@v4 }` are semantically capable of expressing the same mapping key as bare `uses:`. They must not bypass mutable-reference accounting merely by changing YAML presentation.

If a line is recognized as a `uses` mapping key but its value cannot be parsed into one bounded scalar reference, the guard reports `unparsed_uses_syntax` and holds the change rather than silently ignoring it. Malformed, duplicate, or unterminated node-property syntax before a visible `uses:` key fails closed the same way. Ambiguous `uses` syntax is not grandfathered.

YAML block-scalar bodies such as `run: |` remain ignored so shell text containing the word `uses:` is not misclassified as workflow syntax. Quoted inline text containing flow-looking text is likewise not interpreted as a mapping. The flow scanner consumes complete verbatim-tag URIs before interpreting `#` as a comment marker, so URI fragments cannot hide a later `uses:` entry. Outside quoted and verbatim-tag scalars, `#` starts a comment only at the beginning of the scanned line or after YAML separation whitespace; a hash inside a plain scalar such as `foo#bar` therefore cannot truncate scanning before a later `uses:` entry. The same separation rule applies while parsing an unquoted `uses:` value: a non-separated hash remains part of the reference passed to classification, while a separated hash begins a comment.

## Delta semantics

For each added, modified, or renamed file under `.github/workflows/`, the tool extracts `uses:` references from the exact base and head commits. It compares mutable-reference multiplicity per workflow file:

- a legacy mutable reference that remains unchanged does not block the PR, including a recognized quoted-key legacy reference;
- removing or replacing a mutable reference with an immutable pin is allowed;
- adding another occurrence of a grandfathered mutable reference is blocked;
- adding a different mutable reference is blocked;
- adding mutable references through quoted keys, escaped quoted keys, flow mappings, compact flow-sequence mapping entries, or keys preceded by YAML anchors/tags is blocked;
- ambiguous or unparsed `uses` syntax is blocked rather than grandfathered;
- a pure rename preserves the old file's baseline; and
- a copied/new workflow receives no grandfathered baseline.

## Git object boundary

Changed workflow files and action manifests must be regular Git files (mode
`100644` or `100755`). A symlink or other non-regular entry is held before
YAML parsing, so the guard cannot be redirected to content whose identity is
outside the audited path. The focused proof includes a changed-workflow symlink
negative control as well as local-action manifest controls.

Local-action manifest lookups use literal Git pathspecs. Repository-controlled
wildcard characters such as `*` therefore cannot make `git ls-tree` validate
an unrelated manifest while the exact referenced manifest is absent; that case
reports `local_action_manifest_missing` and holds the change.

## Operation

```bash
node tools/void-github-actions-ref-guard-v1.mjs --base <base-commit> --head <head-commit>
```

The command exits `0` with `decision=GREEN`, `1` with `decision=HOLD`, and `2` for malformed invocation or unreadable Git evidence. `--json` emits the complete result object.

The focused pull-request workflow materializes the exact base and head commits with plain `git`; it deliberately uses no external GitHub Action, avoiding a self-exemption from the policy it enforces.

## Dispatch and self-removal boundary

The `push:` trigger is defense in depth, not independent enforcement. GitHub
selects a workflow from the event's associated commit. A pushed `main` head can
therefore delete this workflow or remove its own push trigger before GitHub
dispatches it.

When this detector is invoked, it still audits the exact caller-supplied base and
head. Its receipt now states these unproven properties explicitly:

- `dispatch_authority_verified=false`;
- `self_removal_protection_verified=false`; and
- `independent_required_check_verified=false`.

Closing that gap requires authority outside the mutable pushed head, such as a
repository ruleset or independently required workflow that cannot be removed by
the candidate change. That external control must reject a candidate that deletes
this workflow or removes its trigger. A green detector receipt alone is not that
control.

## Boundary

This is a source-review and CI guard only. It does not rewrite historical workflows, resolve remote tags, update dependencies, access repository secrets, deploy software, mutate services or networks, use wallets/signers, submit transactions, alter Work Credits, or move funds.

A later migration may progressively pin grandfathered references. v1 only prevents the mutable-reference inventory from expanding while that migration remains separate and reviewable.
