#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <linux/if_alg.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V3"
#define POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V3"
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT
#define VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT "/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v3"
#endif
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER
#define VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER "/home/zoso/dev/void-node/ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py"
#endif
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_PYTHON
#define VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_PYTHON "/usr/bin/python3"
#endif
#define FIXED_SELF VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT "/bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3"
#define FIXED_POLICY VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT "/policy-v1.conf"
#define FIXED_INSTALLER VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER
#define FIXED_PYTHON VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_PYTHON
#define FIXED_DEVNULL "/dev/null"
#define PLAN_PREFIX "voidbuye2dormantfirstentryinstall2_"
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_SHA256
#error installer sha required
#endif
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_BYTES
#error installer bytes required
#endif
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_APPLY_CONFIRM
#error apply confirm required
#endif
#define INSTALLER_SHA256 VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_SHA256
#define INSTALLER_BYTES VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_BYTES
#define APPLY_CONFIRM VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_APPLY_CONFIRM
#define MAX_POLICY_BYTES 1024U
#define MAX_PYTHON_BYTES (512U*1024U*1024U)
#define MAX_INSTALLER_BYTES (2U*1024U*1024U)
#ifndef MFD_ALLOW_SEALING
#define MFD_ALLOW_SEALING 0x0002U
#endif
#ifndef F_ADD_SEALS
#define F_ADD_SEALS 1033
#define F_GET_SEALS 1034
#define F_SEAL_SEAL 0x0001
#define F_SEAL_SHRINK 0x0002
#define F_SEAL_GROW 0x0004
#define F_SEAL_WRITE 0x0008
#endif
#define REQUIRED_SEALS (F_SEAL_SEAL|F_SEAL_SHRINK|F_SEAL_GROW|F_SEAL_WRITE)

typedef enum { OP_NONE=0, OP_PLAN=1, OP_APPLY=2 } operation_v1;
typedef struct { operation_v1 op; char launcher[PATH_MAX]; char native[PATH_MAX]; char expected_head[41]; char plan[128]; } request_v1;
typedef struct { char python_sha256[65]; size_t python_bytes; } policy_v1;
typedef struct { int fd; struct stat opened; char path[PATH_MAX]; } retained_file_v1;
typedef struct { int fd; struct stat alias; struct stat opened; char canonical[PATH_MAX]; } retained_python_v1;
static operation_v1 receipt_op=OP_NONE;
static bool child_created=false;

static void hold(const char*r){
    fprintf(stderr,"%s_HOLD reason=%s\n",MARKER,r);
    fprintf(stderr,"installer_python_started=%s\n",child_created?"true":"false");
    if(child_created&&receipt_op==OP_APPLY)
        fprintf(stderr,"installer_apply_state=unknown_or_partial_if_child_created\n");
    else
        fprintf(stderr,"installer_apply_performed=false\n");
    fprintf(stderr,
        "privileged_first_entry_authenticated=false\n"
        "credential_access=false\n"
        "private_key_access=false\n"
        "signing=false\n"
        "transaction=false\n"
        "payment_acceptance=false\n"
        "public_presale_activation=false\n"
        "wc_void_market_activation=false\n"
        "funds_movement=false\n");
    exit(2);
}

static bool hexn(const char*s,size_t n){
    if(!s||strlen(s)!=n)return false;
    for(size_t i=0;i<n;i++)
        if(!((s[i]>='0'&&s[i]<='9')||(s[i]>='a'&&s[i]<='f')))return false;
    return true;
}

static bool decsz(const char*s,size_t max,size_t*out){
    if(!s||!*s)return false;
    size_t v=0;
    for(;*s;s++){
        if(*s<'0'||*s>'9')return false;
        size_t d=(size_t)(*s-'0');
        if(v>(max-d)/10U)return false;
        v=v*10U+d;
    }
    if(!v||v>max)return false;
    *out=v;
    return true;
}

static bool sameid(const struct stat*a,const struct stat*b){
    return a->st_dev==b->st_dev&&a->st_ino==b->st_ino&&a->st_uid==b->st_uid&&
           a->st_gid==b->st_gid&&a->st_mode==b->st_mode&&a->st_nlink==b->st_nlink&&
           a->st_size==b->st_size;
}

static bool sametime(const struct stat*a,const struct stat*b){
    return a->st_mtim.tv_sec==b->st_mtim.tv_sec&&a->st_mtim.tv_nsec==b->st_mtim.tv_nsec&&
           a->st_ctim.tv_sec==b->st_ctim.tv_sec&&a->st_ctim.tv_nsec==b->st_ctim.tv_nsec;
}

static void safedir(const char*p,const char*r){
    struct stat s;
    if(lstat(p,&s)||!S_ISDIR(s.st_mode)||S_ISLNK(s.st_mode)||s.st_uid!=0||(s.st_mode&0022))
        hold(r);
}

static void safeanc(const char*p,const char*r){
    char b[PATH_MAX];
    size_t n=strlen(p);
    if(!n||n>=sizeof(b)||p[0]!='/')hold(r);
    memcpy(b,p,n+1);
    safedir("/",r);
    for(size_t i=1;i<n;i++){
        if(b[i]!='/')continue;
        char c=b[i];
        b[i]=0;
        safedir(b,r);
        b[i]=c;
    }
}

static bool saferoot(const struct stat*s,bool x){
    return S_ISREG(s->st_mode)&&s->st_uid==0&&s->st_nlink==1&&!(s->st_mode&0022)&&
           !(s->st_mode&(S_ISUID|S_ISGID))&&(!x||(s->st_mode&0111));
}

static retained_file_v1 openroot(const char*p,bool x,const char*r){
    safeanc(p,r);
    struct stat a,b,c;
    if(lstat(p,&a)||S_ISLNK(a.st_mode)||!saferoot(&a,x))hold(r);
    int fd=open(p,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if(fd<0)hold(r);
    if(fstat(fd,&b)||lstat(p,&c)||!sameid(&a,&b)||!sameid(&b,&c)||
       !sametime(&a,&b)||!sametime(&b,&c)){close(fd);hold(r);}
    retained_file_v1 z={.fd=fd,.opened=b};
    snprintf(z.path,sizeof(z.path),"%s",p);
    return z;
}

static void reroot(const retained_file_v1*z,bool x,const char*r){
    struct stat a,b;
    if(fstat(z->fd,&a)||lstat(z->path,&b)||!sameid(&z->opened,&a)||!sameid(&a,&b)||
       !sametime(&z->opened,&a)||!sametime(&a,&b)||!saferoot(&a,x))hold(r);
}

static retained_file_v1 opensource(const char*p,const char*r){
    struct stat a,b,c;
    if(lstat(p,&a)||!S_ISREG(a.st_mode)||S_ISLNK(a.st_mode)||a.st_nlink!=1||
       a.st_size<=0||(uintmax_t)a.st_size>MAX_INSTALLER_BYTES)hold(r);
    int fd=open(p,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if(fd<0)hold(r);
    if(fstat(fd,&b)||lstat(p,&c)||!sameid(&a,&b)||!sameid(&b,&c)||
       !sametime(&a,&b)||!sametime(&b,&c)){close(fd);hold(r);}
    retained_file_v1 z={.fd=fd,.opened=b};
    snprintf(z.path,sizeof(z.path),"%s",p);
    return z;
}

static void resource(const retained_file_v1*z,const char*r){
    struct stat a,b;
    if(fstat(z->fd,&a)||lstat(z->path,&b)||!sameid(&z->opened,&a)||!sameid(&a,&b)||
       !sametime(&z->opened,&a)||!sametime(&a,&b))hold(r);
}

static retained_python_v1 openpython(const char*r){
    struct stat alias;
    if(lstat(FIXED_PYTHON,&alias)||alias.st_uid!=0||
       (!S_ISREG(alias.st_mode)&&!S_ISLNK(alias.st_mode))||
       (S_ISREG(alias.st_mode)&&(alias.st_mode&0022)))hold(r);
    safeanc(FIXED_PYTHON,r);
    char real[PATH_MAX];
    if(!realpath(FIXED_PYTHON,real))hold(r);
    safeanc(real,r);
    struct stat a,b,c;
    if(lstat(real,&a)||S_ISLNK(a.st_mode)||!saferoot(&a,true))hold(r);
    int fd=open(real,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if(fd<0)hold(r);
    if(fstat(fd,&b)||lstat(real,&c)||!sameid(&a,&b)||!sameid(&b,&c)||
       !sametime(&a,&b)||!sametime(&b,&c)){close(fd);hold(r);}
    retained_python_v1 z={.fd=fd,.alias=alias,.opened=b};
    snprintf(z.canonical,sizeof(z.canonical),"%s",real);
    return z;
}

static void repython(const retained_python_v1*z,const char*r){
    struct stat alias,a,b;
    char real[PATH_MAX];
    if(lstat(FIXED_PYTHON,&alias)||!sameid(&z->alias,&alias)||!realpath(FIXED_PYTHON,real)||
       strcmp(real,z->canonical)||fstat(z->fd,&a)||lstat(z->canonical,&b)||
       !sameid(&z->opened,&a)||!sameid(&a,&b)||!sametime(&z->opened,&a)||!sametime(&a,&b))
        hold(r);
}

static void devnull(void){
    struct stat a,b;
    if(fstat(0,&a)||lstat(FIXED_DEVNULL,&b)||!S_ISCHR(a.st_mode)||!S_ISCHR(b.st_mode)||
       a.st_dev!=b.st_dev||a.st_ino!=b.st_ino||a.st_rdev!=b.st_rdev)
        hold("bootstrap_stdin_must_be_devnull");
}

static void sha256fd(int fd,char out[65]){
    int s=socket(AF_ALG,SOCK_SEQPACKET,0);
    if(s<0)hold("bootstrap_hash_socket_failed");
    struct sockaddr_alg sa={.salg_family=AF_ALG};
    strcpy((char*)sa.salg_type,"hash");
    strcpy((char*)sa.salg_name,"sha256");
    if(bind(s,(void*)&sa,sizeof(sa))){close(s);hold("bootstrap_hash_bind_failed");}
    int o=accept(s,NULL,0);
    if(o<0){close(s);hold("bootstrap_hash_accept_failed");}
    if(lseek(fd,0,SEEK_SET)<0){close(o);close(s);hold("bootstrap_hash_seek_failed");}
    unsigned char buf[8192];
    for(;;){
        ssize_t n=read(fd,buf,sizeof(buf));
        if(n<0){
            if(errno==EINTR)continue;
            close(o);close(s);hold("bootstrap_hash_read_failed");
        }
        if(!n)break;
        size_t off=0;
        while(off<(size_t)n){
            ssize_t w=send(o,buf+off,(size_t)n-off,MSG_MORE);
            if(w<0){
                if(errno==EINTR)continue;
                close(o);close(s);hold("bootstrap_hash_write_failed");
            }
            if(!w){close(o);close(s);hold("bootstrap_hash_short_write");}
            off+=(size_t)w;
        }
    }
    if(send(o,NULL,0,0)<0){
        close(o);close(s);hold("bootstrap_hash_finalize_failed");
    }
    unsigned char d[32];
    if(read(o,d,32)!=32){close(o);close(s);hold("bootstrap_hash_result_failed");}
    static const char h[]="0123456789abcdef";
    for(size_t i=0;i<32;i++){out[2*i]=h[d[i]>>4];out[2*i+1]=h[d[i]&15];}
    out[64]=0;
    close(o);close(s);
    if(lseek(fd,0,SEEK_SET)<0)hold("bootstrap_hash_rewind_failed");
}

static policy_v1 policy(retained_file_v1*ret){
    *ret=openroot(FIXED_POLICY,false,"bootstrap_policy_custody_invalid");
    if(ret->opened.st_size<=0||(uintmax_t)ret->opened.st_size>MAX_POLICY_BYTES)
        hold("bootstrap_policy_size_invalid");
    size_t n=(size_t)ret->opened.st_size;
    char*b=calloc(n+1,1);
    if(!b)hold("bootstrap_policy_alloc_failed");
    size_t o=0;
    while(o<n){
        ssize_t g=read(ret->fd,b+o,n-o);
        if(g<0){
            if(errno==EINTR)continue;
            free(b);hold("bootstrap_policy_read_failed");
        }
        if(!g){free(b);hold("bootstrap_policy_short_read");}
        o+=(size_t)g;
    }
    if(b[n-1]!='\n'){free(b);hold("bootstrap_policy_newline_required");}
    reroot(ret,false,"bootstrap_policy_changed");
    char*save=NULL,*lines[3];
    size_t count=0;
    for(char*l=strtok_r(b,"\n",&save);l;l=strtok_r(NULL,"\n",&save)){
        if(count>=3){free(b);hold("bootstrap_policy_lines_invalid");}
        lines[count++]=l;
    }
    if(count!=3||strcmp(lines[0],"schema=" POLICY_SCHEMA)||
       strncmp(lines[1],"python_sha256=",14)||strncmp(lines[2],"python_bytes=",13)){
        free(b);hold("bootstrap_policy_schema_invalid");
    }
    policy_v1 p={0};
    if(!hexn(lines[1]+14,64)||!decsz(lines[2]+13,MAX_PYTHON_BYTES,&p.python_bytes)){
        free(b);hold("bootstrap_policy_value_invalid");
    }
    memcpy(p.python_sha256,lines[1]+14,65);
    free(b);
    return p;
}

static bool abspath(const char*s){
    if(!s||s[0]!='/'||strlen(s)>=PATH_MAX)return false;
    for(;*s;s++)if(*s=='\n'||*s=='\r')return false;
    return true;
}

static bool planid(const char*s){
    size_t p=strlen(PLAN_PREFIX);
    return s&&strlen(s)==p+64&&!strncmp(s,PLAN_PREFIX,p)&&hexn(s+p,64);
}

static request_v1 request(int argc,char**argv){
    request_v1 r={0};
    if(argc==8&&!strcmp(argv[1],"--installer-plan")&&!strcmp(argv[2],"--launcher")&&
       abspath(argv[3])&&!strcmp(argv[4],"--native")&&abspath(argv[5])&&
       !strcmp(argv[6],"--expected-head")&&hexn(argv[7],40)){
        r.op=OP_PLAN;
        snprintf(r.launcher,sizeof(r.launcher),"%s",argv[3]);
        snprintf(r.native,sizeof(r.native),"%s",argv[5]);
        snprintf(r.expected_head,sizeof(r.expected_head),"%s",argv[7]);
        return r;
    }
    if(argc==12&&!strcmp(argv[1],"--installer-apply")&&!strcmp(argv[2],"--launcher")&&
       abspath(argv[3])&&!strcmp(argv[4],"--native")&&abspath(argv[5])&&
       !strcmp(argv[6],"--expected-head")&&hexn(argv[7],40)&&
       !strcmp(argv[8],"--expected-plan-id")&&planid(argv[9])&&
       !strcmp(argv[10],"--confirm")&&!strcmp(argv[11],APPLY_CONFIRM)){
        r.op=OP_APPLY;
        snprintf(r.launcher,sizeof(r.launcher),"%s",argv[3]);
        snprintf(r.native,sizeof(r.native),"%s",argv[5]);
        snprintf(r.expected_head,sizeof(r.expected_head),"%s",argv[7]);
        snprintf(r.plan,sizeof(r.plan),"%s",argv[9]);
        return r;
    }
    hold("bootstrap_arguments_invalid");
    return r;
}

static int snapshot(retained_file_v1*src){
    if((uintmax_t)src->opened.st_size!=(uintmax_t)INSTALLER_BYTES)
        hold("bootstrap_installer_size_mismatch");
    int fd=memfd_create("void-e2-protected-install-v2",MFD_CLOEXEC|MFD_ALLOW_SEALING);
    if(fd<0)hold("bootstrap_memfd_failed");
    if(lseek(src->fd,0,SEEK_SET)<0)hold("bootstrap_source_seek_failed");
    unsigned char b[8192];
    for(;;){
        ssize_t n=read(src->fd,b,sizeof(b));
        if(n<0){
            if(errno==EINTR)continue;
            hold("bootstrap_source_read_failed");
        }
        if(!n)break;
        size_t o=0;
        while(o<(size_t)n){
            ssize_t w=write(fd,b+o,(size_t)n-o);
            if(w<0){
                if(errno==EINTR)continue;
                hold("bootstrap_snapshot_write_failed");
            }
            if(!w)hold("bootstrap_snapshot_short_write");
            o+=(size_t)w;
        }
    }
    resource(src,"bootstrap_source_changed_during_snapshot");
    if(fcntl(fd,F_ADD_SEALS,REQUIRED_SEALS))hold("bootstrap_snapshot_seal_failed");
    int seals=fcntl(fd,F_GET_SEALS);
    if(seals<0||(seals&REQUIRED_SEALS)!=REQUIRED_SEALS)
        hold("bootstrap_snapshot_seals_missing");
    char h[65];
    sha256fd(fd,h);
    if(strcmp(h,INSTALLER_SHA256))hold("bootstrap_installer_sha256_mismatch");
    return fd;
}

static void uncloexec(int fd){
    int f=fcntl(fd,F_GETFD);
    if(f<0||fcntl(fd,F_SETFD,f&~FD_CLOEXEC))_exit(126);
}

static int selftest(void){
    if(!hexn("0123456789abcdef0123456789abcdef01234567",40)||
       !hexn(INSTALLER_SHA256,64)||
       (uintmax_t)INSTALLER_BYTES==0||(uintmax_t)INSTALLER_BYTES>MAX_INSTALLER_BYTES||
       strcmp(APPLY_CONFIRM,"INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V2_CREATE_ONLY")||
       !planid(PLAN_PREFIX "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"))
        return 1;
    puts(MARKER "_SELF_TEST_GREEN");
    printf("installer_snapshot_sha256=%s\n",INSTALLER_SHA256);
    printf("installer_snapshot_bytes=%ju\n",(uintmax_t)INSTALLER_BYTES);
    puts("static_native_first_instruction_required=true");
    puts("exact_installer_snapshot_compile_bound=true");
    puts("runtime_expected_head_strict_hex_required=true");
    puts("runtime_expected_head_forwarded_to_authenticated_child=true");
    puts("sealed_installer_memfd_required=true");
    puts("fixed_python_policy_bound=true");
    puts("caller_stdin_must_be_devnull=true");
    puts("strict_plan_apply_argv=true");
    puts("child_environment_closed=true");
    puts("direct_root_python_authoritative=false");
    puts("protected_install_authorized=false");
    puts("funds_movement=false");
    return 0;
}

int main(int argc,char**argv){
    if(argc==2&&!strcmp(argv[1],"--self-test"))return selftest();
    if(geteuid()!=0)hold("bootstrap_root_required");
    devnull();
    request_v1 q=request(argc,argv);
    receipt_op=q.op;

    retained_file_v1 self=openroot(FIXED_SELF,true,"bootstrap_self_custody_invalid");
    char exe[PATH_MAX];
    ssize_t n=readlink("/proc/self/exe",exe,sizeof(exe)-1);
    if(n<=0||(size_t)n>=sizeof(exe))hold("bootstrap_self_identity_unreadable");
    exe[n]=0;
    if(strcmp(exe,FIXED_SELF))hold("bootstrap_fixed_self_path_required");

    retained_file_v1 pf;
    policy_v1 pol=policy(&pf);
    retained_file_v1 src=opensource(FIXED_INSTALLER,"bootstrap_installer_source_invalid");
    int snap=snapshot(&src);
    retained_python_v1 py=openpython("bootstrap_python_custody_invalid");

    struct stat ps;
    if(fstat(py.fd,&ps)||(uintmax_t)ps.st_size!=(uintmax_t)pol.python_bytes)
        hold("bootstrap_python_size_mismatch");
    char ph[65];
    sha256fd(py.fd,ph);
    if(strcmp(ph,pol.python_sha256))hold("bootstrap_python_sha256_mismatch");

    int dn=open(FIXED_DEVNULL,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if(dn<0)hold("bootstrap_devnull_open_failed");

    pid_t ch=fork();
    if(ch<0)hold("bootstrap_fork_failed");
    child_created=true;
    if(!ch){
        if(dup2(dn,0)<0)_exit(126);
        close(dn);
        close(self.fd);
        close(pf.fd);
        close(src.fd);
        uncloexec(snap);
        uncloexec(py.fd);

        char script[64];
        if(snprintf(script,sizeof(script),"/proc/self/fd/%d",snap)<=0)_exit(126);

        char*pa[]={
            (char*)FIXED_PYTHON,(char*)"-I",(char*)"-B",script,
            (char*)"--plan",
            (char*)"--launcher",q.launcher,
            (char*)"--native",q.native,
            (char*)"--expected-head",q.expected_head,
            NULL
        };
        char*aa[]={
            (char*)FIXED_PYTHON,(char*)"-I",(char*)"-B",script,
            (char*)"--apply",
            (char*)"--launcher",q.launcher,
            (char*)"--native",q.native,
            (char*)"--expected-head",q.expected_head,
            (char*)"--expected-plan-id",q.plan,
            (char*)"--confirm",(char*)APPLY_CONFIRM,
            NULL
        };
        char*const envp[]={
            (char*)"PATH=/usr/bin:/bin",
            (char*)"HOME=/nonexistent",
            (char*)"LANG=C",
            (char*)"LC_ALL=C",
            (char*)"TZ=UTC",
            NULL
        };
        fexecve(py.fd,q.op==OP_PLAN?pa:aa,envp);
        _exit(126);
    }

    close(dn);
    int st=0;
    pid_t w;
    do{w=waitpid(ch,&st,0);}while(w<0&&errno==EINTR);
    if(w!=ch)hold("bootstrap_child_wait_failed");

    reroot(&self,true,"bootstrap_self_changed");
    reroot(&pf,false,"bootstrap_policy_changed_after_child");
    repython(&py,"bootstrap_python_changed_after_child");
    resource(&src,"bootstrap_installer_visible_generation_changed_after_child");

    close(snap);
    close(py.fd);
    close(src.fd);
    close(pf.fd);
    close(self.fd);

    if(!WIFEXITED(st)||WEXITSTATUS(st)!=0)hold("bootstrap_child_failed");

    printf("%s_GREEN\n",MARKER);
    printf("operation=%s\n",q.op==OP_PLAN?"installer_plan":"installer_apply");
    printf(
        "privileged_first_entry_authenticated=true\n"
        "installer_snapshot_sealed=true\n"
        "python_generation_authenticated=true\n"
        "expected_head_forwarded=true\n"
        "expected_head_authenticated_by_child=true\n"
        "child_exit_success=true\n"
        "direct_root_python_authoritative=false\n"
    );
    if(q.op==OP_PLAN)printf("installer_apply_performed=false\n");
    else printf("installer_apply_child_exit_success=true\n");
    printf(
        "credential_access=false\n"
        "private_key_access=false\n"
        "signing=false\n"
        "transaction=false\n"
        "payment_acceptance=false\n"
        "public_presale_activation=false\n"
        "wc_void_market_activation=false\n"
        "funds_movement=false\n"
    );
    return 0;
}
