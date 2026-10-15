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

It stages the helper into a private pending file, fsyncs and verifies the full
bytes/metadata, publishes it with a create-only hardlink, fsyncs the lifecycle
directory, removes the pending link and fsyncs again. The service unit is staged
separately and atomically replaced when required. Any pre-replacement service
temporary file is removed on failure. It then performs daemon-reload and verifies
the loaded
`ExecStopPost`, exact `UnsetEnvironment` set, and direct manual start/stop
refusal.

The apply path is restart-safe across its own partial publication boundary.
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
whether helper installation, service replacement, daemon-reload and final
postcheck were attempted, whether the reload command returned success, the
aggregate persistent-mutation possibility, and a fresh read-only recovery
snapshot. A
daemon-reload client failure/timeout reports the command outcome as
`indeterminate`, never as a proven failed reload; the recovery snapshot
classifies what PID1 actually exposes. Fault tests cover failure after helper
creation, after service replacement/parent fsync, at daemon-reload, and at
loaded postcheck, then prove idempotent resume without any target/service start
or stop.

No service/target start or stop is issued. No socket is touched during this
update. The installed cleanup helper independently requires the custody UID
process set to be exactly the helper itself before stale-path deletion, repeating
the gate immediately before hidden-link and advertised-socket unlink. Unreadable
or unclassifiable live process status holds closed.

No training, durable claim, key/signing, transaction, wallet or funds action
occurs.
