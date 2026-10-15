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

The installed-host updater requires both target and custody service to report an
exact loaded/inactive systemd state before mutation. Command failure, empty or
malformed output, missing/unloaded units, and active, unknown, failed, activating,
or deactivating states all HOLD. The updater then atomically replaces only the
target file, performs daemon-reload, and re-verifies exact inactive state plus
the loaded Wants/PropagatesStopTo relationship. It never starts or stops either
unit.

## Daemon-reload recovery

The update is restartable across the one source-to-manager split that can occur
after the target file has been replaced but before systemd successfully reloads
it.

The planner has exactly three accepted states:

- `old_exact` on disk -> `replace_and_reload`;
- `new_exact` on disk plus an exact loaded predecessor shape whose only missing
  field is `PropagatesStopTo` -> `reload_only`;
- `new_exact` on disk plus the exact loaded stop-propagation contract ->
  `already_exact`.

The reload-only state performs **no target-file rewrite**. Before asking systemd
to reload, the updater revalidates that the installed target is still the exact
reviewed `new_exact` generation. It revalidates the target bytes again after the
manager recheck and before success. It then requires both units to remain
inactive and the loaded target to have exactly the custody service in both
`Wants=` and `PropagatesStopTo=`.

This deliberately does not treat an arbitrary stale manager view as recoverable.
Extra loaded `Wants=` dependencies, a different/nonempty
`PropagatesStopTo=` set, active/transitional units, malformed systemctl output,
unknown file bytes, or another target-generation mismatch all HOLD. Because both
reviewed target generations contain an `[Install]` section and the installer
never enables the target, the loaded `UnitFileState` must be exactly
`disabled`; enabled, runtime-enabled, masked, static, linked, indirect, generated,
or other states HOLD.

Therefore a transient daemon-reload failure after a successful atomic replace
can be resumed without a second pathname replacement, while every other drift
continues to fail closed.

No training, claim, private-key/signing, transaction, wallet or funds action.
