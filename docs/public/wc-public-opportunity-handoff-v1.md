# WC public opportunity handoff v1

<!-- VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1 -->

WC public opportunity handoff converts a trusted `available` entry from the merged multi-node directory into exact commands for the merged no-node public earn client.

The handoff is read-only. It does not execute the client.

## Usage

Create a directory result:

```bash
node tools/wc-public-opportunity-directory-v1.mjs \
  --base https://node-one.example \
  --base https://node-two.example \
  > directory.json
```

Create the handoff:

```bash
node tools/wc-public-opportunity-handoff-v1.mjs \
  --directory-json directory.json \
  --account outside-user-1
```

When multiple trusted opportunities are available, select one explicitly:

```bash
node tools/wc-public-opportunity-handoff-v1.mjs \
  --directory-json directory.json \
  --account outside-user-1 \
  --select-base https://node-one.example
```

Use `--directory-json -` to read JSON from standard input.

## Strict selection

A candidate is eligible only when the directory result reports:

- `state=available`
- `trusted=true`
- Coordinator enabled
- Fixed award matches
- Public claim configured and enabled
- Read-only and GET-only child result
- Public award boundary explicitly confirmed
- No mutation attempt

No eligible candidate produces `hold`. Multiple eligible candidates also produce `hold` until `--select-base` is supplied.

## Coordinator identity binding

After selection, the handoff performs exactly one request:

```text
GET /health
```

The response must contain `ok=true` and a 32-character lowercase hexadecimal `nodeId`. That value becomes the exact `--coordinator-node-id` passed to the no-node client. The client independently checks the same binding before status or execution.

The health response is consumed as a stream with a hard 64 KiB byte ceiling. A declared or accumulated body above 64 KiB, a non-stream-readable body, invalid UTF-8, interrupted body, timeout, malformed JSON, or invalid coordinator identity produces `hold`. The configured health deadline remains active through complete body consumption; receiving HTTP headers does not end the deadline.

## Generated commands

The output contains argv and shell-safe forms of:

```text
node tools/void_public_earn_no_node_client_v1.mjs status ...
node tools/void_public_earn_no_node_client_v1.mjs run ...
```

Optional values include `--state-dir` and an HTTPS `--dataset-url-template` containing `{dataset_id}`.

## Safety boundary

The handoff validates the directory marker, directory safety contract, and selected child safety contract. It uses only `GET /health` and never executes the client, creates an identity, claims a ticket, fetches work, submits a result, awards or settles WC, accesses a wallet, restarts a service, or mutates runtime data.

## Focused proof

```bash
node scripts/prove_wc_public_opportunity_handoff_v1.mjs
```

The proof exercises a successful identity-bound handoff plus declared-oversize, streamed-oversize, interrupted-body, multi-candidate, no-candidate, and unsafe-directory HOLD behavior.

Expected marker:

```text
VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1_PROOF_GREEN
```
