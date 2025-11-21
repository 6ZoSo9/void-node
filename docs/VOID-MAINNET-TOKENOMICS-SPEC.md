# VOID Mainnet – Tokenomics Health Spec (v0)

This file defines what the Prometheus gauge **`void_mainnet_tokenomics_health`** means.

It is **not** about price, profit, or “number go up”. It is a binary safety/consistency bit:

- `1` = tokenomics config is present, parseable, and internally consistent on basic invariants.
- `0` = something is missing, corrupted, or violates hard invariants.

This gauge is for:

- Ops / SRE: “is our mainnet tokenomics config sane and in-sync?”
- Alerting: “do not consider VOID mainnet fully healthy if tokenomics health = 0.”
- On-call humans: a single place to see if tokenomics config is broken.

It is **not** a trading or market indicator.

---

## 1. Source of truth

Tokenomics health comes from a single JSON manifest:

- `docs/VOID-MAINNET-TOKENOMICS-MANIFEST.json`

At the monitoring layer, this manifest is the only source of truth for expected
tokenomics parameters. The chain and contracts remain the actual execution
source of truth.

The manifest is versioned and committed in git.

---

## 2. Manifest schema (v0)

The manifest MUST be valid JSON with at least these fields:

- `chainId` (number)
  - MUST be `2050` for VOID mainnet.
- `symbol` (string)
  - MUST be `"VOID"`.
- `decimals` (number)
  - MUST be `18`.
- `version` (string)
  - Non-empty tag like `"v0-mainnet"`.

- `supply` (object)
  - `genesisTotal` (string, wei as decimal text)
  - `maxSupply` (string, wei as decimal text; may be same as genesisTotal or higher).

- `addresses` (object)
  - `token` (string, 0x-prefixed, main ERC-20 token, once known)
  - `treasury` (string, 0x-prefixed, protocol treasury / DAO)
  - `operator` (string, 0x-prefixed, operator / foundation, if any)

- `policy` (object)
  - `mintingAllowed` (boolean)
  - `burningAllowed` (boolean)
  - `notes` (string, free-form)

Notes:

- All big integer values are decimal strings (no hex, no floats).
- `"TODO"`-style sentinel values are allowed early, but MUST be driven out
  before real mainnet launch.
- Future schema versions (v1, v2, …) may add fields but must not break v0
  health checks that rely on the fields above.

---

## 3. Health evaluation (v0)

`void_mainnet_tokenomics_health` MUST be computed by a textfile exporter that:

1. Loads the manifest from:
   - `docs/VOID-MAINNET-TOKENOMICS-MANIFEST.json`

2. Performs **hard invariants**:
   - File exists and is readable.
   - JSON parses successfully.
   - `.chainId == 2050`
   - `.symbol == "VOID"`
   - `.decimals == 18`
   - `.version` is a non-empty string.

3. Optionally logs (but does not yet fail on) **soft invariants**:
   - `supply.genesisTotal` is a non-empty decimal string.
   - If `supply.maxSupply` is non-empty, it is a decimal number and
     `maxSupply >= genesisTotal`.
   - `addresses.token`, `addresses.treasury`, `addresses.operator` are
     non-empty 0x-prefixed hex strings once known.

In v0, the gauge MUST be:

- `1` if and only if all hard invariants above pass.
- `0` if:
  - The manifest is missing or unreadable, OR
  - JSON cannot be parsed, OR
  - `chainId != 2050`, OR
  - `symbol != "VOID"`, OR
  - `decimals != 18`, OR
  - `version` is empty or missing.

Soft invariants are WARN-level only for now and do not flip health to 0.

---

## 4. Metric contract

The exporter MUST emit exactly one gauge:

- Name:
  - `void_mainnet_tokenomics_health`

- Semantics:
  - `1` = tokenomics config present and passes all hard invariants.
  - `0` = missing/invalid manifest or failed hard invariant.

- Example exposition:

  - HELP line:
    `# HELP void_mainnet_tokenomics_health VOID mainnet tokenomics health (1=ok,0=bad)`

  - TYPE line:
    `# TYPE void_mainnet_tokenomics_health gauge`

  - Sample metric:
    `void_mainnet_tokenomics_health{chain="mainnet"} 1`

Recording rule (already in Prometheus):

- `void:mainnet_tokenomics:health:last_5m = max_over_time(void_mainnet_tokenomics_health[5m])`

Alerts MUST key off the recording rule, not the raw gauge, to avoid flapping.

---

## 5. Roadmap (v1+)

Later versions will tighten health to include on-chain checks, for example:

- Confirm the token contract at `addresses.token` exists on chainId 2050 and
  `decimals()` matches the manifest.
- Confirm `totalSupply()` at genesis height matches `supply.genesisTotal`.
- Confirm mint/burn permissions are consistent with `policy.mintingAllowed`
  and `policy.burningAllowed`.

Those checks will be added in v1+ and will be documented in an updated spec.
This v0 spec is intentionally minimal so that mainnet bootstrapping and early
tests do not flap the health bit while economics are still being tuned.
