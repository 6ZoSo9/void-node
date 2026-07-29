# VOID External Agent Paid Work Submission Prerequisite Prepare-Only Runtime Integration V1

Marker: `VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_V1`

## Purpose

This lane connects the merged prerequisite-creation gate to the existing VOID
paid-work client and read-only MCP HTTP transport without activating submission.

It is disabled by default. When explicitly enabled, it may:

1. create one canonical Datanet field object in an operator-owned private
   staging directory outside the repository, or consume one already-validated
   receipt;
2. materialize a work-order envelope whose only input reference is that
   Datanet object;
3. run the merged submission-admission and request-preparation gate in
   `apply=false` mode;
4. validate the private request artifact with
   `tools/void-ai-agent-paid-work-client-v1.mjs`;
5. validate the MCP HTTP configuration with submission disabled and no token;
6. write one mode-`0600` request file and one mode-`0600` operator handoff file
   inside a newly-created mode-`0700` directory.

The adapter never calls the paid-work client submit function, never reads a
token, never constructs an Authorization header, never opens the MCP HTTP
listener, and never sends the prepared request.

## Source-level integration

This is a source-level runtime adapter, not a live mount.

It reuses:

- `scripts/external_agent_paid_work_submission_prerequisite_creation_gate_v1.ts`
  for Datanet receipt validation, admission, callback mount planning, canonical
  body generation, and payload hashing;
- `tools/void-ai-agent-paid-work-client-v1.mjs` for exact private request-file
  validation;
- `integrations/mcp/src/http-config.ts` for the established read-only MCP HTTP
  transport boundary.

The adapter does not modify `src/index.ts`, the MCP server registry, systemd,
reverse-proxy configuration, or any running service.

## Configuration

The configuration marker is:

```text
VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_CONFIG_V1
```

`enabled` must be explicitly set to `true` before a command is evaluated.
The committed example remains `false`.

Bounds:

- `max_datanet_object_bytes`: `64..1048576`
- `max_prepared_request_bytes`: `512..65536`

## Command

The command marker is:

```text
VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_COMMAND_V1
```

The command includes:

- one operation ID;
- the isolated paid-work gateway base URL;
- one new private output-directory path outside the repository;
- Datanet `create` or `existing` mode;
- a work-order draft without a `work_order_id`;
- one bounded admission policy;
- one explicit UTC evaluation timestamp.

The adapter replaces the draft's `service.input_refs` with the exact validated
Datanet object URL and materializes a fresh content-addressed work-order ID.

### Dry run

Use:

```json
{
  "apply": false,
  "confirmation": ""
}
```

With Datanet `create` mode, dry run produces the creation and callback-mount
plan but performs no local write.

With Datanet `existing` mode, dry run can prepare the exact request and handoff
in memory. It writes no files and does not load the MCP runtime configuration.

### Applied preparation

Use:

```json
{
  "apply": true,
  "confirmation": "prepareExternalAgentPaidWorkSubmissionPrerequisiteRuntimeV1"
}
```

Applied preparation may create private local staging and private handoff files.
It still passes `apply=false` to the merged prerequisite gate, so no Express
route is mounted.

## Private artifacts

Applied preparation writes:

```text
<output-directory>/<operation-id>-submission-request-v1.json
<output-directory>/<operation-id>-prepare-only-handoff-v1.json
```

The request bytes are the exact canonical body whose SHA-256 appears in both
the merged gate result and handoff packet. The existing paid-work client reads
and validates that file without a token.

The handoff records:

- endpoint path and method;
- headers excluding Authorization;
- canonical request body, byte count, and SHA-256;
- submission, work-order, and Datanet identities;
- paid-work client path and base origin;
- MCP path `/mcp` and tool `void_prepare_paid_work_submission`;
- callback status and command paths;
- all denied authority.

The handoff deliberately sets `token_file` to `null` and reports
`authenticated_submission_performed=false`.

## MCP boundary

The adapter calls only `loadVoidMcpHttpConfig` with:

```text
VOID_MCP_ALLOW_SUBMIT=0
VOID_MCP_HTTP_HOST=127.0.0.1
```

It requires the resulting bridge to have:

- `allowSubmit=false`
- `tokenFile=null`
- host `127.0.0.1`
- path `/mcp`

It does not call `createVoidMcpHttpServer`, `listen`, or any MCP tool.

## Authority boundary

The lane grants no:

- runtime route mount or network-listener creation;
- token or credential read;
- Authorization-header creation;
- authenticated or unauthenticated external submission;
- provider selection or quote creation;
- payment authorization or execution;
- work authorization or dispatch;
- ticket issuance;
- Work Credit write;
- wallet or signer access;
- signing or transaction broadcast;
- service restart or deployment;
- money movement.

`accepted_for_review` remains an admission result only.

## Verification

The focused proof exercises:

- disabled behavior with zero dependency calls;
- create-mode dry run with zero writes;
- applied private Datanet staging;
- merged gate dry-run preparation and admission;
- request validation through the existing paid-work client;
- read-only MCP HTTP configuration validation;
- mode-`0700` and mode-`0600` artifact boundaries;
- existing-receipt in-memory preparation;
- wrong-confirmation refusal;
- static forbidden-primitive checks.

The workflow also compares focused TypeScript diagnostics against the exact
clean-base diagnostic set. Any new or changed diagnostic fails closed.
