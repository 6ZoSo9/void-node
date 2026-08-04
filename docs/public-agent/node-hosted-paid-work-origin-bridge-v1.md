# VOID Node-Hosted Paid-Work Origin Bridge v1

Marker: `VOID_NODE_HOSTED_PAID_WORK_ORIGIN_BRIDGE_V1`

## Decision

`voidchain.io` is a replaceable legacy DNS alias and is not a prerequisite for
authenticated paid-work submission.

The canonical public origin remains the currently proven node-hosted HTTPS seed:

```text
https://zoso-alienware-aurora-r7.taila47fd.ts.net
```

The domain name does not define network identity. VOID identity remains bound to
reviewed source, node proofs, signed manifests, credential registries, request
hashes, and exact runtime receipts.

## Exact public route

The public composition gateway may expose only:

```text
GET|HEAD|POST /__void/agents/paid-work/submissions/v1
```

The route forwards to one explicitly configured loopback-only AI-agent gateway.
No generic `/__void/agents` proxy is added.

Every edge response carries:

```text
X-Void-Agent-Paid-Work-Submission-Route: v1
X-Void-Node-Hosted-Paid-Work-Origin-Bridge: v1
```

## Cross-box topology

The intended topology keeps both private services loopback-only:

```text
public HTTPS seed
  -> Alienware composition gateway
  -> 127.0.0.1:4113 SSH local forward
  -> Precision 127.0.0.1:4112 AI-agent gateway
  -> Precision 127.0.0.1:4187 paid-work receiver
```

The SSH forward is an inactive example only. Its target, host key, installation,
enablement, start, and health verification require a separate deployment
authorization.

## Public-edge enforcement

Before forwarding POST, the composition edge independently requires:

- exact path with no query string;
- `application/json`;
- bounded request body;
- exact bearer syntax;
- exact `x-void-payload-sha256`;
- SHA-256 equality with the forwarded body;
- valid JSON;
- no redirects;
- bounded upstream response;
- stripped `Location`, `Set-Cookie`, and `WWW-Authenticate`.

GET and HEAD are allowed only as credential-free route probes. Other paths under
`/__void/agent*` remain blocked.

## Disabled-by-default boundary

The edge is unavailable unless this exact environment variable is installed:

```text
VOID_AI_AGENT_GATEWAY_UPSTREAM=http://127.0.0.1:4113
```

Only an exact loopback HTTP origin with an explicit port is accepted.

## Separate future stages

This source lane performs no deployment. Later stages remain independently
authorized:

1. commit, push, and pull request;
2. merge;
3. immutable release preparation;
4. pinned SSH-forward installation on Alienware;
5. composition-gateway drop-in installation;
6. service restarts;
7. public credential-free preflight;
8. fresh canary prerequisite preparation;
9. exactly one authenticated canary submission.

Credential issuance never authorizes submission. A prepared prerequisite never
authorizes submission.

## Prohibited in this lane

This lane performs no:

- commit, push, pull request, or merge;
- deployment or service restart;
- SSH-forward installation or activation;
- Tailscale Funnel mutation;
- DNS or registrar mutation;
- credential or token read;
- Authorization materialization with a live credential;
- replay reservation;
- one-shot lease write;
- authenticated POST;
- payment, Work Credit write, wallet access, signing, or money movement.
