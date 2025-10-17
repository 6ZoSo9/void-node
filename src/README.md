# Void Node (pre-voidchain)

This is a minimal, fast iteration node:
- Signed TCP gossip (HELLO, SUB, PUB, PEERS)
- Content-addressed blobs (any size) with local storage under `data/blobs/`
- Simple mempool + block assembler (publishes to pubsub + `data/blocks/`)
- HTTP API + CLI

## Why
Breaks EVM’s 24MB contract limit and chain bloat by moving heavy data off-chain, but keeps speed & security by signing announcements and (later) committing compact roots on-chain / in consensus.

## Quick start (2 nodes)
Terminal A:
```bash
HTTP_PORT=4101 P2P_PORT=4701 KEY_FILE=.nodekey-A BOOTSTRAP=127.0.0.1:4702 npm run dev
