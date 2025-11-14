# VOID Network – Update Manifest Lifecycle (v1)

This document defines the **off-chain manifest** that UpdateGate points to via
`manifestHash`. It complements `docs/UPDATE-GATE-CONTRACT.md`.

The goals:

- Every protocol update is described by a **canonical manifest**.
- Update signers only sign **one thing**: the manifest hash.
- Nodes can **decide** how aggressively to follow manifests (auto, prompt, or pin).
- The system stays **AI-centered**: manifests can describe model changes, dataset
  migrations, and agent-facing expectations – not just binaries.

---

## 1. Roles & Trust Model

- **MasterKey / AdminGate**
  - Controls the UpdateGate signer set and thresholds.
  - Can freeze/unfreeze _new_ updates.
  - Cannot roll protocol backwards or stop block production.

- **Update Signers (M-of-N)**
  - Human or org keys that approve protocol updates.
  - They never sign arbitrary blobs – they sign **manifest hashes**.

- **Release Operator(s)**
  - Build binaries, publish artifacts & manifests.
  - Prepare candidate manifest JSON for signers to review.

- **Node Operators**
  - Run void-node instances.
  - Choose update policy:
    - **Follow** UpdateGate automatically.
    - **Prompt** and manually apply updates.
    - **Pin** to an older protocol for a while (e.g. audits, custom infra).

---

## 2. Manifest Overview

Each protocol update is described by a **JSON manifest**.

- The contract only sees `bytes32 manifestHash`.
- Off-chain, we store & distribute the full JSON.
- Manifest JSON must be **deterministically encoded** before hashing.

High-level fields:

```jsonc
{
  "schemaVersion": 1,
  "app": "void-node",
  "protocol": {
    "version": 6,
    "minCompat": 5
  },
  "chain": {
    "chainId": 2050,
    "network": "void-mainnet"
  },
  "binaries": [
    {
      "os": "linux",
      "arch": "amd64",
      "kind": "node-binary",
      "url": "https://updates.voidchain.io/void-node/v6/void-node-linux-amd64",
      "sha256": "<hex>",
      "sig": "<optional detached sig over binary>"
    }
  ],
  "docker": [
    {
      "image": "registry.voidchain.io/void-node:v6",
      "digest": "sha256:<hex>"
    }
  ],
  "configHints": {
    "minNodeVersion": "v6.0.0",
    "recommendedFlags": [
      "--enable-wal-v1",
      "--enable-vector7-guard"
    ]
  },
  "activation": {
    "recommendedHeight": 123456,
    "earliestHeight": 123400,
    "emergency": false
  },
  "ai": {
    "models": [
      {
        "id": "void/agent-core-v3",
        "change": "upgraded",
        "registryRef": "model:void/agent-core@3",
        "requiresWarmup": true
      }
    ],
    "datasets": [
      {
        "id": "void/receipts-v1",
        "change": "schema-add-field",
        "notes": "adds 'policySnapshotHash' column"
      }
    ],
    "breakingBehaviour": false
  },
  "changelog": {
    "short": "Enables WAL v1 and Vector 7 guards; improves agent receipts.",
    "url": "https://docs.voidchain.io/changelog/v6"
  },
  "meta": {
    "createdAt": "2025-11-13T00:00:00Z",
    "createdBy": "release-ops@void",
    "ticket": "VOID-1234"
  }
}

