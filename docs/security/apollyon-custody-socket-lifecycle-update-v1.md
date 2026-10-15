# Apollyon custody socket lifecycle update v1

Installed-host successor for Xiphos before the first live custody start.

The existing custody service source deliberately leaves its advertised socket
pathname behind after stop. This update installs the reviewed root-owned cleanup
helper and adds exactly one `ExecStopPost=` to the existing service unit.

The updater requires:

- the stop-propagating activation target exact and loaded/inactive;
- the custody service exact old or exact new blob and loaded/inactive;
- neither target nor service enabled;
- the helper absent or exact.

It then installs the helper as root:root 0444, atomically replaces the service
unit when required, performs daemon-reload, and verifies the loaded
`ExecStopPost` plus direct manual start/stop refusal.

No service/target start or stop is issued. No socket is touched during this
update. No training, durable claim, key/signing, transaction, wallet or funds
action occurs.
