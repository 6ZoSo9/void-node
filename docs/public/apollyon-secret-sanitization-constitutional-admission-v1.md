# Apollyon Secret Sanitization / Constitutional Admission v1

Marker: `VOID_APOLLYON_SECRET_SANITIZATION_CONSTITUTIONAL_ADMISSION_V1`

## Purpose

This lane closes the last-mile trust gap between a VOID Apollyon trial packet and any contestant/model provider.

A contestant must never receive raw operator secrets, private host files, wallet material, validator keys, SSH material, environment credentials, private operator channels, or unrestricted local paths. The model is treated as potentially hostile or compromised. Safety comes from withholding capability and data, not from trusting a model's claim of loyalty.

`model_self_report_is_not_trust=true`
`secret_values_never_leave_core_by_default=true`
`contestant_private_file_access=false`
`contestant_keyboard_or_input_device_access=false`
`contestant_environment_access=false`
`contestant_shell_access=false`

## Constitutional binding

The admission gate is stacked on Apollyon Trials Provider-Neutral v1 and requires the trial packet to bind the canonical VOID command instrument:

- `docs/governance/void-crown-brood-queen-command-layer-v1.md`
- marker `VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818`

The gate computes and records the exact SHA-256 of the constitution bytes used for admission. It requires the Apollyon packet's constitutional obedience, secret non-acquisition, secret non-disclosure, no-authority-expansion, and ambiguity-review flags to remain true.

This is an admission/security contract, not a claim that repository text can override an external provider's own policies or system controls. If a contestant cannot operate inside the VOID constitutional and security boundary, it is ineligible for that trial/office term.

## Staging boundary

Only operator-selected files in a dedicated staging root may be considered for export. The manifest uses relative paths only.

The admission tool rejects:

- absolute paths, `..` traversal, symlinks, devices, FIFOs, sockets, and non-regular files;
- files outside the resolved staging root;
- files larger than the per-file limit or bundles above the total limit;
- non-UTF-8 or binary payloads in v1;
- digest mismatch between manifest and staged file;
- credential-bearing JSON key names;
- private-key PEM material;
- common API/token/authorization secret forms;
- SSH/GitHub/AWS/OpenAI-style credential markers;
- private local-path disclosure such as home/SSH/GnuPG/operator-runtime paths.

The scanner never prints a matched secret value. Failures identify only the manifest label and blocked category.

## Output boundary

The admission receipt contains only:

- trial ID;
- constitution path, marker, and exact SHA-256;
- label, classification, content SHA-256, media type, and byte length for each admitted item;
- fixed security-policy booleans;
- deterministic admission ID.

It contains no local staging path and no staged payload bytes.

`admission_receipt_contains_payload=false`
`admission_receipt_contains_local_paths=false`
`admission_receipt_contains_secret_values=false`

## Authority boundary

A green admission receipt authorizes only publication/transport of the exact content-addressed staged inputs through a separately admitted trial-distribution surface. It does not grant model execution on Precision, repository access, shell access, service control, wallet/signer access, validator access, WC ledger writes, transaction authority, treasury/liquidity authority, or funds movement.

`admission_grants_execution_authority=false`
`admission_grants_secret_authority=false`
`admission_grants_mutation_authority=false`

## Exact active-trial generation boundary

Outbound admission now consumes the parent trial contract's active `admit` terminal, not structural `verify` alone. The caller supplies one explicit canonical UTC-millisecond `admission-at-utc`, and the parent contract must prove:

`created_at_utc <= admission_at_utc < expires_at_utc`

The child reads the selected trial packet exactly once through a no-follow descriptor with `MAX_JSON_BYTES + 1` bounded retention. Those exact bytes are copied to a private verification scratch file and consumed by the current parent `admit` command. All later constitutional, manifest, and receipt reasoning uses only the object parsed from those exact already-admitted bytes. Replacing the original trial pathname after parent admission cannot substitute a different trial generation.

`trial_verify_to_use_exact_generation_bound=true`
`parent_active_trial_admission_required=true`
`expired_or_not_yet_active_trial_outbound_admission=false`

## Prebuffer resource boundary

Trial packets, outbound manifests, constitution bytes, and staged entries use descriptor-bound reads with a repository-owned ceiling plus at most one detection byte. Declared metadata oversize is rejected before body retention; same-inode post-stat growth is stopped on the first over-limit byte; the exact file-generation stamp is revalidated after the bounded read.

The bundle ceiling is also enforced before the next staged entry is retained: each entry receives at most the remaining bundle budget, capped by the per-file ceiling.

`trial_manifest_staged_reads_bounded_before_whole_file_retention=true`
`same_inode_growth_fails_closed=true`
`bundle_retention_never_exceeds_remaining_authority=true`

## Crash-durable receipt publication

The final admission receipt is no longer created as the write target. V1 writes a private anonymous staged generation, file-fsyncs the complete bytes, and commits the exact already-open staged inode with create-only/no-replace exact-fd linking into a retained parent-directory descriptor. The exact final is then reopened no-follow, checked for mode `0600`, exact bytes and exact inode identity, file-synced, and the retained parent directory is fsynced before success becomes durable.

An exact retry converges to an already-present byte-identical receipt. A foreign/conflicting final is never deleted or replaced. A failure after final link but before parent sync is recoverable by exact retry; a post-parent-sync observer/report fault revalidates and returns the already committed receipt rather than downgrading durable truth.

`receipt_publication_failure_atomic_retry_recoverable=true`
`receipt_publication_exact_fd_no_replace=true`
`receipt_parent_directory_crash_durable=true`
`foreign_receipt_preserved=true`

## Focused CI self-enforcement

The focused child workflow trigger-binds the directly executed parent proof, parent public contract document, parent tool/schema/schema-alignment proof, child sources, and shared committed-range hygiene helper/proof. The child proof structurally validates those bindings and deterministic mutated-workflow adversaries must fail.

`focused_workflow_dependency_set_closed=true`
`committed_range_diff_hygiene_bound=true`

The CLI is:

```text
apollyon_secret_sanitization_constitutional_admission_v1.mjs \
  admit <trial-packet.json> <staging-root> <manifest.json> <receipt.json> <admission-at-utc>
```

The receipt binds the exact `admission_at_utc` used for the parent active-admission decision.

## V1 status

Source/proof only. No public endpoint, runtime worker, model daemon, file exporter, provider API integration, secret access, deployment, restart, or Work Credit write is created by this lane.
