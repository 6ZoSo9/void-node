# VOID Network Security History and Key Rotation Report — Phase 1 Draft

**Status:** Substantially complete with one documented remote-coverage gap  
**Assessment date:** July 13, 2026  
**Historical scan baseline:** `e68848360d2d0d898f6f659daabc0a8e90ba4e7f`

## Purpose

This report documents the review of sensitive-looking files and token-like values that previously appeared in the public `void-node` Git repository.

The objective was not to claim that deleting files from the current tree erased them from Git history. Anything that contained real private material was treated as publicly exposed and required retirement, rotation, or current-state non-reuse verification.

This is a first-party security assessment. It is not an independent audit.

## Scope

The assessment covered:

- Reachable Git branches, remote refs, tags, and local reflogs
- Historical node-key, environment, backup, peerstore, identity, runtime-export, and journal paths
- Current effective node-key selection on Precision, Nimo, and Alienware
- Current private-key permissions and cross-machine key duplication
- Historical and current `AGENT_TOKEN` / `VOID_AGENT_TOKEN` fingerprints
- A redacted full-history Gitleaks scan
- Current tracked code paths that read agent-token environment variables

Historical values, private-key contents, and token contents were not printed in public-safe outputs.

## Historical inventory

The initial path inventory identified 21 paths requiring classification:

- 10 critical-category candidates
- 4 high-category candidates
- 7 medium-category candidates

These severity labels represented review priority, not automatic confirmation that every path contained a live credential.

## Confirmed historical sensitive material

### Node private keys

The following files contained historical private node-identity material:

- `.nodekey.b`
- `.nodekey.follower`

Because they entered public Git history, both keys are considered compromised and permanently retired.

### Agent tokens

Historical environment files contained one distinct long-hex value for each of:

- `AGENT_TOKEN`
- `VOID_AGENT_TOKEN`

The values appeared in `proposer.env` and `void.env`. They are treated as historically exposed.

## Material that was not a private credential

The review classified the following as non-credential material:

- `config/update-pubkey.v1.pem` and `ops/keys/update-pubkey.v1.pem`: public verification keys
- `.nodeid`, `.nodeid-A`, and `.nodeid-B`: public node identifiers
- `.peerstore.json`: operational peer metadata
- Chain export and catch-up NDJSON files: runtime chain data
- Txroot journals: diagnostic/runtime records
- `backup_20251023_035534.tgz`: segmented chain data only
- `NODE_PRIVKEY_PATH`, `VOID_NODE_KEY_A`, and `KEY_PATH`: filesystem path references, not key contents
- `JOBID`, `RID`, and `RPC` in the devnet receipt sample: sample metadata
- Ports, hosts, URLs, bootstrap addresses, intervals, flags, and data-directory settings: ordinary runtime configuration

The backup archive contained seven members under `data_a`, including block storage, a sparse index, metadata, and chain-head state. It contained no credential-named member.

## Current node-identity verification

The current effective node keys are:

- Precision: `nodeA.key`
- Nimo: `nodeB.key`
- Alienware: `nodeC.key`

Verification established that:

- All three selected keys are distinct.
- No selected key matches either historically exposed node key.
- All selected keys use owner-only `0600` permissions.
- No active node key is duplicated across machines.
- Nimo and Alienware expose distinct local node IDs.

### Alienware stale-key cleanup

Alienware previously contained unused copies of Precision's `nodeA.key` and `devnet-deployer.key`.

The cleanup:

- Removed the stale `nodeA.key` assignment from Alienware's base systemd unit.
- Preserved the active `nodeC.key` override.
- Performed one planned service restart.
- Confirmed Alienware retained the same local node ID.
- Removed both unused private-key copies.
- Confirmed no unexpected restart occurred.

This was logical file deletion. No forensic-erasure claim is made for SSD or copy-on-write storage.

## Current agent-token verification

### Precision

No current live process, systemd user-manager environment, tracked/untracked repository configuration, or explicit VOID configuration surface reused the historical `AGENT_TOKEN` or `VOID_AGENT_TOKEN` values.

### Nimo

No current live process, systemd user-manager environment, tracked/untracked repository configuration, or explicit VOID configuration surface reused the historical `AGENT_TOKEN` or `VOID_AGENT_TOKEN` values.

### Alienware

Alienware's current agent-token surfaces remain unverified because its inbound SSH listener became unreachable after the completed node-key cleanup.

Tailscale reachability remained green, but port 22, Tailscale SSH, the Tailscale device web interface, RDP, VNC, and Cockpit were unavailable. No existing GitHub runner or pull-based command agent was found for Alienware.

This is a coverage gap, not evidence of token reuse or compromise.

## Current tracked token code

Thirteen tracked `AGENT_TOKEN` assignments in `src/index.ts` were reviewed.

All 13 use one identical expression that:

- Reads `process.env.AGENT_TOKEN`
- Falls back to `process.env.VOID_AGENT_TOKEN`
- Falls back finally to an empty string

No hard-coded token or token-like fallback literal was found.

## Gitleaks adjudication

The redacted full-history scan produced 143 findings, all from the broad `generic-api-key` rule.

The findings were adjudicated through path, history-persistence, syntax, field-name, JSON-type, and semantic-context analysis.

They resolved to:

- Public blockchain addresses
- Transaction hashes
- Checksums and 32-byte integrity values
- Receipt and settlement identifiers
- Public routes
- Release/checkpoint tags
- Proof markers
- Fixture/template values
- Descriptive review metadata
- Amount fields
- Filesystem paths
- Boolean assertions recording whether keys or seed phrases were exposed

The final closure classified all remaining reviewed strings as safe metadata or integrity values:

- 250 of 250 reviewed string fields classified safe
- 10 secret-related fields classified as boolean audit assertions
- 0 holds
- 0 unresolved reviews

No additional credential exposure was confirmed by the Gitleaks lane beyond the historical node keys and the two historical agent-token values already identified.

## Repository-history treatment

The current repository tree was cleaned and forward-looking hygiene guards were added, but Git history has not been rewritten.

This report does not claim that historical objects have disappeared. Old clones, forks, caches, and Git objects may continue to contain the historical material.

Rotation and retirement—not deletion alone—are the security control.

## Current disposition

| Item | Disposition |
|---|---|
| `.nodekey.b` | Compromised by publication; retired |
| `.nodekey.follower` | Compromised by publication; retired |
| Current Precision node key | Distinct from historical keys; `0600` |
| Current Nimo node key | Distinct from historical keys; `0600` |
| Current Alienware node key | Distinct from historical keys; `0600` |
| Cross-box private-key duplication | Closed; stale Alienware copies removed |
| Historical `AGENT_TOKEN` | Exposed; no current reuse found on Precision or Nimo |
| Historical `VOID_AGENT_TOKEN` | Exposed; no current reuse found on Precision or Nimo |
| Alienware current token state | Pending due unavailable remote administration |
| Public update PEM files | Expected public material |
| Peerstore/node IDs | Operational/public metadata |
| Backup archive | Chain data only; no credential member |
| Gitleaks findings | Adjudicated; no additional confirmed credential |

## Remaining actions

1. Restore a legitimate remote-administration channel to Alienware through physical assistance or later physical access.
2. Rerun the current agent-token retirement scan on Alienware.
3. Install a durable, root-owned SSH availability control on Alienware after access is restored.
4. Publish a finalized public-safe version of this report.
5. Keep raw audit outputs and private fingerprint tables outside the repository.
6. Do not rewrite Git history as a substitute for rotation; consider history cleanup only as a separate repository-hygiene decision.
7. Proceed to the milestone map, threat model, trust assumptions, and key-management documentation.

## Conclusion

The historical repository did contain real sensitive material: two private node keys and two agent-token values.

The node-key exposure has been remediated across the active three-machine network. The current effective node identities are unique, owner-protected, and distinct from the exposed historical keys.

No current reuse of the historical agent-token values was found on Precision or Nimo. Alienware remains explicitly pending because its remote administration channel is unavailable.

The full Gitleaks lane found no additional confirmed credentials.

The correct public statement is therefore not “nothing sensitive was ever committed,” and it is not “deleting the files fixed everything.” The accurate statement is:

> Sensitive historical material was identified, classified, and treated as exposed. Active node identities were replaced or verified distinct, stale cross-machine key copies were removed, and no additional credential exposure was confirmed. One current-state token check on Alienware remains pending because remote access is unavailable.
