#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <grp.h>
#include <inttypes.h>
#include <limits.h>
#include <linux/audit.h>
#include <linux/capability.h>
#include <linux/filter.h>
#include <linux/io_uring.h>
#include <linux/magic.h>
#include <linux/seccomp.h>
#include <poll.h>
#include <pthread.h>
#include <signal.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/ptrace.h>
#include <sys/ioctl.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/statfs.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MARKER "VOID_APOLLYON_TRAINING_START_RELEASE_RELEASER_INTEGRATION_V1"
#define PARENT_PIPE_PAIR_BLOB_SHA1 "93390eefd1e72e70af7206e9982c8eaa5e042149"
#define TRAINER_NATIVE_BLOB_SHA1 "098276fc92c247fa1465c11c6403c2c50a61629a"
#define RELEASE_FD 3
#define MAX_DIRENTS 32768
#define MAX_PROC_TEXT 4096

#if defined(__x86_64__)
#define EXPECTED_AUDIT_ARCH AUDIT_ARCH_X86_64
#define X32_SYSCALL_BIT_V1 0x40000000U
#elif defined(__aarch64__)
#define EXPECTED_AUDIT_ARCH AUDIT_ARCH_AARCH64
#else
#error "unsupported architecture"
#endif

#if !defined(__NR_io_uring_setup) || !defined(__NR_io_uring_enter) || \
    !defined(__NR_io_uring_register) || !defined(__NR_recvmsg) || \
    !defined(__NR_recvmmsg) || !defined(__NR_ptrace) || \
    !defined(__NR_process_vm_writev)
#error "required writer-continuity syscalls unavailable"
#endif

struct linux_dirent64_local {
    uint64_t d_ino;
    int64_t d_off;
    unsigned short d_reclen;
    unsigned char d_type;
    char d_name[];
};

typedef enum {
    CASE_POSITIVE = 0,
    CASE_EXTRA_RELEASER_THREAD = 1,
    CASE_CHILD_RETAINS_WRITER = 2,
    CASE_WRONG_TRAINER_PIPE = 3,
    CASE_DUPLICATE_RELEASER_WRITER = 4
} fixture_case_v1;

typedef struct {
    int proc_fd;
    int self_fd;
    int task_fd;
    int self_fd_dir;
} proc_context_v1;

static void close_if_open(int *fd) {
    if(fd != NULL && *fd >= 0) {
        (void)close(*fd);
        *fd = -1;
    }
}

static int procfs_fd(int fd) {
    struct statfs fs;
    return fd >= 0 &&
        fstatfs(fd,&fs)==0 &&
        (unsigned long)fs.f_type==(unsigned long)PROC_SUPER_MAGIC;
}

static int open_proc_context(proc_context_v1 *ctx) {
    memset(ctx,0,sizeof(*ctx));
    ctx->proc_fd=ctx->self_fd=ctx->task_fd=ctx->self_fd_dir=-1;
    ctx->proc_fd=open("/proc",O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    if(!procfs_fd(ctx->proc_fd)) return 0;

    char self_link[64];
    ssize_t n=readlinkat(ctx->proc_fd,"self",self_link,sizeof(self_link)-1);
    if(n<=0 || (size_t)n>=sizeof(self_link)-1) return 0;
    self_link[n]='\0';
    char *end=NULL;
    errno=0;
    long self_pid=strtol(self_link,&end,10);
    if(errno!=0 || end==self_link || *end!='\0' || self_pid!=(long)getpid()) return 0;

    ctx->self_fd=openat(ctx->proc_fd,"self",O_RDONLY|O_DIRECTORY|O_CLOEXEC);
    if(!procfs_fd(ctx->self_fd)) return 0;
    ctx->task_fd=openat(ctx->self_fd,"task",O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    if(!procfs_fd(ctx->task_fd)) return 0;
    ctx->self_fd_dir=openat(ctx->self_fd,"fd",O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    return procfs_fd(ctx->self_fd_dir);
}

static void close_proc_context(proc_context_v1 *ctx) {
    if(ctx==NULL) return;
    close_if_open(&ctx->self_fd_dir);
    close_if_open(&ctx->task_fd);
    close_if_open(&ctx->self_fd);
    close_if_open(&ctx->proc_fd);
}

static int count_numeric_dir(int fd,long required,int *out_count) {
#ifdef SYS_getdents64
    if(lseek(fd,0,SEEK_SET)<0) return 0;
    unsigned char buf[MAX_DIRENTS];
    int count=0,required_seen=(required<0);
    for(;;) {
        long got=syscall(SYS_getdents64,fd,buf,sizeof(buf));
        if(got<0) {
            if(errno==EINTR) continue;
            return 0;
        }
        if(got==0) break;
        long off=0;
        while(off<got) {
            struct linux_dirent64_local *de=(struct linux_dirent64_local *)(buf+off);
            if(de->d_reclen==0 || off+(long)de->d_reclen>got) return 0;
            const char *name=de->d_name;
            if(name[0]>='0' && name[0]<='9') {
                char *end=NULL;
                errno=0;
                long value=strtol(name,&end,10);
                if(errno!=0 || end==name || *end!='\0' || value<=0) return 0;
                ++count;
                if(required>=0 && value==required) required_seen=1;
            }
            off += de->d_reclen;
        }
    }
    if(!required_seen) return 0;
    *out_count=count;
    return 1;
#else
    (void)fd;(void)required;(void)out_count;
    return 0;
#endif
}

static int singleton_self(const proc_context_v1 *ctx) {
    int count=0;
    return ctx!=NULL &&
        count_numeric_dir(ctx->task_fd,(long)getpid(),&count) &&
        count==1;
}

static int pipe_link_inode_at(int fd_dir,int fd,ino_t *out_ino) {
    char leaf[32],link[128],*end=NULL;
    int n=snprintf(leaf,sizeof(leaf),"%d",fd);
    if(n<=0 || (size_t)n>=sizeof(leaf)) return 0;
    ssize_t len=readlinkat(fd_dir,leaf,link,sizeof(link)-1);
    if(len<8 || (size_t)len>=sizeof(link)-1) return 0;
    link[len]='\0';
    if(strncmp(link,"pipe:[",6)!=0 || link[len-1]!=']') return 0;
    link[len-1]='\0';
    errno=0;
    unsigned long long value=strtoull(link+6,&end,10);
    if(errno!=0 || end==link+6 || *end!='\0' || value==0ULL) return 0;
    *out_ino=(ino_t)value;
    return 1;
}

static int fd_link_exact_at(int fd_dir,int fd,const char *expected) {
    char leaf[32],link[PATH_MAX];
    int n=snprintf(leaf,sizeof(leaf),"%d",fd);
    if(
        expected==NULL || n<=0 || (size_t)n>=sizeof(leaf)
    ) return 0;
    ssize_t len=readlinkat(fd_dir,leaf,link,sizeof(link)-1);
    if(len<=0 || (size_t)len>=sizeof(link)-1) return 0;
    link[len]='\0';
    return strcmp(link,expected)==0;
}

static int standard_fd_set_safe(const proc_context_v1 *proc) {
    if(proc==NULL || proc->self_fd_dir<0) return 0;
    struct stat in_st,out_st,err_st;
    ino_t out_ino=0,err_ino=0;
    if(
        fstat(STDIN_FILENO,&in_st)!=0 ||
        fstat(STDOUT_FILENO,&out_st)!=0 ||
        fstat(STDERR_FILENO,&err_st)!=0
    ) return 0;

    /*
     * The hosted proof owns these exact inherited objects:
     * stdin is subprocess.DEVNULL; stdout/stderr are distinct anonymous pipes.
     * Reject regular files, sockets and anon_inode descriptors (including an
     * inherited io_uring/SQPOLL ring) instead of treating fd numbers 0/1/2 as
     * inherently safe.
     */
    if(
        !S_ISCHR(in_st.st_mode) ||
        !fd_link_exact_at(proc->self_fd_dir,STDIN_FILENO,"/dev/null") ||
        !S_ISFIFO(out_st.st_mode) ||
        !S_ISFIFO(err_st.st_mode) ||
        !pipe_link_inode_at(proc->self_fd_dir,STDOUT_FILENO,&out_ino) ||
        !pipe_link_inode_at(proc->self_fd_dir,STDERR_FILENO,&err_ino) ||
        out_ino==err_ino
    ) return 0;
    return 1;
}

static int release_pipe_fd_scan(
    int fd_dir,
    ino_t release_ino,
    int expected_fd,
    int expected_count
) {
#ifdef SYS_getdents64
    if(lseek(fd_dir,0,SEEK_SET)<0) return 0;
    unsigned char buf[MAX_DIRENTS];
    int matches=0,expected_seen=0;
    for(;;) {
        long got=syscall(SYS_getdents64,fd_dir,buf,sizeof(buf));
        if(got<0) {
            if(errno==EINTR) continue;
            return 0;
        }
        if(got==0) break;
        long off=0;
        while(off<got) {
            struct linux_dirent64_local *de=(struct linux_dirent64_local *)(buf+off);
            if(de->d_reclen==0 || off+(long)de->d_reclen>got) return 0;
            char *end=NULL;
            errno=0;
            long fd=strtol(de->d_name,&end,10);
            if(end!=de->d_name && *end=='\0') {
                if(errno!=0 || fd<0 || fd>INT_MAX) return 0;
                ino_t ino=0;
                if(pipe_link_inode_at(fd_dir,(int)fd,&ino) && ino==release_ino) {
                    ++matches;
                    if((int)fd==expected_fd) expected_seen=1;
                }
            }
            off += de->d_reclen;
        }
    }
    return matches==expected_count && expected_seen;
#else
    (void)fd_dir;(void)release_ino;(void)expected_fd;(void)expected_count;
    return 0;
#endif
}

static int child_pid_context(int proc_fd,pid_t pid,int *pid_dir,int *fd_dir) {
    char name[32];
    int n=snprintf(name,sizeof(name),"%ld",(long)pid);
    if(n<=0 || (size_t)n>=sizeof(name)) return 0;
    *pid_dir=openat(proc_fd,name,O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    if(!procfs_fd(*pid_dir)) return 0;
    *fd_dir=openat(*pid_dir,"fd",O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    return procfs_fd(*fd_dir);
}

static int read_small_at(
    int dirfd,
    const char *name,
    char *buf,
    size_t cap,
    size_t *out_len
) {
    int fd=openat(dirfd,name,O_RDONLY|O_NOFOLLOW|O_CLOEXEC);
    if(fd<0) return 0;
    size_t used=0;
    for(;;) {
        if(used+1>=cap) {
            close(fd);
            return 0;
        }
        ssize_t got=read(fd,buf+used,cap-1-used);
        if(got<0 && errno==EINTR) continue;
        if(got<0) {
            close(fd);
            return 0;
        }
        if(got==0) break;
        used+=(size_t)got;
    }
    if(close(fd)!=0) return 0;
    buf[used]='\0';
    *out_len=used;
    return 1;
}

static int process_stat_fields_at(
    int pid_dir,
    pid_t expected_pid,
    pid_t expected_ppid,
    unsigned long long *out_start
) {
    char raw[MAX_PROC_TEXT];
    size_t len=0;
    if(!read_small_at(pid_dir,"stat",raw,sizeof(raw),&len) || len<8) return 0;

    char *openp=strchr(raw,'(');
    char *closep=strrchr(raw,')');
    if(openp==NULL || closep==NULL || closep<=openp || openp==raw) return 0;
    char saved=*openp;
    *openp='\0';
    char *end=NULL;
    errno=0;
    long observed_pid=strtol(raw,&end,10);
    *openp=saved;
    if(errno!=0 || end==raw || observed_pid!=(long)expected_pid) return 0;
    if(closep[1]!=' ') return 0;

    char *cursor=closep+2,*saveptr=NULL;
    unsigned field=3;
    pid_t ppid=-1;
    unsigned long long start=0;
    for(
        char *token=strtok_r(cursor," ",&saveptr);
        token!=NULL;
        token=strtok_r(NULL," ",&saveptr),++field
    ) {
        if(field==4) {
            errno=0;
            long value=strtol(token,&end,10);
            if(errno!=0 || end==token || *end!='\0' || value<=0) return 0;
            ppid=(pid_t)value;
        } else if(field==22) {
            errno=0;
            unsigned long long value=strtoull(token,&end,10);
            if(errno!=0 || end==token || *end!='\0' || value==0ULL) return 0;
            start=value;
            break;
        }
    }
    if(ppid!=expected_ppid || start==0ULL) return 0;
    *out_start=start;
    return 1;
}

static int exe_matches_at(int pid_dir,const struct stat *candidate) {
    int fd=openat(pid_dir,"exe",O_RDONLY|O_CLOEXEC);
    if(fd<0) return 0;
    struct stat observed;
    int ok=fstat(fd,&observed)==0 &&
        observed.st_dev==candidate->st_dev &&
        observed.st_ino==candidate->st_ino &&
        observed.st_mode==candidate->st_mode;
    (void)close(fd);
    return ok;
}

static int pidfd_live(int fd) {
    struct pollfd pfd={.fd=fd,.events=POLLIN,.revents=0};
    int rc;
    do {
        rc=poll(&pfd,1,0);
    } while(rc<0 && errno==EINTR);
    return rc==0;
}

static int child_generation_ready(
    proc_context_v1 *proc,
    pid_t child,
    int pidfd,
    const struct stat *candidate,
    ino_t release_ino,
    unsigned long long *out_start
) {
    if(!pidfd_live(pidfd)) return 0;
    int pid_dir=-1,fd_dir=-1,ok=0;
    if(!child_pid_context(proc->proc_fd,child,&pid_dir,&fd_dir)) goto out;
    unsigned long long start=0;
    if(!process_stat_fields_at(pid_dir,child,getpid(),&start)) goto out;
    if(!exe_matches_at(pid_dir,candidate)) goto out;
    if(!release_pipe_fd_scan(fd_dir,release_ino,RELEASE_FD,1)) goto out;
    *out_start=start;
    ok=1;
out:
    close_if_open(&fd_dir);
    close_if_open(&pid_dir);
    return ok;
}

static int child_generation_revalidate(
    proc_context_v1 *proc,
    pid_t child,
    int pidfd,
    const struct stat *candidate,
    ino_t release_ino,
    unsigned long long expected_start
) {
    unsigned long long observed=0;
    return child_generation_ready(
        proc,child,pidfd,candidate,release_ino,&observed
    ) && observed==expected_start;
}

static int own_fd_set_exact(proc_context_v1 *proc,int writer,int pidfd) {
#ifdef SYS_getdents64
    if(!standard_fd_set_safe(proc)) return 0;
    if(lseek(proc->self_fd_dir,0,SEEK_SET)<0) return 0;
    unsigned char buf[MAX_DIRENTS];
    for(;;) {
        long got=syscall(SYS_getdents64,proc->self_fd_dir,buf,sizeof(buf));
        if(got<0) {
            if(errno==EINTR) continue;
            return 0;
        }
        if(got==0) break;
        long off=0;
        while(off<got) {
            struct linux_dirent64_local *de=(struct linux_dirent64_local *)(buf+off);
            if(de->d_reclen==0 || off+(long)de->d_reclen>got) return 0;
            char *end=NULL;
            errno=0;
            long fd=strtol(de->d_name,&end,10);
            if(end!=de->d_name && *end=='\0') {
                if(errno!=0 || fd<0 || fd>INT_MAX) return 0;
                if(
                    fd==0 || fd==1 || fd==2 || fd==writer || fd==pidfd ||
                    fd==proc->proc_fd || fd==proc->self_fd ||
                    fd==proc->task_fd || fd==proc->self_fd_dir
                ) {
                    /* exact allowed set */
                } else {
                    return 0;
                }
            }
            off += de->d_reclen;
        }
    }
    return 1;
#else
    (void)proc;(void)writer;(void)pidfd;
    return 0;
#endif
}

static int inherited_sqpoll_standard_fd_rejected(void) {
    pid_t pid=fork();
    if(pid<0) return 0;
    if(pid==0) {
        struct io_uring_params params;
        memset(&params,0,sizeof(params));
        params.flags=IORING_SETUP_SQPOLL;
        params.sq_thread_idle=100U;
        int ring=(int)syscall(__NR_io_uring_setup,2U,&params);
        if(ring<0) _exit(171);
        if(dup2(ring,STDIN_FILENO)!=STDIN_FILENO) _exit(172);
        if(ring!=STDIN_FILENO && close(ring)!=0) _exit(173);

        proc_context_v1 proc;
        if(!open_proc_context(&proc)) _exit(174);
        int rejected=!standard_fd_set_safe(&proc);
        close_proc_context(&proc);
        _exit(rejected?0:175);
    }
    int status=0;
    for(;;) {
        pid_t got=waitpid(pid,&status,0);
        if(got==pid) break;
        if(got<0 && errno==EINTR) continue;
        return 0;
    }
    return WIFEXITED(status) && WEXITSTATUS(status)==0;
}

static int install_writer_continuity_filter(void) {
    if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0)!=0) return 0;
    struct sock_filter filter[] = {
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,(uint32_t)offsetof(struct seccomp_data,arch)),
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,EXPECTED_AUDIT_ARCH,1,0),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_KILL_PROCESS),
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,(uint32_t)offsetof(struct seccomp_data,nr)),
#if defined(__x86_64__)
        BPF_JUMP(BPF_JMP|BPF_JSET|BPF_K,X32_SYSCALL_BIT_V1,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_KILL_PROCESS),
#endif
#ifdef __NR_ptrace
        /*
         * The stopped trainer must remain immutable after generation proof.
         * The reviewed flow needs only the final DETACH. Deny every mutating
         * or alternate-control ptrace request in the terminal interval.
         */
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_ptrace,0,4),
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,(uint32_t)offsetof(struct seccomp_data,args)),
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,(uint32_t)PTRACE_DETACH,1,0),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ALLOW),
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,(uint32_t)offsetof(struct seccomp_data,nr)),
#endif
#ifdef __NR_process_vm_writev
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_process_vm_writev,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_clone
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_clone,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_clone3
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_clone3,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_fork
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_fork,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_vfork
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_vfork,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_dup
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_dup,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_dup2
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_dup2,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_dup3
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_dup3,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_fcntl
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_fcntl,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_ioctl
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_ioctl,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_execve
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_execve,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_execveat
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_execveat,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_open
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_open,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_openat
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_openat,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_openat2
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_openat2,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_creat
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_creat,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_socket
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_socket,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_socketpair
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_socketpair,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_sendmsg
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_sendmsg,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_sendmmsg
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_sendmmsg,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_recvmsg
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_recvmsg,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_recvmmsg
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_recvmmsg,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_pidfd_getfd
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_pidfd_getfd,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_io_uring_setup
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_io_uring_setup,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_io_uring_enter
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_io_uring_enter,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_io_uring_register
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_io_uring_register,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ALLOW),
    };
    struct sock_fprog prog={
        .len=(unsigned short)(sizeof(filter)/sizeof(filter[0])),
        .filter=filter,
    };
#ifdef SYS_seccomp
    return syscall(SYS_seccomp,SECCOMP_SET_MODE_FILTER,0,&prog)==0;
#else
    return prctl(PR_SET_SECCOMP,SECCOMP_MODE_FILTER,&prog)==0;
#endif
}

static int hex_value(char c) {
    if(c>='0' && c<='9') return c-'0';
    if(c>='a' && c<='f') return 10+(c-'a');
    return -1;
}

static int decode_frame(const char *hex,unsigned char frame[64]) {
    if(hex==NULL || strlen(hex)!=128U) return 0;
    for(size_t i=0;i<64U;i++) {
        int hi=hex_value(hex[i*2U]);
        int lo=hex_value(hex[i*2U+1U]);
        if(hi<0 || lo<0) return 0;
        frame[i]=(unsigned char)((hi<<4)|lo);
    }
    return 1;
}

static int write_all(int fd,const unsigned char *buf,size_t len) {
    size_t offset=0;
    while(offset<len) {
        ssize_t written=write(fd,buf+offset,len-offset);
        if(written<0 && errno==EINTR) continue;
        if(written<=0) return 0;
        offset+=(size_t)written;
    }
    return 1;
}

static int clear_inheritable_caps(void) {
#if defined(SYS_capget) && defined(SYS_capset)
    struct __user_cap_header_struct hdr={
        .version=_LINUX_CAPABILITY_VERSION_3,
        .pid=0,
    };
    struct __user_cap_data_struct data[2];
    memset(data,0,sizeof(data));
    if(syscall(SYS_capget,&hdr,data)!=0) return 0;
    data[0].inheritable=0;
    data[1].inheritable=0;
    return syscall(SYS_capset,&hdr,data)==0;
#else
    return 0;
#endif
}

static int close_child_fds_except(
    int candidate_fd,
    int release_fd,
    int ready_write,
    int go_read,
    int optional_writer
) {
    for(int fd=3;fd<4096;fd++) {
        if(
            fd==candidate_fd || fd==release_fd ||
            fd==ready_write || fd==go_read ||
            fd==optional_writer
        ) continue;
        errno=0;
        if(close(fd)!=0 && errno!=EBADF) return 0;
    }
    return 1;
}

static void *sleep_thread(void *unused) {
    (void)unused;
    usleep(300000);
    return NULL;
}

static int wait_byte(int fd,char expected) {
    struct pollfd pfd={.fd=fd,.events=POLLIN,.revents=0};
    int rc;
    do {
        rc=poll(&pfd,1,2000);
    } while(rc<0 && errno==EINTR);
    if(rc!=1 || (pfd.revents&POLLIN)==0) return 0;
    char ch=0;
    return read(fd,&ch,1)==1 && ch==expected;
}

static int wait_trainer_exec(
    proc_context_v1 *proc,
    pid_t child,
    int pidfd,
    const struct stat *candidate,
    ino_t release_ino,
    unsigned long long *start
) {
    for(int i=0;i<1000;i++) {
        if(child_generation_ready(
            proc,child,pidfd,candidate,release_ino,start
        )) return 1;
        if(!pidfd_live(pidfd)) return 0;
        usleep(1000);
    }
    return 0;
}

static int wait_trainer_exec_stop(pid_t child) {
    int status=0;
    for(;;) {
        pid_t got=waitpid(child,&status,WUNTRACED);
        if(got==child) break;
        if(got<0 && errno==EINTR) continue;
        return 0;
    }
    if(!WIFSTOPPED(status) || WSTOPSIG(status)!=SIGTRAP) return 0;
    return ((unsigned int)status>>16)==(unsigned int)PTRACE_EVENT_EXEC;
}

static int cleanup_child(pid_t child) {
    if(child<=0) return 1;
    (void)kill(child,SIGKILL);
    for(;;) {
        int status=0;
        pid_t got=waitpid(child,&status,0);
        if(got==child) return 1;
        if(got<0 && errno==EINTR) continue;
        return 0;
    }
}

static int fixture_run(
    const char *trainer,
    const char *binding,
    const char *frame_hex,
    fixture_case_v1 which
) {
    if(geteuid()!=0) return 90;

    proc_context_v1 proc;
    if(!open_proc_context(&proc)) return 91;

    if(which==CASE_EXTRA_RELEASER_THREAD) {
        pthread_t thread;
        if(pthread_create(&thread,NULL,sleep_thread,NULL)!=0) return 92;
        int rejected=0;
        for(int i=0;i<100;i++) {
            if(!singleton_self(&proc)) {
                rejected=1;
                break;
            }
            usleep(1000);
        }
        (void)pthread_join(thread,NULL);
        close_proc_context(&proc);
        return rejected?0:93;
    }

    if(!singleton_self(&proc)) return 94;

    int candidate_fd=open(trainer,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if(candidate_fd<0) return 95;
    struct stat candidate_st;
    if(
        fstat(candidate_fd,&candidate_st)!=0 ||
        !S_ISREG(candidate_st.st_mode) ||
        (candidate_st.st_mode&0111)==0
    ) return 96;

    int release_pipe[2]={-1,-1};
    int alternate[2]={-1,-1};
    int ready[2]={-1,-1};
    int go[2]={-1,-1};
    if(
        pipe2(release_pipe,O_CLOEXEC)!=0 ||
        pipe2(ready,O_CLOEXEC)!=0 ||
        pipe2(go,O_CLOEXEC)!=0
    ) return 97;

    struct stat release_st;
    if(
        fstat(release_pipe[0],&release_st)!=0 ||
        !S_ISFIFO(release_st.st_mode)
    ) return 98;

    if(
        which==CASE_WRONG_TRAINER_PIPE &&
        pipe2(alternate,O_CLOEXEC)!=0
    ) return 99;

    int duplicate_writer=-1;
    if(which==CASE_DUPLICATE_RELEASER_WRITER) {
        duplicate_writer=dup(release_pipe[1]);
        if(duplicate_writer<0) return 100;
    }

    pid_t child=fork();
    if(child<0) return 101;
    if(child==0) {
        close_proc_context(&proc);
        (void)close(ready[0]);
        (void)close(go[1]);

        int chosen_read=(
            which==CASE_WRONG_TRAINER_PIPE
            ? alternate[0]
            : release_pipe[0]
        );
        if(
            chosen_read!=RELEASE_FD &&
            dup2(chosen_read,RELEASE_FD)!=RELEASE_FD
        ) _exit(110);
        if(chosen_read!=RELEASE_FD) (void)close(chosen_read);

        int kept_writer=(
            which==CASE_CHILD_RETAINS_WRITER
            ? release_pipe[1]
            : -1
        );
        if(which!=CASE_CHILD_RETAINS_WRITER) {
            (void)close(release_pipe[1]);
        }
        if(alternate[0]>=0 && alternate[0]!=RELEASE_FD) {
            (void)close(alternate[0]);
        }
        if(alternate[1]>=0) (void)close(alternate[1]);

        if(!close_child_fds_except(
            candidate_fd,RELEASE_FD,ready[1],go[0],kept_writer
        )) _exit(111);

        if(write(ready[1],"R",1)!=1) _exit(112);
        if(!wait_byte(go[0],'G')) _exit(113);
        (void)close(ready[1]);
        (void)close(go[0]);
        if(kept_writer>=0) (void)close(kept_writer);

        for(int cap=0;cap<64;cap++) {
            errno=0;
            if(
                prctl(PR_CAPBSET_DROP,cap,0,0,0)!=0 &&
                errno!=EINVAL
            ) _exit(114);
        }
#ifdef PR_CAP_AMBIENT
        errno=0;
        if(
            prctl(
                PR_CAP_AMBIENT,
                PR_CAP_AMBIENT_CLEAR_ALL,
                0,0,0
            )!=0 &&
            errno!=EINVAL
        ) _exit(115);
#endif
        if(!clear_inheritable_caps()) _exit(116);
        if(setgroups(0,NULL)!=0) _exit(117);
        if(setresgid(1000,1000,1000)!=0) _exit(118);
        if(setresuid(1000,1000,1000)!=0) _exit(119);
        if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0)!=0) _exit(120);

        int release_flags=fcntl(RELEASE_FD,F_GETFD);
        if(
            release_flags<0 ||
            fcntl(
                RELEASE_FD,
                F_SETFD,
                release_flags&~FD_CLOEXEC
            )!=0
        ) _exit(121);

        char *const argv[]={
            (char *)trainer,
            (char *)"--run",
            (char *)"--release-binding-id",
            (char *)binding,
            (char *)"--expected-uid",
            (char *)"1000",
            (char *)"--expected-gid",
            (char *)"1000",
            NULL
        };
        char *const envp[]={
            (char *)"LANG=C",
            (char *)"LC_ALL=C",
            (char *)"TZ=UTC",
            NULL
        };
        fexecve(candidate_fd,argv,envp);
        _exit(122);
    }

    (void)close(ready[1]);
    (void)close(go[0]);
    (void)close(release_pipe[0]);
    if(alternate[0]>=0) (void)close(alternate[0]);
    if(alternate[1]>=0) (void)close(alternate[1]);

#ifdef SYS_pidfd_open
    int pidfd=(int)syscall(SYS_pidfd_open,child,0U);
#else
    int pidfd=-1;
#endif
    if(pidfd<0) return 102;
    if(!wait_byte(ready[0],'R')) {
        cleanup_child(child);
        return 103;
    }

    int child_pid_dir=-1,child_fd_dir=-1;
    if(!child_pid_context(
        proc.proc_fd,child,&child_pid_dir,&child_fd_dir
    )) {
        cleanup_child(child);
        return 104;
    }
    int child_pipe_ok=release_pipe_fd_scan(
        child_fd_dir,release_st.st_ino,RELEASE_FD,1
    );
    close_if_open(&child_fd_dir);
    close_if_open(&child_pid_dir);

    if(which==CASE_CHILD_RETAINS_WRITER) {
        if(child_pipe_ok) return 105;
        cleanup_child(child);
        close_if_open(&pidfd);
        close_if_open(&ready[0]);
        close_if_open(&go[1]);
        close_if_open(&candidate_fd);
        close_if_open(&release_pipe[1]);
        close_if_open(&duplicate_writer);
        close_proc_context(&proc);
        return 0;
    }

    if(which==CASE_WRONG_TRAINER_PIPE) {
        if(child_pipe_ok) return 106;
        cleanup_child(child);
        close_if_open(&pidfd);
        close_if_open(&ready[0]);
        close_if_open(&go[1]);
        close_if_open(&candidate_fd);
        close_if_open(&release_pipe[1]);
        close_if_open(&duplicate_writer);
        close_proc_context(&proc);
        return 0;
    }

    if(!child_pipe_ok) {
        cleanup_child(child);
        return 107;
    }

    if(
        ptrace(
            PTRACE_SEIZE,
            child,
            NULL,
            (void *)(uintptr_t)PTRACE_O_TRACEEXEC
        )!=0
    ) {
        cleanup_child(child);
        return 108;
    }

    if(write(go[1],"G",1)!=1) {
        cleanup_child(child);
        return 109;
    }
    close_if_open(&ready[0]);
    close_if_open(&go[1]);
    close_if_open(&candidate_fd);

    if(!wait_trainer_exec_stop(child)) {
        cleanup_child(child);
        return 110;
    }

    unsigned long long child_start=0;
    if(!wait_trainer_exec(
        &proc,child,pidfd,&candidate_st,release_st.st_ino,&child_start
    )) {
        cleanup_child(child);
        return 111;
    }

    if(which==CASE_DUPLICATE_RELEASER_WRITER) {
        if(own_fd_set_exact(&proc,release_pipe[1],pidfd)) return 123;
        cleanup_child(child);
        close_if_open(&duplicate_writer);
        close_if_open(&release_pipe[1]);
        close_if_open(&pidfd);
        close_proc_context(&proc);
        return 0;
    }

    if(!singleton_self(&proc)) {
        cleanup_child(child);
        return 124;
    }
    if(!own_fd_set_exact(&proc,release_pipe[1],pidfd)) {
        cleanup_child(child);
        return 125;
    }
    if(!child_generation_revalidate(
        &proc,child,pidfd,&candidate_st,release_st.st_ino,child_start
    )) {
        cleanup_child(child);
        return 126;
    }

    if(!install_writer_continuity_filter()) {
        cleanup_child(child);
        return 127;
    }
    if(!singleton_self(&proc)) {
        cleanup_child(child);
        return 128;
    }

    /*
     * Executable inode identity is not enough if the root tracer can rewrite
     * the stopped UID-1000 trainer after the proof. The filter must reject
     * tracer mutation while still allowing the reviewed final DETACH.
     */
    errno=0;
    if(
        ptrace(PTRACE_POKEDATA,child,NULL,NULL)>=0 ||
        errno!=EPERM
    ) {
        cleanup_child(child);
        return 153;
    }
    errno=0;
    if(
        syscall(
            __NR_process_vm_writev,
            child,
            NULL,0UL,
            NULL,0UL,
            0UL
        )>=0 ||
        errno!=EPERM
    ) {
        cleanup_child(child);
        return 154;
    }

    errno=0;
    pid_t unexpected=fork();
    if(unexpected==0) _exit(201);
    if(unexpected>0) {
        (void)kill(unexpected,SIGKILL);
        (void)waitpid(unexpected,NULL,0);
        cleanup_child(child);
        return 129;
    }
    if(errno!=EPERM) {
        cleanup_child(child);
        return 130;
    }

    errno=0;
    if(dup(release_pipe[1])>=0 || errno!=EPERM) {
        cleanup_child(child);
        return 131;
    }

    errno=0;
    if(
        fcntl(release_pipe[1],F_DUPFD_CLOEXEC,4)>=0 ||
        errno!=EPERM
    ) {
        cleanup_child(child);
        return 132;
    }

    errno=0;
    if(ioctl(release_pipe[1],FIONCLEX)==0 || errno!=EPERM) {
        cleanup_child(child);
        return 145;
    }

#ifdef SYS_execve
    errno=0;
    if(
        syscall(SYS_execve,(const char *)(uintptr_t)1,NULL,NULL)>=0 ||
        errno!=EPERM
    ) {
        cleanup_child(child);
        return 146;
    }
#endif

#ifdef SYS_execveat
    errno=0;
    if(
        syscall(
            SYS_execveat,
            AT_FDCWD,
            (const char *)(uintptr_t)1,
            NULL,
            NULL,
            0
        )>=0 ||
        errno!=EPERM
    ) {
        cleanup_child(child);
        return 147;
    }
#endif

    struct msghdr denied_message;
    memset(&denied_message,0,sizeof(denied_message));
    errno=0;
    if(sendmsg(1,&denied_message,0)>=0 || errno!=EPERM) {
        cleanup_child(child);
        return 133;
    }

#ifdef SYS_pidfd_getfd
    errno=0;
    if(
        syscall(SYS_pidfd_getfd,pidfd,RELEASE_FD,0)>=0 ||
        errno!=EPERM
    ) {
        cleanup_child(child);
        return 134;
    }
#endif

    char reopen_path[64];
    int pn=snprintf(
        reopen_path,sizeof(reopen_path),
        "/proc/self/fd/%d",release_pipe[1]
    );
    if(pn<=0 || (size_t)pn>=sizeof(reopen_path)) {
        cleanup_child(child);
        return 135;
    }
    errno=0;
    if(
        open(reopen_path,O_WRONLY|O_CLOEXEC)>=0 ||
        errno!=EPERM
    ) {
        cleanup_child(child);
        return 136;
    }

#ifdef __NR_creat
    errno=0;
    int creat_duplicate=(int)syscall(__NR_creat,reopen_path,0600);
    if(creat_duplicate>=0 || errno!=EPERM) {
        if(creat_duplicate>=0) (void)close(creat_duplicate);
        cleanup_child(child);
        return 144;
    }
#endif

    errno=0;
    if(
        socket(AF_UNIX,SOCK_STREAM|SOCK_CLOEXEC,0)>=0 ||
        errno!=EPERM
    ) {
        cleanup_child(child);
        return 137;
    }

    /* Filters must deny at syscall entry, even for invalid FDs/arguments.
     * This also excludes inherited ring/socket use through standard FDs. */
    errno=0;
    if(syscall(__NR_io_uring_setup,1U,NULL)>=0 || errno!=EPERM) {
        cleanup_child(child);
        return 148;
    }
    errno=0;
    if(syscall(__NR_io_uring_enter,-1,0U,0U,0U,NULL,0U)>=0 || errno!=EPERM) {
        cleanup_child(child);
        return 149;
    }
    errno=0;
    if(syscall(__NR_io_uring_register,-1,0U,NULL,0U)>=0 || errno!=EPERM) {
        cleanup_child(child);
        return 150;
    }
    errno=0;
    if(syscall(__NR_recvmsg,-1,&denied_message,0)>=0 || errno!=EPERM) {
        cleanup_child(child);
        return 151;
    }
    errno=0;
    if(syscall(__NR_recvmmsg,-1,NULL,0U,0U,NULL)>=0 || errno!=EPERM) {
        cleanup_child(child);
        return 152;
    }
    unsigned char frame[64];
    if(!decode_frame(frame_hex,frame)) {
        cleanup_child(child);
        return 138;
    }

    /*
     * Keep the trainer stopped at PTRACE_EVENT_EXEC until the exact frame is
     * fully buffered and the releaser's sole writer is closed. The trainer's
     * one-second frame deadline therefore cannot include releaser proof work
     * or a scheduler gap between resume and frame publication.
     */
    if(!write_all(release_pipe[1],frame,sizeof(frame))) {
        cleanup_child(child);
        return 140;
    }
    if(close(release_pipe[1])!=0) {
        cleanup_child(child);
        return 141;
    }
    release_pipe[1]=-1;

    if(ptrace(PTRACE_DETACH,child,NULL,NULL)!=0) {
        cleanup_child(child);
        return 139;
    }

    int status=0;
    if(waitpid(child,&status,0)!=child) return 142;
    if(!WIFEXITED(status) || WEXITSTATUS(status)!=0) return 143;

    close_if_open(&pidfd);
    close_proc_context(&proc);

    puts(MARKER "_FIXTURE_GREEN");
    puts("direct_trainer_child_lineage_fixture=true");
    puts("same_pipe_fd3_fixture=true");
    puts("single_threaded_releaser_before_write=true");
    puts("trainer_exec_stop_synchronization=true");
    puts("frame_budget_starts_after_releaser_proof=true");
    puts("frame_and_eof_buffered_before_trainer_resume=true");
    puts("writer_continuity_filter_installed=true");
    puts("late_clone_dup_open_socket_fdpass_blocked=true");
    puts("creat_procfd_reopen_blocked=true");
    puts("writer_cloexec_clear_ioctl_blocked=true");
    puts("releaser_exec_transition_blocked=true");
    puts("io_uring_setup_enter_register_denied=true");
    puts("scm_rights_receive_denied=true");
    puts("ptrace_mutation_denied_detach_allowed=true");
    puts("process_vm_writev_denied=true");
    puts("exact_frame_written_and_sole_writer_closed=true");
    puts("trainer_gate_exit_zero=true");
    puts("protected_releaser_origin_proven=false");
    puts("trainer_release_authorized=false");
    puts("training_execution_authorized=false");
    puts("funds_movement=false");
    return 0;
}

static int run_case(
    const char *trainer,
    const char *binding,
    const char *frame,
    fixture_case_v1 which
) {
    pid_t pid=fork();
    if(pid<0) return 0;
    if(pid==0) _exit(fixture_run(trainer,binding,frame,which));

    int status=0;
    for(;;) {
        pid_t got=waitpid(pid,&status,0);
        if(got==pid) break;
        if(got<0 && errno==EINTR) continue;
        return 0;
    }
    return WIFEXITED(status) && WEXITSTATUS(status)==0;
}

int main(int argc,char **argv) {
    if(
        argc!=8 ||
        strcmp(argv[1],"--self-test")!=0 ||
        strcmp(argv[2],"--trainer")!=0 ||
        strcmp(argv[4],"--release-binding-id")!=0 ||
        strcmp(argv[6],"--frame-hex")!=0
    ) {
        fprintf(stderr,MARKER "_HOLD source_test_ci_only=true\n");
        fprintf(stderr,"trainer_release_authorized=false\n");
        fprintf(stderr,"training_execution_authorized=false\n");
        fprintf(stderr,"funds_movement=false\n");
        return 2;
    }

    if(!inherited_sqpoll_standard_fd_rejected()) return 9;
    if(!run_case(
        argv[3],argv[5],argv[7],CASE_EXTRA_RELEASER_THREAD
    )) return 10;
    if(!run_case(
        argv[3],argv[5],argv[7],CASE_CHILD_RETAINS_WRITER
    )) return 11;
    if(!run_case(
        argv[3],argv[5],argv[7],CASE_WRONG_TRAINER_PIPE
    )) return 12;
    if(!run_case(
        argv[3],argv[5],argv[7],CASE_DUPLICATE_RELEASER_WRITER
    )) return 13;
    if(!run_case(
        argv[3],argv[5],argv[7],CASE_POSITIVE
    )) return 14;

    puts(MARKER "_SELF_TEST_GREEN");
    puts("parent_pipe_pair_blob_bound=" PARENT_PIPE_PAIR_BLOB_SHA1);
    puts("trainer_native_blob_bound=" TRAINER_NATIVE_BLOB_SHA1);
    puts("standard_descriptors_exactly_classified=true");
    puts("inherited_sqpoll_standard_fd_rejected=true");
    puts("extra_releaser_thread_rejected=true");
    puts("child_retained_writer_rejected=true");
    puts("wrong_trainer_pipe_rejected=true");
    puts("duplicate_releaser_writer_rejected=true");
    puts("direct_parent_same_pipe_actual_trainer_fixture=true");
    puts("single_thread_writer_continuity_fixture=true");
    puts("trainer_exec_stop_synchronization=true");
    puts("frame_budget_starts_after_releaser_proof=true");
    puts("creat_procfd_reopen_blocked=true");
    puts("writer_cloexec_clear_ioctl_blocked=true");
    puts("releaser_exec_transition_blocked=true");
    puts("io_uring_setup_enter_register_denied=true");
    puts("scm_rights_receive_denied=true");
    puts("ptrace_mutation_denied_detach_allowed=true");
    puts("process_vm_writev_denied=true");
    puts("protected_releaser_origin_proven=false");
    puts("writer_exclusivity_host_proven=false");
    puts("trainer_release_authorized=false");
    puts("training_execution_authorized=false");
    puts("funds_movement=false");
    return 0;
}
