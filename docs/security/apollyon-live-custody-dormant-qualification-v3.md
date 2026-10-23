# Apollyon dormant custody qualifier V3 — source-only startup readiness

Marker: `VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V3`

Status: **source-only candidate; not installed, not live-qualified, no authority to run training**.

## Evidence on Xiphos, 2026-10-22

- V2 two-cycle wrapper passed SHA-256 verification, source self-test and dormant preflight.
- At 16:53:25.673373 systemd reported service started; at 16:53:25.688928 cleanup began, ~15.6 ms after start.
- At 17:23:34.727361 systemd reported service started; at 17:23:34.745508 cleanup began, ~18.1 ms after start.
- The failure receipt was `HOLD=custody_node_executable_mismatch`; each attempt recorded a single target start, emergency cleanup green, and a final dormant recheck green.
- An auxiliary observer captured `/usr/bin/python3.12` with custody UID. PID 3706725 was confirmed by the service journal to be the intentional `ExecStopPost` cleanup process; it was **not** proof that systemd's main executable was Python.
- The installed Node path was a regular root-owned, non-symlink executable with expected size, mode and SHA-256.
- The socket remained absent after cleanup; no durable claim, private-key access, training execution or funds movement was observed.

These facts are consistent with an early-active `Type=simple` pre-`execve` race; they do not conclusively establish the live main-process executable or prove that no independent startup fault exists.

## Narrow V3 correction

Preserve the separately pinned V2 source and introduce a versioned V3 successor.

The reviewed V3 candidate:

1. preserves exact installed target, service, launcher, Node digest, environment, systemd version, process identity/credential, socket, role UID/TID, consumed-state and cleanup bindings;
2. waits for the already-reviewed custody socket publication **after** systemd reports target and service active but **before** capturing `MainPID` and evaluating its executable;
3. re-reads active unit state after socket publication, so a transient pre-`execve` process cannot pass or cause an instant false executable mismatch;
4. uses `os.readlink("/proc/<pid>/exe")` instead of `os.path.realpath` so a vanished process is a distinct fail-closed `HOLD`, never treated as an observed alternate executable;
5. requires the exact expected executable pathname **and** matching device/inode for the pinned Node executable;
6. re-verifies process start ticks and the systemd `MainPID`, then **re-attests the executable path and device/inode** because `execve` preserves PID/start ticks;
7. collects a second independently validated custody subject snapshot after that check: raw NUL-delimited argv, UID/GID/groups, capabilities, NoNewPrivs, stable security status, full thread credential inventory, training-UID absence and global custody-UID/TID map must **match the first snapshot exactly**. Same-binary `execve` with changed argv therefore HOLDs even when PID, start ticks, and executable inode match;
8. rechecks process start ticks, systemd `MainPID`, executable identity and start ticks once more after the coherent subject comparison. This narrows a time-of-check/time-of-use interval without claiming perfect atomicity against a concurrent `execve`;
9. keeps the 8-second socket timeout, exact argv/credentials, global role thread census, socket metadata and connection, two-cycle cleanup and final dormancy requirements.

The V3 self-test exercises the exact match, unexpected executable, missing executable and inode-identity checks.

A separate **inert same-Node re-execution regression** invokes `live_observation` with a constant PID, constant start ticks, and the same mocked pinned Node executable while changing only the second validated subject's raw argv. It must HOLD with `custody_mainpid_live_snapshot_changed`. The control case supplies identical subject snapshots and must pass. Neither case starts systemd or executes Node.

Dual sampling is not a kernel-atomic process-generation lock: a privileged actor or compromised custody process capable of a perfectly timed new `execve` after the last observation is outside the narrow source proof's demonstrated guarantees. The reviewed custody service itself must not provide re-exec or execution authority, and runtime activation remains gated by separate privileged host qualification. It injects an inode mismatch *after a matching observed executable pathname* and requires `exact_custody_node_executable` itself to emit `HOLD=custody_node_executable_inode_mismatch`; a standalone helper test alone is insufficient. The source proof also requires two executable-identity attestations, with the second after the final systemd `MainPID` check. The read-only `scripts/prove_apollyon_live_custody_dormant_qualification_v3.py` runs the self-test and checks the production boundaries.

**Important:** Socket publication is only a readiness barrier. It does **not** replace the executable, credential, argv, socket, and process-exclusivity attestations. Socket absence, early main-process exit, tampering or unexpected executable still HOLD and trigger guarded cleanup.

## Activation boundary

Source tests and CI are not live custody qualification. Do not reuse or overwrite the root-staged V2 hash-pinned wrapper with V3 bytes. A separate independently reviewed, hash-pinned V3 root-staging plan, preflight and user-authorized two-cycle live test are required before V3 could be accepted.

No `systemctl` mutation, service install, signing, training, claim creation or money movement is performed by this source-only PR.

PROTECT THE CORE.
