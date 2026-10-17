#ifndef VOID_APOLLYON_CLAIM_NO_CLONE_LOCK_V1_H
#define VOID_APOLLYON_CLAIM_NO_CLONE_LOCK_V1_H

#include "apollyon_claim_task_singleton_guard_v1.h"

#define VOID_APOLLYON_CLAIM_NO_CLONE_LOCK_V1 \
  "VOID_APOLLYON_CLAIM_NO_CLONE_LOCK_V1"

struct apollyon_claim_no_clone_observation_v1 {
  pid_t pid;
  unsigned long long start_ticks;
  unsigned int singleton_before;
  unsigned int singleton_after;
  int no_new_privs_after;
  int seccomp_mode_after;
  int thread_sync_required;
  int clone_and_fork_denied;
};

/*
 * Installs an irreversible process security restriction on THIS process.
 * 0: reviewed SELF process singleton before/after successful TSYNC filter.
 * -1: HOLD/error. A failed call may still have enabled no_new_privs or an
 * installed filter; callers must discard this process, not retry as authority.
 *
 * Does not prove caller's reviewed identity origin, protected host source,
 * thread-creation continuity before installation, or claim/release authority.
 */
int apollyon_claim_no_clone_lock_install_v1(
  const struct apollyon_claim_process_identity_v2 *reviewed_identity,
  struct apollyon_claim_no_clone_observation_v1 *out
);

#endif
