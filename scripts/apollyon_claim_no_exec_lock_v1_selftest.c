#define _GNU_SOURCE
#include "apollyon_claim_no_exec_lock_v1.h"

#include <errno.h>
#include <fcntl.h>
#include <linux/seccomp.h>
#include <pthread.h>
#include <sched.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <unistd.h>

#define CMD_CAP 4096
struct thread_gate { atomic_int ready; atomic_int stop; };

static void *idle_thread(void *arg) {
  struct thread_gate *gate=(struct thread_gate *)arg;
  atomic_store(&gate->ready,1);
  while(!atomic_load(&gate->stop)) sched_yield();
  return NULL;
}
static int read_cmdline(unsigned char buf[CMD_CAP], size_t *used){
  int fd=open("/proc/self/cmdline",O_RDONLY|O_CLOEXEC);
  if(fd<0)return -1;
  size_t n=0;
  while(n<CMD_CAP){
    ssize_t k=read(fd,buf+n,CMD_CAP-n);
    if(k<0&&errno==EINTR)continue;
    if(k<0){close(fd);return -1;}
    if(k==0)break;
    n+=(size_t)k;
  }
  if(close(fd)!=0 || n<2 || n==CMD_CAP)return -1;
  *used=n;
  return 0;
}
static int one_case(int scenario){
  unsigned char cmd[CMD_CAP];
  size_t cmdlen=0;
  if(read_cmdline(cmd,&cmdlen)!=0)return 1;
  int exe_fd=open(scenario==3?"/dev/null":"/proc/self/exe",O_RDONLY|O_CLOEXEC);
  if(exe_fd<0)return 2;
  gid_t groups[APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2];
  int n=getgroups((int)(sizeof(groups)/sizeof(groups[0])),groups);
  if(n<0){close(exe_fd);return 3;}
  size_t group_count=(size_t)n;
  if(scenario==6){groups[0]=(gid_t)65531;group_count=1;}
  if(scenario==4)cmd[0]^=0x20;

  pid_t ppid=getppid();
  uid_t uid=geteuid();
  if(scenario==1)ppid++;
  if(scenario==2)uid++;

  struct thread_gate gate={0};
  pthread_t thread;
  int spawned=0;
  if(scenario==5){
    if(pthread_create(&thread,NULL,idle_thread,&gate)!=0){close(exe_fd);return 4;}
    spawned=1;
    while(!atomic_load(&gate.ready))sched_yield();
  }

  struct apollyon_claim_no_exec_lock_v1 lock;
  int rc=apollyon_claim_no_exec_lock_install_v1(
    ppid,uid,getegid(),groups,group_count,exe_fd,cmd,cmdlen,&lock
  );
  if(spawned){
    atomic_store(&gate.stop,1);
    if(pthread_join(thread,NULL)!=0){close(exe_fd);return 5;}
  }
  if(close(exe_fd)!=0)return 6;
  if(scenario!=0){
    if(rc==0){apollyon_claim_no_exec_lock_close_v1(&lock);return 7;}
    return 0;
  }
  if(rc!=0)return 8;
  if(lock.self.retained.pid!=getpid() ||
     lock.self.retained.start_ticks==0 ||
     lock.self.retained.pidfd<0 ||
     lock.self.kernel_self_generation_observed!=1 ||
     lock.self.no_task_creation_lock_installed!=1 ||
     lock.no_exec_filter_installed!=1 ||
     lock.execve_and_execveat_denied!=1 ||
     lock.same_kernel_generation_reobserved!=1 ||
     lock.protected_expected_source_origin_proven!=0 ||
     lock.xiphos_host_qualification_performed!=0 ||
     lock.durable_attempt_claim_performed!=0 ||
     prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0)!=1 ||
     prctl(PR_GET_SECCOMP,0,0,0,0)!=SECCOMP_MODE_FILTER){
    apollyon_claim_no_exec_lock_close_v1(&lock);
    return 9;
  }
  char *const argv[]={"/bin/false",NULL};
  char *const envp[]={NULL};

  errno=0;
  if(syscall(SYS_execve,"/bin/false",argv,envp)!=-1 || errno!=EPERM){
    apollyon_claim_no_exec_lock_close_v1(&lock);
    return 10;
  }
  errno=0;
  if(syscall(SYS_execveat,AT_FDCWD,"/bin/false",argv,envp,0)!=-1 ||
     errno!=EPERM){
    apollyon_claim_no_exec_lock_close_v1(&lock);
    return 11;
  }
  int fd=open("/bin/false",O_PATH|O_CLOEXEC);
  if(fd<0){apollyon_claim_no_exec_lock_close_v1(&lock);return 12;}
  errno=0;
  int denied=(syscall(SYS_execveat,fd,"",argv,envp,AT_EMPTY_PATH)==-1 &&
              errno==EPERM);
  if(close(fd)!=0 || !denied){
    apollyon_claim_no_exec_lock_close_v1(&lock);
    return 13;
  }
  errno=0;
  if(syscall(SYS_fork)!=-1 || errno!=EPERM){
    apollyon_claim_no_exec_lock_close_v1(&lock);
    return 14;
  }
  errno=0;
  if(syscall(SYS_clone3,NULL,0)!=-1 || errno!=EPERM){
    apollyon_claim_no_exec_lock_close_v1(&lock);
    return 15;
  }
  if(apollyon_claim_process_identity_pidfd_state_v2(lock.self.retained.pidfd)!=0){
    apollyon_claim_no_exec_lock_close_v1(&lock);
    return 16;
  }
  apollyon_claim_no_exec_lock_close_v1(&lock);
  if(lock.self.retained.pidfd!=-1)return 17;
  return 0;
}
static int forked_case(int scenario){
  pid_t pid=fork();
  if(pid<0)return -1;
  if(pid==0)_exit(one_case(scenario));
  int status=0;
  pid_t w;
  do{w=waitpid(pid,&status,0);}while(w<0&&errno==EINTR);
  if(w!=pid||!WIFEXITED(status)||WEXITSTATUS(status)!=0){
    fprintf(stderr,"case_%d_exit=%d\n",scenario,
      WIFEXITED(status)?WEXITSTATUS(status):-1);
    return -1;
  }
  return 0;
}
int main(int argc,char **argv){
  if(argc!=2||strcmp(argv[1],"--self-test")!=0){
    fputs("HOLD=source_only_self_test_only\n",stderr);
    return 2;
  }
  for(int i=0;i<=6;i++){
    if(forked_case(i)!=0){
      fprintf(stderr,"HOLD=no_exec_scenario_%d\n",i);
      return 1;
    }
  }
  puts("VOID_APOLLYON_CLAIM_NO_EXEC_LOCK_V1_PROOF_GREEN");
  puts("self_observed_no_clone_parent_bound=true");
  puts("execve_and_execveat_denied=true");
  puts("execveat_empty_path_denied=true");
  puts("no_new_tasks_still_denied=true");
  puts("post_lock_same_process_generation_reobserved=true");
  puts("wrong_ppid_uid_exe_cmdline_groups_and_multithread_rejected=true");
  puts("protected_expected_source_origin_proven=false");
  puts("xiphos_host_qualification_performed=false");
  puts("durable_attempt_claim_performed=false");
  puts("training_execution_performed=false");
  puts("funds_movement=false");
  return 0;
}
