#define _GNU_SOURCE
#include "apollyon_claim_no_clone_lock_v1.h"
#include <errno.h>
#include <linux/sched.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <unistd.h>

static atomic_int ready=0,done=0;
static void *worker(void *arg){
  (void)arg;
  atomic_store_explicit(&ready,1,memory_order_release);
  while(!atomic_load_explicit(&done,memory_order_acquire))usleep(1000);
  return NULL;
}
static unsigned long long self_start_ticks(void){
  FILE *f=fopen("/proc/self/stat","r");
  if(!f)return 0;
  char buf[8192];size_t n=fread(buf,1,sizeof(buf)-1,f);
  if(fclose(f)!=0||n==0||n>=sizeof(buf)-1)return 0;
  buf[n]='\0';
  char *tail=strrchr(buf,')');
  if(!tail||tail[1]!=' ')return 0;
  char *context=NULL;
  char *field=strtok_r(tail+2," ",&context);
  for(int i=0;field;i++,field=strtok_r(NULL," ",&context))if(i==19){
    errno=0;char *end=NULL;
    unsigned long long ticks=strtoull(field,&end,10);
    return errno==0&&end!=field&&*end=='\0'?ticks:0;
  }
  return 0;
}
static int raw_denied(long nr){
  errno=0;
  long rc=syscall(nr,0L,0L,0L,0L,0L);
  if(rc==0)_exit(98); /* broken guard: never continue in accidental child */
  if(rc>0){waitpid((pid_t)rc,NULL,0);return -1;}
  return errno==EPERM?0:-1;
}
static int child_tests(void){
  struct apollyon_claim_process_identity_v2 identity={0};
  identity.pid=getpid();
  identity.ppid=getppid();
  identity.start_ticks=self_start_ticks();
  identity.pidfd=(int)syscall(SYS_pidfd_open,identity.pid,0);
  if(identity.pidfd<0||identity.start_ticks==0)return 10;
  struct apollyon_claim_no_clone_observation_v1 obs={0};
  struct apollyon_claim_process_identity_v2 incorrect=identity;
  incorrect.pid+=1;
  if(apollyon_claim_no_clone_lock_install_v1(&incorrect,&obs)==0)return 11;
  incorrect=identity;incorrect.start_ticks+=1;
  if(apollyon_claim_no_clone_lock_install_v1(&incorrect,&obs)==0)return 12;
  puts("wrong_process_generation_rejected=true");

  int initial_nnp=prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0);
  int initial_seccomp=prctl(PR_GET_SECCOMP,0,0,0,0);
  if(initial_nnp<0||initial_seccomp<0)return 13;
  pthread_t tid;
  if(pthread_create(&tid,NULL,worker,NULL)!=0)return 13;
  for(int n=0;!atomic_load_explicit(&ready,memory_order_acquire)&&n<10000;n++)usleep(1000);
  if(!atomic_load_explicit(&ready,memory_order_acquire))return 14;
  errno=0;
  if(apollyon_claim_no_clone_lock_install_v1(&identity,&obs)==0||errno!=EBUSY)return 15;
  if(prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0)!=initial_nnp||
     prctl(PR_GET_SECCOMP,0,0,0,0)!=initial_seccomp)return 26;
  atomic_store_explicit(&done,1,memory_order_release);
  if(pthread_join(tid,NULL)!=0)return 16;
  puts("preexisting_second_thread_rejected=true");
  puts("multithread_rejection_does_not_install_filter=true");

  if(apollyon_claim_no_clone_lock_install_v1(&identity,&obs)!=0){
    fprintf(stderr,"install_errno=%d\n",errno);return 17;
  }
  if(obs.pid!=identity.pid||obs.start_ticks!=identity.start_ticks||
     obs.singleton_before!=1||obs.singleton_after!=1||
     obs.no_new_privs_after!=1||obs.seccomp_mode_after!=2||
     obs.thread_sync_required!=1||obs.clone_and_fork_denied!=1)return 18;
  puts("singleton_seccomp_tsync_installed=true");
  if(raw_denied(SYS_clone)!=0)return 19;
  if(raw_denied(SYS_clone3)!=0)return 20;
  if(raw_denied(SYS_fork)!=0)return 21;
  if(raw_denied(SYS_vfork)!=0)return 22;
  if(raw_denied(SYS_clone|0x40000000U)!=0)return 23;
  puts("clone_clone3_fork_vfork_x32_denied=true");
  atomic_store(&done,0);
  int attempt=pthread_create(&tid,NULL,worker,NULL);
  if(attempt==0){atomic_store(&done,1);pthread_join(tid,NULL);return 24;}
  puts("pthread_create_denied=true");
  if(syscall(SYS_getpid)!=identity.pid||prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0)!=1||
     prctl(PR_GET_SECCOMP,0,0,0,0)!=2)return 25;
  puts("noncreation_syscall_alive=true");
  close(identity.pidfd);
  return 0;
}
int main(int argc,char **argv){
  if(argc!=2||strcmp(argv[1],"--self-test")!=0){
    fputs("HOLD=source_only_self_test_only\n",stderr);
    return 2;
  }
  pid_t child=fork();
  if(child<0)return 3;
  if(child==0){
    int code=child_tests();
    fflush(stdout);fflush(stderr);
    _exit(code);
  }
  int status=0;
  if(waitpid(child,&status,0)!=child||!WIFEXITED(status)||WEXITSTATUS(status)!=0){
    fprintf(stderr,"child_status=%d exit=%d\n",status,WIFEXITED(status)?WEXITSTATUS(status):-1);
    return 4;
  }
  puts("VOID_APOLLYON_CLAIM_NO_CLONE_LOCK_V1_PROOF_GREEN");
  puts("self_process_singleton_before_after=true");
  puts("seccomp_tsync_no_new_privs=true");
  puts("continuous_clone_fork_syscall_denial_in_self_process=true");
  puts("protected_caller_origin_proven=false");
  puts("host_installation_performed=false");
  puts("durable_attempt_claim_performed=false");
  puts("training_execution_performed=false");
  puts("funds_movement=false");
  return 0;
}
