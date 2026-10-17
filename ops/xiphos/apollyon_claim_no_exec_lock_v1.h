#ifndef VOID_APOLLYON_CLAIM_NO_EXEC_LOCK_V1_H
#define VOID_APOLLYON_CLAIM_NO_EXEC_LOCK_V1_H

#include "apollyon_claim_self_observed_lock_v1.h"

#define VOID_APOLLYON_CLAIM_NO_EXEC_LOCK_V1 "VOID_APOLLYON_CLAIM_NO_EXEC_LOCK_V1"

struct apollyon_claim_no_exec_lock_v1 {
  struct apollyon_claim_self_observed_lock_v1 self;
  int no_exec_filter_installed;
  int execve_and_execveat_denied;
  int same_kernel_generation_reobserved;
  int protected_expected_source_origin_proven;
  int xiphos_host_qualification_performed;
  int durable_attempt_claim_performed;
};

/*
 * Further restrict THIS process after accepted #3456 self-observed no-clone.
 * Installs TSYNC seccomp denial of execve + execveat, then re-observes exact
 * process generation. All expected policy inputs remain caller-supplied.
 *
 * On any error (including after partial irreversible restriction), discard
 * this process; NEVER retry it as a privileged claim/release process.
 * Close the retained pidfd only after a successful install.
 */
int apollyon_claim_no_exec_lock_install_v1(
  pid_t expected_ppid,
  uid_t expected_uid,
  gid_t expected_gid,
  const gid_t *expected_supplementary_gids,
  size_t expected_supplementary_gid_count,
  int expected_executable_fd,
  const unsigned char *expected_cmdline,
  size_t expected_cmdline_len,
  struct apollyon_claim_no_exec_lock_v1 *out
);
void apollyon_claim_no_exec_lock_close_v1(
  struct apollyon_claim_no_exec_lock_v1 *out
);
#endif
