# VOID Public Earn No-Node Client v1

`VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1` is a one-shot participant client for people who want to perform bounded, server-selected Public Earn work without installing or running the full VOID node.

The client is not a validator, coordinator, wallet, miner, background daemon, or generic job submitter. It uses Node.js built-ins, creates a local Ed25519 executor identity, claims one capability-bound ticket, fetches and verifies the coordinator-selected DataNet input, signs one outbound proof bundle, submits the result, and verifies that the canonical redeemable Work Credit balance increased by exactly 3 WC.

## What changed

The previous public claim and participant CLIs delegated two operations to a running local VOID node:

- `/wc/public-earning-pilot-v1/sign-claim`
- `/wc/public-earning-pilot-v1/execute-local`

This client replaces those loopback dependencies with a private local identity and direct one-shot work execution. It does not weaken coordinator verification. The existing public claim signature, ticket binding, result-envelope signature, capability token, outbound proof bundle, replay controls, caps, and canonical WC acceptance remain authoritative.

## Requirements

- Node.js 22 or newer
- Network access to the trusted Public Earn HTTPS gateway
- A public immutable representation of the server-selected DataNet dataset
- No local VOID repository, node process, P2P listener, HTTP listener, or inbound port

The repository copy is used for development and proofing. Participants can download the single `.mjs` client directly from the trusted Public Earn gateway and run it from any ordinary local directory.

## Download the single client file

Choose the Public Earn gateway origin you intend to trust. The gateway publishes the same no-node client used by the browser `/participant` handoff at `/download/void-public-earn-no-node-client-v1.mjs`.

The bounded download below refuses redirects, enforces a 7-second total deadline, reads at most 1 MiB, and creates the local client file only after the complete response has passed those checks:

```bash
PUBLIC_HTTPS_BASE='https://PUBLIC-EARN-GATEWAY'
CLIENT_FILE='./void-public-earn-no-node-client-v1.mjs'

node --input-type=module - "$PUBLIC_HTTPS_BASE" "$CLIENT_FILE" <<'NODE'
import { writeFile } from 'node:fs/promises';

const [base, output] = process.argv.slice(2);
const maxBytes = 1024 * 1024;
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 7000);
timer.unref?.();

try {
  const response = await fetch(
    new URL('/download/void-public-earn-no-node-client-v1.mjs', base),
    {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    },
  );
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`client download redirect refused: HTTP ${response.status}`);
  }
  if (response.status !== 200) {
    throw new Error(`client download unavailable: HTTP ${response.status}`);
  }
  const declaredRaw = response.headers.get('content-length');
  if (declaredRaw) {
    const declared = Number(declaredRaw);
    if (!Number.isSafeInteger(declared) || declared < 1 || declared > maxBytes) {
      throw new Error(`client download content-length refused: ${declaredRaw}`);
    }
  }
  if (!response.body) {
    throw new Error('client download response body unavailable');
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > maxBytes) {
      controller.abort();
      throw new Error(`client download exceeds ${maxBytes} bytes`);
    }
    chunks.push(bytes);
  }
  if (total < 1) {
    throw new Error('client download was empty');
  }
  await writeFile(output, Buffer.concat(chunks), { flag: 'wx', mode: 0o700 });
} finally {
  clearTimeout(timer);
}
NODE
```

`flag: 'wx'` refuses to overwrite an existing local file. If you intentionally want a fresh copy, remove or rename the old local client first and rerun the bounded download.

## Identity

The first client run creates a stable Ed25519 executor identity under:

```text
~/.local/state/void/public-earn-no-node-client-v1/identity/
```

The state directory is mode `0700`. The private key, public key, identity record, pending tickets, and receipts are mode `0600`.

Show or create the identity without contacting a coordinator:

```bash
node "$CLIENT_FILE" identity
```

The executor node ID is the first 32 lowercase hexadecimal characters of the SHA-256 digest of the exact public-key PEM, matching `nodeIdFromPubPEM`.

## Discover the coordinator node ID safely

A participant should not have to transcribe the coordinator node ID by hand from the public status JSON. With the trusted Public Earn gateway origin already selected above, derive the exact coordinator node ID from the sanitized participant-status contract with a bounded, redirect-refusing read:

```bash
COORDINATOR_NODE_ID="$(
  node --input-type=module - "$PUBLIC_HTTPS_BASE" <<'NODE'
const base = process.argv[2];
const maxBytes = 65536;
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 7000);
timer.unref?.();

try {
  const response = await fetch(
    new URL('/__void/public-participant/status.json', base),
    {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    },
  );
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`participant status redirect refused: HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`participant status unavailable: HTTP ${response.status}`);
  }
  const declaredRaw = response.headers.get('content-length');
  if (declaredRaw) {
    const declared = Number(declaredRaw);
    if (!Number.isSafeInteger(declared) || declared < 1 || declared > maxBytes) {
      throw new Error(`participant status content-length refused: ${declaredRaw}`);
    }
  }
  if (!response.body) {
    throw new Error('participant status response body unavailable');
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > maxBytes) {
      controller.abort();
      throw new Error(`participant status exceeds ${maxBytes} bytes`);
    }
    chunks.push(bytes);
  }
  const status = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (status?.marker !== 'VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1') {
    throw new Error('participant status marker mismatch');
  }
  const nodeId = String(status?.coordinator_node_id || '');
  if (!/^[0-9a-f]{32}$/.test(nodeId)) {
    throw new Error('participant status coordinator node ID unavailable');
  }
  process.stdout.write(nodeId);
} finally {
  clearTimeout(timer);
}
NODE
)"
```

This discovery step reads only the public sanitized participant status. It does not claim work, submit a result, create or inspect an account directory, access a wallet, or mutate Work Credits. Keep `PUBLIC_HTTPS_BASE` explicitly bound to the gateway origin you intended to trust; the no-node client still verifies that `/health` reports the same coordinator node ID before it will proceed.

## Check availability

```bash
node "$CLIENT_FILE" status \
  --account outside-user-1 \
  --coordinator-base "$PUBLIC_HTTPS_BASE" \
  --coordinator-node-id "$COORDINATOR_NODE_ID"
```

The client rejects a gateway whose `/health` node ID does not equal the explicitly trusted coordinator node ID.

## Claim, work, and earn

```bash
node "$CLIENT_FILE" run \
  --account outside-user-1 \
  --coordinator-base "$PUBLIC_HTTPS_BASE" \
  --coordinator-node-id "$COORDINATOR_NODE_ID"
```

The command performs exactly one bounded attempt:

1. Verify coordinator identity and Public Earn availability.
2. Read the canonical redeemable WC balance.
3. Sign an exact `VOID_WC_PUBLIC_TICKET_CLAIM_V1` request locally.
4. Claim one coordinator-selected `datanet_fetch_verify` ticket.
5. Persist the capability ticket privately before useful work begins.
6. Fetch a public representation of the ticket's server-selected dataset.
7. Require the fetched bytes to match the ticket's exact `expected_input_hash`.
8. Build and sign one `outbound_bundle` result envelope.
9. Submit with the single-use capability in the `Authorization: Bearer` header.
10. Verify coordinator signature/job/receipt acceptance and an exact `+3 WC` canonical balance change.
11. Write a sanitized receipt and delete the consumed pending ticket.

The client never accepts `--dataset-id`, `--input-hash`, `--task`, or `--award`. Those values remain coordinator-selected.

## Dataset URL discovery

The client first uses a sanitized dataset URL template published by `public_claim` status when available. It also supports an operator-published explicit template:

```bash
node "$CLIENT_FILE" run \
  --account outside-user-1 \
  --coordinator-base https://PUBLIC-EARN-GATEWAY \
  --coordinator-node-id 32-lowercase-hex \
  --dataset-url-template 'https://PUBLIC-DATANET/open?dataset_id={dataset_id}'
```

The template changes only the retrieval location. The dataset ID and expected hash still come exclusively from the signed capability ticket. The client also tries a bounded set of existing public DataNet open-by-ID route forms on the coordinator origin.

A response is accepted only when the SHA-256 of the raw response or an extracted JSON content field equals the ticket's server-selected expected input hash.

## Recovery

A failed dataset fetch, timeout, or rejected submission leaves the capability ticket in the private `pending/` directory. Re-running the same command with the same account, coordinator, and identity resumes that exact ticket instead of requesting another one.

A pending ticket is deleted only after:

- coordinator result acceptance,
- capability consumption,
- exact signed job and receipt verification,
- and a canonical redeemable balance increase of exactly 3 WC.

The current public earning protocol does not yet provide participant-readable recovery for the narrower case where the coordinator durably accepts and credits the submission but the HTTP success response is lost before the client receives it. In that case the participant must treat the outcome as HOLD rather than inventing a new submission identity or assuming success. This limitation is tracked separately from the repo-less onboarding instructions here.

## Security boundary

The client enforces:

- HTTPS for public endpoints; HTTP only for loopback, private development networks, or Tailscale addresses
- explicit trusted coordinator node ID
- Ed25519 proof of executor-key possession
- exact claim field set and deterministic JSON signing bytes
- stable account and executor binding
- coordinator-selected task, dataset, expected hash, award, and expiry
- single-use capability token hash binding
- outbound-only transport with no participant callback port
- exact signed result-envelope fields
- exact proof-bundle ticket, executor, job, receipt, and dataset binding
- private state and atomic writes
- token reflection rejection and token redaction from terminal output and sanitized receipts
- no automatic background loop

## Explicitly outside this client

- Full VOID node operation
- P2P participation or block validation
- Generic `/jobs/submit`
- Participant-selected work or awards
- WC-to-VOID execution
- Buy VOID fulfillment
- Wallet creation, import, unlock, signing, or sending
- Validator registration, admission, or active-set mutation
- Any money movement

## Proof

Repository developers can run the deterministic local proof from a VOID source checkout:

```bash
node --experimental-strip-types \
  scripts/prove_void_public_earn_no_node_client_v1.ts
```

The proof uses a loopback mock gateway to verify:

- exact Ed25519 claim and result signatures,
- a successful no-node `+3 WC` flow,
- private file modes and token non-disclosure,
- coordinator identity rejection,
- dataset hash mismatch HOLD behavior,
- retained-ticket recovery without a second claim,
- and the absence of the old loopback node routes.

Expected marker:

```text
VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_PROOF_EXACT_GREEN
```
