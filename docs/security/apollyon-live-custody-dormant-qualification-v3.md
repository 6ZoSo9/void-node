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
6. re-verifies process start ticks and the systemd `MainPID` before the live observation is accepted;
7. keeps the 8-second socket timeout, exact argv/credentials, global role thread census, socket metadata and connection, two-cycle cleanup and final dormancy requirements.

The V3 self-test exercises the exact match, unexpected executable, missing executable and inode-identity checks. The read-only `scripts/prove_apollyon_live_custody_dormant_qualification_v3.py` runs the self-test and checks the production boundaries.

**Important:** Socket publication is only a readiness barrier. It does **not** replace the executable, credential, argv, socket, and process-exclusivity attestations. Socket absence, early main-process exit, tampering or unexpected executable still HOLD and trigger guarded cleanup.

## Activation boundary

Source tests and CI are not live custody qualification. Do not reuse or overwrite the root-staged V2 hash-pinned wrapper with V3 bytes. A separate independently reviewed, hash-pinned V3 root-staging plan, preflight and user-authorized two-cycle live test are required before V3 could be accepted.

No `systemctl` mutation, service install, signing, training, claim creation or money movement is performed by this source-only PR.

PROTECT THE CORE.
