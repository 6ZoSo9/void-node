# Apollyon claim peer task-set singleton guard v1

Marker: `VOID_APOLLYON_CLAIM_TASK_SINGLETON_GUARD_V1`

Status: **source/test/CI-only reusable native primitive; no Xiphos installation or claim authority**.

## Why this exists

Accepted #3309 observes the thread-group leader's PID/start/pidfd, UID/GID slots,
Groups and executable identity. Linux credentials are per-task, so the leader's
status alone cannot prove that a second live thread has no unreviewed credentials
or capabilities. A future privileged revalidator, claim publisher, or training
releaser must not promote a leader-only observation to process-wide authority.

## Exact interface

`apollyon_claim_task_singleton_observe_v1(reviewed_identity, out)` accepts a
retained `apollyon_claim_process_identity_v2` result from #3309. It performs no
process start/stop and no filesystem mutation. It requires:

- live retained pidfd at the first, middle and final observation;
- a direct `/proc` view with `fstatfs(...)=PROC_SUPER_MAGIC` at the retained root,
  PID, task-directory and `stat` descriptor boundaries;
- descriptor-relative `/proc/<pid>/stat` whose literal PID equals the expected
  PID and whose start ticks equal the already-reviewed #3309 generation;
- a retained direct task directory, opened with `O_NOFOLLOW`, with exactly one
  numeric task entry and its TID exactly equal to the reviewed PID;
- two separate task-directory enumerations, with unchanged PID start-time,
  procfs, directory dev/inode/ownership/type and live pidfd between and after;
- no additional task, inconsistent directory entry, fake procfs root, changed
  process generation, or exited/invalid pidfd.

A success returns only the observed singleton task-set PID/start and procfs
PID/task directory generations. It is **not** a durable host attestation, a
claim writer, an account/group credential proof, or runtime authorization.

## Scope of the guarantee

A singleton census is a point-in-time observation, not a permanent kernel ban
on `clone`/`clone3` or threads. A peer can create another thread after return.
Consumers must re-run this check **alongside the full reviewed identity/security
census immediately before each claim-service body read, pre-mutation boundary,
acknowledgment, or trainer-release operation**. The future integrated executable
must prevent new threads across the final security-to-mutation gap or otherwise
hold a proven no-thread-creation enforcement boundary. The caller also must
prove the incoming pidfd really originates from the reviewed #3309 observer;
this helper does not confer origin authority merely by accepting a struct.

## Hosted proof

The proof compiles the exact reviewed #3309 native source and this new module,
links a self-test-only fork/pthread harness, and exercises actual Linux pidfds:

- live one-TID process accepted;
- a second live pthread rejected while active;
- the original singleton accepted again after thread join;
- wrong PID/start generation rejected;
- invalid pidfd and exited/reaped retained pidfd rejected;
- a fake non-procfs root rejected by the fstatfs boundary;
- non-self-test executable entry always HOLDs;
- repeat builds must be byte-identical.

No test contacts Xiphos, installs a service, mutates an authorization/claim store,
reads private keys, makes a claim, releases a trainer or runs training.

## Required future authority facts

```text
singleton_task_set_observed=true  # only after source helper returns 0
continuous_single_threadedness_proven=false
process_wide_credential_authority_proven=false
protected_peer_identity_proven=false
host_installation_performed=false
durable_attempt_claim_performed=false
trainer_release_authorized=false
training_execution_performed=false
private_key_access=false
signing=false
funds_movement=false
```

PROTECT THE CORE.
