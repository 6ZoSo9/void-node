#define _GNU_SOURCE
#include "apollyon_claim_no_clone_lock_v1.h"

#include <errno.h>
#include <stddef.h>
#include <string.h>
#include <linux/audit.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <unistd.h>

#if !defined(__linux__) || !defined(__x86_64__) || \
    !defined(__NR_clone) || !defined(__NR_clone3) || \
    !defined(__NR_fork) || !defined(__NR_vfork) || \
    !defined(__NR_seccomp) || !defined(AUDIT_ARCH_X86_64)
#error reviewed_linux_x86_64_clone_syscalls_required
#endif

#ifndef __X32_SYSCALL_BIT
#define __X32_SYSCALL_BIT 0x40000000U
#endif

static int reject(int err) { errno=err; return -1; }

/* Only install after the reviewed #3441 singleton preflight has accepted self. */
int apollyon_claim_no_clone_lock_install_v1(
  const struct apollyon_claim_process_identity_v2 *id,
  struct apollyon_claim_no_clone_observation_v1 *out
) {
  if(!out || !id) return reject(EINVAL);
  memset(out,0,sizeof(*out));
  if(id->pid<=1 || id->pid!=getpid() || id->start_ticks==0 || id->pidfd<0){
    return reject(EINVAL);
  }
  if(syscall(SYS_gettid)!=(long)id->pid){
    return reject(EBUSY); /* no worker TID may install as the process leader */
  }
  struct apollyon_claim_task_singleton_observation_v1 before,after;
  if(apollyon_claim_task_singleton_observe_v1(id,&before)!=0) return -1;
  if(before.observed_task_count!=1 || before.pid!=id->pid ||
     before.start_ticks!=id->start_ticks) return reject(ESTALE);

  /* Fail-closed ABI: no compat/x32 switch can bypass the x86_64 syscall mask. */
  struct sock_filter code[]={
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS, offsetof(struct seccomp_data,arch)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, AUDIT_ARCH_X86_64, 1, 0),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_KILL_PROCESS),
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS, offsetof(struct seccomp_data,nr)),
    BPF_JUMP(BPF_JMP|BPF_JSET|BPF_K, __X32_SYSCALL_BIT, 0, 1),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO | (EPERM & SECCOMP_RET_DATA)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_clone, 0, 1),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO | (EPERM & SECCOMP_RET_DATA)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_clone3, 0, 1),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO | (EPERM & SECCOMP_RET_DATA)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_fork, 0, 1),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO | (EPERM & SECCOMP_RET_DATA)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_vfork, 0, 1),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO | (EPERM & SECCOMP_RET_DATA)),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ALLOW),
  };
  struct sock_fprog program={
    .len=(unsigned short)(sizeof(code)/sizeof(code[0])),
    .filter=code,
  };

  /* NNP may already be set by systemd; reasserting it cannot relax state. */
  if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0)!=0) return -1;
  const long result=syscall(__NR_seccomp,SECCOMP_SET_MODE_FILTER,
    SECCOMP_FILTER_FLAG_TSYNC,&program);
  if(result>0) return reject(EBUSY);  /* kernel names divergent TID */
  if(result<0) return -1;
  if(prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0)!=1) return reject(EPERM);
  if(prctl(PR_GET_SECCOMP,0,0,0,0)!=SECCOMP_MODE_FILTER) return reject(EPERM);
  if(apollyon_claim_task_singleton_observe_v1(id,&after)!=0) return -1;
  if(after.observed_task_count!=1 || after.pid!=before.pid ||
     after.start_ticks!=before.start_ticks ||
     after.proc_directory_dev!=before.proc_directory_dev ||
     after.proc_directory_ino!=before.proc_directory_ino ||
     after.task_directory_dev!=before.task_directory_dev ||
     after.task_directory_ino!=before.task_directory_ino){
    return reject(ESTALE);
  }

  out->pid=id->pid;
  out->start_ticks=id->start_ticks;
  out->singleton_before=1;
  out->singleton_after=1;
  out->no_new_privs_after=1;
  out->seccomp_mode_after=SECCOMP_MODE_FILTER;
  out->thread_sync_required=1;
  out->clone_and_fork_denied=1;
  return 0;
}
