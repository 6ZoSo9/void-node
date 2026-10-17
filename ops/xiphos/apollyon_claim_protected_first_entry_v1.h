#ifndef VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_V1_H
#define VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_V1_H

#include "apollyon_claim_no_exec_lock_v1.h"

#include <sys/types.h>

#define VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_V1 \
  "VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_V1"

struct apollyon_claim_protected_first_entry_v1 {
  struct apollyon_claim_no_exec_lock_v1 lock;
  dev_t executable_dev;
  ino_t executable_ino;
  int fixed_path_custody_verified;
  int expected_executable_fd_derived_internally;
  int expected_cmdline_derived_internally;
  int visible_generation_revalidated_after_lock;
  int protected_expected_source_origin_proven;
  int protected_parent_origin_proven;
  int xiphos_host_qualification_performed;
  int durable_attempt_claim_performed;
};

/*
 * Bind THIS process to its fixed protected executable path and actual raw
 * kernel cmdline before invoking the accepted #3459 no-clone/no-exec chain.
 *
 * No caller supplies expected executable FD, cmdline, PPid, UID/GID or
 * supplementary groups. They are derived from the running kernel generation.
 *
 * Production defaults require root-owned fixed-path custody. Test builds may
 * override the fixed path / required owner at compile time only.
 *
 * On any failure after irreversible seccomp restrictions may have begun, the
 * caller MUST discard the process and never retry it as claim authority.
 *
 * Success proves only protected expected-source origin for THIS fixed entry.
 * It does not prove parent-process origin, Xiphos installation/qualification,
 * AF_UNIX peer authority, durable claim publication, training or funds action.
 */
int apollyon_claim_protected_first_entry_install_v1(
  struct apollyon_claim_protected_first_entry_v1 *out
);

void apollyon_claim_protected_first_entry_close_v1(
  struct apollyon_claim_protected_first_entry_v1 *out
);

#endif
