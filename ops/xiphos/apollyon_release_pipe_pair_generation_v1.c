#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <poll.h>
#include <linux/magic.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/statfs.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MARKER "VOID_APOLLYON_RELEASE_PIPE_PAIR_GENERATION_V1"

/*
 * Candidate only: these helpers bind live kernel pipe descriptors.
 * They do not prove protected releaser origin, FD-transfer lineage,
 * writer exclusivity across fork/dup/SCM_RIGHTS, or trainer release.
 */
typedef struct {
    int retained_read;
    int retained_write;
    dev_t dev;
    ino_t ino;
    mode_t mode;
} apollyon_pipe_pair_v1;

static void close_pair(apollyon_pipe_pair_v1 *pair) {
    if(pair==NULL) return;
    if(pair->retained_read>=0) (void)close(pair->retained_read);
    if(pair->retained_write>=0) (void)close(pair->retained_write);
    pair->retained_read=-1;
    pair->retained_write=-1;
    pair->dev=0;
    pair->ino=0;
    pair->mode=0;
}

static int pipe_link_matches(pid_t pid,int fd,ino_t expected) {
    if(pid<=0 || fd<0 || expected==0) return 0;
    int proc=open("/proc",O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    if(proc<0) return 0;
    int dir=-1,ok=0;
    struct statfs fstype;
    char self[64],*end=NULL;
    ssize_t sn=readlinkat(proc,"self",self,sizeof(self)-1);
    if(fstatfs(proc,&fstype)!=0 ||
       (unsigned long)fstype.f_type!=(unsigned long)PROC_SUPER_MAGIC ||
       sn<=0 || (size_t)sn>=sizeof(self)-1) goto out;
    self[sn]='\0';
    errno=0;
    long observed=strtol(self,&end,10);
    if(errno!=0 || end==self || *end!='\0' || observed!=(long)getpid()) goto out;
    char directory[64];
    int n=snprintf(directory,sizeof(directory),"%ld/fd",(long)pid);
    if(n<=0 || (size_t)n>=sizeof(directory)) goto out;
    dir=openat(proc,directory,O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    if(dir<0 || fstatfs(dir,&fstype)!=0 ||
       (unsigned long)fstype.f_type!=(unsigned long)PROC_SUPER_MAGIC) goto out;
    char leaf[32],link[128];
    n=snprintf(leaf,sizeof(leaf),"%d",fd);
    if(n<=0 || (size_t)n>=sizeof(leaf)) goto out;
    ssize_t len=readlinkat(dir,leaf,link,sizeof(link)-1);
    if(len<8 || (size_t)len>=sizeof(link)-1) goto out;
    link[len]='\0';
    if(strncmp(link,"pipe:[",6)!=0 || link[len-1]!=']') goto out;
    link[len-1]='\0';
    errno=0;
    unsigned long long ino=strtoull(link+6,&end,10);
    if(errno!=0 || end==link+6 || *end!='\0' || ino==0ULL) goto out;
    ok=((uintmax_t)ino==(uintmax_t)expected);
out:
    if(dir>=0) (void)close(dir);
    (void)close(proc);
    return ok;
}

static int observe_pair(int read_fd,int write_fd,struct stat *read_st) {
    if(read_fd<3 || write_fd<3 || read_fd==write_fd || read_st==NULL) return 0;
    int rf=fcntl(read_fd,F_GETFL);
    int wf=fcntl(write_fd,F_GETFL);
    if(rf<0 || wf<0 ||
       (rf&O_ACCMODE)!=O_RDONLY || (wf&O_ACCMODE)!=O_WRONLY ||
       (rf&O_PATH)!=0 || (wf&O_PATH)!=0) return 0;
    if(fcntl(read_fd,F_GETPIPE_SZ)<1 || fcntl(write_fd,F_GETPIPE_SZ)<1)
        return 0;
    struct stat a,b;
    if(fstat(read_fd,&a)!=0 || fstat(write_fd,&b)!=0 ||
       !S_ISFIFO(a.st_mode) || !S_ISFIFO(b.st_mode) ||
       a.st_dev!=b.st_dev || a.st_ino!=b.st_ino ||
       a.st_ino==0 || a.st_mode!=b.st_mode) return 0;
    if(!pipe_link_matches(getpid(),read_fd,a.st_ino) ||
       !pipe_link_matches(getpid(),write_fd,a.st_ino)) return 0;
    *read_st=a;
    return 1;
}

static int capture_pair(int read_fd,int write_fd,apollyon_pipe_pair_v1 *out) {
    if(out==NULL) return 0;
    out->retained_read=-1;
    out->retained_write=-1;
    out->dev=0;
    out->ino=0;
    out->mode=0;
    struct stat initial,held,current;
    if(!observe_pair(read_fd,write_fd,&initial)) return 0;
    out->retained_read=fcntl(read_fd,F_DUPFD_CLOEXEC,4);
    if(out->retained_read<0) goto fail;
    out->retained_write=fcntl(write_fd,F_DUPFD_CLOEXEC,4);
    if(out->retained_write<0) goto fail;
    if(!observe_pair(out->retained_read,out->retained_write,&held) ||
       !observe_pair(read_fd,write_fd,&current)) goto fail;
    if(initial.st_dev!=held.st_dev || initial.st_ino!=held.st_ino ||
       initial.st_mode!=held.st_mode ||
       initial.st_dev!=current.st_dev || initial.st_ino!=current.st_ino ||
       initial.st_mode!=current.st_mode) goto fail;
    out->dev=initial.st_dev;
    out->ino=initial.st_ino;
    out->mode=initial.st_mode;
    return 1;
fail:
    close_pair(out);
    return 0;
}

static int revalidate_pair(const apollyon_pipe_pair_v1 *pair,int read_fd,int write_fd) {
    if(pair==NULL || pair->retained_read<0 || pair->retained_write<0 ||
       pair->ino==0) return 0;
    struct stat held,current;
    if(!observe_pair(pair->retained_read,pair->retained_write,&held) ||
       !observe_pair(read_fd,write_fd,&current)) return 0;
    return held.st_dev==pair->dev && held.st_ino==pair->ino &&
           held.st_mode==pair->mode &&
           current.st_dev==pair->dev && current.st_ino==pair->ino &&
           current.st_mode==pair->mode;
}

static int await_child_link(pid_t pid,int expected_fd,ino_t ino,int expected_match) {
    for(int i=0;i<200;i++) {
        int matched=pipe_link_matches(pid,expected_fd,ino);
        if(matched==expected_match) return 1;
        usleep(1000);
    }
    return 0;
}

static int fork_reader_fixture(int read_fd,int write_fd,int ready_write) {
    pid_t pid=fork();
    if(pid!=0) return (int)pid;
    if(read_fd!=3 && dup2(read_fd,3)!=3) _exit(83);
    if(read_fd!=3) (void)close(read_fd);
    if(write_fd!=3) (void)close(write_fd);
    if(write(ready_write,"R",1)!=1) _exit(85);
    (void)close(ready_write);
    char ch=0;
    ssize_t n=read(3,&ch,1);
    _exit(n==1 && ch=='K'?0:84);
}

static int wait_child_ready(int read_fd) {
    struct pollfd pfd={.fd=read_fd,.events=POLLIN,.revents=0};
    int rc;
    do{rc=poll(&pfd,1,1000);}while(rc<0&&errno==EINTR);
    if(rc!=1 || (pfd.revents&POLLIN)==0) return 0;
    char ready=0;
    return read(read_fd,&ready,1)==1 && ready=='R';
}

static int reap_success(pid_t pid) {
    int status=0;
    if(waitpid(pid,&status,0)!=pid) return 0;
    return WIFEXITED(status) && WEXITSTATUS(status)==0;
}

static int self_test(void) {
    int p[2]={-1,-1},q[2]={-1,-1};
    apollyon_pipe_pair_v1 pair={.retained_read=-1,.retained_write=-1};
    if(pipe2(p,O_CLOEXEC)!=0 || pipe2(q,O_CLOEXEC)!=0) return 10;
    if(!capture_pair(p[0],p[1],&pair)) return 11;
    if(!revalidate_pair(&pair,p[0],p[1])) return 12;

    apollyon_pipe_pair_v1 wrong={.retained_read=-1,.retained_write=-1};
    if(capture_pair(p[0],q[1],&wrong)) {close_pair(&wrong);return 13;}
    if(capture_pair(p[1],p[0],&wrong)) {close_pair(&wrong);return 14;}
    if(capture_pair(p[0],p[0],&wrong)) {close_pair(&wrong);return 15;}

    /* Changed FD number is rejected even while module-owned copies keep
       the original pipe inode live. */
    if(dup2(q[0],p[0])!=p[0]) return 16;
    if(revalidate_pair(&pair,p[0],p[1])) return 17;
    if(dup2(pair.retained_read,p[0])!=p[0]) return 18;
    if(!revalidate_pair(&pair,p[0],p[1])) return 19;

    /* A duplicate writer remains undetectable by pair identity alone. */
    int extra=fcntl(p[1],F_DUPFD_CLOEXEC,4);
    if(extra<0) return 20;
    if(!revalidate_pair(&pair,p[0],p[1])) return 21;
    if(close(extra)!=0) return 22;

    int sync[2];
    if(pipe2(sync,O_CLOEXEC)!=0) return 23;
    pid_t good=(pid_t)fork_reader_fixture(p[0],p[1],sync[1]);
    if(good<=0) return 24;
    (void)close(sync[1]);
    if(!wait_child_ready(sync[0])) return 25;
    (void)close(sync[0]);
    if(!await_child_link(good,3,pair.ino,1)) return 26;
    if(write(p[1],"K",1)!=1 || !reap_success(good)) return 27;

    if(pipe2(sync,O_CLOEXEC)!=0) return 28;
    pid_t bad=(pid_t)fork_reader_fixture(q[0],q[1],sync[1]);
    if(bad<=0) return 29;
    (void)close(sync[1]);
    if(!wait_child_ready(sync[0])) return 30;
    (void)close(sync[0]);
    if(!await_child_link(bad,3,pair.ino,0)) return 31;
    if(write(q[1],"K",1)!=1 || !reap_success(bad)) return 32;

    if(!revalidate_pair(&pair,p[0],p[1])) return 33;
    close_pair(&pair);
    (void)close(p[0]);(void)close(p[1]);(void)close(q[0]);(void)close(q[1]);
    puts(MARKER "_SELF_TEST=GREEN");
    puts("kernel_same_pipe_pair_captured=true");
    puts("retained_descriptor_generation_revalidated=true");
    puts("cross_process_child_fd3_same_pipe_fixture=true");
    puts("cross_pipe_child_fd3_rejected=true");
    puts("fd_replacement_rejected=true");
    puts("writer_exclusivity_proven=false");
    puts("protected_releaser_origin_proven=false");
    puts("trainer_releaser_lineage_proven=false");
    puts("trainer_release_authorized=false");
    puts("trainer_release_performed=false");
    puts("training_execution_authorized=false");
    puts("training_execution_performed=false");
    puts("store_mutation=false");
    puts("key_signing_transaction_funds=false");
    return 0;
}

int main(int argc,char **argv) {
    if(argc==2 && strcmp(argv[1],"--self-test")==0) {
        int rc=self_test();
        if(rc!=0) fprintf(stderr,MARKER "_HOLD subcode=%d\n",rc);
        return rc==0?0:2;
    }
    fprintf(stderr,MARKER "_HOLD: source-only self-test candidate\n");
    fprintf(stderr,"trainer_release_authorized=false\ntraining_execution_authorized=false\n");
    return 2;
}
