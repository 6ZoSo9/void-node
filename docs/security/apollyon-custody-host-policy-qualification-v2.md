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
UID. Process discovery itself scans every `/proc/<tgid>/task/<tid>/status`
rather than trusting only each thread-group leader, so a process is admitted for
inspection if **any** thread touches the training UID. It then inventories that
complete process set twice and requires the set to remain stable. For every
admitted process it enumerates `/proc/<pid>/task/<tid>`, reads every thread's
UID slots, capability sets, `NoNewPrivs`, and start-time identity twice, and
requires the thread set plus credential transcript to remain unchanged. Every
thread must
have all four UID slots equal to the training UID, zero
inherited/permitted/effective/ambient capabilities, and `NoNewPrivs: 1`.
The evidence stores bounded per-process thread counts and SHA-256 inventory
digests rather than unbounded raw thread records. This prevents either a
privileged sibling process or privileged sibling thread from hiding behind a
clean caller-selected PID.

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

The collector also inventories the live unique names on the **system bus**.
Any bus sender whose authenticated Unix UID is the training UID or whose
authenticated Unix PID belongs to the admitted training-process set must match
**both** dimensions exactly; a sender with a training PID but foreign
authenticated UID, or training UID but unadmitted PID, HOLDS. Each admitted
sender is then probed through `pkcheck --system-bus-name` over the same exact
reviewed systemd control surface. The sender set is collected again afterward
and must remain stable. Any unique name listed by the bus whose authenticated
PID or UID cannot be resolved HOLDS the census; a disappearing sender is never
silently dropped. V2 requires a bounded list of those sender identities, the
exact denial-check count, and the SHA-256 of the canonical all-denied transcript
for each sender.

After the bus-denial phase, the complete training-process evidence is collected
again and compared by full start-time-bound process identity plus per-process
thread inventory digest, not only by integer PID. PID reuse or thread-credential
drift across the authorization window therefore HOLDS. The earlier
PID/start/UID process probes remain defense-in-depth; they are no longer the sole
Polkit subject evidence.

That observation still cannot prove that the training execution boundary lacks a
pre-authenticated system-bus connection inherited or received under different
credentials. Such a connection can exist without appearing as a current
PID/UID-matching sender at both endpoint snapshots. V2 therefore requires two
additional truths before service-control qualification:

```text
inherited_system_bus_descriptor_absence_required=true
inherited_system_bus_descriptor_absence_proven=true
absolute_runtime_service_control_denial_proven=true
```

The current read-only collector deliberately reports the first as required and
the latter two as false, with `runtime_can_control_service=null`. As a result,
today's live collector evidence **cannot** satisfy the V2 policy. A separately
reviewed training-launch/runtime boundary must prove that inherited/passed
pre-authenticated system-bus descriptors are absent and remain impossible before
the policy may emit `source_policy_qualified`. This is an intentional
fail-closed HOLD, not a missing positive test.

The V1 classifier remains byte-for-byte unchanged; V2 strips
the successor-only service-control block before delegating to V1.

No V1 source, proof or documentation is repinned. Success remains source-policy
qualification only: live host qualification, independent custody, attempt claim,
training execution, signing, wallet/transaction authority and funds movement
remain false. The next gate is the read-only designated-host V2 collector.
