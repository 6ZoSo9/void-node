#define _GNU_SOURCE
#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <linux/unistd.h>
#include <signal.h>
#include <stdbool.h>
#include <stdarg.h>
#include <linux/audit.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_BOOTSTRAP_V1"
#define PLAN_ID "voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc"
#define PLAN_BLOB "9dde5523dca6ab240626430ce1c2b82f1cfe7f20"
#define PLAN_REQUIREMENTS 70U
#define MANIFEST_SCHEMA "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_MANIFEST_V1"
#define RECEIPT_SCHEMA "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_RECEIPT_V1"
#define SEAL_MODE "CREATE_ONLY_CLOSED_TREE_V1"
#define FIXED_SOURCE_ROOT "/home/zoso/Downloads/void-v7-create-only-closed-tree-candidate-v1"
#define FIXED_PAYLOAD_NAME "payload"
#define FIXED_MANIFEST_NAME "manifest-v1.conf"
#define FIXED_FINAL_PARENT "/opt"
#define FIXED_FINAL_NAME "void-buy-void-v7-create-only-closed-tree-v1"
#define FIXED_STAGE_NAME ".void-buy-void-v7-create-only-closed-tree-v1.stage-v1"
#define RECEIPT_NAME "install-receipt-v1.conf"
#define CONFIRM_TOKEN "INSTALL_VOID_V7_CREATE_ONLY_CLOSED_TREE_BOOTSTRAP_V1"
#define MAX_MANIFEST_BYTES (64U * 1024U * 1024U)
#define MAX_RECEIPT_BYTES (128U * 1024U * 1024U)
#define MAX_ENTRIES 250000U
#define MAX_FILE_BYTES (512ULL * 1024ULL * 1024ULL)
#define MAX_TOTAL_BYTES (16ULL * 1024ULL * 1024ULL * 1024ULL)
#define IO_BUFFER_BYTES (1024U * 1024U)
#ifndef RENAME_NOREPLACE
#define RENAME_NOREPLACE 1U
#endif

#ifndef VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_SHA256
#define VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_SHA256 ""
#endif
#ifndef VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_BYTES
#define VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_BYTES 0U
#endif
#define ACCEPTED_MANIFEST_SHA256 VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_SHA256
#define ACCEPTED_MANIFEST_BYTES VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_BYTES

typedef struct {
    uint32_t h[8];
    uint64_t total;
    unsigned char block[64];
    size_t used;
} sha256_ctx;

typedef struct {
    char kind;
    mode_t mode;
    char *path;
    uint64_t size;
    char sha256[65];
    dev_t dev;
    ino_t ino;
    nlink_t nlink;
} entry_v1;

typedef struct {
    char *raw;
    size_t raw_size;
    char generation[65];
    entry_v1 *entries;
    size_t count;
    uint64_t total_bytes;
    char sha256[65];
} manifest_v1;

typedef struct {
    int fd;
    struct stat st;
} retained_file_v1;

static bool write_boundary_entered=false;
static bool publication_performed=false;
static bool parent_fsync_completed=false;
static bool final_verification_completed=false;
static bool fixture_mode=false;
static uid_t expected_owner=0;
static gid_t expected_group=0;

static void receipt_common(FILE *out) {
    fprintf(out,"plan_contract_id=%s\n",PLAN_ID);
    fprintf(out,"plan_contract_blob=%s\n",PLAN_BLOB);
    fprintf(out,"plan_contract_requirement_count=%u\n",PLAN_REQUIREMENTS);
    fprintf(out,"seal_mode=%s\n",SEAL_MODE);
    fprintf(out,"existing_launcher_v2_modified=false\n");
    fprintf(out,"new_launcher_generation_authorized=false\n");
    fprintf(out,"protected_v5_apply=false\n");
    fprintf(out,"service_mutation=false\ncredential_access=false\nsigning=false\ntransaction=false\n");
    fprintf(out,"payment_acceptance=false\npublic_presale_activation=false\nwc_activation=false\nfunds_movement=false\n");
}

static void hold(const char *reason) {
    fprintf(stderr,"%s_HOLD reason=%s\n",MARKER,reason);
    fprintf(stderr,"write_boundary_entered=%s\n",write_boundary_entered?"true":"false");
    fprintf(stderr,"publication=%s\n",publication_performed?"true":"false");
    fprintf(stderr,"parent_fsync_completed=%s\n",parent_fsync_completed?"true":"false");
    fprintf(stderr,"final_verification_completed=%s\n",final_verification_completed?"true":"false");
    receipt_common(stderr);
    exit(2);
}

static bool hexn(const char *s,size_t n){
    if(!s || strlen(s)!=n) return false;
    for(size_t i=0;i<n;i++) if(!((s[i]>='0'&&s[i]<='9')||(s[i]>='a'&&s[i]<='f'))) return false;
    return true;
}
static bool decu64(const char *s,uint64_t max,uint64_t *out){
    if(!s||!*s) return false;
    if(s[0]=='0' && s[1]) return false;
    uint64_t v=0;
    for(const char *p=s;*p;p++){
        if(*p<'0'||*p>'9') return false;
        unsigned d=(unsigned)(*p-'0');
        if(v>(max-d)/10U) return false;
        v=v*10U+d;
    }
    if(v>max) return false;
    *out=v; return true;
}
static bool clean_rel(const char *path){
    if(!path||!*path||path[0]=='/'||strlen(path)>=PATH_MAX) return false;
    if(!strcmp(path,RECEIPT_NAME)) return false;
    const char *p=path;
    while(*p){
        const char *e=strchr(p,'/'); size_t n=e?(size_t)(e-p):strlen(p);
        if(!n||n>NAME_MAX||(n==1&&p[0]=='.')||(n==2&&p[0]=='.'&&p[1]=='.')) return false;
        for(size_t i=0;i<n;i++){
            unsigned char c=(unsigned char)p[i];
            if(c<0x20||c==0x7f||c=='|'||c=='\\') return false;
        }
        if(!e) return true;
        p=e+1; if(!*p) return false;
    }
    return false;
}
static bool clean_abs(const char *path){
    if(!path||path[0]!='/'||strlen(path)>=PATH_MAX) return false;
    if(!strcmp(path,"/")) return true;
    return clean_rel(path+1);
}

static uint32_t rotr32(uint32_t x,unsigned n){return (x>>n)|(x<<(32U-n));}
static const uint32_t K256[64]={
0x428a2f98U,0x71374491U,0xb5c0fbcfU,0xe9b5dba5U,0x3956c25bU,0x59f111f1U,0x923f82a4U,0xab1c5ed5U,
0xd807aa98U,0x12835b01U,0x243185beU,0x550c7dc3U,0x72be5d74U,0x80deb1feU,0x9bdc06a7U,0xc19bf174U,
0xe49b69c1U,0xefbe4786U,0x0fc19dc6U,0x240ca1ccU,0x2de92c6fU,0x4a7484aaU,0x5cb0a9dcU,0x76f988daU,
0x983e5152U,0xa831c66dU,0xb00327c8U,0xbf597fc7U,0xc6e00bf3U,0xd5a79147U,0x06ca6351U,0x14292967U,
0x27b70a85U,0x2e1b2138U,0x4d2c6dfcU,0x53380d13U,0x650a7354U,0x766a0abbU,0x81c2c92eU,0x92722c85U,
0xa2bfe8a1U,0xa81a664bU,0xc24b8b70U,0xc76c51a3U,0xd192e819U,0xd6990624U,0xf40e3585U,0x106aa070U,
0x19a4c116U,0x1e376c08U,0x2748774cU,0x34b0bcb5U,0x391c0cb3U,0x4ed8aa4aU,0x5b9cca4fU,0x682e6ff3U,
0x748f82eeU,0x78a5636fU,0x84c87814U,0x8cc70208U,0x90befffaU,0xa4506cebU,0xbef9a3f7U,0xc67178f2U};
static void sha_block(sha256_ctx *c,const unsigned char b[64]){
    uint32_t w[64];
    for(size_t i=0;i<16;i++) w[i]=((uint32_t)b[4*i]<<24)|((uint32_t)b[4*i+1]<<16)|((uint32_t)b[4*i+2]<<8)|b[4*i+3];
    for(size_t i=16;i<64;i++){
        uint32_t s0=rotr32(w[i-15],7)^rotr32(w[i-15],18)^(w[i-15]>>3);
        uint32_t s1=rotr32(w[i-2],17)^rotr32(w[i-2],19)^(w[i-2]>>10);
        w[i]=w[i-16]+s0+w[i-7]+s1;
    }
    uint32_t a=c->h[0],bb=c->h[1],cc=c->h[2],d=c->h[3],e=c->h[4],f=c->h[5],g=c->h[6],h=c->h[7];
    for(size_t i=0;i<64;i++){
        uint32_t S1=rotr32(e,6)^rotr32(e,11)^rotr32(e,25);
        uint32_t ch=(e&f)^((~e)&g);
        uint32_t t1=h+S1+ch+K256[i]+w[i];
        uint32_t S0=rotr32(a,2)^rotr32(a,13)^rotr32(a,22);
        uint32_t maj=(a&bb)^(a&cc)^(bb&cc);
        uint32_t t2=S0+maj;
        h=g;g=f;f=e;e=d+t1;d=cc;cc=bb;bb=a;a=t1+t2;
    }
    c->h[0]+=a;c->h[1]+=bb;c->h[2]+=cc;c->h[3]+=d;c->h[4]+=e;c->h[5]+=f;c->h[6]+=g;c->h[7]+=h;
}
static void sha_init(sha256_ctx *c){
    memset(c,0,sizeof(*c));
    uint32_t init[8]={0x6a09e667U,0xbb67ae85U,0x3c6ef372U,0xa54ff53aU,0x510e527fU,0x9b05688cU,0x1f83d9abU,0x5be0cd19U};
    memcpy(c->h,init,sizeof(init));
}
static void sha_update(sha256_ctx *c,const void *raw,size_t n){
    const unsigned char *p=raw;c->total+=n;
    while(n){size_t take=64-c->used;if(take>n)take=n;memcpy(c->block+c->used,p,take);c->used+=take;p+=take;n-=take;if(c->used==64){sha_block(c,c->block);c->used=0;}}
}
static void sha_final(sha256_ctx *c,char out[65]){
    uint64_t bits=c->total*8U;c->block[c->used++]=0x80;
    if(c->used>56){memset(c->block+c->used,0,64-c->used);sha_block(c,c->block);c->used=0;}
    memset(c->block+c->used,0,56-c->used);for(size_t i=0;i<8;i++)c->block[63-i]=(unsigned char)(bits>>(8*i));sha_block(c,c->block);
    static const char d[]="0123456789abcdef";for(size_t i=0;i<8;i++)for(size_t j=0;j<4;j++){unsigned char v=(unsigned char)(c->h[i]>>(24-8*j));out[8*i+2*j]=d[v>>4];out[8*i+2*j+1]=d[v&15];}out[64]=0;
}
static void sha_bytes(const void *raw,size_t n,char out[65]){sha256_ctx c;sha_init(&c);sha_update(&c,raw,n);sha_final(&c,out);}
static void sha_fd_exact(int fd,uint64_t size,char out[65]){
    if(lseek(fd,0,SEEK_SET)<0) hold("hash_seek_failed");
    sha256_ctx c;sha_init(&c);unsigned char buf[65536];uint64_t left=size;
    while(left){size_t want=left>sizeof(buf)?sizeof(buf):(size_t)left;ssize_t n=read(fd,buf,want);if(n<0&&errno==EINTR)continue;if(n<=0)hold("hash_short_read");sha_update(&c,buf,(size_t)n);left-=(uint64_t)n;}
    unsigned char extra;if(read(fd,&extra,1)!=0)hold("hash_file_grew");sha_final(&c,out);
}

static int open_dir_path_at(int rootfd,const char *path){
    if(!path||!*path) return dup(rootfd);
    char copy[PATH_MAX];if(strlen(path)>=sizeof(copy))hold("dir_path_too_long");strcpy(copy,path);
    int fd=dup(rootfd);if(fd<0)hold("dir_dup_failed");char *save=NULL;
    for(char *p=strtok_r(copy,"/",&save);p;p=strtok_r(NULL,"/",&save)){
        int n=openat(fd,p,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);if(n<0){close(fd);hold("dir_open_failed");}close(fd);fd=n;
    }
    return fd;
}
static void split_parent(const char *path,char parent[PATH_MAX],char leaf[NAME_MAX+1]){
    const char *slash=strrchr(path,'/');if(!slash){parent[0]=0;if(strlen(path)>NAME_MAX)hold("leaf_too_long");strcpy(leaf,path);return;}
    size_t pn=(size_t)(slash-path);if(pn>=PATH_MAX||strlen(slash+1)>NAME_MAX)hold("split_path_invalid");memcpy(parent,path,pn);parent[pn]=0;strcpy(leaf,slash+1);
}

static char *read_file_path(const char *path,size_t max,size_t *out_size,char out_sha[65]){
    struct stat before,after;if(lstat(path,&before)||!S_ISREG(before.st_mode)||S_ISLNK(before.st_mode)||before.st_nlink!=1||before.st_size<0||(uintmax_t)before.st_size>max)hold("input_file_metadata_invalid");
    int fd=open(path,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);if(fd<0)hold("input_open_failed");if(fstat(fd,&after)||before.st_dev!=after.st_dev||before.st_ino!=after.st_ino||before.st_size!=after.st_size||before.st_mtim.tv_sec!=after.st_mtim.tv_sec||before.st_mtim.tv_nsec!=after.st_mtim.tv_nsec||before.st_ctim.tv_sec!=after.st_ctim.tv_sec||before.st_ctim.tv_nsec!=after.st_ctim.tv_nsec){close(fd);hold("input_rebound");}
    size_t n=(size_t)before.st_size;char *buf=malloc(n+1);if(!buf){close(fd);hold("input_alloc_failed");}size_t off=0;while(off<n){ssize_t r=read(fd,buf+off,n-off);if(r<0&&errno==EINTR)continue;if(r<=0){close(fd);free(buf);hold("input_short_read");}off+=(size_t)r;}char extra;if(read(fd,&extra,1)!=0){close(fd);free(buf);hold("input_grew");}struct stat final,visible;if(fstat(fd,&final)||lstat(path,&visible)||final.st_dev!=before.st_dev||final.st_ino!=before.st_ino||final.st_size!=before.st_size||visible.st_dev!=before.st_dev||visible.st_ino!=before.st_ino||visible.st_size!=before.st_size){close(fd);free(buf);hold("input_generation_changed");}close(fd);buf[n]=0;sha_bytes(buf,n,out_sha);*out_size=n;return buf;
}

static manifest_v1 parse_manifest(const char *path){
    manifest_v1 m={0};m.raw=read_file_path(path,MAX_MANIFEST_BYTES,&m.raw_size,m.sha256);
    if(!m.raw_size||m.raw[0]=='\n'||m.raw[m.raw_size-1]!='\n'||memchr(m.raw,'\r',m.raw_size)||memchr(m.raw,'\0',m.raw_size)||memmem(m.raw,m.raw_size,"\n\n",2))hold("manifest_noncanonical");
    m.entries=calloc(MAX_ENTRIES,sizeof(entry_v1));if(!m.entries)hold("manifest_entries_alloc_failed");
    char *save=NULL;char *line=strtok_r(m.raw,"\n",&save);if(!line||strcmp(line,"schema=" MANIFEST_SCHEMA))hold("manifest_schema_invalid");
    line=strtok_r(NULL,"\n",&save);if(!line||strncmp(line,"generation=",11)||!hexn(line+11,64))hold("manifest_generation_invalid");strcpy(m.generation,line+11);
    line=strtok_r(NULL,"\n",&save);if(!line||strncmp(line,"entry_count=",12))hold("manifest_count_row_invalid");uint64_t declared=0;if(!decu64(line+12,MAX_ENTRIES,&declared)||!declared)hold("manifest_count_invalid");
    while((line=strtok_r(NULL,"\n",&save))){
        if(m.count>=MAX_ENTRIES)hold("manifest_entry_limit");if(strncmp(line,"entry=",6))hold("manifest_entry_prefix_invalid");
        char *p=line+6;char *parts[5]={0};for(int i=0;i<5;i++){parts[i]=p;if(i<4){char *q=strchr(p,'|');if(!q)hold("manifest_entry_fields_missing");*q=0;p=q+1;}}
        if(strchr(parts[4],'|'))hold("manifest_entry_extra_field");entry_v1 *e=&m.entries[m.count++];
        if(strlen(parts[0])!=1||(parts[0][0]!='D'&&parts[0][0]!='F'))hold("manifest_entry_kind_invalid");e->kind=parts[0][0];
        if(strlen(parts[1])!=4||parts[1][0]!='0'||parts[1][1]<'0'||parts[1][1]>'7'||parts[1][2]<'0'||parts[1][2]>'7'||parts[1][3]<'0'||parts[1][3]>'7')hold("manifest_entry_mode_invalid");e->mode=(mode_t)strtoul(parts[1],NULL,8);
        if(!clean_rel(parts[2]))hold("manifest_entry_path_invalid");e->path=parts[2];
        if(e->kind=='D'){
            if(e->mode!=0555||strcmp(parts[3],"0")||strcmp(parts[4],"-"))hold("manifest_directory_contract_invalid");
        }else{
            if(e->mode!=0444&&e->mode!=0555)hold("manifest_file_mode_invalid");if(!decu64(parts[3],MAX_FILE_BYTES,&e->size)||!e->size||!hexn(parts[4],64))hold("manifest_file_identity_invalid");strcpy(e->sha256,parts[4]);
            if(m.total_bytes>MAX_TOTAL_BYTES-e->size)hold("manifest_total_bytes_limit");m.total_bytes+=e->size;
        }
    }
    if(m.count!=(size_t)declared)hold("manifest_entry_count_mismatch");
    for(size_t i=1;i<m.count;i++) if(strcmp(m.entries[i-1].path,m.entries[i].path)>=0) hold("manifest_entries_not_strictly_sorted");
    for(size_t i=0;i<m.count;i++){
        const char *path2=m.entries[i].path;const char *slash=strrchr(path2,'/');if(slash){size_t pn=(size_t)(slash-path2);bool found=false;for(size_t j=0;j<i;j++)if(m.entries[j].kind=='D'&&strlen(m.entries[j].path)==pn&&!memcmp(m.entries[j].path,path2,pn)){found=true;break;}if(!found)hold("manifest_parent_directory_missing");}
    }
    return m;
}
static void free_manifest(manifest_v1 *m){free(m->entries);free(m->raw);memset(m,0,sizeof(*m));}

struct linux_dirent64_local { ino64_t d_ino; off64_t d_off; unsigned short d_reclen; unsigned char d_type; char d_name[]; };
static unsigned numeric_name(const char *s){if(!*s)return 0;unsigned v=0;for(;*s;s++){if(!isdigit((unsigned char)*s))return 0;v=v*10U+(unsigned)(*s-'0');}return v;}
static unsigned count_tasks_path(const char *path){
    int fd=open(path,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);if(fd<0)hold("task_dir_open_failed");char buf[8192];unsigned count=0;for(;;){long n=syscall(SYS_getdents64,fd,buf,sizeof(buf));if(n<0&&errno==EINTR)continue;if(n<0){close(fd);hold("task_getdents_failed");}if(!n)break;for(long off=0;off<n;){struct linux_dirent64_local *d=(void *)(buf+off);if(!d->d_reclen||off+d->d_reclen>n){close(fd);hold("task_dirent_invalid");}if(strcmp(d->d_name,".")&&strcmp(d->d_name,"..")&&numeric_name(d->d_name))count++;off+=d->d_reclen;}}close(fd);return count;
}
static void require_single_thread(void){if(count_tasks_path("/proc/self/task")!=1U)hold("secondary_thread_present");long tid=syscall(SYS_gettid);if(tid<=0||(pid_t)tid!=getpid())hold("main_thread_identity_invalid");}
static void require_no_shared_writable_mapping(void){
    FILE *f=fopen("/proc/self/maps","re");if(!f)hold("maps_open_failed");char line[8192];while(fgets(line,sizeof(line),f)){char *sp=strchr(line,' ');if(!sp||strlen(sp+1)<4){fclose(f);hold("maps_line_invalid");}char *perm=sp+1;if(perm[1]=='w'&&perm[3]=='s'){fclose(f);hold("shared_writable_mapping_present");}}if(ferror(f)){fclose(f);hold("maps_read_failed");}fclose(f);
}

#define SC_DENY_NR(nr) BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,(nr),0,1), BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA))
static void install_write_barrier(void){
    require_single_thread();
    require_no_shared_writable_mapping();
    if(prctl(PR_SET_DUMPABLE,0,0,0,0))hold("prctl_dumpable_failed");
    if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0))hold("prctl_no_new_privs_failed");
    struct sock_filter filter[]={
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,arch)),
#ifdef AUDIT_ARCH_X86_64
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,AUDIT_ARCH_X86_64,1,0),
#else
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,0xc000003eU,1,0),
#endif
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_KILL_PROCESS),
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,nr)),
#ifdef __NR_clone
        SC_DENY_NR(__NR_clone),
#endif
#ifdef __NR_clone3
        SC_DENY_NR(__NR_clone3),
#endif
#ifdef __NR_fork
        SC_DENY_NR(__NR_fork),
#endif
#ifdef __NR_vfork
        SC_DENY_NR(__NR_vfork),
#endif
#ifdef __NR_execve
        SC_DENY_NR(__NR_execve),
#endif
#ifdef __NR_execveat
        SC_DENY_NR(__NR_execveat),
#endif
#ifdef __NR_io_uring_setup
        SC_DENY_NR(__NR_io_uring_setup),
#endif
#ifdef __NR_io_uring_enter
        SC_DENY_NR(__NR_io_uring_enter),
#endif
#ifdef __NR_io_uring_register
        SC_DENY_NR(__NR_io_uring_register),
#endif
#ifdef __NR_io_setup
        SC_DENY_NR(__NR_io_setup),
#endif
#ifdef __NR_io_submit
        SC_DENY_NR(__NR_io_submit),
#endif
#ifdef __NR_io_destroy
        SC_DENY_NR(__NR_io_destroy),
#endif
#ifdef __NR_io_cancel
        SC_DENY_NR(__NR_io_cancel),
#endif
#ifdef __NR_io_getevents
        SC_DENY_NR(__NR_io_getevents),
#endif
#ifdef __NR_io_pgetevents
        SC_DENY_NR(__NR_io_pgetevents),
#endif
#ifdef __NR_socket
        SC_DENY_NR(__NR_socket),
#endif
#ifdef __NR_socketpair
        SC_DENY_NR(__NR_socketpair),
#endif
#ifdef __NR_sendmsg
        SC_DENY_NR(__NR_sendmsg),
#endif
#ifdef __NR_sendmmsg
        SC_DENY_NR(__NR_sendmmsg),
#endif
#ifdef __NR_setuid
        SC_DENY_NR(__NR_setuid),
#endif
#ifdef __NR_setgid
        SC_DENY_NR(__NR_setgid),
#endif
#ifdef __NR_setreuid
        SC_DENY_NR(__NR_setreuid),
#endif
#ifdef __NR_setregid
        SC_DENY_NR(__NR_setregid),
#endif
#ifdef __NR_setresuid
        SC_DENY_NR(__NR_setresuid),
#endif
#ifdef __NR_setresgid
        SC_DENY_NR(__NR_setresgid),
#endif
#ifdef __NR_setgroups
        SC_DENY_NR(__NR_setgroups),
#endif
#ifdef __NR_setfsuid
        SC_DENY_NR(__NR_setfsuid),
#endif
#ifdef __NR_setfsgid
        SC_DENY_NR(__NR_setfsgid),
#endif
#ifdef __NR_mmap
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_mmap,0,5),
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,args[2])),
        BPF_JUMP(BPF_JMP|BPF_JSET|BPF_K,PROT_WRITE,0,3),
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,args[3])),
        BPF_JUMP(BPF_JMP|BPF_JSET|BPF_K,MAP_SHARED,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ALLOW)
    };
    struct sock_fprog prog={.len=(unsigned short)(sizeof(filter)/sizeof(filter[0])),.filter=filter};
    if(prctl(PR_SET_SECCOMP,SECCOMP_MODE_FILTER,&prog))hold("seccomp_install_failed");
    write_boundary_entered=true;
}

static int rename_noreplace(int pfd,const char *oldn,const char *newn){
#ifdef SYS_renameat2
    return (int)syscall(SYS_renameat2,pfd,oldn,pfd,newn,RENAME_NOREPLACE);
#else
    errno=ENOSYS;return -1;
#endif
}
static retained_file_v1 open_source_regular(int payloadfd,const char *path,uint64_t expected_size,const char expected_sha[65]){
    char parent[PATH_MAX],leaf[NAME_MAX+1];split_parent(path,parent,leaf);int dfd=open_dir_path_at(payloadfd,parent);if(dfd<0)hold("source_parent_open_failed");struct stat before,opened;if(fstatat(dfd,leaf,&before,AT_SYMLINK_NOFOLLOW)||!S_ISREG(before.st_mode)||S_ISLNK(before.st_mode)||before.st_nlink!=1||(uint64_t)before.st_size!=expected_size){close(dfd);hold("source_file_metadata_invalid");}int fd=openat(dfd,leaf,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);close(dfd);if(fd<0||fstat(fd,&opened)||opened.st_dev!=before.st_dev||opened.st_ino!=before.st_ino||opened.st_size!=before.st_size){if(fd>=0)close(fd);hold("source_file_rebound");}char sha[65];sha_fd_exact(fd,expected_size,sha);if(strcmp(sha,expected_sha)){close(fd);hold("source_file_pre_copy_hash_mismatch");}return (retained_file_v1){.fd=fd,.st=opened};
}
static void mkdir_rel(int rootfd,const char *path,mode_t mode){char parent[PATH_MAX],leaf[NAME_MAX+1];split_parent(path,parent,leaf);int dfd=open_dir_path_at(rootfd,parent);if(mkdirat(dfd,leaf,0700)){close(dfd);hold("destination_mkdir_failed");}int fd=openat(dfd,leaf,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);close(dfd);if(fd<0)hold("destination_dir_open_failed");if(fchown(fd,expected_owner,expected_group)||fchmod(fd,mode)){close(fd);hold("destination_dir_metadata_failed");}struct stat st;if(fstat(fd,&st)||!S_ISDIR(st.st_mode)||st.st_uid!=expected_owner||st.st_gid!=expected_group||st.st_nlink<2||((st.st_mode&07777)!=mode)){close(fd);hold("destination_dir_metadata_invalid");}close(fd);}
static void copy_file(int srcroot,int dstroot,entry_v1 *e,unsigned char *buffer){
    retained_file_v1 src=open_source_regular(srcroot,e->path,e->size,e->sha256);
#ifdef VOID_V7_CLOSED_TREE_TEST_HOOKS
    const char *marker=getenv("VOID_V7_TEST_PIN_MARKER");
    if(fixture_mode&&marker&&clean_abs(marker)){
        int mfd=open(marker,O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW,0600);
        if(mfd<0)hold("test_pin_marker_create_failed");
        if(write(mfd,"pinned\n",7)!=7||fsync(mfd)){close(mfd);hold("test_pin_marker_write_failed");}
        close(mfd);
    }
    const char *delay=getenv("VOID_V7_TEST_DELAY_AFTER_SOURCE_PIN_MS");if(fixture_mode&&delay){uint64_t ms=0;if(decu64(delay,5000,&ms)&&ms){struct timespec ts={.tv_sec=(time_t)(ms/1000),.tv_nsec=(long)((ms%1000)*1000000)};nanosleep(&ts,NULL);}}
#endif
    if(lseek(src.fd,0,SEEK_SET)<0){close(src.fd);hold("source_rewind_failed");}
    char parent[PATH_MAX],leaf[NAME_MAX+1];split_parent(e->path,parent,leaf);int dfd=open_dir_path_at(dstroot,parent);int out=openat(dfd,leaf,O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW,0600);close(dfd);if(out<0){close(src.fd);hold("destination_create_failed");}
    sha256_ctx copied;sha_init(&copied);uint64_t left=e->size;while(left){size_t want=left>IO_BUFFER_BYTES?IO_BUFFER_BYTES:(size_t)left;ssize_t n=read(src.fd,buffer,want);if(n<0&&errno==EINTR)continue;if(n<=0){close(out);close(src.fd);hold("source_changed_during_copy");}size_t off=0;while(off<(size_t)n){ssize_t w=write(out,buffer+off,(size_t)n-off);if(w<0&&errno==EINTR)continue;if(w<=0){close(out);close(src.fd);hold("destination_write_failed");}off+=(size_t)w;}sha_update(&copied,buffer,(size_t)n);left-=(uint64_t)n;}
    unsigned char extra;if(read(src.fd,&extra,1)!=0){close(out);close(src.fd);hold("source_grew_during_copy");}char copy_sha[65];sha_final(&copied,copy_sha);if(strcmp(copy_sha,e->sha256)){close(out);close(src.fd);hold("source_mutation_changed_copy");}
    if(fsync(out)||fchown(out,expected_owner,expected_group)||fchmod(out,e->mode)||fsync(out)){close(out);close(src.fd);hold("destination_finalize_failed");}struct stat st;if(fstat(out,&st)||!S_ISREG(st.st_mode)||st.st_uid!=expected_owner||st.st_gid!=expected_group||st.st_nlink!=1||(uint64_t)st.st_size!=e->size||(st.st_mode&07777)!=e->mode){close(out);close(src.fd);hold("destination_final_metadata_invalid");}e->dev=st.st_dev;e->ino=st.st_ino;e->nlink=st.st_nlink;close(out);close(src.fd);
    int verify_parent=open_dir_path_at(dstroot,parent);int verify=openat(verify_parent,leaf,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);close(verify_parent);if(verify<0)hold("destination_reopen_failed");char sha[65];sha_fd_exact(verify,e->size,sha);struct stat vst;if(fstat(verify,&vst)||vst.st_dev!=e->dev||vst.st_ino!=e->ino||vst.st_nlink!=1||strcmp(sha,e->sha256)){close(verify);hold("destination_reopen_verification_failed");}close(verify);
}
static void verify_entry(int rootfd,entry_v1 *e){
    char parent[PATH_MAX],leaf[NAME_MAX+1];split_parent(e->path,parent,leaf);int dfd=open_dir_path_at(rootfd,parent);struct stat st;if(fstatat(dfd,leaf,&st,AT_SYMLINK_NOFOLLOW)){close(dfd);hold("verify_entry_missing");}if(e->kind=='D'){if(!S_ISDIR(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=expected_owner||st.st_gid!=expected_group||(st.st_mode&07777)!=0555){close(dfd);hold("verify_directory_invalid");}e->dev=st.st_dev;e->ino=st.st_ino;e->nlink=st.st_nlink;close(dfd);return;}if(!S_ISREG(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=expected_owner||st.st_gid!=expected_group||st.st_nlink!=1||(uint64_t)st.st_size!=e->size||(st.st_mode&07777)!=e->mode){close(dfd);hold("verify_file_metadata_invalid");}int fd=openat(dfd,leaf,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);close(dfd);if(fd<0)hold("verify_file_open_failed");char sha[65];sha_fd_exact(fd,e->size,sha);struct stat aft;if(fstat(fd,&aft)||aft.st_dev!=st.st_dev||aft.st_ino!=st.st_ino||strcmp(sha,e->sha256)){close(fd);hold("verify_file_content_invalid");}e->dev=st.st_dev;e->ino=st.st_ino;e->nlink=st.st_nlink;close(fd);
}
static entry_v1 *manifest_find(manifest_v1 *m,const char *path){
    size_t lo=0,hi=m->count;
    while(lo<hi){size_t mid=lo+(hi-lo)/2;int c=strcmp(m->entries[mid].path,path);if(c<0)lo=mid+1;else if(c>0)hi=mid;else return &m->entries[mid];}
    return NULL;
}
static void verify_directory_entries_exact(int rootfd,manifest_v1 *m,const char *prefix){
    int fd=prefix&&*prefix?open_dir_path_at(rootfd,prefix):dup(rootfd);if(fd<0)hold("layout_dir_open_failed");
    DIR *dir=fdopendir(fd);if(!dir){close(fd);hold("layout_fdopendir_failed");}
    errno=0;struct dirent *de;
    while((de=readdir(dir))){
        if(!strcmp(de->d_name,".")||!strcmp(de->d_name,".."))continue;
        if((!prefix||!*prefix)&&!strcmp(de->d_name,RECEIPT_NAME))continue;
        char rel[PATH_MAX];int n=(prefix&&*prefix)?snprintf(rel,sizeof(rel),"%s/%s",prefix,de->d_name):snprintf(rel,sizeof(rel),"%s",de->d_name);
        if(n<0||n>=(int)sizeof(rel)||!manifest_find(m,rel)){closedir(dir);hold("unexpected_tree_entry");}
    }
    if(errno){closedir(dir);hold("layout_readdir_failed");}
    closedir(dir);
}
static void verify_exact_layout(int rootfd,manifest_v1 *m){
    verify_directory_entries_exact(rootfd,m,"");
    for(size_t i=0;i<m->count;i++)if(m->entries[i].kind=='D')verify_directory_entries_exact(rootfd,m,m->entries[i].path);
}
static void capture_directory_identities(int rootfd,manifest_v1 *m){
    for(size_t i=0;i<m->count;i++){
        entry_v1 *e=&m->entries[i];
        if(e->kind!='D') continue;
        int fd=open_dir_path_at(rootfd,e->path);struct stat st;
        if(fstat(fd,&st)||!S_ISDIR(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=expected_owner||st.st_gid!=expected_group||st.st_nlink<2){close(fd);hold("directory_identity_capture_failed");}
        e->dev=st.st_dev;e->ino=st.st_ino;e->nlink=st.st_nlink;close(fd);
    }
}
static void fsync_dirs(int rootfd,manifest_v1 *m){for(size_t i=m->count;i>0;i--){entry_v1 *e=&m->entries[i-1];if(e->kind=='D'){int fd=open_dir_path_at(rootfd,e->path);if(fsync(fd)){close(fd);hold("directory_fsync_failed");}close(fd);}}if(fsync(rootfd))hold("root_fsync_failed");}
static void close_tree_dirs(int rootfd,manifest_v1 *m){for(size_t i=m->count;i>0;i--){entry_v1 *e=&m->entries[i-1];if(e->kind=='D'){int fd=open_dir_path_at(rootfd,e->path);if(fchown(fd,expected_owner,expected_group)||fchmod(fd,0555)||fsync(fd)){close(fd);hold("directory_close_metadata_failed");}close(fd);}}if(fchown(rootfd,expected_owner,expected_group)||fchmod(rootfd,0555)||fsync(rootfd))hold("root_close_metadata_failed");}
static void require_no_writable_dest_fds(manifest_v1 *m,const entry_v1 *receipt_state,int rootfd){
    struct stat rst;if(fstat(rootfd,&rst))hold("fd_census_root_stat_failed");int d=open("/proc/self/fd",O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);if(d<0)hold("fd_census_open_failed");char buf[8192];for(;;){long n=syscall(SYS_getdents64,d,buf,sizeof(buf));if(n<0&&errno==EINTR)continue;if(n<0){close(d);hold("fd_census_getdents_failed");}if(!n)break;for(long off=0;off<n;){struct linux_dirent64_local *x=(void *)(buf+off);unsigned num=numeric_name(x->d_name);if(num&&num!=(unsigned)d){struct stat st;if(!fstat((int)num,&st)){bool match=(st.st_dev==rst.st_dev&&st.st_ino==rst.st_ino);for(size_t i=0;!match&&i<m->count;i++) if(m->entries[i].dev==st.st_dev&&m->entries[i].ino==st.st_ino) match=true;
                    if(!match&&receipt_state&&receipt_state->dev==st.st_dev&&receipt_state->ino==st.st_ino) match=true;
                    if(match){int fl=fcntl((int)num,F_GETFL);if(fl>=0&&((fl&O_ACCMODE)==O_WRONLY||(fl&O_ACCMODE)==O_RDWR)){close(d);hold("writable_destination_fd_retained");}}}}off+=x->d_reclen;}}close(d);
}
static size_t appendf(char *buf,size_t cap,size_t off,const char *fmt,...){va_list ap;va_start(ap,fmt);int n=vsnprintf(buf+off,cap-off,fmt,ap);va_end(ap);if(n<0||(size_t)n>=cap-off)hold("receipt_buffer_exceeded");return off+(size_t)n;}
static void self_sha(char out[65]){int fd=open("/proc/self/exe",O_RDONLY|O_CLOEXEC);if(fd<0)hold("self_open_failed");struct stat st;if(fstat(fd,&st)||!S_ISREG(st.st_mode)||st.st_size<=0){close(fd);hold("self_metadata_invalid");}sha_fd_exact(fd,(uint64_t)st.st_size,out);close(fd);}
static size_t build_receipt(char *buf,size_t cap,manifest_v1 *m,struct stat rootst,const char selfhash[65]){
    size_t off=0;off=appendf(buf,cap,off,"schema=%s\nseal_mode=%s\nplan_contract_id=%s\nplan_contract_blob=%s\nmanifest_sha256=%s\nmanifest_bytes=%zu\nsource_generation=%s\nbootstrap_sha256=%s\nroot_dev=%ju\nroot_ino=%ju\npayload_count=%zu\n",RECEIPT_SCHEMA,SEAL_MODE,PLAN_ID,PLAN_BLOB,m->sha256,m->raw_size,m->generation,selfhash,(uintmax_t)rootst.st_dev,(uintmax_t)rootst.st_ino,m->count);
    for(size_t i=0;i<m->count;i++){entry_v1 *e=&m->entries[i];off=appendf(buf,cap,off,"entry=%c|%04o|%s|%" PRIu64 "|%s|%ju|%ju|%ju\n",e->kind,e->mode,e->path,e->kind=='F'?e->size:0,e->kind=='F'?e->sha256:"-",(uintmax_t)e->dev,(uintmax_t)e->ino,(uintmax_t)e->nlink);}
    return off;
}
static void create_receipt(int rootfd,char *raw,size_t size,entry_v1 *receipt_state){int fd=openat(rootfd,RECEIPT_NAME,O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW,0600);if(fd<0)hold("receipt_create_failed");size_t off=0;while(off<size){ssize_t w=write(fd,raw+off,size-off);if(w<0&&errno==EINTR)continue;if(w<=0){close(fd);hold("receipt_write_failed");}off+=(size_t)w;}if(fsync(fd)||fchown(fd,expected_owner,expected_group)||fchmod(fd,0444)||fsync(fd)){close(fd);hold("receipt_finalize_failed");}struct stat st;if(fstat(fd,&st)||!S_ISREG(st.st_mode)||st.st_nlink!=1||st.st_uid!=expected_owner||st.st_gid!=expected_group||(st.st_mode&07777)!=0444||(size_t)st.st_size!=size){close(fd);hold("receipt_metadata_invalid");}receipt_state->kind='F';receipt_state->mode=0444;receipt_state->path=(char *)RECEIPT_NAME;receipt_state->size=size;sha_bytes(raw,size,receipt_state->sha256);receipt_state->dev=st.st_dev;receipt_state->ino=st.st_ino;receipt_state->nlink=st.st_nlink;close(fd);}
static void verify_receipt_exact(int rootfd,const char *expected,size_t size){
    struct stat st;
    if(fstatat(rootfd,RECEIPT_NAME,&st,AT_SYMLINK_NOFOLLOW)||!S_ISREG(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=expected_owner||st.st_gid!=expected_group||st.st_nlink!=1||(st.st_mode&07777)!=0444||(size_t)st.st_size!=size) hold("receipt_visible_invalid");
    int fd=openat(rootfd,RECEIPT_NAME,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);
    if(fd<0) hold("receipt_open_failed");
    unsigned char buf[65536];size_t off=0;
    while(off<size){size_t want=size-off;if(want>sizeof(buf))want=sizeof(buf);ssize_t n=read(fd,buf,want);if(n<0&&errno==EINTR)continue;if(n<=0){close(fd);hold("receipt_short_read");}if(memcmp(buf,expected+off,(size_t)n)){close(fd);hold("receipt_content_mismatch");}off+=(size_t)n;}
    unsigned char extra;if(read(fd,&extra,1)!=0){close(fd);hold("receipt_grew");}
    close(fd);
}
static void verify_tree(int rootfd,manifest_v1 *m,const char *receipt,size_t receipt_size){struct stat rootst;if(fstat(rootfd,&rootst)||!S_ISDIR(rootst.st_mode)||rootst.st_uid!=expected_owner||rootst.st_gid!=expected_group||(rootst.st_mode&07777)!=0555)hold("final_root_metadata_invalid");for(size_t i=0;i<m->count;i++)verify_entry(rootfd,&m->entries[i]);verify_exact_layout(rootfd,m);verify_receipt_exact(rootfd,receipt,receipt_size);}

static int fixture_apply(const char *source_root,const char *parent_path,const char *final_name,const char *stage_name){
    fixture_mode=true;expected_owner=getuid();expected_group=getgid();if(!clean_abs(source_root)||!clean_abs(parent_path)||!clean_rel(final_name)||strchr(final_name,'/')||!clean_rel(stage_name)||strchr(stage_name,'/'))hold("fixture_paths_invalid");
    char manifest_path[PATH_MAX],payload_path[PATH_MAX];if(snprintf(manifest_path,sizeof(manifest_path),"%s/%s",source_root,FIXED_MANIFEST_NAME)>=(int)sizeof(manifest_path)||snprintf(payload_path,sizeof(payload_path),"%s/%s",source_root,FIXED_PAYLOAD_NAME)>=(int)sizeof(payload_path))hold("fixture_path_too_long");
    manifest_v1 m=parse_manifest(manifest_path);int payloadfd=open(payload_path,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);if(payloadfd<0)hold("payload_root_open_failed");
    char selfhash[65];self_sha(selfhash);size_t receipt_cap=MAX_RECEIPT_BYTES;char *receipt=malloc(receipt_cap);unsigned char *io=malloc(IO_BUFFER_BYTES);if(!receipt||!io)hold("fixture_buffer_alloc_failed");
    install_write_barrier();
    int pfd=open(parent_path,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);if(pfd<0){close(payloadfd);hold("final_parent_open_failed");}
    struct stat existing;if(!fstatat(pfd,final_name,&existing,AT_SYMLINK_NOFOLLOW)){
        int finalfd=openat(pfd,final_name,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);if(finalfd<0)hold("existing_final_open_failed");for(size_t i=0;i<m.count;i++)verify_entry(finalfd,&m.entries[i]);struct stat rst;if(fstat(finalfd,&rst))hold("existing_final_stat_failed");size_t rs=build_receipt(receipt,receipt_cap,&m,rst,selfhash);verify_tree(finalfd,&m,receipt,rs);if(fsync(pfd))hold("existing_parent_fsync_failed");close(finalfd);printf("%s_FIXTURE_ALREADY_GREEN\n",MARKER);receipt_common(stdout);free(io);free(receipt);close(payloadfd);close(pfd);free_manifest(&m);return 0;
    }else if(errno!=ENOENT)hold("final_state_observation_failed");
    if(!fstatat(pfd,stage_name,&existing,AT_SYMLINK_NOFOLLOW)||errno!=ENOENT)hold("stage_preexisting");if(mkdirat(pfd,stage_name,0700))hold("stage_create_failed");int stagefd=openat(pfd,stage_name,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);if(stagefd<0)hold("stage_open_failed");if(fchown(stagefd,expected_owner,expected_group)||fchmod(stagefd,0700))hold("stage_private_metadata_failed");
    for(size_t i=0;i<m.count;i++)if(m.entries[i].kind=='D')mkdir_rel(stagefd,m.entries[i].path,0700);
    for(size_t i=0;i<m.count;i++)if(m.entries[i].kind=='F')copy_file(payloadfd,stagefd,&m.entries[i],io);
    capture_directory_identities(stagefd,&m);
    struct stat stage_st;if(fstat(stagefd,&stage_st))hold("stage_stat_failed");size_t receipt_size=build_receipt(receipt,receipt_cap,&m,stage_st,selfhash);entry_v1 receipt_state={0};create_receipt(stagefd,receipt,receipt_size,&receipt_state);
    close_tree_dirs(stagefd,&m);verify_tree(stagefd,&m,receipt,receipt_size);require_no_writable_dest_fds(&m,&receipt_state,stagefd);require_single_thread();require_no_shared_writable_mapping();fsync_dirs(stagefd,&m);
    if(rename_noreplace(pfd,stage_name,final_name)){hold("publication_rename_noreplace_failed");}publication_performed=true;
#ifdef VOID_V7_CLOSED_TREE_TEST_HOOKS
    if(fixture_mode&&getenv("VOID_V7_TEST_EXIT_AFTER_RENAME")) _exit(73);
#endif
    if(fsync(pfd))hold("parent_fsync_failed_after_publication");parent_fsync_completed=true;int finalfd=openat(pfd,final_name,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);if(finalfd<0)hold("final_open_failed");verify_tree(finalfd,&m,receipt,receipt_size);final_verification_completed=true;close(finalfd);
    printf("%s_FIXTURE_GREEN\n",MARKER);printf("publication=true\nparent_fsync_completed=true\nfinal_verification_completed=true\n");printf("single_threaded_write_phase=true\nasync_destination_io_forbidden=true\ndestination_io_quiescence_before_publication=true\nseccomp_process_creation_denied=true\nseccomp_fd_passing_denied=true\nseccomp_shared_writable_mapping_denied=true\n");receipt_common(stdout);
    free(io);free(receipt);close(stagefd);close(payloadfd);close(pfd);free_manifest(&m);return 0;
}

static void barrier_self_test(void){
    install_write_barrier();
    errno=0;
#ifdef __NR_fork
    long f=syscall(__NR_fork);if(f!=-1||errno!=EPERM)hold("barrier_fork_not_denied");
#endif
#ifdef __NR_io_uring_setup
    errno=0;long u=syscall(__NR_io_uring_setup,1,NULL);if(u!=-1||errno!=EPERM)hold("barrier_io_uring_not_denied");
#endif
    errno=0;void *p=mmap(NULL,4096,PROT_READ|PROT_WRITE,MAP_SHARED|MAP_ANONYMOUS,-1,0);if(p!=MAP_FAILED||errno!=EPERM)hold("barrier_shared_write_mmap_not_denied");
    printf("%s_BARRIER_SELF_TEST_GREEN\n",MARKER);printf("fork_denied=true\nio_uring_denied=true\nshared_writable_mmap_denied=true\n");receipt_common(stdout);
}
static void task_parser_self_test(void){char tmp[]="/tmp/void-v7-task-fixture.XXXXXX";char *d=mkdtemp(tmp);if(!d)hold("task_fixture_create_failed");char a[PATH_MAX],b[PATH_MAX];snprintf(a,sizeof(a),"%s/123",d);snprintf(b,sizeof(b),"%s/456",d);if(mkdir(a,0700)||count_tasks_path(d)!=1U||mkdir(b,0700)||count_tasks_path(d)!=2U)hold("task_parser_fixture_failed");rmdir(a);rmdir(b);rmdir(d);printf("%s_TASK_PARSER_SELF_TEST_GREEN\n",MARKER);}
static void source_plan(void){printf("%s\n",MARKER);printf("mode=source-plan\nsource_only=true\nimplementation_candidate=true\nproduction_apply_enabled=false\nproduction_payload_manifest_lock_bound=false\nfixed_final_root=%s/%s\n",FIXED_FINAL_PARENT,FIXED_FINAL_NAME);printf("single_threaded_write_phase_required=true\nasync_destination_io_forbidden=true\ndestination_io_quiescence_before_publication_required=true\natomic_noreplace_publication_required=true\ndurable_receipt_required=true\nnew_launcher_generation_authorized=false\nbootstrap_candidate_accepted=false\nroot_execution=false\nprotected_filesystem_mutation=false\n");receipt_common(stdout);}
static void self_test(void){if(!hexn(PLAN_BLOB,40)||strncmp(PLAN_ID,"voidv7createonlysealplan1_",26)||PLAN_REQUIREMENTS!=70U)hold("compile_contract_invalid");if(strlen(ACCEPTED_MANIFEST_SHA256)&&!hexn(ACCEPTED_MANIFEST_SHA256,64))hold("accepted_manifest_compile_hash_invalid");task_parser_self_test();printf("%s_SELF_TEST_GREEN\n",MARKER);printf("manifest_parser_bounded=true\nfresh_inode_create_flags_bound=true\nretained_source_hash_before_copy=true\ndestination_exact_hash_after_copy=true\nreceipt_self_hash_cycle_absent=true\nreceipt_nlink_one_required=true\nproduction_apply_enabled=%s\n",(strlen(ACCEPTED_MANIFEST_SHA256)==64&&ACCEPTED_MANIFEST_BYTES>0)?"true":"false");receipt_common(stdout);}

static void production_disabled(void){
    printf("%s_HOLD reason=production_payload_manifest_lock_not_bound\n",MARKER);
    printf("root_execution=false\nprotected_filesystem_mutation=false\nbootstrap_candidate_accepted=false\n");
    receipt_common(stdout);
    if (false) (void)fixture_apply(FIXED_SOURCE_ROOT,FIXED_FINAL_PARENT,FIXED_FINAL_NAME,FIXED_STAGE_NAME);
    exit(2);
}
int main(int argc,char **argv){
    setvbuf(stdout,NULL,_IONBF,0);setvbuf(stderr,NULL,_IONBF,0);
    if(argc==2&&!strcmp(argv[1],"--self-test")){self_test();return 0;}
    if(argc==2&&!strcmp(argv[1],"--barrier-self-test")){barrier_self_test();return 0;}
    if(argc==2&&!strcmp(argv[1],"--source-plan")){source_plan();return 0;}
#ifdef VOID_V7_CLOSED_TREE_TEST_HOOKS
    if(argc==6&&!strcmp(argv[1],"--fixture-apply")){return fixture_apply(argv[2],argv[3],argv[4],argv[5]);}
#endif
    if(argc>=2&&(!strcmp(argv[1],"--plan")||!strcmp(argv[1],"--apply")))production_disabled();
    fprintf(stderr,"%s_HOLD reason=usage\n",MARKER);receipt_common(stderr);return 2;
}
