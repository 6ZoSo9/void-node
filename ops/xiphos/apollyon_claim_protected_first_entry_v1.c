#define _GNU_SOURCE
#include "apollyon_claim_protected_first_entry_v1.h"

#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stddef.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#ifndef VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF
#define VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF \
  "/opt/void-apollyon-claim-protected-first-entry-v1/bin/apollyon_claim_protected_first_entry_v1"
#endif

#ifndef VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_REQUIRED_UID
#define VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_REQUIRED_UID 0
#endif

#ifndef VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_REQUIRED_GID
#define VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_REQUIRED_GID 0
#endif

#define CMDLINE_CAP 4096U

static int reject(int code) { errno=code; return -1; }

static int same_generation(
  const struct stat *a,
  const struct stat *b
) {
  return (
    a->st_dev==b->st_dev &&
    a->st_ino==b->st_ino &&
    a->st_mode==b->st_mode &&
    a->st_uid==b->st_uid &&
    a->st_gid==b->st_gid &&
    a->st_nlink==b->st_nlink &&
    a->st_size==b->st_size &&
    a->st_mtim.tv_sec==b->st_mtim.tv_sec &&
    a->st_mtim.tv_nsec==b->st_mtim.tv_nsec &&
    a->st_ctim.tv_sec==b->st_ctim.tv_sec &&
    a->st_ctim.tv_nsec==b->st_ctim.tv_nsec
  );
}

static int safe_leaf(const struct stat *st) {
  return (
    S_ISREG(st->st_mode) &&
    !S_ISLNK(st->st_mode) &&
    st->st_uid==(uid_t)VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_REQUIRED_UID &&
    st->st_gid==(gid_t)VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_REQUIRED_GID &&
    st->st_nlink==1 &&
    (st->st_mode&0022)==0 &&
    (st->st_mode&(S_ISUID|S_ISGID))==0 &&
    (st->st_mode&0111)!=0
  );
}

static int safe_directory(const char *path) {
  struct stat st;
  if(lstat(path,&st)!=0) return -1;
  if(
    !S_ISDIR(st.st_mode) ||
    S_ISLNK(st.st_mode) ||
    (st.st_mode&0022)!=0 ||
    !(st.st_uid==0 ||
      st.st_uid==(uid_t)VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_REQUIRED_UID)
  ) return reject(EPERM);
  return 0;
}

static int safe_ancestors(void) {
  const char *fixed=VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF;
  const size_t n=strlen(fixed);
  if(n<2 || n>=PATH_MAX || fixed[0]!='/') return reject(EINVAL);

  char buffer[PATH_MAX];
  memcpy(buffer,fixed,n+1);
  if(safe_directory("/")!=0) return -1;

  for(size_t i=1;i<n;i++){
    if(buffer[i]!='/') continue;
    const char saved=buffer[i];
    buffer[i]='\0';
    if(safe_directory(buffer)!=0) return -1;
    buffer[i]=saved;
  }
  return 0;
}

static int open_fixed_self(
  int *fd_out,
  struct stat *opened_out
) {
  if(!fd_out || !opened_out) return reject(EINVAL);
  if(safe_ancestors()!=0) return -1;

  struct stat before;
  if(
    lstat(VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF,&before)!=0 ||
    !safe_leaf(&before)
  ) return reject(EPERM);

  const int fd=open(
    VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF,
    O_RDONLY|O_CLOEXEC|O_NOFOLLOW
  );
  if(fd<0) return -1;

  struct stat opened,visible;
  if(
    fstat(fd,&opened)!=0 ||
    lstat(VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF,&visible)!=0 ||
    !same_generation(&before,&opened) ||
    !same_generation(&opened,&visible) ||
    !safe_leaf(&opened)
  ){
    const int saved=errno?errno:ESTALE;
    close(fd);
    return reject(saved);
  }

  *fd_out=fd;
  *opened_out=opened;
  return 0;
}

static int exact_self_path(void) {
  char observed[PATH_MAX];
  const ssize_t n=readlink("/proc/self/exe",observed,sizeof(observed)-1U);
  if(n<=0 || (size_t)n>=sizeof(observed)) return reject(ESTALE);
  observed[n]='\0';
  if(strcmp(
      observed,
      VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF
    )!=0) return reject(EPERM);
  return 0;
}

static int read_actual_cmdline(
  unsigned char buffer[CMDLINE_CAP],
  size_t *used
) {
  if(!buffer || !used) return reject(EINVAL);
  const int fd=open("/proc/self/cmdline",O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
  if(fd<0) return -1;

  size_t n=0;
  while(n<CMDLINE_CAP){
    ssize_t got=read(fd,buffer+n,CMDLINE_CAP-n);
    if(got<0 && errno==EINTR) continue;
    if(got<0){
      const int saved=errno;
      close(fd);
      return reject(saved);
    }
    if(got==0) break;
    n+=(size_t)got;
  }
  const int close_rc=close(fd);
  if(close_rc!=0 || n<2 || n==CMDLINE_CAP || buffer[n-1U]!='\0'){
    return reject(EINVAL);
  }
  *used=n;
  return 0;
}

void apollyon_claim_protected_first_entry_close_v1(
  struct apollyon_claim_protected_first_entry_v1 *out
) {
  if(!out) return;
  apollyon_claim_no_exec_lock_close_v1(&out->lock);
  out->executable_dev=0;
  out->executable_ino=0;
  out->fixed_path_custody_verified=0;
  out->expected_executable_fd_derived_internally=0;
  out->expected_cmdline_derived_internally=0;
  out->visible_generation_revalidated_after_lock=0;
  out->fixed_path_expected_source_bound=0;
  out->static_first_instruction_proven=0;
  out->protected_expected_source_origin_proven=0;
}

int apollyon_claim_protected_first_entry_install_v1(
  struct apollyon_claim_protected_first_entry_v1 *out
) {
  if(!out) return reject(EINVAL);
  memset(out,0,sizeof(*out));
  out->lock.self.retained.pidfd=-1;

  if(exact_self_path()!=0) return -1;

  int executable_fd=-1;
  struct stat executable_before;
  if(open_fixed_self(&executable_fd,&executable_before)!=0) return -1;

  unsigned char cmdline[CMDLINE_CAP];
  size_t cmdline_len=0;
  if(read_actual_cmdline(cmdline,&cmdline_len)!=0){
    const int saved=errno?errno:EIO;
    close(executable_fd);
    return reject(saved);
  }

  gid_t groups[APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2];
  const int group_count=getgroups(
    (int)(sizeof(groups)/sizeof(groups[0])),
    groups
  );
  if(group_count<0){
    const int saved=errno;
    close(executable_fd);
    return reject(saved);
  }

  struct apollyon_claim_no_exec_lock_v1 locked;
  memset(&locked,0,sizeof(locked));
  locked.self.retained.pidfd=-1;
  if(apollyon_claim_no_exec_lock_install_v1(
      getppid(),
      geteuid(),
      getegid(),
      groups,
      (size_t)group_count,
      executable_fd,
      cmdline,
      cmdline_len,
      &locked
    )!=0){
    const int saved=errno?errno:EPERM;
    close(executable_fd);
    return reject(saved);
  }

  struct stat retained_after,visible_after;
  const int stable=(
    fstat(executable_fd,&retained_after)==0 &&
    lstat(
      VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF,
      &visible_after
    )==0 &&
    safe_leaf(&retained_after) &&
    same_generation(&executable_before,&retained_after) &&
    same_generation(&retained_after,&visible_after) &&
    exact_self_path()==0 &&
    locked.self.retained.pid==getpid() &&
    locked.self.retained.ppid==getppid() &&
    locked.no_exec_filter_installed==1 &&
    locked.execve_and_execveat_denied==1 &&
    locked.same_kernel_generation_reobserved==1 &&
    apollyon_claim_process_identity_pidfd_state_v2(
      locked.self.retained.pidfd
    )==0
  );

  const int close_rc=close(executable_fd);
  if(!stable || close_rc!=0){
    const int saved=errno?errno:ESTALE;
    apollyon_claim_no_exec_lock_close_v1(&locked);
    return reject(saved);
  }

  out->lock=locked;
  out->executable_dev=retained_after.st_dev;
  out->executable_ino=retained_after.st_ino;
  out->fixed_path_custody_verified=1;
  out->expected_executable_fd_derived_internally=1;
  out->expected_cmdline_derived_internally=1;
  out->visible_generation_revalidated_after_lock=1;
  out->fixed_path_expected_source_bound=1;

  /*
   * Source code cannot prove that this binary was entered without a dynamic
   * loader. A later reproducible static candidate/lock gate must close that
   * first-instruction boundary before full protected source origin is true.
   */
  out->static_first_instruction_proven=0;
  out->protected_expected_source_origin_proven=0;

  /* Still not proved by this source-only fixed-entry layer. */
  out->protected_parent_origin_proven=0;
  out->xiphos_host_qualification_performed=0;
  out->durable_attempt_claim_performed=0;
  return 0;
}
