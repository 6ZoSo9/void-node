# Apollyon custody socket lifecycle update v1

Installed-host successor for Xiphos before the first live custody start.

The existing custody service source deliberately leaves its advertised socket
pathname behind after stop. This update installs the reviewed root-owned cleanup
helper, adds exactly one `ExecStopPost=`, and adds an explicit
`UnsetEnvironment=GCONV_PATH LD_AUDIT LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH OPENSSL_CONF` boundary
to the existing service unit. This removes the reviewed glibc/Node/OpenSSL manager-level influence variables at service execution without reading their values.

The updater requires:

- the stop-propagating activation target exact and loaded/inactive;
- the custody service to be one of the exact reviewed predecessor blobs or the
  exact new blob and loaded/inactive. Reviewed predecessors are base
  `6ff5315f...`, deployed lifecycle `83f363b3...`, and four-variable
  environment generation `86ed2500...`; arbitrary bytes still HOLD;
- target `UnitFileState=disabled` exactly;
- custody service `UnitFileState=static` exactly;
- every other target/service unit-file state holds closed; and
- the helper absent or exact.

It stages the helper into a private pending file, applies the final reviewed
ownership/mode, verifies the descriptor metadata and bytes, and only then
fsyncs the finalized file immediately before create-only hardlink publication.
The lifecycle directory is fsynced after publication, the pending link is
removed, and the directory is fsynced again. When the lifecycle root itself is
first created, the updater fsyncs that root and its `/opt` parent before any
helper publication. The service staging file uses the same rule: final
ownership/mode and descriptor verification precede its final file fsync, which
precedes atomic replacement and the systemd-directory fsync. If a process crash leaves
a private pending name before publication, or leaves the exact final helper with
its one same-inode pending hardlink, plan classifies that state explicitly and
apply removes only the reviewed private pending link(s), fsyncs the lifecycle
directory, and resumes. The service unit is staged separately and atomically
replaced when required. Any pre-replacement service
temporary file is removed on failure. It then performs daemon-reload and verifies
the loaded
`ExecStopPost`, exact `UnsetEnvironment` set, and direct manual start/stop
refusal.

The apply path is restart-safe across its own partial publication boundary.
The initial plan is not treated as a mutation lease: apply re-runs the exact
target/service dormant and loaded-generation census immediately before any
durability repair, helper publication, service-unit replacement, and
daemon-reload. If either unit becomes active or its reviewed generation/state
changes at a mutation boundary, apply HOLDs without starting or stopping it.
Plan mode classifies the reviewed predecessor generations explicitly. The
historical base can be initial/helper-only, the installed lifecycle and
four-variable environment predecessors are `predecessor_ready`, and the new
generation can be pending daemon-reload or complete. Before resuming from a
helper-only, reviewed-predecessor, or pending-reload state, apply re-fsyncs the
already-published lifecycle/service directories as applicable so a prior
directory-fsync failure cannot be skipped. A new exact service file with PID1
still holding the exact old generation is therefore a bounded
`RESUME_DAEMON_RELOAD` state,
not a dead-end collision. Any other file/loaded combination still HOLDs.

If apply fails, the failure receipt records the initial lifecycle/helper/service
file/loaded-service state, whether persistent mutation was already present before
this invocation, whether filesystem mutation was possible during this invocation,
and how many mutation-boundary dormancy revalidations completed. Durability
repair of the two pending-helper states is conservatively classified as a
possible current-invocation persistent mutation before it may remove a pending
entry. Pure re-fsync of an already-published exact generation does not by itself
claim a new namespace/content mutation. A mid-cleanup failure therefore cannot
falsely attribute an unlink performed by this invocation to a prior run.
The receipt also records whether helper installation, service replacement,
daemon-reload and final
postcheck were attempted, whether the reload command returned success, the
aggregate persistent-mutation possibility, and a fresh read-only recovery
snapshot. A
daemon-reload client failure/timeout reports the command outcome as
`indeterminate`, never as a proven failed reload; the recovery snapshot
classifies what PID1 actually exposes. Fault tests cover failure after helper
creation, after service replacement/parent fsync, at daemon-reload, and at
loaded postcheck, and mutation-boundary dormancy drift before the first
publication. The latter requires zero helper/service publication and zero
daemon-reload attempts. The tests then prove idempotent resume without any
target/service start or stop.

No service/target start or stop is issued. No socket is touched during this
update. The installed cleanup helper independently requires the custody UID
process set to be exactly the helper itself before stale-path deletion, repeating
the gate immediately before hidden-link and advertised-socket unlink. Unreadable
or unclassifiable live process status holds closed.

No training, durable claim, key/signing, transaction, wallet or funds action
occurs.
