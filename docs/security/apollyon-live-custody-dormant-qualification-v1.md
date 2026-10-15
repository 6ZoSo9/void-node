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

Before either start, the qualifier also closes the effective systemd and
environment boundary. The installed custody environment file must be the exact
five-key root-owned generation for the observed IPC GID and reviewed public-key
fingerprint; extra keys therefore HOLD. The reviewed service additionally
requires exact effective `UnsetEnvironment=LD_LIBRARY_PATH LD_PRELOAD
NODE_OPTIONS NODE_PATH`, so those manager-level influence variables are removed
at execution without reading or exposing manager environment values.

Before either target start, the qualifier also reuses the reviewed V2 collector's
systemd-generation boundary. `/usr/bin/systemctl --version` must report systemd
major 255 with exact reviewed Noble package `255.4-1ubuntu8.11` or
`255.4-1ubuntu8.18`; the system-bus owner of
`org.freedesktop.systemd1` must be PID 1; and the running manager `Version`
must be reviewed and exactly equal the installed package version. This check is
part of `verify_static_install()`, so it is repeated before each cycle.

For both the target and service, the loaded fragment path must be the reviewed
`/etc/systemd/system` path, `DropInPaths` must be empty, and
`NeedDaemonReload=no`. The target dependency and stop-propagation sets are
closed to the custody service. The service's complete loaded execution arrays
are checked: exactly one reviewed `ExecStart`, no `ExecCondition`,
`ExecStartPre`, `ExecStartPost` or `ExecStop`, and exactly one reviewed
`ExecStopPost`. Extra commands, runtime/persistent drop-ins, stale daemon
configuration, an altered `UnsetEnvironment` set, or alternate effective
command arrays fail closed before start.

The qualifier also closes systemd dependency-directory authority without
guessing implicit manager dependency sets. Across the complete reviewed
system-manager unit search roots under `/etc`, `/run`,
`/usr/local/lib` and `/usr/lib`, any visible
`<target-or-service>.wants/` or `<target-or-service>.requires/`
entry is unreviewed authority and HOLDs before start. Missing dependency
directories are accepted; unreadable, symlinked, non-directory or non-empty
dependency directories fail closed. Focused self-tests inject both an extra
target `.requires/foreign.service` and an extra service
`.wants/foreign.service` and require rejection.

The consumed-record directory must be byte-metadata stable across both cycles.
Stability is checked before each start and immediately after each completed stop,
so a mutation in cycle 1 halts before cycle 2 instead of being deferred to the
final check. The snapshot includes the consumed directory's own device/inode,
ownership, mode, link count, size, mtime and ctime as well as each visible entry,
so create-then-delete activity cannot disappear behind an empty final listing.

Before each target start, every pathname that systemd or the custody runtime
will resolve is re-bound to retained trusted ancestry. The execution parents for
the root-custodied Node, reviewed launcher, cleanup helper, systemd unit files,
environment file and public key must be direct, symlink-free, root-owned and
non-group/world-writable. The root-owned ancestor chains protecting the config,
state and socket-parent pathnames are revalidated as well; a hostile
world-writable execution parent HOLDs before activation.

The config directory must remain real root:root 0755; the custody state root and
consumed directory must remain real custody-owned 0700 directories; and the
socket parent must remain a real custody:IPC 0750 directory. Symlink or metadata
substitution HOLDs. The custody account's NSS group closure must be exactly its
primary custody GID plus the reviewed IPC GID. Once live, the process
supplementary `Groups:` set must equal that reviewed IPC-only supplementary
set; an extra effective group HOLDs. The exact installed files, environment,
effective systemd command arrays and other static boundary facts are also
reverified before every target start; identity drift between cycles therefore
HOLDs before another activation.

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
recheck is never hidden behind the original qualification error. The final
post-cycle dormant and consumed-state attestations execute inside the same
lifecycle exception-accounting boundary; if either fails after completed
cycles, the failure receipt preserves the real target start/stop counts rather
than reporting a pre-start HOLD. Focused self-tests execute the same
emergency-cleanup helper with clean stop, failed
stop, unit-transition timeout and socket-transition timeout fixtures, and require
each failure to remain visible in the cleanup receipt. Exact argv tests also
reject alternate state-root, public-key path and key-fingerprint values.

No direct custody-service action, training, durable claim, private-key access,
signing, wallet, transaction or funds movement is authorized.
