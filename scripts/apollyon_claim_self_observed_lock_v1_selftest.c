#define _GNU_SOURCE
#include "apollyon_claim_self_observed_lock_v1.h"

#include <errno.h>
#include <fcntl.h>
#include <linux/seccomp.h>
#include <pthread.h>
#include <sched.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define CMD_CAP 4096
struct thread_gate { atomic_int ready; atomic_int stop; };

static void *hold_thread(void *ctx){
  struct thread_gate *g=(struct thread_gate *)ctx;
  atomic_store(&g->ready,1);
  while(!atomic_load(&g->stop)) sched_yield();
  return NULL;
}
static void *null_thread(void *ctx){(void)ctx; return NULL;}

static int read_self_cmdline(unsigned char buf[CMD_CAP], size_t *len){
  const int fd=open("/proc/self/cmdline",O_RDONLY|O_CLOEXEC);
  if(fd<0) return -1;
  size_t n=0;
  while(n<CMD_CAP){
    const ssize_t k=read(fd,buf+n,CMD_CAP-n);
    if(k<0&&errno==EINTR)continue;
    if(k<0){close(fd);return -1;}
    if(k==0)break;
    n+=(size_t)k;
  }
  if(close(fd)!=0 || n<2 || n==CMD_CAP)return -1;
  *len=n;
  return 0;
}

static int run_case(int scenario){
  unsigned char cmd[CMD_CAP];
  size_t cmdlen=0;
  if(read_self_cmdline(cmd,&cmdlen)!=0)return 1;
  const int fd=open(scenario==3?"/dev/null":"/proc/self/exe",O_RDONLY|O_CLOEXEC);
  if(fd<0)return 2;
  gid_t groups[APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2];
  const int n=getgroups((int)(sizeof(groups)/sizeof(groups[0])),groups);
  if(n<0){close(fd);return 3;}
  size_t group_count=(size_t)n;
  if(scenario==6){groups[0]=(gid_t)65531;group_count=1;}
  if(scenario==4)cmd[0]^=0x20;

  pid_t ppid=getppid();
  uid_t uid=geteuid();
  if(scenario==1)ppid+=1;
  if(scenario==2)uid+=1;

  struct thread_gate gate={0};
  pthread_t active_thread;
  int active=0;
  if(scenario==5){
    if(pthread_create(&active_thread,NULL,hold_thread,&gate)!=0){close(fd);return 4;}
    active=1;
    while(!atomic_load(&gate.ready))sched_yield();
  }

  struct apollyon_claim_self_observed_lock_v1 result;
  const int rc=apollyon_claim_self_observed_lock_install_v1(
    ppid,uid,getegid(),groups,group_count,fd,cmd,cmdlen,&result
  );
  if(active){
    atomic_store(&gate.stop,1);
    if(pthread_join(active_thread,NULL)!=0){close(fd);return 5;}
  }
  if(close(fd)!=0)return 6;

  if(scenario!=0){
    if(rc==0){apollyon_claim_self_observed_lock_close_v1(&result);return 7;}
    return 0;
  }
  if(rc!=0)return 8;
  if(result.retained.pid!=getpid() ||
     result.retained.start_ticks==0 ||
     result.retained.pidfd<0 ||
     result.lock.pid!=getpid() ||
     result.lock.start_ticks!=result.retained.start_ticks ||
     result.lock.seccomp_mode_after!=SECCOMP_MODE_FILTER ||
     result.lock.thread_sync_required!=1 ||
     result.kernel_self_generation_observed!=1 ||
     result.no_task_creation_lock_installed!=1 ||
     result.protected_expected_source_origin_proven!=0 ||
     result.xiphos_host_qualification_performed!=0 ||
     result.durable_attempt_claim_performed!=0){
    apollyon_claim_self_observed_lock_close_v1(&result);
    return 9;
  }
  errno=0;
  if(syscall(SYS_fork)!=-1 || errno!=EPERM){
    apollyon_claim_self_observed_lock_close_v1(&result);
    return 10;
  }
  errno=0;
  if(syscall(SYS_clone3,NULL,0)!=-1 || errno!=EPERM){
    apollyon_claim_self_observed_lock_close_v1(&result);
    return 11;
  }
  pthread_t not_created;
  if(pthread_create(&not_created,NULL,null_thread,NULL)==0){
    pthread_join(not_created,NULL);
    apollyon_claim_self_observed_lock_close_v1(&result);
    return 12;
  }
  if(apollyon_claim_process_identity_pidfd_state_v2(result.retained.pidfd)!=0){
    apollyon_claim_self_observed_lock_close_v1(&result);
    return 13;
  }
  apollyon_claim_self_observed_lock_close_v1(&result);
  if(result.retained.pidfd!=-1)return 14;
  return 0;
}
static int run_forked_case(int scenario){
  const pid_t pid=fork();
  if(pid<0)return -1;
  if(pid==0)_exit(run_case(scenario));
  int status=0;
  pid_t w;
  do{w=waitpid(pid,&status,0);}while(w<0&&errno==EINTR);
  if(w!=pid || !WIFEXITED(status) || WEXITSTATUS(status)!=0)return -1;
  return 0;
}

int main(int argc,char **argv){
  if(argc!=2 || strcmp(argv[1],"--self-test")!=0){
    fputs("HOLD=source_only_self_test_only\n",stderr);
    return 2;
  }
  for(int scenario=0;scenario<=6;++scenario){
    if(run_forked_case(scenario)!=0){
      fprintf(stderr,"HOLD=self_case_failed_%d\n",scenario);
      return 1;
    }
  }
  puts("VOID_APOLLYON_CLAIM_SELF_OBSERVED_LOCK_V1_PROOF_GREEN");
  puts("same_process_kernel_identity_observed=true");
  puts("expected_parent_uid_executable_cmdline_groups_checked=true");
  puts("post_filter_independent_generation_reobservation=true");
  puts("invalid_source_parent_uid_groups_rejected=true");
  puts("preexisting_second_thread_rejected=true");
  puts("no_clone_filter_fork_clone3_pthread_denial=true");
  puts("protected_expected_source_origin_proven=false");
  puts("xiphos_host_qualification_performed=false");
  puts("durable_attempt_claim_performed=false");
  puts("training_execution_performed=false");
  puts("funds_movement=false");
  return 0;
}
