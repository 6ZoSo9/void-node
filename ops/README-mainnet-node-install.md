# VOID Mainnet — Node Install & Runbook (Draft)

This document describes how a *third-party validator/operator* should install and run a VOID node
for mainnet. It is written from the perspective of a packaged release (tarball, .deb, etc.), even
though right now we are still in dev.

No scripts are executed by this file itself. It is documentation only.

---

## 1. What this node is (and is not)

- This node is a **VOID mainnet core node**:
  - Validates blocks.
  - Participates in consensus (when configured as a validator).
  - Exposes health/metrics endpoints that match our internal SLOs.

- It is **not**:
  - A wallet (Obelisk handles wallet UX).
  - A random fork with custom logic (core is frozen by UpdateGate/AdminGate).
  - A magic “click once and get rich” miner.

Operators should assume:
- chainId = **2050**
- Token = **VOID** (symbol `$VOID`, VoidStones)
- Genesis + config files are shipped with the release.

---

## 2. High-level install shape (target state)

The target UX for a mainnet operator:

1. Download a signed release:
   - E.g. `void-node-mainnet-<version>-linux-x64.tar.gz`
   - Or a distro-specific package (`.deb`, `.rpm`, etc.).
2. Verify signatures:
   - Check detached signature against our release key.
   - Optionally verify checksums.
3. Install binaries + configs into:
   - `/usr/local/bin/void-node` (or distro equivalent).
   - `/etc/void/mainnet/` for config (read-only).
4. Create data dir:
   - `/var/lib/void/mainnet/` (or user-level `$HOME/.void/mainnet/` for small setups).
5. Start via systemd:
   - `void-node-mainnet.service` (or user-level unit).
6. Verify health:
   - `curl http://127.0.0.1:4100/head.txt`
   - `curl http://127.0.0.1:4100/health/txroot3?format=prom`
   - `curl http://127.0.0.1:4100/metrics/void/head`

This doc will eventually match whatever the real packaging story becomes. For now, it is the design.

---

## 3. Ports and endpoints (mainnet core)

Default mainnet core node expectations:

- HTTP API (metrics + JSON):
  - `http://127.0.0.1:4100`
- P2P:
  - `4700` (exact transport details will be finalized in mainnet config).

Key endpoints an operator should know:

- `GET /head.txt`
  - Returns latest persisted block height (plain text).
- `GET /metrics/void/head`
  - Prometheus text; gauge `void_head_number`.
- `GET /health/txroot3?format=prom`
  - TxRoot health; gauge `void_txroot_health`.
- Other internal exporters (may be read-only for operators):
  - TxRoot core (`/__void/metrics/txroot4/core2.json`, etc.).
  - Header3 (`/__void/metrics/header3.prom`).
  - Seals (`/metrics/void/seals`).
  - Proposer (`/metrics/void/proposer.v3b.prom`).

Mainnet docs will expose a stable subset; the rest remains for power users and SREs.

---

## 4. Minimal “I just want a non-validator node” checklist

For a simple full node (non-validator):

1. Install the release (tarball or package).
2. Ensure a dedicated user:
   - Example: `void` system user with limited permissions.
3. Create data dir (owned by `void` user), e.g.:
   - `/var/lib/void/mainnet/`
4. Ensure config points at mainnet:
   - ChainId 2050.
   - Seed peers from the official bootstrap list.
5. Start the service:
   - `systemctl enable --now void-node-mainnet.service`
6. Verify:
   - `/head.txt` returns a non-zero height after some time.
   - `void_head_number` increases over time.
   - txroot/header3/seals health are OK in Prometheus.

This mode is suitable for:
- Users who want to query the chain.
- Light infra for wallets or dApps.
- Future Obelisk “trusted RPC” endpoints.

---

## 5. Validator node expectations (high-level)

For validator operators, the main differences versus a plain full node:

- Same base install and ports, plus:
  - Node must be stable under load.
  - Node must keep up with head (low drift).
- Tied into the validator identity:
  - Consensus key configured on this node.
  - Reward address managed via Obelisk wallet.
- Integrated with monitoring:
  - Prometheus scraping all key exporters.
  - Alerts (or Obelisk notifications) for:
    - Node down.
    - High drift.
    - Missed blocks.

The detailed validator flow is in:
- `ops/README-mainnet-keys-and-devices.md`
- `ops/README-mainnet-validator-quickstart.md`
- `ops/obelisk-validator-ux-checklist.sh` (scripted checklist)

This install doc focuses on the node itself, not keys.

---

## 6. Security expectations for install

When we ship real releases, operators should expect:

- Signed artifacts:
  - Release binaries signed via Sigstore / cosign or equivalent.
  - Checksums published on official channels.
- Minimal dependencies:
  - Single static binary or a narrow set of libs.
- Predictable config layout:
  - Read-only genesis and network config under `/etc/void/mainnet/`.
  - Writable data dir under `/var/lib/void/mainnet/` (or user-level equivalent).

We will provide:
- Example systemd units.
- Example Prometheus scrape configs.
- Example Grafana dashboards.

Operators MUST:
- Avoid running the node as `root` unnecessarily.
- Restrict firewall ports (only expose P2P where needed).
- Treat node machines as sensitive infra.

---

## 7. Planned future additions

Later, we expect to extend this doc with:

- Exact package names and download URLs.
- Example `systemd` unit files for:
  - Mainnet node.
  - Optional follower or canary nodes.
- Recommended hardware profiles:
  - Minimal spec for non-validator nodes.
  - Suggested spec for validators (CPU, RAM, SSD, network).
- Official bootstrap peers and snapshots.
- Integration tips for:
  - Obelisk Wallet (Titan/Mobile).
  - NullFeed and other VOID dApps.

Until mainnet is closer, this remains a draft design aligned with our current mainnet-core and pillars work.
