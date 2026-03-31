# VOID Node — Second Machine Onboarding Runbook

This runbook captures the currently proven path for bringing up a second box
like Alienware as a working remote node/helper/relayer participant.

## Intended role

Current proven remote role:

- node HTTP: `4100`
- node P2P: `4700`
- helper: `4312`
- relayer: `4313`
- local anvil/devnet RPC: `8545`

This role is **not** the same as the full isolated beta-proof box.
Do not expect:

- isolated node on `4110`
- full `make beta-proof`
- local manifest-backed DataNet proof unless data has been reseeded

## Proven prerequisites

- repo present at `~/dev/void-node`
- SSH access works from Precision
- Node.js **22.x** installed
- user unit `void-node.service` installed
- helper / relayer / anvil available locally on the second box
- updater scripts available:
  - `ops/alienware-bootstrap-node-helper-relayer.sh`
  - `ops/alienware-update-node-helper-relayer.sh`
  - `ops/alienware-remote-update.sh`

## Fast path

From the primary box (Precision), after pushing current `main`:

    bash ops/alienware-remote-update.sh

That should:

- fetch/reset remote repo to `origin/main`
- install deps
- stop service
- clear stale `4100/4700` holders
- restart
- verify node/helper/relayer/anvil role health

## First-time bootstrap path

On the remote box directly:

    bash ops/alienware-bootstrap-node-helper-relayer.sh

Expected pass conditions:

- `/health` returns ok
- `/participant` loads
- helper `/pool.json` responds
- relayer `/health` responds
- RPC `eth_chainId` responds
- listeners exist on `4100`, `4700`, `4312`, `4313`, `8545`

## If the node "listens" but HTTP hangs

This happened before and the real cause was stale/conflicting live processes.

Use the role updater or do the equivalent manually:

    systemctl --user stop void-node.service || true
    for p in 4100 4700; do fuser -k "${p}/tcp" || true; done
    systemctl --user restart void-node.service

Then recheck:

    curl -fsS http://127.0.0.1:4100/health
    curl -fsS http://127.0.0.1:4100/participant >/dev/null && echo ok

## If the second box stays at head -1

That means peer connectivity alone is not enough; the box may still be empty.

Symptoms observed in the broken state:

- `/health` ok
- peer connected
- `/head.txt` => `-1`
- `/blocks/latest/number2.json` => `{"number":-1,...}`

In that case, reseed the remote `data_a` from Precision.

## Proven reseed procedure

From Precision:

    ALIEN="zoso@100.122.79.39"

    ssh "$ALIEN" 'timeout 12s systemctl --user stop void-node.service || true'
    ssh "$ALIEN" 'cd "$HOME/dev/void-node" && TS="$(date +%Y%m%d-%H%M%S)" && [ -d data_a ] && mv data_a "data_a.bak.$TS" || true && mkdir -p data_a && ls -ld data_a*'

    rsync -av --delete \
      "$HOME/dev/void-node/data_a/" \
      "$ALIEN:/home/zoso/dev/void-node/data_a/"

    ssh "$ALIEN" 'bash -lc '"'"'
    set -euo pipefail
    systemctl --user restart void-node.service
    sleep 8
    curl -fsS --max-time 6 http://127.0.0.1:4100/head.txt
    echo
    curl -fsS --max-time 6 http://127.0.0.1:4100/health
    echo
    curl -fsS --max-time 6 http://127.0.0.1:4100/__void/ready.json || true
    '"'"''

## Proven post-reseed verification

From Precision:

    PH="$(curl -fsS --max-time 6 http://127.0.0.1:4100/head.txt | tr -d '\r\n')"
    AH="$(ssh zoso@100.122.79.39 'curl -fsS --max-time 6 http://127.0.0.1:4100/head.txt' | tr -d '\r\n')"
    echo "precision_head=$PH"
    echo "alienware_head=$AH"
    python3 - <<'PY' "$PH" "$AH"
    import sys
    p=sys.argv[1].strip()
    a=sys.argv[2].strip()
    try:
        print(f"head_gap={int(p)-int(a)}")
    except:
        print("head_gap=unknown")
    PY

Expected good state:

- both heads equal
- `head_gap=0`

## Ready-state verification

Current known-good readiness check on both boxes:

    curl -fsS http://127.0.0.1:4100/__void/ready.json

Expected good output shape:

    {"ready":true,"head":1607,"lastmile_seen":1607,"gap":0,"txroot_live":1,"reasons":[]}

Exact numbers will vary, but the key is:

- `ready: true`
- `gap: 0`
- `txroot_live: 1`

## Known important fix already baked into current main

Readiness used to stay false because `__void/ready.json` read txroot liveness from the older
`/health/txroot3/live.prom` path. Current `main` now prefers:

- `/health/txroot3?format=prom`

with `live.prom` only as fallback.

If a second box is synced at head parity but still shows:

- `ready:false`
- `txroot_live:0`

make sure it is updated to current `main` first.

## Role updater safety markers

Current role updaters now write snapshot markers to:

- `/tmp/void-update-snapshots/precision-update-last-head.txt`
- `/tmp/void-update-snapshots/alienware-update-last-head.txt`

They also print a rollback hint like:

    git reset --hard <old_head>

## Current recommended commands

Precision local updater:

    bash ops/precision-update-node.sh

Alienware direct updater:

    bash ops/alienware-update-node-helper-relayer.sh

Alienware remote updater from Precision:

    bash ops/alienware-remote-update.sh

## Summary

The currently proven second-machine bring-up order is:

1. update remote box to current `main`
2. ensure Node 22.x
3. clear stale `4100/4700` holders
4. verify node/helper/relayer role health
5. if head is `-1`, reseed `data_a`
6. verify head parity
7. verify `ready:true`

Do not skip reseed when the remote box is empty.
Peer connectivity alone does not guarantee state.
