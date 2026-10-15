# Apollyon live custody dormant qualification v1

This gate is the first live activation of the installed custody service.

It exercises custody only. The training service is never started.

The run performs two complete cycles:

1. verify target/service dormant and socket absent;
2. start only `void-apollyon-authorization-custody-v1.target`;
3. require the dependency-started custody service active;
4. attest the root-custodied Node executable, custody UID/GID slots,
   supplementary IPC group, zero capabilities and NoNewPrivileges;
5. require the complete live argv to equal the reviewed fixed Node/launcher plus
   the exact canonical socket path, state root, observed IPC GID, operator public
   key fingerprint and canonical public-key file;
6. require the custody UID process set to be exactly the service MainPID/start
   generation while live;
7. stop only the activation target;
8. require target/service inactive, the advertised socket absent after
   `ExecStopPost`, and zero custody-UID processes;
9. repeat the cycle once and require a new custody process generation.

The consumed-record directory must be byte-metadata stable across both cycles.
The custody UID lifecycle is therefore 0 -> exact service generation -> 0 for
each cycle, and no process carrying the dedicated training UID may appear before,
during or after qualification. Both process-absence and custody-exclusivity
censuses fail closed when a still-existing PID cannot be classified. Focused
self-tests exercise the child qualifier's own process enumerator against empty,
exact-live, second-custody-process, saved/fs-UID-only, malformed-status and
unreadable-status synthetic proc trees.

If a qualification failure occurs after a target-start attempt, the failure
receipt preserves the original reason, reports start attempts/successes and
normal stop attestations, and records bounded emergency target cleanup. It then
performs a separate read-only final dormant-boundary recheck over target/service
state, socket absence, socket-parent emptiness, custody-UID process absence, and
training-UID process absence. `final_dormant_after_failure_proven` may become
true only from that final recheck; completed start/stop counts alone are never
treated as proof of the current dormant state. A failed cleanup or failed final
recheck is never hidden behind the original qualification error. Focused
self-tests execute the same emergency-cleanup helper with clean stop, failed
stop, unit-transition timeout and socket-transition timeout fixtures, and require
each failure to remain visible in the cleanup receipt. Exact argv tests also
reject alternate state-root, public-key path and key-fingerprint values.

No direct custody-service action, training, durable claim, private-key access,
signing, wallet, transaction or funds movement is authorized.
