# Apollyon designated-host custody evidence read-only v1

Marker: VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V1

Status: **read-only designated-host evidence collector**.

## Purpose

V83 implements the live-host collector required by the merged V82 policy. It is
intended to run on **Xiphos** after the V80/V81 custody implementation and host
layout have been staged.

The collector derives the V82 evidence object from the host. It does not accept
caller-supplied UID/GID, permission, systemd-hardening, process-exclusivity,
boot-generation, or clock facts.

The caller supplies identifiers only:

- training/runtime account name;
- custody-service account name;
- dedicated IPC group name;
- absolute custody state-root path;
- absolute advertised AF_UNIX socket path; and
- systemd service-unit name.

## Read-only boundary

V83 performs filesystem/stat/xattr reads, account/group lookups, /proc reads,
kernel clock reads, and systemctl show only.

It does **not** call or implement:

- chmod, chown, mkdir, rename, unlink, or file writes;
- useradd, groupadd, or usermod;
- service start/stop/restart/enable/disable/reload;
- network access;
- operator private-key access or signing;
- authorization consumption;
- attempt claim;
- training execution or candidate-weight mutation;
- wallet/transaction/funds operations.

Live collection requires effective UID 0 so protected cross-UID state can be
observed without weakening its permissions. Root is observation authority only;
there is no mutation path in the collector.

## Source binding

Before host evidence is emitted, the collector recomputes Git blob SHA-1 for the
reviewed merged V80/V81 implementation and requires the exact V82 pins:

~~~text
custody core    f9f18db5bbfeea466202ef0d7babe08c3c401d66
custody service 8961572ba5834371b1229f790a1960940fc74935
custody client  fb31dbbda76c94f0ad08e38094c151a24a78b486
~~~

The collector must therefore run from a repository checkout containing those
reviewed bytes.

## Clock and boot generation

V83 derives:

- verification_now_ms and observed_at_ms from the kernel realtime clock;
- evidence_generation from CLOCK_BOOTTIME nanoseconds; and
- boot_id_sha256 from /proc/sys/kernel/random/boot_id.

The evidence TTL is bounded to five minutes and defaults to five minutes. These
values are not caller assertions.

## Filesystem evidence

V83 rejects path aliases and symlinks and requires no POSIX ACL xattrs on the
state root, consumed directory, socket parent, advertised socket, or state-root
parent. It derives standard-mode write/traverse authority from the live UID/GID
and supplementary-group sets.

It emits the exact V82 fields for the custody state root, consumed directory,
socket parent, and advertised AF_UNIX socket.

## Service evidence

V83 uses system-manager systemctl show only. It reads the hardening properties
required by V82 plus RefuseManualStart, RefuseManualStop, ActiveState, and
MainPID.

To report runtime_can_control_service=false, both manual-control refusal flags
must be enabled. The service must be active.

To report custody_uid_only_reviewed_service=true, V83 scans /proc/*/status and
requires the custody UID to own exactly the current systemd MainPID and no other
process.

ReadWritePaths must resolve to exactly the configured socket parent and state
root; any extra writable path HOLDs.

## Output

On success stdout contains exactly one canonical JSON object matching the V82
VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1 input shape. Status and safety
markers go to stderr so stdout can be piped directly into a later classifier.

V83 does not itself claim that the V82 classification passed. It collects live
host truth only.

## Example Xiphos invocation

~~~bash
sudo python3 -I -B ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v1.py \
  --training-user <training-user> \
  --custody-user <custody-user> \
  --ipc-group <ipc-group> \
  --state-root /absolute/custody/state/root \
  --socket-path /absolute/custody.sock \
  --service-unit <custody-service>.service
~~~

No account names or production paths are guessed by source.

## Proof

~~~bash
python3 -m py_compile ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v1.py
python3 -I -B ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v1.py --self-test
python3 -I -B scripts/prove_apollyon_designated_host_custody_evidence_readonly_v1.py
~~~

CI proves syntax, helper invariants, the absence of mutating filesystem calls,
systemctl-show-only service probing, boot/clock binding, source-blob binding,
and the no-key/no-claim/no-training authority boundary. CI does not claim it ran
on the designated Xiphos host.
