#define _GNU_SOURCE
#include "apollyon_claim_task_singleton_guard_v1.h"

#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/magic.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/vfs.h>
#include <unistd.h>

#ifndef VOID_APOLLYON_TASKSET_PROC_ROOT
#define VOID_APOLLYON_TASKSET_PROC_ROOT "/proc"
#endif

static int reject(int code) { errno=code; return -1; }
static int is_kernel_procfs(int fd) {
  struct statfs st;
  if(fstatfs(fd,&st)!=0) return -1;
  if((unsigned long)st.f_type!=(unsigned long)PROC_SUPER_MAGIC) return reject(EPROTO);
  return 0;
}
static int generation_live(const struct apollyon_claim_process_identity_v2 *id) {
  if(!id||id->pid<=1||id->pidfd<0||id->start_ticks==0) return reject(EINVAL);
  int state=apollyon_claim_process_identity_pidfd_state_v2(id->pidfd);
  if(state<0) return -1;
  if(state!=0) return reject(ESRCH);
  return 0;
}
static int same_directory(const struct stat *a,const struct stat *b) {
  return a->st_dev==b->st_dev && a->st_ino==b->st_ino &&
    a->st_uid==b->st_uid && a->st_gid==b->st_gid &&
    (a->st_mode&S_IFMT)==(b->st_mode&S_IFMT);
}
static int proc_start_ticks(int pid_fd,pid_t expected_pid,unsigned long long *out) {
  int fd=openat(pid_fd,"stat",O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
  if(fd<0) return -1;
  if(is_kernel_procfs(fd)!=0) {int saved=errno;close(fd);return reject(saved);}
  char buf[8192];
  ssize_t n=0;
  size_t used=0;
  while(used<sizeof(buf)-1){
    do { n=read(fd,buf+used,sizeof(buf)-1-used); } while(n<0&&errno==EINTR);
    if(n<=0) break;
    used+=(size_t)n;
  }
  int saved=errno;
  if(close(fd)!=0) return -1;
  if(n<0) return reject(saved);
  if(used==0||used==sizeof(buf)-1||memchr(buf,'\0',used)!=NULL) return reject(EPROTO);
  buf[used]='\0';
  char *end=NULL;
  errno=0;
  long parsed_pid=strtol(buf,&end,10);
  if(errno!=0||end==buf||*end!=' '||parsed_pid!=(long)expected_pid) return reject(EPROTO);
  char *close_paren=strrchr(end,')');
  if(!close_paren||close_paren[1]!=' ') return reject(EPROTO);
  char *context=NULL;
  char *field=strtok_r(close_paren+2," ",&context);
  for(int index=0;field;field=strtok_r(NULL," ",&context),++index){
    if(index==19){
      errno=0;
      char *last=NULL;
      unsigned long long ticks=strtoull(field,&last,10);
      if(errno!=0||last==field||*last!='\0'||ticks==0) return reject(EPROTO);
      *out=ticks;
      return 0;
    }
  }
  return reject(EPROTO);
}
static int singleton_census(int task_fd,pid_t expected_pid) {
  int scan=openat(task_fd,".",O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
  if(scan<0) return -1;
  if(is_kernel_procfs(scan)!=0){int saved=errno;close(scan);return reject(saved);}
  DIR *dir=fdopendir(scan);
  if(!dir){int saved=errno;close(scan);return reject(saved);}
  int found=0;
  int bad=0;
  for(;;){
    errno=0;
    struct dirent *de=readdir(dir);
    if(!de){if(errno!=0)bad=errno;break;}
    if(strcmp(de->d_name,".")==0||strcmp(de->d_name,"..")==0)continue;
    const char *s=de->d_name;
    if(!s[0]){bad=EPROTO;break;}
    for(const char *p=s;*p;p++)if(*p<'0'||*p>'9'){bad=EPROTO;break;}
    if(bad)break;
    errno=0;
    char *end=NULL;
    long tid=strtol(s,&end,10);
    if(errno!=0||end==s||*end!='\0'||tid<1||tid>INT_MAX){bad=EPROTO;break;}
    struct stat st;
    if(fstatat(task_fd,s,&st,AT_SYMLINK_NOFOLLOW)!=0){bad=errno;break;}
    if(!S_ISDIR(st.st_mode)||tid!=(long)expected_pid){bad=EBUSY;break;}
    found++;
    if(found>1){bad=EBUSY;break;}
  }
  if(closedir(dir)!=0 && !bad)bad=errno;
  if(bad)return reject(bad);
  if(found!=1)return reject(ESRCH);
  return 0;
}

int apollyon_claim_task_singleton_observe_v1(
  const struct apollyon_claim_process_identity_v2 *id,
  struct apollyon_claim_task_singleton_observation_v1 *out
) {
  if(!id||!out) return reject(EINVAL);
  memset(out,0,sizeof(*out));
  if(generation_live(id)!=0)return -1;
  int procfd=-1,pidfd=-1,taskfd=-1;
  int status=-1;
  struct stat before_pid,before_task,after_pid,after_task;
  unsigned long long before_ticks=0,after_ticks=0;
  char name[32];
  if(snprintf(name,sizeof(name),"%ld",(long)id->pid)>=(int)sizeof(name))return reject(EOVERFLOW);
  procfd=open(VOID_APOLLYON_TASKSET_PROC_ROOT,O_PATH|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
  if(procfd<0)goto done;
  if(is_kernel_procfs(procfd)!=0)goto done;
  pidfd=openat(procfd,name,O_PATH|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
  if(pidfd<0)goto done;
  if(is_kernel_procfs(pidfd)!=0||fstat(pidfd,&before_pid)!=0||!S_ISDIR(before_pid.st_mode))goto done;
  taskfd=openat(pidfd,"task",O_PATH|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
  if(taskfd<0)goto done;
  if(is_kernel_procfs(taskfd)!=0||fstat(taskfd,&before_task)!=0||!S_ISDIR(before_task.st_mode))goto done;
  if(proc_start_ticks(pidfd,id->pid,&before_ticks)!=0||before_ticks!=id->start_ticks){errno=ESTALE;goto done;}
  if(singleton_census(taskfd,id->pid)!=0)goto done;
  if(generation_live(id)!=0)goto done;
  if(proc_start_ticks(pidfd,id->pid,&after_ticks)!=0||after_ticks!=before_ticks){errno=ESTALE;goto done;}
  if(singleton_census(taskfd,id->pid)!=0)goto done;
  if(generation_live(id)!=0)goto done;
  if(proc_start_ticks(pidfd,id->pid,&after_ticks)!=0||after_ticks!=before_ticks){errno=ESTALE;goto done;}
  if(fstat(pidfd,&after_pid)!=0||fstat(taskfd,&after_task)!=0||
     !same_directory(&before_pid,&after_pid)||!same_directory(&before_task,&after_task)||
     is_kernel_procfs(procfd)!=0||is_kernel_procfs(pidfd)!=0||is_kernel_procfs(taskfd)!=0){
    errno=ESTALE;goto done;
  }
  out->pid=id->pid;
  out->start_ticks=after_ticks;
  out->proc_directory_dev=after_pid.st_dev;
  out->proc_directory_ino=after_pid.st_ino;
  out->task_directory_dev=after_task.st_dev;
  out->task_directory_ino=after_task.st_ino;
  out->observed_task_count=1;
  status=0;
done:
  {
    int saved=errno;
    if(taskfd>=0)close(taskfd);
    if(pidfd>=0)close(pidfd);
    if(procfd>=0)close(procfd);
    if(status!=0){memset(out,0,sizeof(*out));errno=saved?saved:EPROTO;}
  }
  return status;
}
