#ifndef VOID_APOLLYON_CLAIM_TASK_SINGLETON_GUARD_V1_H
#define VOID_APOLLYON_CLAIM_TASK_SINGLETON_GUARD_V1_H

#include "apollyon_durable_attempt_claim_native_process_identity_v2.h"

#define VOID_APOLLYON_CLAIM_TASK_SINGLETON_GUARD_V1 \
  "VOID_APOLLYON_CLAIM_TASK_SINGLETON_GUARD_V1"

struct apollyon_claim_task_singleton_observation_v1 {
  pid_t pid;
  unsigned long long start_ticks;
  dev_t proc_directory_dev;
  ino_t proc_directory_ino;
  dev_t task_directory_dev;
  ino_t task_directory_ino;
  unsigned int observed_task_count;
};

/*
 * 0: two stable singleton snapshots for an already-reviewed #3309 identity.
 * -1: reject/indeterminate, errno set. Never grants a claim/release.
 * This is NOT continuity between calls, credential-proof of every thread,
 * or authentication of the original #3309 identity by itself.
 * Consumers must invoke again at every authority-bearing protocol boundary.
 */
int apollyon_claim_task_singleton_observe_v1(
  const struct apollyon_claim_process_identity_v2 *reviewed_identity,
  struct apollyon_claim_task_singleton_observation_v1 *out
);

#endif
