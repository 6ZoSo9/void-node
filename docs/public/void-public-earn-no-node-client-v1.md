# VOID Public Earn No-Node Client v1

`VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1` is a one-shot participant client for people who want to perform bounded, server-selected Public Earn work without installing or running the full VOID node.

The client is not a validator, coordinator, wallet, miner, background daemon, or generic job submitter. It uses Node.js built-ins, creates a local Ed25519 executor identity, claims one capability-bound ticket, fetches and verifies the coordinator-selected DataNet input, signs one outbound proof bundle, submits the result, and verifies that the canonical redeemable Work Credit balance increased by exactly 3 WC.

## Requirements

- Node.js 22 or newer
- Network access to the Public Earn coordinator origin you intend to trust
- HTTPS for public coordinator origins; HTTP is accepted only for the same private/development host classes admitted by the canonical client
- Network access to an immutable source mirror for the initial one-file client download
- A public immutable representation of the server-selected DataNet dataset
- No local VOID repository, node process, P2P listener, HTTP listener, or inbound port

The repository copy is used for development and proofing. A repo-less participant downloads one reviewed client file, verifies its content-addressed source identity **before local file creation**, and then runs that local file from any ordinary directory.

## Trust boundary for the downloaded executable

The selected Public Earn gateway is **not** trusted to choose the executable client bytes. The client source below is pinned to the immutable reviewed repository commit that last changed the canonical client and to the exact Git blob identity of that file:

- reviewed source commit: `dee46215a7166beb524fcd7eb051482a37c5ef0b`
- exact client Git blob: `1b82f964f2eeb762e861a88d514879a6c9d2355d`
- repository path: `tools/void_public_earn_no_node_client_v1.mjs`

The same blob is the client present on the reviewed current source baseline for this guide. The Git blob ID is computed over the exact Git blob object (`blob <byte-length>\0<bytes>`), so altered bytes are rejected before `writeFile` or execution.

This is an **immutable reviewed source/content identity**, independent of the participant-selected Public Earn gateway. It is **not** a VOID release signature and does not claim that the Git hosting provider is part of VOID consensus or constitutional authority. A future signed VOID distribution that cryptographically binds this exact standalone client can supersede this source-pinned bootstrap without weakening the participant checks below.

## Download and verify the single client file

Choose the Public Earn coordinator origin you intend to trust. Before **any** network request, the snippet applies the same origin-admission contract as the canonical client: public origins must use HTTPS; HTTP is accepted only for localhost/loopback, RFC1918 IPv4, CGNAT `100.64.0.0/10`, or `.ts.net` development hosts; userinfo, query strings, fragments, and non-root paths are rejected.

The executable itself is fetched from the immutable reviewed source commit, not from the selected Public Earn gateway. The download refuses redirects, keeps a 7-second deadline through body consumption, reads at most 1 MiB, verifies the exact Git blob identity, and creates the local client only after all checks pass.

```bash
PUBLIC_HTTPS_BASE='https://PUBLIC-EARN-GATEWAY'
CLIENT_FILE='./void-public-earn-no-node-client-v1.mjs'

PUBLIC_HTTPS_BASE="$(
  node --input-type=module - "$PUBLIC_HTTPS_BASE" "$CLIENT_FILE" <<'NODE'
import { createHash } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';

const [rawBase, output] = process.argv.slice(2);
const sourceUrl = 'https://raw.githubusercontent.com/6ZoSo9/void-node/dee46215a7166beb524fcd7eb051482a37c5ef0b/tools/void_public_earn_no_node_client_v1.mjs';
const expectedGitBlobSha1 = '1b82f964f2eeb762e861a88d514879a6c9d2355d';
const maxBytes = 1024 * 1024;

function isPrivateHttpHost(hostname) {
  const rawHost = String(hostname || '').trim().toLowerCase();
  const host = rawHost.startsWith('[') && rawHost.endsWith(']')
    ? rawHost.slice(1, -1)
    : rawHost;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (host.endsWith('.ts.net')) return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((value) => value < 0 || value > 255)) return false;
  if (octets[0] === 10 || octets[0] === 127) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  return false;
}

function safeBase(raw) {
  const value = String(raw || '').trim();
  if (!value || value.length > 512) return '';
  try {
    const parsed = new URL(value);
    const https = parsed.protocol === 'https:';
    const privateHttp = parsed.protocol === 'http:' && isPrivateHttpHost(parsed.hostname);
    if (!https && !privateHttp) return '';
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return '';
    if (parsed.pathname && parsed.pathname !== '/') return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

const base = safeBase(rawBase);
if (!base) throw new Error('Public Earn coordinator origin refused');

try {
  await access(output);
  throw new Error(`client output already exists: ${output}`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 7000);
timer.unref?.();

try {
  const response = await fetch(sourceUrl, {
    method: 'GET',
    redirect: 'manual',
    signal: controller.signal,
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`client source redirect refused: HTTP ${response.status}`);
  }
  if (response.status !== 200) {
    throw new Error(`client source unavailable: HTTP ${response.status}`);
  }

  const declaredRaw = response.headers.get('content-length');
  if (declaredRaw) {
    const declared = Number(declaredRaw);
    if (!Number.isSafeInteger(declared) || declared < 1 || declared > maxBytes) {
      throw new Error(`client source content-length refused: ${declaredRaw}`);
    }
  }
  if (!response.body) throw new Error('client source response body unavailable');

  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > maxBytes) {
      controller.abort();
      throw new Error(`client source exceeds ${maxBytes} bytes`);
    }
    chunks.push(bytes);
  }
  if (total < 1) throw new Error('client source was empty');

  const body = Buffer.concat(chunks);
  const actualGitBlobSha1 = createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
  if (actualGitBlobSha1 !== expectedGitBlobSha1) {
    throw new Error(`client source identity mismatch: ${actualGitBlobSha1}`);
  }

  await writeFile(output, body, { flag: 'wx', mode: 0o700 });
  process.stdout.write(base);
} finally {
  clearTimeout(timer);
}
NODE
)"
```

`PUBLIC_HTTPS_BASE` is replaced with the normalized origin only after the origin policy and verified client download succeed. `flag: 'wx'` also refuses to overwrite an existing local file. If the origin is unsafe or the executable bytes do not match the pinned content identity, the command exits before creating the client file.

### Origin-policy examples

The pre-client policy intentionally matches the current canonical no-node client:

- `https://public.example` → allowed
- `http://127.0.0.1:8082` → allowed
- `http://10.0.0.5:8082` → allowed
- `http://192.168.1.5:8082` → allowed
- `http://172.16.0.5:8082` through `172.31.x.x` → allowed
- `http://100.64.0.5:8082` through `100.127.x.x` → allowed
- `http://host.ts.net:8082` → allowed
- `http://[::1]:8082` → allowed
- ordinary public HTTP, non-loopback IPv6 HTTP, `172.32/16`, `100.63/10`, `100.128/10`, userinfo, query/fragment-bearing origins, and non-root paths → refused before fetch

Bracketed IPv6 loopback HTTP follows the **current canonical client** exactly: one surrounding bracket pair is normalized before private-host classification, so `http://[::1]:...` is admitted while non-loopback IPv6 over HTTP remains refused. This guide does not widen the client policy beyond the reviewed canonical client.

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

A participant should not have to transcribe the coordinator node ID by hand. The discovery snippet revalidates the selected origin **before** contacting it, then reads only the sanitized participant-status contract with the same redirect refusal, 7-second deadline, and a streamed 64 KiB maximum.

```bash
COORDINATOR_NODE_ID="$(
  node --input-type=module - "$PUBLIC_HTTPS_BASE" <<'NODE'
const rawBase = process.argv[2];
const maxBytes = 65536;

function isPrivateHttpHost(hostname) {
  const rawHost = String(hostname || '').trim().toLowerCase();
  const host = rawHost.startsWith('[') && rawHost.endsWith(']')
    ? rawHost.slice(1, -1)
    : rawHost;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (host.endsWith('.ts.net')) return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((value) => value < 0 || value > 255)) return false;
  if (octets[0] === 10 || octets[0] === 127) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  return false;
}

function safeBase(raw) {
  const value = String(raw || '').trim();
  if (!value || value.length > 512) return '';
  try {
    const parsed = new URL(value);
    const https = parsed.protocol === 'https:';
    const privateHttp = parsed.protocol === 'http:' && isPrivateHttpHost(parsed.hostname);
    if (!https && !privateHttp) return '';
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return '';
    if (parsed.pathname && parsed.pathname !== '/') return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

const base = safeBase(rawBase);
if (!base) throw new Error('Public Earn coordinator origin refused');

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
  if (!response.body) throw new Error('participant status response body unavailable');

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

This discovery step reads only public sanitized participant status. It does not claim work, inspect an account directory, access a wallet, or mutate Work Credits. The no-node client still verifies that `/health` reports the same explicitly trusted coordinator node ID before proceeding.

## Check availability

```bash
node "$CLIENT_FILE" status \
  --account outside-user-1 \
  --coordinator-base "$PUBLIC_HTTPS_BASE" \
  --coordinator-node-id "$COORDINATOR_NODE_ID"
```

The client rejects a coordinator whose `/health` node ID does not equal the explicitly trusted coordinator node ID.

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

The template changes only the retrieval location. The dataset ID and expected hash still come exclusively from the signed capability ticket. A response is accepted only when the SHA-256 of the raw response or an extracted JSON content field equals the ticket's server-selected expected input hash.

## Recovery

A failed dataset fetch, timeout, or rejected submission leaves the capability ticket in the private `pending/` directory. Re-running the same command with the same account, coordinator, and identity resumes that exact ticket instead of requesting another one.

A pending ticket is deleted only after coordinator result acceptance, capability consumption, exact signed job/receipt verification, and a canonical redeemable balance increase of exactly 3 WC.

The current public earning protocol does **not** yet provide participant-readable recovery for the narrower case where the coordinator durably accepts and credits the submission but the HTTP success response is lost before the client receives it. In that case the participant must treat the outcome as HOLD rather than inventing a new submission identity or assuming success. That canonical recovery seam remains a separate Work Credit-owner blocker and is deliberately not patched by this repo-less onboarding guide.

## Security boundary

The repo-less path enforces:

- exact immutable reviewed source commit and content-addressed Git blob identity for the downloaded executable before local file creation
- public HTTPS coordinator origins; private/development HTTP only for the canonical client's current allowlist
- origin validation before any coordinator-origin network request
- explicit trusted coordinator node ID
- bounded response sizes and total deadlines
- redirect refusal and create-only executable output
- Ed25519 proof of executor-key possession
- coordinator-selected task, dataset, expected hash, award, and expiry
- single-use capability-token binding
- outbound-only transport with no participant callback port
- exact signed result/proof binding
- private state and atomic writes
- token reflection rejection and token redaction
- no automatic background loop

The pinned Git source identity authenticates source content independently of the Public Earn gateway. It does not grant GitHub, the gateway, or this guide runtime, wallet, validator, Work Credit, Buy VOID, treasury, or constitutional authority.

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

The canonical client proof verifies exact Ed25519 claim/result signatures, a successful no-node `+3 WC` flow, private file modes/token non-disclosure, coordinator identity rejection, dataset hash mismatch HOLD behavior, retained-ticket recovery without a second claim, and the absence of the old loopback node routes.

For this repo-less guide specifically, completion evidence must additionally execute the embedded origin policy and source-integrity checks: public HTTP and malformed/adjacent origins must fail before any fetch/file creation, the canonical pinned client must pass its exact Git blob check, altered bytes must fail before `writeFile`, and the existing size/deadline/redirect/create-only boundaries must remain intact.

Expected canonical client marker:

```text
VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_PROOF_EXACT_GREEN
```
