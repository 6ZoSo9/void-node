#define _GNU_SOURCE
#include "apollyon_claim_task_singleton_guard_v1.h"

#include <errno.h>
#include <poll.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <unistd.h>

#ifdef VOID_APOLLYON_TASKSET_LOCAL_TEST_STUB
int apollyon_claim_process_identity_pidfd_state_v2(int pidfd){
  if(pidfd<0){errno=EBADF;return -1;}
  struct pollfd p={.fd=pidfd,.events=POLLIN};
  int n=poll(&p,1,0);
  if(n<0)return -1;
  if(n==0)return 0;
  if(p.revents&(POLLERR|POLLNVAL)){errno=EBADF;return -1;}
  if(p.revents&(POLLIN|POLLHUP))return 1;
  errno=EPROTO;return -1;
}
#endif

static atomic_int worker_done=0;
static void *worker_main(void *arg){
  (void)arg;
  while(!atomic_load_explicit(&worker_done,memory_order_acquire))usleep(1000);
  return NULL;
}
static int exact_read(int fd,char *out){
  for(;;){
    ssize_t n=read(fd,out,1);
    if(n==1)return 0;
    if(n<0&&errno==EINTR)continue;
    return -1;
  }
}
static int exact_write(int fd,char ch){
  for(;;){
    ssize_t n=write(fd,&ch,1);
    if(n==1)return 0;
    if(n<0&&errno==EINTR)continue;
    return -1;
  }
}
static int child_main(int read_fd,int write_fd){
  pthread_t tid;
  int worker_active=0;
  if(exact_write(write_fd,'r')!=0)return 11;
  for(;;){
    char command=0;
    if(exact_read(read_fd,&command)!=0)return 12;
    if(command=='T'&&!worker_active){
      atomic_store(&worker_done,0);
      if(pthread_create(&tid,NULL,worker_main,NULL)!=0)return 13;
      worker_active=1;
      if(exact_write(write_fd,'t')!=0)return 14;
    }else if(command=='U'&&worker_active){
      atomic_store(&worker_done,1);
      if(pthread_join(tid,NULL)!=0)return 15;
      worker_active=0;
      if(exact_write(write_fd,'u')!=0)return 16;
    }else if(command=='Q'&&!worker_active){
      if(exact_write(write_fd,'q')!=0)return 17;
      return 0;
    }else return 18;
  }
}
static unsigned long long read_start(pid_t pid){
  char path[64],buf[8192];
  if(snprintf(path,sizeof(path),"/proc/%ld/stat",(long)pid)>=(int)sizeof(path))return 0;
  FILE *f=fopen(path,"r");
  if(!f)return 0;
  size_t n=fread(buf,1,sizeof(buf)-1,f);
  if(fclose(f)!=0||n==0||n>=sizeof(buf)-1)return 0;
  buf[n]='\0';
  char *end=strrchr(buf,')');
  if(!end||end[1]!=' ')return 0;
  char *ctx=NULL;
  char *field=strtok_r(end+2," ",&ctx);
  for(int i=0;field;i++,field=strtok_r(NULL," ",&ctx))if(i==19){
    char *tail=NULL;
    unsigned long long value=strtoull(field,&tail,10);
    return tail&&*tail=='\0'?value:0;
  }
  return 0;
}
static int send_ack(int to_child,int from_child,char command,char expected){
  char got=0;
  return exact_write(to_child,command)==0&&exact_read(from_child,&got)==0&&got==expected?0:-1;
}
static int run_test(void){
  int commands[2]={-1,-1},replies[2]={-1,-1};
  int status=0,pidfd=-1;
  pid_t child=-1;
  if(pipe(commands)!=0||pipe(replies)!=0)return 20;
  child=fork();
  if(child<0)return 21;
  if(child==0){
    close(commands[1]);close(replies[0]);
    int rc=child_main(commands[0],replies[1]);
    _exit(rc);
  }
  close(commands[0]);close(replies[1]);
  char ready=0;
  if(exact_read(replies[0],&ready)!=0||ready!='r'){status=22;goto done;}
  pidfd=(int)syscall(SYS_pidfd_open,child,0);
  if(pidfd<0){status=23;goto done;}
  struct apollyon_claim_process_identity_v2 id={0};
  id.pid=child;
  id.ppid=getpid();
  id.start_ticks=read_start(child);
  id.pidfd=pidfd;
  if(id.start_ticks==0){status=24;goto done;}
  struct apollyon_claim_task_singleton_observation_v1 observed;
  const char *fake=getenv("VOID_APOLLYON_TEST_EXPECT_FAKE_PROCFS");
  if(fake&&strcmp(fake,"1")==0){
    if(apollyon_claim_task_singleton_observe_v1(&id,&observed)==0){status=25;goto done;}
    if(send_ack(commands[1],replies[0],'Q','q')!=0){status=26;goto done;}
    puts("fake_procfs_rejected=true");
    goto done;
  }
  if(apollyon_claim_task_singleton_observe_v1(&id,&observed)!=0||
     observed.pid!=child||observed.start_ticks!=id.start_ticks||
     observed.observed_task_count!=1){status=27;goto done;}
  puts("singleton_child_accepted=true");
  if(send_ack(commands[1],replies[0],'T','t')!=0){status=28;goto done;}
  errno=0;
  if(apollyon_claim_task_singleton_observe_v1(&id,&observed)==0||errno!=EBUSY){status=29;goto done;}
  puts("second_live_tid_rejected=true");
  if(send_ack(commands[1],replies[0],'U','u')!=0){status=30;goto done;}
  if(apollyon_claim_task_singleton_observe_v1(&id,&observed)!=0){status=31;goto done;}
  puts("singleton_reaccepted_after_join=true");
  id.start_ticks++;
  if(apollyon_claim_task_singleton_observe_v1(&id,&observed)==0){status=32;goto done;}
  puts("wrong_start_generation_rejected=true");
  id.start_ticks--;
  id.pidfd=-1;
  if(apollyon_claim_task_singleton_observe_v1(&id,&observed)==0){status=33;goto done;}
  id.pidfd=pidfd;
  puts("invalid_pidfd_rejected=true");
  if(send_ack(commands[1],replies[0],'Q','q')!=0){status=34;goto done;}
  int child_status=0;
  if(waitpid(child,&child_status,0)!=child||!WIFEXITED(child_status)||WEXITSTATUS(child_status)!=0){status=35;goto done;}
  child=-1;
  if(apollyon_claim_task_singleton_observe_v1(&id,&observed)==0){status=36;goto done;}
  puts("exited_pidfd_rejected=true");
done:
  if(child>0){kill(child,SIGKILL);waitpid(child,NULL,0);}
  if(pidfd>=0)close(pidfd);
  close(commands[1]);close(replies[0]);
  if(status!=0)fprintf(stderr,"self_test_subcode=%d errno=%d\n",status,errno);
  return status;
}
int main(int argc,char **argv){
  if(argc!=2||strcmp(argv[1],"--self-test")!=0){
    fputs("HOLD=source_only_self_test_only\n",stderr);
    return 2;
  }
  int result=run_test();
  if(result!=0)return result;
  puts("VOID_APOLLYON_CLAIM_TASK_SINGLETON_GUARD_V1_PROOF_GREEN");
  puts("kernel_procfs_required=true");
  puts("reviewed_pidfd_generation_required=true");
  puts("two_singleton_censuses_required=true");
  puts("continuous_single_threadedness_proven=false");
  puts("process_wide_credential_authority_proven=false");
  puts("durable_attempt_claim_performed=false");
  puts("training_execution_performed=false");
  puts("host_installation_performed=false");
  return 0;
}
