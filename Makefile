.RECIPEPREFIX := >
PROPOSER ?= http://127.0.0.1:4100
FOLLOWER ?= http://127.0.0.1:4101

.PHONY: build up proposer follower seal follow-once tx lookup status receipts kidx-all kidx-block kidx-hash hello-now stop

build:
> npm run build

up:
> bash scripts/boot.sh up

proposer:
> bash scripts/boot.sh proposer

follower:
> bash scripts/boot.sh follower

seal:
> bash scripts/boot.sh seal

follow-once:
> bash scripts/boot.sh once

tx:
> bash scripts/boot.sh tx

lookup:
> bash scripts/boot.sh lookup

status:
> curl -sS $(FOLLOWER)/sync/status | jq .

receipts:
> bash scripts/boot.sh rcpt

kidx-all:
> curl -sS -X POST $(FOLLOWER)/index/kidx/build | jq .

kidx-block:
> test -n "$(BLOCK)" || (echo "usage: make kidx-block BLOCK=<number>"; exit 1)
> curl -sS -X POST "$(FOLLOWER)/index/kidx/rebuild-shard?block=$(BLOCK)" | jq .

kidx-hash:
> test -n "$(HASH)" || (echo "usage: make kidx-hash HASH=<64-hex>"; exit 1)
> curl -sS -X POST "$(FOLLOWER)/index/kidx/rebuild-shard?hash=$(HASH)" | jq .

hello-now:
> curl -sS $(PROPOSER)/p2p/hello-now | jq .
> curl -sS $(FOLLOWER)/p2p/hello-now | jq .

stop:
> bash scripts/boot.sh stop
