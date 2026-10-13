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
its /proc start-time ticks and UID, requires zero CapInh/CapPrm/CapEff/CapAmb
and NoNewPrivs=1, pins systemd major 255, then performs non-interactive
`/usr/bin/pkcheck` probes for the complete reviewed systemd control surface.
Only exit status 1 is accepted as explicit denial. RefuseManualStart/Stop remain
defense-in-depth unit facts; they no longer independently justify
`runtime_can_control_service=false`.

It emits VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2 version 2 with a separate
`service_control` transcript. It performs no filesystem/service mutation,
private-key access, signing, attempt claim, training, wallet/transaction
operation or funds movement. Live Xiphos execution is a separate authority gate
and is not performed by CI.
