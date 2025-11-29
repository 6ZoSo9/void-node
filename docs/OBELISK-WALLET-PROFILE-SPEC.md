# OBELISK Wallet Network Profile Spec (VOID)

This document defines how OBELISK wallets (Lite, Mobile, Titan) discover and
trust a VOID network using:

- A JSON "network profile" file, and
- A small set of Prometheus metrics exported by a VOID node.

It is the contract between:

- VOID node operators (who publish a profile and metrics), and
- OBELISK wallet implementations (browser, phone, desktop).

All examples below use the VOID devnet-local environment (chainId 2050).


## 1. Goals

1. Provide a single source of truth for a "network profile"
   (name, chainId, RPC URLs, health URLs).
2. Allow wallets to sanity-check the chain via metrics before trusting it:
   - heads advance,
   - txroot3 health is OK,
   - safeboot fallback exists.
3. Make the profile and metrics easy to generate from a running node and
   easy to monitor via Prometheus and Alertmanager.


## 2. Profile JSON schema

File pattern:

  config/obelisk-mainnet-profile.<env>.json

Current devnet example:

  config/obelisk-mainnet-profile.dev.json

### 2.1. Example structure

The profile JSON SHOULD look conceptually like this:

  {
    "name": "VOID Devnet (Local)",
    "network": "void-devnet-local",
    "chainId": 2050,

    "rpc": {
      "main": "http://127.0.0.1:4100",
      "safeboot": "http://127.0.0.1:4104"
    },

    "health": {
      "txroot_main": "http://127.0.0.1:4100/health/txroot3?format=prom",
      "txroot_safeboot": "http://127.0.0.1:4104/health/txroot3?format=prom"
    },

    "meta": {
      "version": 1,
      "environment": "devnet-local",
      "notes": "Local devnet profile for OBELISK wallets."
    }
  }

Required fields for a valid profile:

- name (string)
- network (string)
- chainId (number)
- rpc.main (string URL)
- health.txroot_main (string URL)

Strongly recommended:

- rpc.safeboot
- health.txroot_safeboot
- meta.version, meta.environment

OBELISK wallets MUST refuse to auto-connect if any required field is missing
or if chainId does not match what the node reports at runtime (via eth_chainId).


## 3. Exported metrics

The exporter writes a textfile for node_exporter:

  /var/lib/node_exporter/textfile_collector/void_obelisk_profile.prom

This file contains gauges such as:

- void_obelisk_profile_health
- void_obelisk_profile_chainid
- void_obelisk_profile_head_main
- void_obelisk_profile_head_safeboot
- void_obelisk_profile_txroot_main_ok
- void_obelisk_profile_txroot_safeboot_ok

Prometheus also defines a recording rule:

- void:obelisk_profile_health:last_5m

which smooths the raw health over a 5-minute window.


### 3.1. Metric semantics

1) void_obelisk_profile_health

Example:

  void_obelisk_profile_health 1

Meaning:

- 1 = profile JSON parsed OK and basic RPC/txroot checks succeeded.
- 0 = profile is broken or checks failed.

This is the raw "instant" health.


2) void:obelisk_profile_health:last_5m

Example:

  void:obelisk_profile_health:last_5m 1

Meaning:

- 1 = the profile has been healthy in the last 5 minutes (smoothed).
- This is what Alertmanager uses for the VoidObeliskProfileUnhealthy alert.
- For preflight gates and dashboards, this is the main scalar we care about.


3) void_obelisk_profile_chainid

Example:

  void_obelisk_profile_chainid 2050

Meaning:

- chainId value extracted from the profile JSON.
- OBELISK wallets MUST cross-check this with eth_chainId from the RPC.


4) void_obelisk_profile_head_main

Example:

  void_obelisk_profile_head_main 812066

Meaning:

- Last known head from rpc.main when the exporter last ran.
- Monotonic under normal operation.
- Can be stale if the node is down; Prometheus keeps the last sample.


5) void_obelisk_profile_head_safeboot

Example:

  void_obelisk_profile_head_safeboot 231260

Meaning:

- Same as head_main, but for rpc.safeboot.


6) void_obelisk_profile_txroot_main_ok and void_obelisk_profile_txroot_safeboot_ok

Example:

  void_obelisk_profile_txroot_main_ok 1
  void_obelisk_profile_txroot_safeboot_ok 1

Meaning:

- 1 = health endpoint returned void_txroot_health 1.
- 0 = endpoint missing or health bad.

OBELISK wallets can rely on these booleans instead of parsing Prometheus text.


## 4. OBELISK Wallet boot sequence (conceptual)

When a wallet wants to attach to a VOID network described by this profile:

1) Fetch or embed the profile JSON

- Devnet: bundled in the app or loaded from a trusted local path
  (config/obelisk-mainnet-profile.dev.json).
- Mainnet: shipped with the app and optionally updated via a signed
  manifest or similar mechanism.

2) Basic sanity checks

- Ensure chainId in the JSON is correct for the intended network (e.g. 2050).
- Ensure rpc.main is a valid URL.
- Optionally, ensure rpc.safeboot is present for safe-mode operation.

3) Ping the node

- Call eth_chainId on rpc.main.
- If mismatch with profile chainId, refuse to connect.
- If main is down, optionally fall back to rpc.safeboot in read-only mode.

4) Check txroot3 health

- Call health.txroot_main (e.g. /health/txroot3?format=prom).
- Require HTTP 200 and a body containing void_txroot_health 1.
- If missing or non-healthy, the wallet should:
  - warn the user, and/or
  - fall back to safeboot (if available), or
  - refuse to enable validator mode.

5) Optional: JSON facade instead of Prometheus

A node or sidecar can expose a simple JSON facade that wraps the metrics,
for example:

  {
    "profileHealth": 1,
    "chainId": 2050,
    "headMain": 812066,
    "headSafeboot": 231260,
    "txrootMainOk": 1,
    "txrootSafebootOk": 1
  }

OBELISK wallets can then read this single JSON document and avoid any
direct Prometheus parsing.


## 5. Safeboot and validator mode for phones

OBELISK wallets on phones can operate in two modes:

1) Normal client mode

- Uses rpc.main for reads and writes.
- Uses safeboot only if main is unavailable.
- Still checks basic txroot3 health before showing the network as "OK".

2) Validator or "mini-server" mode

Enabled only if:

- void:obelisk_profile_health:last_5m == 1, and
- void_obelisk_profile_txroot_main_ok == 1, and
- void_obelisk_profile_txroot_safeboot_ok == 1 (recommended).

In this mode the wallet:

- May run a lightweight validator or agent loop (future layer),
- Treats txroot3 and safeboot as sources of truth for safety,
- Refuses to continue if health drops (future behavior, tied to metrics).


## 6. Future extensions

The profile JSON can be extended later with:

- features: booleans for chain-side capabilities
  (supportsAgents, supportsNullFeed, etc.).
- fees: suggested gas price bands or fee policies.
- explorer: URLs for block explorers, NullFeed frontends, etc.
- validators: optional bootstrap set of known validator identities.

The current minimum contract is:

- Profile JSON: name, network, chainId, rpc.main, health.txroot_main;
- Optional rpc.safeboot and associated health;
- Obelisk metrics: void_obelisk_profile_* plus
  void:obelisk_profile_health:last_5m;
- Wallet boot and health rules as described above.

This is enough for OBELISK wallets to safely talk to VOID without needing to
know any internal details of the node or Prometheus.
