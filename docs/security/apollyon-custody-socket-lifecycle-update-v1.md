# Apollyon custody socket lifecycle update v1

Installed-host successor for Xiphos before the first live custody start.

The existing custody service source deliberately leaves its advertised socket
pathname behind after stop. This update installs the reviewed root-owned cleanup
helper, adds exactly one `ExecStopPost=`, and adds an explicit
`UnsetEnvironment=GCONV_PATH LD_AUDIT LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH OPENSSL_CONF` boundary
to the existing service unit. This removes the reviewed glibc/Node/OpenSSL manager-level influence variables at service execution without reading their values.

The updater requires:

- the stop-propagating activation target exact and loaded/inactive;
- the custody service exact old or exact new blob and loaded/inactive;
- target `UnitFileState=disabled` exactly;
- custody service `UnitFileState=static` exactly;
- every other target/service unit-file state holds closed; and
- the helper absent or exact.

It then installs the helper as root:root 0444, atomically replaces the service
unit when required, performs daemon-reload, and verifies the loaded
`ExecStopPost`, exact `UnsetEnvironment` set, and direct manual start/stop
refusal.

The apply path is restart-safe across its own partial publication boundary.
Plan mode classifies exactly four reviewed states: initial old service/helper
absent, helper-only publication, new service file pending daemon-reload, and
complete new loaded generation. A new exact service file with PID1 still holding
the exact old generation is therefore a bounded `RESUME_DAEMON_RELOAD` state,
not a dead-end collision. Any other file/loaded combination still HOLDs.

If apply fails after mutation starts, the failure receipt reports whether helper
installation, service replacement, daemon-reload and final postcheck were
attempted, whether the reload command returned success, whether persistent
filesystem mutation is possible, and a fresh read-only recovery snapshot. Fault
tests cover failure after helper creation, after service replacement/parent
fsync, at daemon-reload, and at loaded postcheck, then prove idempotent resume
without any target/service start or stop.

No service/target start or stop is issued. No socket is touched during this
update. The installed cleanup helper independently requires the custody UID
process set to be exactly the helper itself before stale-path deletion, repeating
the gate immediately before hidden-link and advertised-socket unlink. Unreadable
or unclassifiable live process status holds closed.

No training, durable claim, key/signing, transaction, wallet or funds action
occurs.
