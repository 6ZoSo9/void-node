#define _GNU_SOURCE
#include "apollyon_claim_no_exec_lock_v1.h"

#include <errno.h>
#include <linux/audit.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <stddef.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <unistd.h>

#if !defined(__linux__) || !defined(__x86_64__) || \
    !defined(__NR_execve) || !defined(__NR_execveat) || \
    !defined(__NR_seccomp) || !defined(AUDIT_ARCH_X86_64)
#error reviewed_linux_x86_64_exec_syscalls_required
#endif

#ifndef __X32_SYSCALL_BIT
#define __X32_SYSCALL_BIT 0x40000000U
#endif

static int reject(int code) { errno=code; return -1; }

void apollyon_claim_no_exec_lock_close_v1(
  struct apollyon_claim_no_exec_lock_v1 *out
) {
  if(!out) return;
  apollyon_claim_self_observed_lock_close_v1(&out->self);
  out->no_exec_filter_installed=0;
  out->execve_and_execveat_denied=0;
  out->same_kernel_generation_reobserved=0;
}

int apollyon_claim_no_exec_lock_install_v1(
  pid_t expected_ppid, uid_t expected_uid, gid_t expected_gid,
  const gid_t *expected_supplementary_gids,
  size_t expected_supplementary_gid_count,
  int expected_executable_fd,
  const unsigned char *expected_cmdline,
  size_t expected_cmdline_len,
  struct apollyon_claim_no_exec_lock_v1 *out
) {
  if(!out) return reject(EINVAL);
  memset(out,0,sizeof(*out));
  out->self.retained.pidfd=-1;

  struct apollyon_claim_self_observed_lock_v1 first;
  memset(&first,0,sizeof(first));
  first.retained.pidfd=-1;
  if(apollyon_claim_self_observed_lock_install_v1(
       expected_ppid,expected_uid,expected_gid,
       expected_supplementary_gids,expected_supplementary_gid_count,
       expected_executable_fd,expected_cmdline,expected_cmdline_len,
       &first)!=0) return -1;

  /* #3456 already rejects non-leader callers and all secondary threads. */
  if(syscall(SYS_gettid)!=(long)first.retained.pid){
    const int saved=errno?errno:EPERM;
    apollyon_claim_self_observed_lock_close_v1(&first);
    return reject(saved);
  }
  const struct sock_filter instructions[]={
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,arch)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,AUDIT_ARCH_X86_64,1,0),
    BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_KILL_PROCESS),
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,nr)),
    BPF_JUMP(BPF_JMP|BPF_JSET|BPF_K,__X32_SYSCALL_BIT,0,1),
    BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_execve,0,1),
    BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_execveat,0,1),
    BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
    BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ALLOW),
  };
  struct sock_fprog program={
    .len=(unsigned short)(sizeof(instructions)/sizeof(instructions[0])),
    .filter=(struct sock_filter *)instructions,
  };

  /* Restrictions are monotonic; TSYNC must succeed exactly, not partially. */
  if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0)!=0){
    const int saved=errno;
    apollyon_claim_self_observed_lock_close_v1(&first);
    return reject(saved);
  }
  const long install=syscall(__NR_seccomp,SECCOMP_SET_MODE_FILTER,
    SECCOMP_FILTER_FLAG_TSYNC,&program);
  if(install!=0){
    const int saved=install>0?EBUSY:(errno?errno:EPERM);
    apollyon_claim_self_observed_lock_close_v1(&first);
    return reject(saved);
  }
  if(prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0)!=1 ||
     prctl(PR_GET_SECCOMP,0,0,0,0)!=SECCOMP_MODE_FILTER){
    apollyon_claim_self_observed_lock_close_v1(&first);
    return reject(EPERM);
  }

  struct apollyon_claim_process_identity_v2 second;
  memset(&second,0,sizeof(second));
  second.pidfd=-1;
  if(apollyon_claim_process_identity_observe_v2(
       getpid(),expected_ppid,expected_uid,expected_gid,
       expected_supplementary_gids,expected_supplementary_gid_count,
       expected_executable_fd,expected_cmdline,expected_cmdline_len,
       &second)!=0){
    const int saved=errno?errno:ESTALE;
    apollyon_claim_self_observed_lock_close_v1(&first);
    return reject(saved);
  }
  const int exact=(
    first.retained.pid==getpid() && second.pid==first.retained.pid &&
    first.retained.ppid==expected_ppid && second.ppid==first.retained.ppid &&
    second.uid==first.retained.uid && second.gid==first.retained.gid &&
    second.start_ticks==first.retained.start_ticks &&
    second.executable_dev==first.retained.executable_dev &&
    second.executable_ino==first.retained.executable_ino &&
    apollyon_claim_process_identity_pidfd_state_v2(first.retained.pidfd)==0 &&
    apollyon_claim_process_identity_pidfd_state_v2(second.pidfd)==0
  );
  apollyon_claim_process_identity_close_v2(&second);
  if(!exact){
    apollyon_claim_self_observed_lock_close_v1(&first);
    return reject(ESTALE);
  }

  out->self=first;  /* Transfer the retained live pidfd only on success. */
  out->no_exec_filter_installed=1;
  out->execve_and_execveat_denied=1;
  out->same_kernel_generation_reobserved=1;
  out->protected_expected_source_origin_proven=0;
  out->xiphos_host_qualification_performed=0;
  out->durable_attempt_claim_performed=0;
  return 0;
}
