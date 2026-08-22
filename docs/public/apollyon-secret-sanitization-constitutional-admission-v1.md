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

## V1 status

Source/proof only. No public endpoint, runtime worker, model daemon, file exporter, provider API integration, secret access, deployment, restart, or Work Credit write is created by this lane.
