# DataNet field replication safe serve runbook v1

Status: repeatable operator runbook.

Purpose: repeat the proven source-node to field-node DataNet replication loop using the repository safe serve command, not a generic Python HTTP server.

## Boundaries

This runbook is public-safe and read-only.

It does not enable wallet movement, WC settlement, validator admission, public mutation routes, ledger writes, automatic rewards, or secret handling.

The safe serve command serves only the repository `public/` directory.

## Required values

Replace these placeholders with the active private tailnet addresses:

- Source node public serve base: `http://<source-tailnet-ip>:8088`
- Field node mirror serve base: `http://<field-tailnet-ip>:8089`

Do not publish private tailnet addresses in public status cards.

## 1. Source node: start safe public serve

```bash
cd ~/dev/void-node
git checkout main
git fetch origin main --tags
git pull --ff-only origin main

(lsof -t -iTCP:8088 -sTCP:LISTEN 2>/dev/null | xargs -r kill) || true

nohup npm run public-node:serve -- --port 8088 \
  > /tmp/void-public-node-safe-serve-8088.log 2>&1 &

echo $! > /tmp/void-public-node-safe-serve-8088.pid
sleep 1
cat /tmp/void-public-node-safe-serve-8088.log

Expected:

VOID_PUBLIC_NODE_SAFE_SERVE_V1_GREEN
VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY
dangerous_paths_touched=false
2. Field node: start safe public serve
cd ~/dev/void-node
git checkout main
git fetch origin main --tags
git pull --ff-only origin main

(lsof -t -iTCP:8089 -sTCP:LISTEN 2>/dev/null | xargs -r kill) || true

nohup npm run public-node:serve -- --port 8089 \
  > /tmp/void-public-node-safe-serve-8089.log 2>&1 &

echo $! > /tmp/void-public-node-safe-serve-8089.pid
sleep 1
cat /tmp/void-public-node-safe-serve-8089.log

Expected:

VOID_PUBLIC_NODE_SAFE_SERVE_V1_GREEN
VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY
dangerous_paths_touched=false
3. Field node: run replication runner
cd ~/dev/void-node

VOID_NETWORK_HINT=cellphone-data+tailscale npm run datanet:field-replication:run -- \
  http://<source-tailnet-ip>:8088 \
  http://<field-tailnet-ip>:8089

Expected:

VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN
host=<field-node-hostname>
next_roundtrip=...

Copy the printed next_roundtrip= command.

4. Source node: verify field mirror

Run the printed roundtrip command on the source node.

Expected:

VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN
match=true

Then run:

VOID_NETWORK_HINT=precision-to-field-tailnet npm run void:field-report

Expected:

VOID_FIELD_REPORT_V1_READY
Proven marker set
VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY
VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN
VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN
VOID_FIELD_REPORT_V1_READY
Stop conditions

Stop and inspect before continuing if:

host= shows the wrong machine
dangerous_paths_touched is not false
roundtrip verification does not return match=true
safe serve is not serving from public/
any command tries to touch wallet, WC settlement, validator admission, mutation route, or ledger write paths
