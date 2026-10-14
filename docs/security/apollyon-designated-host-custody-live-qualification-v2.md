# Apollyon designated-host custody live qualification v2

Marker: `VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V2`

Status: **read-only V2 live namespace qualification runner**.

## Purpose

This successor preserves historical V84/V1 and consumes the corrected current
V2 service-control/socket-parent generation from #2906.

It accepts no evidence JSON. It runs the exact V2 designated-host collector
twice on Xiphos and immediately classifies both observations with the exact V2
host-policy classifier.

## Pre-entry trust root

Direct privileged execution from the repository worktree, direct privileged
Node execution, and direct privileged Python execution are **unsupported**.

The first reviewed live entrypoint is a small native executable installed at:

```text
/opt/void-apollyon-custody-v2-preentry-v1/apollyon_v2_native_preentry_v1
```

Reviewed native pre-entry source blob:

```text
7863007de9d55614305be4d01083c3f8e8bd7453
```

The native source has no setuid transition, shell, package, service, network,
key, claim, training, transaction, or funds capability. Live mode requires
effective UID 0 supplied by the operator's separately controlled privilege
boundary; the installed binary itself must have neither setuid nor setgid mode bits. The native runtime custody check rejects both.

Before Python evaluates any launcher source, the native pre-entry:

- proves `/proc/self/exe` resolves to the exact fixed installed native path;
- requires that native executable to be a direct root-owned, single-link,
  executable, non-group/world-writable file beneath trusted root-owned,
  non-group/world-writable ancestry;
- treats `/usr/bin/python3` only as the fixed requested interpreter path;
- resolves its canonical interpreter target, requires trusted root-owned
  ancestry and a direct root-owned, single-link, executable,
  non-group/world-writable target;
- opens that target with `O_NOFOLLOW`, rechecks descriptor/path identity, and
  invokes it with `fexecve()`; and
- supplies fixed `-I -B`, the fixed installed Python-launcher pathname, a
  minimal environment, and the marker
  `VOID_APOLLYON_V2_NATIVE_PREENTRY=VOID_APOLLYON_V2_NATIVE_PREENTRY_V1`.

The Python launcher refuses live mode without that exact marker. Its fixed path
is:

```text
/opt/void-apollyon-custody-v2-preentry-v1/apollyon_v2_installed_live_launcher_v1.py
```

Reviewed Python-launcher source blob:

```text
61aa52d8c91387fa0fa9de914f2625661f49ecb3
```

That launcher then authenticates the separately installed reviewed source root:

```text
/opt/void-apollyon-custody-v2-reviewed-v1
```

before starting Node. It materializes exact reviewed bytes into a private
temporary execution tree. The live Node executable is independently admitted as
a direct root-owned, single-link, executable, non-group/world-writable file
without setuid or setgid mode bits, beneath trusted root-owned/non-group/world-
writable ancestry. It is retained with `O_NOFOLLOW` and executed through
inherited `/proc/self/fd/<fd>`, so the training user cannot gain root by
invoking an accidentally set-id general-purpose Node interpreter.

Installing the native executable, Python launcher, or reviewed `/opt` source
tree is a **separate privileged mutation gate** and is not performed by this PR
or its CI. CI compiles the native source only into the ephemeral runner
temporary directory and exercises `--self-test`; it does not install or
execute the production fixed path.

## Exact source binding

After the installed launcher establishes the pre-entry trust root, the live
runner also validates the Python interpreter before collector execution.
`/usr/bin/python3` may resolve through its normal root-owned system symlink,
but both the requested path ancestry and canonical target ancestry must be
root-owned and non-group/world-writable; the canonical target must be a direct
root-owned executable with one link. The runner opens that target with
`O_NOFOLLOW`, rechecks descriptor/path identity, and executes it through
inherited `/proc/self/fd/4`. The collector remains separately inherited on
descriptor 3. A later Python pathname or symlink replacement therefore cannot
redirect the privileged collector execution.

After those interpreter checks, the live runner itself is pinned by the
installed launcher to Git blob:

```text
a46cae54131bd25c25f2efb2d67c24b57a872a7e
```

The runner then binds a complete reviewed execution closure **before first
policy evaluation or collector execution**:

```text
V1 policy    6f34e79d94c502e31ca4923fd78922d4875550a5
V2 policy    db5493a513a42780865e7194580eec3b770dc8e1
V2 collector c7c63106511ee285f8f1cf79b97d32afe0424c65
custody core f9f18db5bbfeea466202ef0d7babe08c3c401d66
service      8961572ba5834371b1229f790a1960940fc74935
client       fb31dbbda76c94f0ad08e38094c151a24a78b486
```

It performs stable no-follow source reads, copies those exact bytes into a
private execution tree, imports V2 (and its V1 relative dependency) only from
that tree, and launches Python on the private collector through inherited file
descriptor `/proc/self/fd/3`. The collector's own source-binding check therefore
sees the exact private core/service/client bytes and cannot be redirected by a
later worktree pathname replacement.

The focused proof also pins historical V84/V1 tool, proof and documentation so
the successor cannot silently rewrite the earlier evidence generation. It
includes pre-import and post-preparation replacement sentinels for policy and
collector bytes.

## Two-observation rule

Both observations must:

- pass the V2 policy classifier;
- target Xiphos;
- share one boot-ID digest;
- have strictly increasing CLOCK_BOOTTIME evidence generation;
- have non-regressing realtime/observation timestamps; and
- have identical policy-critical host state after removing only observation
  time/generation fields.

The V2 policy additionally requires the socket-parent retained ancestor chain to
be root-owned, direct, symlink-free, non-group/world-writable, and to deny the
training UID rename/unlink authority through the socket parent's immediate
parent.

The corrected V2 evidence also binds the live training PID/start-time/UID and
requires the exact lexically-first action-ID-only Polkit deny rule plus explicit
non-interactive denial checks. The private execution closure therefore includes
the corrected V2 collector and policy bytes, not the earlier overclaiming
generation.

## Deliberate boundary

The current exact V2 collector is intentionally fail-closed on absolute service
control. Endpoint/Polkit observations cannot prove that the training process did
not inherit or receive a pre-authenticated system-bus descriptor, so real
collector output retains:

```text
runtime_can_control_service=null
inherited_system_bus_descriptor_absence_required=true
inherited_system_bus_descriptor_absence_proven=false
absolute_runtime_service_control_denial_proven=false
```

The pure policy therefore rejects current live collector evidence before this
runner can emit a successful live qualification. The positive path exercised by
the source self-test is synthetic contract evidence only; it is not live Xiphos
authority.

After the separately reviewed training bus-isolation lane (#2918) is installed
and independently attested, a later composition gate may supply the missing
descriptor-absence proof. Only then may a policy-qualified V2 observation report:

```text
live_host_qualification_performed=true
socket_parent_namespace_custody_live_qualified=true
verification_clock_authority_proven=true
evidence_generation_monotonicity_proven=true
```

Even that future qualified observation deliberately does **not** report
production custody ready:

```text
live_service_source_identity_required=true
live_service_source_identity_proven=false
same_live_custody_session_binding_required=true
same_live_custody_session_binding_proven=false
independent_custody_proven=false
custody_production_gate_ready=false
attempt_claimed=false
training_execution_performed=false
```

The live systemd process still needs to be bound to reviewed launcher/source
bytes before any claim path can proceed.

## Invocation

After a separately reviewed installed-host gate has placed and attested the
native executable, Python launcher, and reviewed source tree, the accepted live
entry shape is:

```bash
sudo /opt/void-apollyon-custody-v2-preentry-v1/apollyon_v2_native_preentry_v1 \
  --training-user <training-user> \
  --training-pid <live-training-pid> \
  --custody-user <custody-user> \
  --ipc-group <ipc-group> \
  --state-root /absolute/custody/state/root \
  --socket-path /absolute/custody.sock \
  --service-unit <custody-service>.service
```

The following are intentionally **not** accepted live entrypoints:

```text
sudo /usr/bin/python3 .../apollyon_v2_installed_live_launcher_v1.py ...
sudo node tools/apollyon-designated-host-custody-live-qualification-v2.mjs ...
```

The installed launcher creates one private pre-entry execution tree and binds
the Node runner's `TMPDIR` to that exact outer private root. The Node runner's
nested `void-apollyon-custody-v2-reviewed-*` dependency tree is therefore
physically contained beneath the launcher-owned `/run` tree. If the 60-second
Node deadline kills the runner before its own cleanup executes, the launcher's
parent cleanup recursively removes both layers.

Normal success and ordinary HOLD paths report the temporary-write boundary
truthfully. If either the outer launcher or inner Node runner cannot remove its
temporary reviewed tree, it instead reports:

```text
persistent_host_mutation=unknown
temporary_filesystem_cleanup_proven=false
retained_private_tree_possible=true
retained_private_tree=<exact possible retained path>
```

It never converts a cleanup error into a false
`persistent_host_mutation=false` claim.

Expected launcher runtime failures are also fail-closed and machine-readable:
Node deadline expiry, OS/path/exec failures, and other subprocess-layer failures
are converted to bounded `HOLD=apollyon_v2_installed_launcher_runtime_*`
reasons after cleanup semantics run. The timeout case is cleanup-safe because
the runner's `TMPDIR` is inside the launcher's retained outer private root.
Signal termination is also classified explicitly from a negative child
returncode as `HOLD=apollyon_v2_installed_launcher_runtime_signaled:<signal>`
after the same parent cleanup. Existing `Hold` results are preserved.
Unexpected programming exceptions are deliberately not relabeled as normal
runtime HOLDs.

No service mutation, private-key access, signing, attempt claim, training
execution, wallet/transaction operation or funds movement is granted by this
source lane.

## Next gates

Current prerequisite:

`installed_apollyon_training_bus_isolation_qualification_v1`

That separately authorized lane must install/attest the #2918 service + native
pre-entry and prove the missing inherited-system-bus descriptor boundary.

Only after that proof is composed into current V2 evidence does this runner's
qualified output advance to:

`live_custody_service_source_identity_binding_v2`

That later gate must bind the stable live MainPID and AF_UNIX session to exact
reviewed launcher/source bytes before any candidate-training claim contract is
considered.
