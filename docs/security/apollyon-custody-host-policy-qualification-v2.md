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
UID. It also inventories the complete live process set touching the training UID
twice, requires that set to remain stable across inspection, and requires every
such process to have zero inherited/permitted/effective/ambient capabilities,
all four Linux UID slots equal to the training UID, and `NoNewPrivs: 1`.
This prevents a harmless caller-selected PID from masking a privileged sibling.

The systemd boundary is pinned to the exact reviewed package generation
`255.4-1ubuntu8.11`, not merely major 255. The collector queries the system
bus owner PID for `org.freedesktop.systemd1` through
`GetConnectionUnixProcessID` and requires it to equal PID 1 before accepting
`Manager.Version`. Installed package, running manager version and reviewed
package must all match exactly; owner/version/package drift HOLDS.

V2 also requires an exact root-owned, non-group/world-writable, single-link
Polkit deny rule at
`/etc/polkit-1/rules.d/00-void-apollyon-training-custody-deny-v1.rules`.
The rule must be lexically first and return `NO` for the training user based
only on the four reviewed systemd action IDs. Because that first rule ignores
request details, `polkit.message`, `polkit.gettext_domain`, unit and verb
details cannot turn a denied operation into an allow. Non-interactive
`pkcheck` exit status 1 is then required as confirmation for the generic
`manage-units` action, every reviewed unit-control verb for the protected
custody unit, `manage-unit-files`, `reload-daemon`, and `set-environment`.
Any authorized, interactive/challenge, dismissed, or error result HOLDS.
The V1 classifier remains byte-for-byte unchanged; V2 strips
the successor-only service-control block before delegating to V1.

No V1 source, proof or documentation is repinned. Success remains source-policy
qualification only: live host qualification, independent custody, attempt claim,
training execution, signing, wallet/transaction authority and funds movement
remain false. The next gate is the read-only designated-host V2 collector.
