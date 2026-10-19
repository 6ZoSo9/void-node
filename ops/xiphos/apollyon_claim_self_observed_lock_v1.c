#define _GNU_SOURCE
#include "apollyon_claim_self_observed_lock_v1.h"

#include <errno.h>
#include <string.h>
#include <unistd.h>

static int reject(int code) { errno=code; return -1; }

void apollyon_claim_self_observed_lock_close_v1(
  struct apollyon_claim_self_observed_lock_v1 *out
) {
  if(!out) return;
  apollyon_claim_process_identity_close_v2(&out->retained);
  out->kernel_self_generation_observed=0;
  out->no_task_creation_lock_installed=0;
}

/*
 * The expected executable FD and cmdline must originate from a later
 * root-custodied fixed first-entry layer; this function does not trust or
 * authenticate where the caller obtained them.
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
) {
  if(!out) return reject(EINVAL);
  memset(out,0,sizeof(*out));
  out->retained.pidfd=-1;
  if(expected_ppid<=0 || expected_executable_fd<0 ||
     !expected_cmdline || expected_cmdline_len<2){
    return reject(EINVAL);
  }

  const pid_t self=getpid();
  struct apollyon_claim_process_identity_v2 first;
  memset(&first,0,sizeof(first));
  first.pidfd=-1;
  if(apollyon_claim_process_identity_observe_v2(
      self,expected_ppid,expected_uid,expected_gid,
      expected_supplementary_gids,expected_supplementary_gid_count,
      expected_executable_fd,expected_cmdline,expected_cmdline_len,
      &first)!=0) return -1;

  struct apollyon_claim_no_clone_observation_v1 locked;
  memset(&locked,0,sizeof(locked));
  if(apollyon_claim_no_clone_lock_install_v1(&first,&locked)!=0){
    const int saved=errno?errno:EPERM;
    apollyon_claim_process_identity_close_v2(&first);
    return reject(saved);
  }

  struct apollyon_claim_process_identity_v2 second;
  memset(&second,0,sizeof(second));
  second.pidfd=-1;
  if(apollyon_claim_process_identity_observe_v2(
      self,expected_ppid,expected_uid,expected_gid,
      expected_supplementary_gids,expected_supplementary_gid_count,
      expected_executable_fd,expected_cmdline,expected_cmdline_len,
      &second)!=0){
    const int saved=errno?errno:ESTALE;
    apollyon_claim_process_identity_close_v2(&first);
    return reject(saved);
  }

  const int same=(
    first.pid==self && second.pid==self &&
    first.ppid==expected_ppid && second.ppid==first.ppid &&
    first.uid==expected_uid && second.uid==first.uid &&
    first.gid==expected_gid && second.gid==first.gid &&
    first.start_ticks>0 && second.start_ticks==first.start_ticks &&
    first.executable_dev==second.executable_dev &&
    first.executable_ino==second.executable_ino &&
    locked.pid==self && locked.start_ticks==first.start_ticks &&
    locked.singleton_before==1 && locked.singleton_after==1 &&
    locked.no_new_privs_after==1 && locked.thread_sync_required==1 &&
    locked.clone_and_fork_denied==1 &&
    apollyon_claim_process_identity_pidfd_state_v2(first.pidfd)==0 &&
    apollyon_claim_process_identity_pidfd_state_v2(second.pidfd)==0
  );
  apollyon_claim_process_identity_close_v2(&second);
  if(!same){
    apollyon_claim_process_identity_close_v2(&first);
    return reject(ESTALE);
  }
  out->retained=first;  /* transfer the live retained pidfd */
  out->lock=locked;
  out->kernel_self_generation_observed=1;
  out->no_task_creation_lock_installed=1;
  /* These fields must remain false: this is not protected origin. */
  out->protected_expected_source_origin_proven=0;
  out->xiphos_host_qualification_performed=0;
  out->durable_attempt_claim_performed=0;
  return 0;
}
