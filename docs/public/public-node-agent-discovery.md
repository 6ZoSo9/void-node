# VOID Public Node Agent Discovery <!-- VOID_PUBLIC_NODE_AGENT_DISCOVERY_DOC_V1 -->

Well-known public JSON route for agents, testers, and UIs to discover a VOID public node.

## Route

    /.well-known/void-public-node.json

## Purpose

This route gives agents one obvious entrypoint for discovering:

- public node page
- route manifest
- self-check snapshot
- outside tester smoke command
- tester bundle
- result receipt
- public proofs

## Protocol

    void-public-node-discovery-v1

## Expected status

    public_node_agent_discovery_ready

## Safety boundary

This route is public-route and read-only.

It does not call private APIs, mutate state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, or mutate validators.
