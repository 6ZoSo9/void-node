#ifndef VOID_APOLLYON_CLAIM_SELF_OBSERVED_LOCK_V1_H
#define VOID_APOLLYON_CLAIM_SELF_OBSERVED_LOCK_V1_H

#include "apollyon_claim_no_clone_lock_v1.h"

#define VOID_APOLLYON_CLAIM_SELF_OBSERVED_LOCK_V1 \
  "VOID_APOLLYON_CLAIM_SELF_OBSERVED_LOCK_V1"

struct apollyon_claim_self_observed_lock_v1 {
  struct apollyon_claim_process_identity_v2 retained;
  struct apollyon_claim_no_clone_observation_v1 lock;
  int kernel_self_generation_observed;
  int no_task_creation_lock_installed;
  int protected_expected_source_origin_proven;
  int xiphos_host_qualification_performed;
  int durable_attempt_claim_performed;
};

/*
 * Bind caller-supplied EXPECTED policy to an actual SELF process generation
 * using #3309's procfs+pidfd+executable+cmdline observer, install #3454's
 * irreversible task-creation guard, and independently re-observe SELF.
 *
 * EXPECTED source/executable FD and cmdline origin is not established here.
 * On any error after restriction may have begun: discard this process.
 * Success does not authorize a claim, release, training, or host action.
 * Caller owns retained.pidfd on success and must close it.
 */
int apollyon_claim_self_observed_lock_install_v1(
  pid_t expected_ppid,
  uid_t expected_uid,
  gid_t expected_gid,
  const gid_t *expected_supplementary_gids,
  size_t expected_supplementary_gid_count,
  int expected_executable_fd,
  const unsigned char *expected_cmdline,
  size_t expected_cmdline_len,
  struct apollyon_claim_self_observed_lock_v1 *out
);

void apollyon_claim_self_observed_lock_close_v1(
  struct apollyon_claim_self_observed_lock_v1 *out
);
#endif
