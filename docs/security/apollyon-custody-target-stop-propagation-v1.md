# Apollyon custody activation target stop propagation v1

The custody service intentionally refuses direct manual start and stop.

The activation target already starts custody indirectly through:

`Wants=void-apollyon-authorization-custody-v1.service`

This successor adds the stop-only inverse control:

`PropagatesStopTo=void-apollyon-authorization-custody-v1.service`

Systemd documents that `PropagatesStopTo=` queues stop requests on linked
units, while `RefuseManualStop=yes` permits a unit to be stopped indirectly
as a dependency. This gives the operator one bounded control surface: start and
stop the target, never the service directly.

The installed-host updater requires both target and custody service inactive,
atomically replaces only the target file, performs daemon-reload, and verifies
the loaded Wants/PropagatesStopTo relationship. It never starts or stops either
unit.

No training, claim, private-key/signing, transaction, wallet or funds action.
