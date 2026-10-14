# Apollyon designated-host custody evidence read-only v2

Marker: VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2

Issue: #2900. This V84 successor preserves the immutable V83 collector bytes and
adds socket-parent namespace evidence for the V2 policy classifier.

The collector remains root-observer-only on Xiphos, preserves V80/V81 source
binding, boot-ID and CLOCK_BOOTTIME binding, process/systemd evidence, and uses
read-only systemd/Polkit observation only. It collects the full socket-parent
retained ancestor chain,
rejects extended ACLs on those ancestors, records root ownership/directness/
symlink/write exposure, and derives training UID rename/unlink denial through the
socket parent's immediate parent.

The caller must also supply the exact live training PID. V84 binds that PID to
its /proc start-time ticks and UID. Process discovery walks every
`/proc/<tgid>/task/<tid>/status`; if any thread touches the training UID, its
whole thread group enters the admitted inspection set. The process inventory
must remain stable across a second scan. For every admitted process it
enumerates
`/proc/<pid>/task/<tid>` twice and requires every thread credential transcript
to remain stable: all four UID slots equal the training UID, zero
CapInh/CapPrm/CapEff/CapAmb, and NoNewPrivs=1. Evidence carries bounded thread
counts and SHA-256 inventory digests per process plus a total thread count. A
privileged sibling process or sibling thread therefore cannot be hidden behind
a harmless selected PID.

The collector pins systemd to the exact reviewed package generation
`255.4-1ubuntu8.11`. It obtains the Unix PID owning
`org.freedesktop.systemd1` via the system-bus
`GetConnectionUnixProcessID` method and requires that owner to be PID 1 before
reading `org.freedesktop.systemd1.Manager.Version`. Installed package,
running-manager version and reviewed package generation must match exactly.

The collector also requires the exact reviewed early Polkit rule at
`/etc/polkit-1/rules.d/00-void-apollyon-training-custody-deny-v1.rules`.
The rule must be root:root, single-link, non-group/world-writable, have trusted
root-owned ancestors, be lexically first across the system Polkit rule
directories, and deny the training user by action ID only for
`manage-units`, `manage-unit-files`, `reload-daemon`, and
`set-environment`. This makes the denial independent of optional
`polkit.message` / `polkit.gettext_domain` request details.

The collector then performs non-interactive `/usr/bin/pkcheck` probes for the
reviewed systemd control surface. It retains the PID/start-time/UID
`--process` probes as defense-in-depth, and separately enumerates the live
unique system-bus names using `busctl`. For any live bus connection whose
authenticated Unix UID equals the training UID or whose authenticated Unix PID
belongs to the admitted training-process set, both PID and UID must match the
admitted training identity exactly. Each such connection is probed using
`pkcheck --system-bus-name` across the full reviewed control surface, then the
relevant bus-sender set is collected again and must be unchanged. A unique name
that disappears or fails either authenticated PID/UID lookup causes HOLD rather
than being omitted from the census. Evidence contains a bounded sender list with
identity, action count, and the SHA-256 of its canonical all-denied transcript.

The complete training-process inventory is then collected again after the bus
checks and compared using PID + process start time + thread inventory digest.
That closes PID-reuse ambiguity across the authorization window and is surfaced
as `training_uid_process_identity_stable_across_authorization=true`.

Only exit status 1 is accepted as explicit denial. RefuseManualStart/Stop remain
defense-in-depth unit facts.

The collector intentionally does **not** convert these endpoint observations
into an absolute service-control claim. It cannot prove that the training
execution boundary lacks a pre-authenticated system-bus descriptor inherited or
received under different credentials, nor can two endpoint snapshots rule out a
connection that exists only between those snapshots. Its service-control
evidence therefore reports:

```text
inherited_system_bus_descriptor_absence_required=true
inherited_system_bus_descriptor_absence_proven=false
absolute_runtime_service_control_denial_proven=false
runtime_can_control_service=null
```

The V2 policy requires the missing provenance proof to be true, so this current
collector deliberately HOLDS before live source-policy qualification. A later
reviewed training-launch/runtime isolation gate must close that descriptor
provenance boundary; this collector does not manufacture it.

It emits VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2 version 2 with a separate
`service_control` transcript. It performs no filesystem/service mutation,
private-key access, signing, attempt claim, training, wallet/transaction
operation or funds movement. Live Xiphos execution is a separate authority gate
and is not performed by CI.
