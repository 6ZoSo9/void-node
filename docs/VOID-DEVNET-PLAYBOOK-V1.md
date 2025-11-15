# VOID Devnet Playbook – v1 (2025-11-14)

This document explains how to run the VOID devnet stack locally,
deploy core contracts, and verify protocol state.

For now, use these scripts:
- ops/void-devnet-stack.sh              # tests + deploy + premine verify
- ops/void-devnet-bootstrap-protocol.sh # write protocol snapshot JSON
- ops/void-devnet-protocol-verify.sh    # verify chainId + deployer vs snapshot

Key JSON files:
- docs/VOID-DEVNET-DEPLOY-ADDRESSES.json
- docs/VOID-DEVNET-PROTOCOL-STATE.json

This is a v1 stub; we will extend it as the devnet stack grows.
