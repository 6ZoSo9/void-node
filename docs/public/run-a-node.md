# Run a VOID node

<!-- VOID_PUBLIC_RUN_A_NODE_CURRENT_STATE_V2 -->

This guide starts a standard VOID node for local participation and read-only public verification.

Running a node does not automatically grant validator, wallet, Work Credit coordinator, Buy VOID fulfillment, or treasury authority.

## Requirements

Recommended environment:

- Ubuntu 24.04 LTS or a comparable Linux distribution.
- Windows 11 with WSL2 is also supported for development.
- Node.js 22.
- Git.
- At least 8 GB RAM.
- Persistent disk space for chain and DataNet state.
- Stable network access.

## Install

```bash
git clone https://github.com/6ZoSo9/void-node.git
cd void-node
npm ci
cp .env.example .env
npm run build
```

Review `.env.example` before changing configuration.

Common settings:

```text
DATA_DIR
HTTP_PORT
P2P_PORT
BOOTSTRAP_ADDRS
```

Keep secrets out of shell history, screenshots, issue reports, and public receipts.

## Start

```bash
npm start
```

The default local HTTP endpoint is normally:

```text
http://127.0.0.1:4100
```

Check readiness:

```bash
curl -fsS http://127.0.0.1:4100/__void/ready.json
```

Healthy readiness should report:

```text
ready=true
gap=0
txroot_live=1
```

Check public discovery:

```bash
curl -fsS http://127.0.0.1:4100/.well-known/void-public-node.json
```

## Public exposure

Public exposure is optional.

When exposing the public-node surface, provide the exact external base URL that testers should copy:

```bash
PUBLIC_NODE_EXTERNAL_BASE_URL=https://your-node.example npm start
```

Begin external review at:

```text
https://your-node.example/public-node
```

Only expose documented public routes. Do not publish private RPC, signer, wallet, operator mutation, Work Credit award, settlement, validator mutation, Buy VOID fulfillment, or treasury routes.

Use a reverse proxy, TLS, host firewall, and service isolation appropriate to your environment.

## Produce operator evidence

Create a dedicated operator attestation key. Do not reuse a wallet key, validator key, treasury key, or account key.

Then run:

```bash
node tools/public-node-operator-evidence-workflow-v1.mjs \
  --base https://your-node.example \
  --expected-peer-count 2 \
  --output-dir "$HOME/void-operator-evidence" \
  --operator-id your-operator-id \
  --node-key your-public-node-key \
  --private-key "$HOME/.config/void/operator-keys/your-key.ed25519"
```

A successful workflow should report:

```text
status=green
gate=passed
attestation_created=true
attestation_verified=true
mutation_attempted=false
```

The workflow creates permission-restricted files and recursive checksums. Review the output before sharing it.

See [public-node operator evidence workflow](../public-node/public-node-operator-evidence-workflow-v1.md).

## Join as a Work Credit executor

Executor participation is separate from merely running a node.

A coordinator must issue a capability-bound ticket. The executor performs the requested work and returns a receipt. The coordinator verifies the receipt before any award is written.

There is no public generic-credit route.

## Validator boundary

A healthy node is not automatically a validator.

Public validator registration remains candidate/waiting only. Active admission requires separate policy, stake, identity, readiness, and operator approval. Active admission is currently disabled.

## Updating safely

Use a clean checkout or isolated worktree for changes.

Before updating a live service:

1. Fetch the intended revision.
2. Review release and migration notes.
3. Build and run targeted proofs.
4. Confirm data-directory ownership and backups.
5. Restart only when the change actually requires it.
6. Recheck PID, restart count, readiness, head, gap, and peers.

Documentation-only work does not require a node restart.

## Help

- [Support guide](../../SUPPORT.md)
- [Security policy](../../SECURITY.md)
- [Developer reference](developer-reference.md)
- [Current capability matrix](current-capability-matrix.md)
