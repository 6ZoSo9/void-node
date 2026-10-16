#ifndef VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2_H
#define VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2_H

#include <stddef.h>
#include <sys/types.h>

#define APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2 64U

#define VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2 \
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2"

struct apollyon_claim_process_identity_v2 {
  pid_t pid;
  pid_t ppid;
  uid_t uid;
  gid_t gid;
  unsigned long long start_ticks;
  dev_t executable_dev;
  ino_t executable_ino;
  int pidfd;
};

int apollyon_claim_process_identity_observe_v2(
  pid_t pid,
  pid_t expected_ppid,
  uid_t expected_uid,
  gid_t expected_gid,
  const gid_t *expected_supplementary_gids,
  size_t expected_supplementary_gid_count,
  int expected_executable_fd,
  const unsigned char *expected_cmdline,
  size_t expected_cmdline_len,
  struct apollyon_claim_process_identity_v2 *out
);

/* Returns 0 while the retained generation is live, 1 once exited, -1 on error. */
int apollyon_claim_process_identity_pidfd_state_v2(int pidfd);

void apollyon_claim_process_identity_close_v2(
  struct apollyon_claim_process_identity_v2 *identity
);

#endif
