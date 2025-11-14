# VOID Network – Protocol 6 Update Runbook (draft v1)

This runbook is the end-to-end flow for moving VOID to protocol 6 using:

- Off-chain manifest tooling:
  - ops/new-update-manifest.mjs
  - ops/update-manifest-hash.mjs
  - ops/update-ticket-print.mjs
  - ops/update-protocol-diff.mjs
- On-chain policy contract:
  - contracts/UpdateGate.sol
- Demo pipeline:
  - ops/updategate-propose-demo.sh

---

## 0. Preconditions

- UpdateGate deployed and address known:
  - CONTRACT=0x...
  - RPC_URL=...
- MasterKey + signer keys controlled by gatekeeper.
- v6 node binaries built and available.
- Legal + changelog for v6 drafted.

---

## 1. Generate v6 manifest (off-chain)

1. Go to repo root:

   cd ~/dev/void-node

2. Remove any previous temp manifest:

   rm -f /tmp/update-manifest-v6.json

3. Generate v6 manifest with minCompat=5:

   node ops/new-update-manifest.mjs 6 5 > /tmp/update-manifest-v6.json

4. Sanity check the head:

   sed -n '1,40p' /tmp/update-manifest-v6.json

5. Compute manifestHash (what UpdateGate stores):

   node ops/update-manifest-hash.mjs /tmp/update-manifest-v6.json

---

## 2. Print EIP-712 tickets for signers

1. Normal update ticket:

   node ops/update-ticket-print.mjs /tmp/update-manifest-v6.json

2. Emergency update ticket:

   node ops/update-ticket-print.mjs /tmp/update-manifest-v6.json --emergency

---

## 3. Demo: propose update via helper pipeline

1. Normal demo:

   ./ops/updategate-propose-demo.sh 6 5

2. Emergency demo:

   ./ops/updategate-propose-demo.sh 6 5 --emergency

This prints the manifest head, manifestHash, EIP-712 ticket, and a sample proposeUpdate(...) call.

---

## 4. Node-side protocol policy (pinned vs target)

Example: node pinned at protocol 5 while manifest is 6.

### 4.1 Pin node policy via systemd env

1. Drop-in for void-node.service:

   mkdir -p ~/.config/systemd/user/void-node.service.d

   tee ~/.config/systemd/user/void-node.service.d/45-update-protocol.conf >/dev/null <<'INI'
[Service]
Environment=VOID_PROTOCOL_VERSION=5
Environment=VOID_UPDATE_POLICY=pinned
INI

2. Reload and restart:

   systemctl --user daemon-reload
   systemctl --user restart void-node.service

### 4.2 Compute diff vs manifest and emit Prom textfile

1. Use update-protocol-diff:

   TFD=/var/lib/node_exporter/textfile_collector
   TEXTFILE_DIR="$TFD" node ops/update-protocol-diff.mjs 5 /tmp/update-manifest-v6.json --write-prom

2. Verify textfile:

   ls -l "$TFD"/void_update_protocol.prom

This writes metrics like:

- void_update_protocol_local
- void_update_protocol_target
- void_update_protocol_diff
- void_update_policy

ready for node_exporter’s textfile collector.

---

## 5. Periodic metrics

Use:

- ops/update-protocol-metrics.sh
- void-update-protocol-metrics.service
- void-update-protocol-metrics.timer

to refresh void_update_protocol.prom every few minutes via systemd.

---

## 4. Monitoring this node’s protocol status

The node exports its current vs target protocol via a textfile collector:

- Raw metrics (node_exporter):
  - `void_update_protocol_diff`
  - `void_update_protocol_local`
  - `void_update_protocol_target`

Prometheus recording rules (see `/etc/prometheus/void-update-protocol-rules.yml`):

- `void:update_protocol:diff`
- `void:update_protocol:local`
- `void:update_protocol:target`
- `void:update_protocol:outdated` (1 when this node is behind)
- `void:update_protocol:ahead` (1 when this node is ahead)

Alerting (see `/etc/prometheus/alerts/void-update-protocol.yml`):

- `VoidNodeProtocolOutdated` (warning when `void:update_protocol:outdated > 0` for 10m)
- `VoidNodeProtocolAhead` (critical when `void:update_protocol:ahead > 0` for 5m)
