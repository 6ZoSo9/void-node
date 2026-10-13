# Apollyon custody host-policy qualification v2

Marker: VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2

Issue: #2900.

This source-only successor preserves the immutable V82/V1 classifier. A V2
success first converts only the marker/version and socket-parent successor fields
back to the historical V1 shape and requires the exact V1 classifier to succeed.
It then requires socket-parent retained ancestor count >= 2, root-owned direct
symlink-free ancestors, no group/other-writable retained ancestor, and training
UID rename/unlink denial through the socket parent's immediate parent.

V2 additionally requires explicit service-control denial evidence before the
historical `runtime_can_control_service=false` field can be admitted. The
evidence is bound to the exact training PID, Linux process start-time ticks and
UID, requires systemd major 255, zero inherited/permitted/effective/ambient
capabilities plus `NoNewPrivs: 1`, and requires non-interactive `pkcheck`
exit status 1 for the generic `manage-units` action, every reviewed unit-control
verb for the protected custody unit, `manage-unit-files`, `reload-daemon`,
and `set-environment`. Any authorized, interactive/challenge, dismissed, or
error result HOLDS. The V1 classifier remains byte-for-byte unchanged; V2 strips
the successor-only service-control block before delegating to V1.

No V1 source, proof or documentation is repinned. Success remains source-policy
qualification only: live host qualification, independent custody, attempt claim,
training execution, signing, wallet/transaction authority and funds movement
remain false. The next gate is the read-only designated-host V2 collector.
