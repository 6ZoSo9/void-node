# Paid DataNet Public Pilot Triage CLI V1

Marker: `VOID_PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1`

## Purpose

This offline operator tool converts one local JSON export of a submitted Paid DataNet pilot issue into a deterministic triage packet. It validates the public issue form, binds the packet to the exact issue export and issue body, checks the selected service against the merged Paid DataNet service catalog, and produces one of two dispositions:

- `READY_FOR_QUOTE`
- `HOLD_FOR_CLARIFICATION`

A ready packet includes a deterministic quote-request seed. The operator must still supply the operator cost basis and request timestamp before using the separate quote system.

## Export one issue

Run the GitHub command separately from the triage CLI:

```bash
gh issue view ISSUE_NUMBER \
  --repo 6ZoSo9/void-node \
  --json number,title,body,url,author,createdAt,labels \
  > paid-datanet-pilot-issue.json
```

Review the local JSON export before continuing. The source GitHub issue is public and must not contain secrets, credentials, private keys, payment credentials, personal data, confidential data, or private dataset contents.

## Triage the local JSON export

```bash
npx --no-install tsx \
  scripts/paid_datanet_public_pilot_triage_cli_v1.ts \
  --input-json paid-datanet-pilot-issue.json \
  --format pretty
```

The CLI writes the packet to stdout. Redirect stdout only when the operator intentionally wants to preserve the packet:

```bash
npx --no-install tsx \
  scripts/paid_datanet_public_pilot_triage_cli_v1.ts \
  --input-json paid-datanet-pilot-issue.json \
  --format pretty \
  > paid-datanet-pilot-triage.json
```

## Ready disposition

`READY_FOR_QUOTE` means the local export is structurally complete, the service code is recognized, declared object count and bytes fit the catalog limits, the references appear public-safe, all required acknowledgements are checked, and no supported credential pattern was detected.

It does not mean the request was accepted. It does not issue a quote, collect payment, admit work, or authorize execution. An operator must review the issue and triage packet before creating the deterministic quote.

## Hold disposition

`HOLD_FOR_CLARIFICATION` includes deterministic `missing_fields` and `hold_reasons`. The operator should request only public-safe clarification in the public issue. Potential secret or credential detection is a mandatory hold; treat the public issue as exposed and follow the project security process rather than copying the suspected value elsewhere.

## Security and authority boundary

- Local JSON export input only.
- Stdout JSON output only.
- No GitHub API access by the CLI.
- No network access.
- No filesystem writes by the CLI.
- No automatic quote approval.
- No payment collection.
- No execution.
- No Work Credit mutation.
- No wallet or treasury access.
- Operator review remains required.

The separate `gh issue view` export command can access GitHub. That network action is outside the triage CLI and remains explicit and operator-controlled.
