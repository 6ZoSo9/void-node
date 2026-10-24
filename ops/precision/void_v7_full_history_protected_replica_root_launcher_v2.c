#define _GNU_SOURCE
#include <errno.h>
#include <dirent.h>
#include <elf.h>
#include <fcntl.h>
#include <grp.h>
#include <inttypes.h>
#include <limits.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MARKER "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_V2"
#define POLICY_SCHEMA "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_POLICY_V2"
#define RECEIPT_SCHEMA "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_RECEIPT_V1"
#define SEAL_MODE "CREATE_ONLY_CLOSED_TREE_V1"
#define PLAN_CONTRACT_ID "voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc"
#define PLAN_CONTRACT_BLOB "9dde5523dca6ab240626430ce1c2b82f1cfe7f20"
#define ACCEPTANCE_ID "voidv7closedtreeaccept1_19ac8c5b09377162ff42048535352a15b5dc75020701c9402c1ebc6ba73fc4b3"
#define FIXED_ROOT "/opt/void-v7-full-history-protected-replica-closed-tree-v1"
#define SELF_REL "bin/void_v7_full_history_protected_replica_root_launcher_v2"
#define POLICY_REL "policy-v2.conf"
#define RECEIPT_REL "install-receipt-v1.conf"
#define PYTHON_REL "runtime/bin/python3.12-static"
#define STDLIB_REL "runtime/lib/python312.zip"
#define INSTALLER_REL "source/ops/precision/void_v7_full_history_protected_replica_install_v1.py"
#define FIXED_SELF FIXED_ROOT "/" SELF_REL
#define FIXED_BIN FIXED_ROOT "/bin"
#define FIXED_POLICY FIXED_ROOT "/" POLICY_REL
#define FIXED_RECEIPT FIXED_ROOT "/" RECEIPT_REL
#define FIXED_RUNTIME_ROOT FIXED_ROOT "/runtime"
#define FIXED_PYTHON_BIN FIXED_RUNTIME_ROOT "/bin"
#define FIXED_PYTHON_LIB FIXED_RUNTIME_ROOT "/lib"
#define FIXED_PYTHON FIXED_ROOT "/" PYTHON_REL
#define FIXED_STDLIB_ZIP FIXED_ROOT "/" STDLIB_REL
#define FIXED_SOURCE_ROOT FIXED_ROOT "/source"
#define FIXED_SOURCE_OPS FIXED_SOURCE_ROOT "/ops"
#define FIXED_SOURCE_PRECISION FIXED_SOURCE_OPS "/precision"
#define FIXED_SOURCE_GIT FIXED_SOURCE_ROOT "/.git"
#define FIXED_SOURCE_GIT_INFO FIXED_SOURCE_GIT "/info"
#define FIXED_SOURCE_GIT_OBJECTS FIXED_SOURCE_GIT "/objects"
#define FIXED_SOURCE_GIT_OBJECTS_INFO FIXED_SOURCE_GIT_OBJECTS "/info"
#define FIXED_SOURCE_GIT_REFS FIXED_SOURCE_GIT "/refs"
#define FIXED_SOURCE_GIT_HEADS FIXED_SOURCE_GIT_REFS "/heads"
#define FIXED_SOURCE_GIT_HEAD FIXED_SOURCE_GIT "/HEAD"
#define FIXED_SOURCE_GIT_CONFIG FIXED_SOURCE_GIT "/config"
#define FIXED_SOURCE_GIT_MAIN FIXED_SOURCE_GIT_HEADS "/main"
#define FIXED_INSTALLER FIXED_ROOT "/" INSTALLER_REL
#define INSTALLER_BYTES 126743U
#define INSTALLER_SHA256 "794e7ee6a12f59860482fc0c2f99840ee92c374c0a660f13560a498986407f37"
#define PLAN_PREFIX "voidv7fullhistoryreplicainstall1_"
#define APPLY_CONFIRM "INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY"
#define RUNTIME_UID 1000U
#define RUNTIME_GID 1000U
#define MAX_POLICY_BYTES 4096U
#define MAX_RECEIPT_BYTES (128U * 1024U * 1024U)
#define MAX_MANIFEST_BYTES (64U * 1024U * 1024U)
#define MAX_PYTHON_BYTES (512U * 1024U * 1024U)
#define MAX_STDLIB_BYTES (512U * 1024U * 1024U)
#define MAX_FILE_BYTES (512ULL * 1024ULL * 1024ULL)
#define MAX_TOTAL_PAYLOAD_BYTES (16ULL * 1024ULL * 1024ULL * 1024ULL)
#define MAX_RECEIPT_ENTRIES 250000U
#define REQUIRED_RECEIPT_COUNT 21U
#define COPY_CHUNK 65536U

struct file_id {
    dev_t dev;
    ino_t ino;
    mode_t mode;
    nlink_t nlink;
    off_t size;
    uid_t uid;
    gid_t gid;
    struct timespec mtim;
    struct timespec ctim;
};

typedef struct {
    size_t python_bytes;
    char python_sha256[65];
    size_t stdlib_bytes;
    char stdlib_sha256[65];
} policy_v2;

typedef struct {
    bool apply;
    const char *expected_head;
    const char *expected_tree;
    const char *expected_plan_id;
    const char *confirm;
} request_v2;

typedef struct {
    char kind;
    mode_t mode;
    char *path;
    uint64_t size;
    char sha256[65];
    uintmax_t dev;
    uintmax_t ino;
    uintmax_t nlink;
} receipt_entry_v1;

typedef struct {
    char manifest_sha256[65];
    size_t manifest_bytes;
    char source_generation[65];
    char bootstrap_sha256[65];
    uintmax_t root_dev;
    uintmax_t root_ino;
    size_t count;
    receipt_entry_v1 *entries;
} receipt_v1;

typedef struct {
    const char *path;
    char kind;
    mode_t mode;
} required_receipt_entry_v1;

static const required_receipt_entry_v1 REQUIRED_RECEIPT[REQUIRED_RECEIPT_COUNT] = {
    {"bin",'D',0555},
    {SELF_REL,'F',0555},
    {POLICY_REL,'F',0444},
    {"runtime",'D',0555},
    {"runtime/bin",'D',0555},
    {PYTHON_REL,'F',0555},
    {"runtime/lib",'D',0555},
    {STDLIB_REL,'F',0444},
    {"source",'D',0555},
    {"source/.git",'D',0555},
    {"source/.git/HEAD",'F',0444},
    {"source/.git/config",'F',0444},
    {"source/.git/info",'D',0555},
    {"source/.git/objects",'D',0555},
    {"source/.git/objects/info",'D',0555},
    {"source/.git/refs",'D',0555},
    {"source/.git/refs/heads",'D',0555},
    {"source/.git/refs/heads/main",'F',0444},
    {"source/ops",'D',0555},
    {"source/ops/precision",'D',0555},
    {INSTALLER_REL,'F',0444},
};

typedef struct{unsigned char data[64];uint32_t datalen;uint64_t bitlen;uint32_t state[8];} sha256_ctx;
static const uint32_t SHA256_K[64]={0x428a2f98U,0x71374491U,0xb5c0fbcfU,0xe9b5dba5U,0x3956c25bU,0x59f111f1U,0x923f82a4U,0xab1c5ed5U,0xd807aa98U,0x12835b01U,0x243185beU,0x550c7dc3U,0x72be5d74U,0x80deb1feU,0x9bdc06a7U,0xc19bf174U,0xe49b69c1U,0xefbe4786U,0x0fc19dc6U,0x240ca1ccU,0x2de92c6fU,0x4a7484aaU,0x5cb0a9dcU,0x76f988daU,0x983e5152U,0xa831c66dU,0xb00327c8U,0xbf597fc7U,0xc6e00bf3U,0xd5a79147U,0x06ca6351U,0x14292967U,0x27b70a85U,0x2e1b2138U,0x4d2c6dfcU,0x53380d13U,0x650a7354U,0x766a0abbU,0x81c2c92eU,0x92722c85U,0xa2bfe8a1U,0xa81a664bU,0xc24b8b70U,0xc76c51a3U,0xd192e819U,0xd6990624U,0xf40e3585U,0x106aa070U,0x19a4c116U,0x1e376c08U,0x2748774cU,0x34b0bcb5U,0x391c0cb3U,0x4ed8aa4aU,0x5b9cca4fU,0x682e6ff3U,0x748f82eeU,0x78a5636fU,0x84c87814U,0x8cc70208U,0x90befffaU,0xa4506cebU,0xbef9a3f7U,0xc67178f2U};
static uint32_t rotr32(uint32_t x,uint32_t n){return(x>>n)|(x<<(32U-n));}
static void sha256_transform(sha256_ctx*c,const unsigned char d[64]){uint32_t m[64];for(size_t i=0;i<16;i++){size_t j=i*4;m[i]=((uint32_t)d[j]<<24)|((uint32_t)d[j+1]<<16)|((uint32_t)d[j+2]<<8)|(uint32_t)d[j+3];}for(size_t i=16;i<64;i++){uint32_t s0=rotr32(m[i-15],7)^rotr32(m[i-15],18)^(m[i-15]>>3),s1=rotr32(m[i-2],17)^rotr32(m[i-2],19)^(m[i-2]>>10);m[i]=m[i-16]+s0+m[i-7]+s1;}uint32_t a=c->state[0],b=c->state[1],cc=c->state[2],dd=c->state[3],e=c->state[4],f=c->state[5],g=c->state[6],h=c->state[7];for(size_t i=0;i<64;i++){uint32_t s1=rotr32(e,6)^rotr32(e,11)^rotr32(e,25),ch=(e&f)^((~e)&g),t1=h+s1+ch+SHA256_K[i]+m[i],s0=rotr32(a,2)^rotr32(a,13)^rotr32(a,22),maj=(a&b)^(a&cc)^(b&cc),t2=s0+maj;h=g;g=f;f=e;e=dd+t1;dd=cc;cc=b;b=a;a=t1+t2;}c->state[0]+=a;c->state[1]+=b;c->state[2]+=cc;c->state[3]+=dd;c->state[4]+=e;c->state[5]+=f;c->state[6]+=g;c->state[7]+=h;}
static void sha256_init(sha256_ctx*c){c->datalen=0;c->bitlen=0;c->state[0]=0x6a09e667U;c->state[1]=0xbb67ae85U;c->state[2]=0x3c6ef372U;c->state[3]=0xa54ff53aU;c->state[4]=0x510e527fU;c->state[5]=0x9b05688cU;c->state[6]=0x1f83d9abU;c->state[7]=0x5be0cd19U;}
static void sha256_update(sha256_ctx*c,const unsigned char*d,size_t n){for(size_t i=0;i<n;i++){c->data[c->datalen++]=d[i];if(c->datalen==64U){sha256_transform(c,c->data);c->bitlen+=512U;c->datalen=0;}}}
static void sha256_final(sha256_ctx*c,unsigned char h[32]){uint32_t i=c->datalen;c->data[i++]=0x80U;if(i>56U){while(i<64U)c->data[i++]=0;sha256_transform(c,c->data);i=0;}while(i<56U)c->data[i++]=0;c->bitlen+=(uint64_t)c->datalen*8U;for(size_t j=0;j<8;j++)c->data[63U-j]=(unsigned char)(c->bitlen>>(j*8U));sha256_transform(c,c->data);for(size_t j=0;j<8;j++){h[j*4]=(unsigned char)(c->state[j]>>24);h[j*4+1]=(unsigned char)(c->state[j]>>16);h[j*4+2]=(unsigned char)(c->state[j]>>8);h[j*4+3]=(unsigned char)c->state[j];}}
static void sha256_buffer(const unsigned char*d,size_t n,unsigned char h[32]){sha256_ctx c;sha256_init(&c);sha256_update(&c,d,n);sha256_final(&c,h);}
static void hex32(const unsigned char d[32], char out[65]) { static const char h[]="0123456789abcdef"; for(size_t i=0;i<32;i++){out[i*2]=h[d[i]>>4];out[i*2+1]=h[d[i]&15];} out[64]=0; }

static void hold(const char *reason) {
    fprintf(stderr, "%s_HOLD reason=%s\n", MARKER, reason);
    fprintf(stderr, "source_snapshot_mutation=false\nprotected_install_performed=false\nservice_mutation=false\ncredential_access=false\nsigning=false\ntransaction=false\npayment_acceptance=false\npublic_presale_activation=false\nwc_void_market_activation=false\nfunds_movement=false\n");
    exit(2);
}
static bool hexn(const char *s,size_t n){ if(!s||strlen(s)!=n)return false;for(size_t i=0;i<n;i++)if(!((s[i]>='0'&&s[i]<='9')||(s[i]>='a'&&s[i]<='f')))return false;return true; }
static bool decsz(const char *s,size_t max,size_t *out){ if(!s||!*s||(s[0]=='0'&&s[1]))return false;size_t v=0;for(;*s;s++){if(*s<'0'||*s>'9')return false;size_t d=(size_t)(*s-'0');if(v>(max-d)/10U)return false;v=v*10U+d;}if(v>max)return false;*out=v;return true; }
static bool planid(const char *s){ return s&&strncmp(s,PLAN_PREFIX,strlen(PLAN_PREFIX))==0&&hexn(s+strlen(PLAN_PREFIX),64); }

static struct file_id fid(struct stat st){ return (struct file_id){st.st_dev,st.st_ino,st.st_mode,st.st_nlink,st.st_size,st.st_uid,st.st_gid,st.st_mtim,st.st_ctim}; }
static bool same_id(struct file_id a,struct file_id b){ return a.dev==b.dev&&a.ino==b.ino&&a.mode==b.mode&&a.nlink==b.nlink&&a.size==b.size&&a.uid==b.uid&&a.gid==b.gid&&a.mtim.tv_sec==b.mtim.tv_sec&&a.mtim.tv_nsec==b.mtim.tv_nsec&&a.ctim.tv_sec==b.ctim.tv_sec&&a.ctim.tv_nsec==b.ctim.tv_nsec; }
static void require_dir(const char *path, mode_t exact_mode, bool exact){ struct stat st;if(lstat(path,&st))hold("trusted_directory_missing"); if(!S_ISDIR(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=0||st.st_gid!=0)hold("trusted_directory_metadata_invalid");mode_t m=st.st_mode&07777;if((exact&&m!=exact_mode)||(!exact&&(m&0022)))hold("trusted_directory_mode_invalid"); }
static void require_ancestors(const char *path){
    char buf[PATH_MAX]; size_t n=strnlen(path,sizeof(buf)); if(!n||n>=sizeof(buf)||path[0]!='/')hold("trusted_path_invalid"); memcpy(buf,path,n+1);
    char *slash=strrchr(buf,'/'); if(!slash)hold("trusted_path_invalid"); if(slash==buf){require_dir("/",0,false);return;} *slash=0;
    for(;;){ require_dir(buf,0,false); slash=strrchr(buf,'/'); if(!slash||slash==buf)break; *slash=0; }
    require_dir("/",0,false);
}
static bool runtime_can_write_path_or_ancestor(const char *path){
    char buf[PATH_MAX]; size_t n=strnlen(path,sizeof(buf));
    if(!n||n>=sizeof(buf)||path[0]!='/') return true;
    memcpy(buf,path,n+1);
    for(;;){
        if(access(buf,W_OK)==0) return true;
        if(!strcmp(buf,"/")) break;
        char *slash=strrchr(buf,'/');
        if(!slash) return true;
        if(slash==buf){ buf[1]=0; }
        else *slash=0;
    }
    return false;
}
static void runtime_nonwritable(char *const paths[], size_t count){
    pid_t p=fork(); if(p<0)hold("runtime_write_audit_fork_failed");
    if(p==0){
        if(setgroups(0,NULL)||setgid((gid_t)RUNTIME_GID)||setuid((uid_t)RUNTIME_UID))_exit(5);
        for(size_t i=0;i<count;i++) if(runtime_can_write_path_or_ancestor(paths[i])) _exit(3);
        _exit(0);
    }
    int st=0;pid_t w;do{w=waitpid(p,&st,0);}while(w<0&&errno==EINTR);
    if(w!=p||!WIFEXITED(st))hold("runtime_write_audit_child_abnormal");
    int rc=WEXITSTATUS(st);if(rc==3)hold("runtime_identity_can_write_trusted_path_or_ancestor");if(rc!=0)hold("runtime_write_audit_failed");
}
static int open_regular_mode(const char *path,size_t max,mode_t exact_mode,bool executable,struct file_id *id){
    struct stat before;
    if(lstat(path,&before))hold("trusted_file_missing");
    mode_t mode=before.st_mode&07777;
    if(!S_ISREG(before.st_mode)||S_ISLNK(before.st_mode)||before.st_uid!=0||before.st_gid!=0||before.st_nlink!=1||before.st_size<0||(uint64_t)before.st_size>max||(before.st_mode&(S_ISUID|S_ISGID))||(before.st_mode&0022)||(exact_mode&&mode!=exact_mode)||(executable&&!(mode&0111)))hold("trusted_file_metadata_invalid");
    int fd=open(path,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);
    if(fd<0)hold("trusted_file_open_failed");
    struct stat opened;if(fstat(fd,&opened)){close(fd);hold("trusted_file_fstat_failed");}
    if(!same_id(fid(before),fid(opened))){close(fd);hold("trusted_file_rebound");}
    *id=fid(opened);return fd;
}
static void revalidate_file(const char *path,int fd,struct file_id expected){ struct stat a,b;if(fstat(fd,&a)||lstat(path,&b)||!same_id(fid(a),expected)||!same_id(fid(b),expected))hold("trusted_file_generation_changed"); }
static void require_running_self(struct file_id expected){
    char observed[PATH_MAX];
    ssize_t n=readlink("/proc/self/exe",observed,sizeof(observed)-1);
    if(n<=0||(size_t)n>=sizeof(observed)) hold("self_executable_unreadable");
    observed[n]=0;
    if(strcmp(observed,FIXED_SELF)) hold("fixed_self_path_required");
    struct stat st;
    if(stat("/proc/self/exe",&st)||!same_id(fid(st),expected)) hold("running_self_generation_mismatch");
}
static void require_exact_dir_entries(const char *path,const char *first,const char *second){
    DIR *dir=opendir(path); if(!dir) hold("runtime_directory_open_failed");
    bool seen_first=false,seen_second=(second==NULL); errno=0;
    for(;;){
        struct dirent *entry=readdir(dir);
        if(!entry) break;
        if(!strcmp(entry->d_name,".")||!strcmp(entry->d_name,"..")) continue;
        if(!strcmp(entry->d_name,first)){ if(seen_first){closedir(dir);hold("runtime_directory_duplicate_entry");} seen_first=true; continue; }
        if(second&&!strcmp(entry->d_name,second)){ if(seen_second){closedir(dir);hold("runtime_directory_duplicate_entry");} seen_second=true; continue; }
        closedir(dir); hold("runtime_directory_extra_entry");
    }
    if(errno){closedir(dir);hold("runtime_directory_read_failed");}
    if(closedir(dir)) hold("runtime_directory_close_failed");
    if(!seen_first||!seen_second) hold("runtime_directory_required_entry_missing");
}
static void pread_exact_or_hold(int fd,void *buffer,size_t bytes,off_t offset,const char *reason){
    unsigned char *out=buffer; size_t done=0;
    while(done<bytes){
        ssize_t n=pread(fd,out+done,bytes-done,offset+(off_t)done);
        if(n<0&&errno==EINTR) continue;
        if(n<=0) hold(reason);
        done+=(size_t)n;
    }
}
static void require_static_python_elf(int fd,size_t bytes){
    Elf64_Ehdr eh;
    if(bytes<sizeof(eh)) hold("python_elf_too_small");
    pread_exact_or_hold(fd,&eh,sizeof(eh),0,"python_elf_header_read_failed");
    if(memcmp(eh.e_ident,ELFMAG,SELFMAG)||eh.e_ident[EI_CLASS]!=ELFCLASS64||eh.e_ident[EI_DATA]!=ELFDATA2LSB||
       eh.e_type!=ET_EXEC||eh.e_machine!=EM_X86_64||eh.e_phentsize!=sizeof(Elf64_Phdr)||eh.e_phnum==0)
        hold("python_static_elf_identity_invalid");
    uint64_t end=(uint64_t)eh.e_phoff+(uint64_t)eh.e_phentsize*(uint64_t)eh.e_phnum;
    if(end>(uint64_t)bytes) hold("python_elf_program_headers_out_of_bounds");
    bool load=false;
    for(uint16_t i=0;i<eh.e_phnum;i++){
        Elf64_Phdr ph;
        pread_exact_or_hold(fd,&ph,sizeof(ph),(off_t)(eh.e_phoff+(uint64_t)i*sizeof(ph)),"python_elf_program_header_read_failed");
        if(ph.p_type==PT_INTERP||ph.p_type==PT_DYNAMIC) hold("dynamic_python_runtime_forbidden");
        if(ph.p_type==PT_LOAD) load=true;
    }
    if(!load) hold("python_elf_pt_load_required");
}
static void hash_exact_fd(int fd,size_t expected,char out[65]){
    if(lseek(fd,0,SEEK_SET)<0) hold("trusted_file_seek_failed");
    sha256_ctx c; sha256_init(&c);
    size_t left=expected; uint8_t buf[COPY_CHUNK];
    while(left){
        size_t want=left<sizeof(buf)?left:sizeof(buf);
        ssize_t n=read(fd,buf,want);
        if(n<0&&errno==EINTR) continue;
        if(n<=0) hold("trusted_file_short_read");
        sha256_update(&c,buf,(size_t)n); left-=(size_t)n;
    }
    uint8_t x; ssize_t n;
    do { n=read(fd,&x,1); } while(n<0&&errno==EINTR);
    if(n!=0) hold("trusted_file_grew");
    uint8_t d[32]; sha256_final(&c,d); hex32(d,out);
}
static char *read_policy_bytes(int fd,size_t size){ char *buf=calloc(size+1,1);if(!buf)hold("policy_allocation_failed");if(lseek(fd,0,SEEK_SET)<0)hold("policy_seek_failed");size_t off=0;while(off<size){ssize_t n=read(fd,buf+off,size-off);if(n<0&&errno==EINTR)continue;if(n<=0)hold("policy_short_read");off+=(size_t)n;}char extra;if(read(fd,&extra,1)!=0)hold("policy_grew");for(size_t i=0;i<size;i++)if(buf[i]=='\0'||buf[i]=='\r')hold("policy_noncanonical_bytes");return buf; }

static bool receipt_clean_rel(const char *path){
    if(!path||!*path||path[0]=='/'||strlen(path)>=PATH_MAX)return false;
    const char *p=path;
    while(*p){
        const char *e=strchr(p,'/');size_t n=e?(size_t)(e-p):strlen(p);
        if(!n||n>NAME_MAX||(n==1&&p[0]=='.')||(n==2&&p[0]=='.'&&p[1]=='.'))return false;
        for(size_t i=0;i<n;i++){unsigned char c=(unsigned char)p[i];if(c<0x20||c==0x7f||c=='|'||c=='\\')return false;}
        if(!e)return true;
        p=e+1;
        if(!*p)return false;
    }
    return false;
}
static bool decu_receipt(const char *s,uintmax_t *out){
    if(!s||!*s||(s[0]=='0'&&s[1]))return false;
    uintmax_t v=0;
    for(const char *p=s;*p;p++){
        if(*p<'0'||*p>'9')return false;
        unsigned digit=(unsigned)(*p-'0');
        if(v>(UINTMAX_MAX-digit)/10U)return false;
        v=v*10U+digit;
    }
    *out=v;
    return true;
}
static bool mode4_receipt(const char *s,mode_t *out){
    if(!s||strlen(s)!=4)return false;
    unsigned v=0;
    for(size_t i=0;i<4;i++){if(s[i]<'0'||s[i]>'7')return false;v=(v<<3)|(unsigned)(s[i]-'0');}
    *out=(mode_t)v;return true;
}
static char *receipt_line(char **cursor){
    char *p=*cursor;if(!p||!*p)hold("receipt_row_missing");
    char *e=strchr(p,'\n');if(!e)hold("receipt_final_lf_required");*e=0;*cursor=e+1;
    if(!*p)hold("receipt_blank_row");
    return p;
}
static char *receipt_value(char *line,const char *key){
    size_t n=strlen(key);if(strncmp(line,key,n)||line[n]!='=')hold("receipt_key_or_order_invalid");
    char *v=line+n+1;if(!*v||strchr(v,'='))hold("receipt_value_invalid");return v;
}
static bool receipt_scope_allowed(const char *path){
    if(!strcmp(path,POLICY_REL))return true;
    const char *roots[]={"bin","runtime","source"};
    for(size_t i=0;i<3;i++){
        size_t n=strlen(roots[i]);
        if(!strcmp(path,roots[i])||(!strncmp(path,roots[i],n)&&path[n]=='/'))return true;
    }
    return false;
}
static bool receipt_source_git_path_allowed(const char *path){
    const char *prefix="source/.git";size_t n=strlen(prefix);
    if(strcmp(path,prefix)&&(strncmp(path,prefix,n)||path[n]!='/'))return true;
    for(size_t i=0;i<REQUIRED_RECEIPT_COUNT;i++)if(!strcmp(REQUIRED_RECEIPT[i].path,path))return true;
    return false;
}
static receipt_v1 parse_receipt(char *raw,size_t size){
    if(!size||raw[size-1]!='\n')hold("receipt_final_lf_required");
    receipt_v1 out={0};char *p=raw;char *v=NULL;size_t tmp=0;uintmax_t u=0;uint64_t total=0;
    if(strcmp(receipt_value(receipt_line(&p),"schema"),RECEIPT_SCHEMA))hold("receipt_schema_invalid");
    if(strcmp(receipt_value(receipt_line(&p),"seal_mode"),SEAL_MODE))hold("receipt_seal_mode_invalid");
    if(strcmp(receipt_value(receipt_line(&p),"plan_contract_id"),PLAN_CONTRACT_ID))hold("receipt_plan_id_invalid");
    if(strcmp(receipt_value(receipt_line(&p),"plan_contract_blob"),PLAN_CONTRACT_BLOB))hold("receipt_plan_blob_invalid");
    v=receipt_value(receipt_line(&p),"manifest_sha256");if(!hexn(v,64))hold("receipt_manifest_sha256_invalid");strcpy(out.manifest_sha256,v);
    v=receipt_value(receipt_line(&p),"manifest_bytes");if(!decsz(v,MAX_MANIFEST_BYTES,&tmp)||!tmp)hold("receipt_manifest_bytes_invalid");out.manifest_bytes=tmp;
    v=receipt_value(receipt_line(&p),"source_generation");if(!hexn(v,64))hold("receipt_source_generation_invalid");strcpy(out.source_generation,v);
    v=receipt_value(receipt_line(&p),"bootstrap_sha256");if(!hexn(v,64))hold("receipt_bootstrap_sha256_invalid");strcpy(out.bootstrap_sha256,v);
    v=receipt_value(receipt_line(&p),"root_dev");if(!decu_receipt(v,&u)||!u)hold("receipt_root_dev_invalid");out.root_dev=u;
    v=receipt_value(receipt_line(&p),"root_ino");if(!decu_receipt(v,&u)||!u)hold("receipt_root_ino_invalid");out.root_ino=u;
    v=receipt_value(receipt_line(&p),"payload_count");if(!decsz(v,MAX_RECEIPT_ENTRIES,&tmp)||tmp<REQUIRED_RECEIPT_COUNT)hold("receipt_payload_count_invalid");out.count=tmp;
    out.entries=calloc(out.count,sizeof(*out.entries));if(!out.entries)hold("receipt_entries_alloc_failed");
    for(size_t i=0;i<out.count;i++){
        char *line=receipt_line(&p);if(strncmp(line,"entry=",6))hold("receipt_entry_prefix_invalid");
        char *fields[8];char *q=line+6;
        for(size_t j=0;j<7;j++){fields[j]=q;char *bar=strchr(q,'|');if(!bar)hold("receipt_entry_field_missing");*bar=0;q=bar+1;}
        fields[7]=q;if(strchr(fields[7],'|'))hold("receipt_entry_extra_field");
        if(strlen(fields[0])!=1||(fields[0][0]!='D'&&fields[0][0]!='F'))hold("receipt_entry_kind_invalid");
        mode_t mode=0;if(!mode4_receipt(fields[1],&mode))hold("receipt_entry_mode_invalid");
        if(!receipt_clean_rel(fields[2])||!strcmp(fields[2],RECEIPT_REL)||!receipt_scope_allowed(fields[2]))hold("receipt_entry_path_invalid");
        if(!receipt_source_git_path_allowed(fields[2]))hold("receipt_source_git_extra_path");
        if(i&&strcmp(out.entries[i-1].path,fields[2])>=0)hold("receipt_entries_not_strictly_sorted");
        receipt_entry_v1 *e=&out.entries[i];e->kind=fields[0][0];e->mode=mode;
        if((e->kind=='D'&&e->mode!=0555)||(e->kind=='F'&&e->mode!=0444&&e->mode!=0555))hold("receipt_entry_mode_contract_invalid");
        size_t plen=strlen(fields[2]);if(plen>=PATH_MAX)hold("receipt_entry_path_too_long");e->path=malloc(plen+1);if(!e->path)hold("receipt_entry_path_alloc_failed");memcpy(e->path,fields[2],plen+1);
        uintmax_t file_size=0;if(!decu_receipt(fields[3],&file_size)||file_size>MAX_FILE_BYTES)hold("receipt_entry_size_invalid");e->size=(uint64_t)file_size;
        if(e->kind=='D'){if(e->size||strcmp(fields[4],"-"))hold("receipt_directory_payload_invalid");e->sha256[0]=0;}
        else{if(!e->size||!hexn(fields[4],64))hold("receipt_file_payload_invalid");strcpy(e->sha256,fields[4]);if(total>MAX_TOTAL_PAYLOAD_BYTES-e->size)hold("receipt_total_bytes_limit");total+=e->size;}
        if(!decu_receipt(fields[5],&e->dev)||!e->dev||!decu_receipt(fields[6],&e->ino)||!e->ino||!decu_receipt(fields[7],&e->nlink)||!e->nlink)hold("receipt_entry_identity_invalid");
        if(e->kind=='F'&&e->nlink!=1)hold("receipt_file_nlink_invalid");
        if(e->kind=='D'&&e->nlink<2)hold("receipt_directory_nlink_invalid");
    }
    if(*p)hold("receipt_extra_rows");
    for(size_t i=0;i<REQUIRED_RECEIPT_COUNT;i++){
        bool found=false;
        for(size_t j=0;j<out.count;j++)if(!strcmp(REQUIRED_RECEIPT[i].path,out.entries[j].path)){
            found=true;
            if(REQUIRED_RECEIPT[i].kind!=out.entries[j].kind||REQUIRED_RECEIPT[i].mode!=out.entries[j].mode)hold("receipt_required_entry_contract_mismatch");
            break;
        }
        if(!found)hold("receipt_required_entry_missing");
    }
    return out;
}
static void free_receipt(receipt_v1 *r){
    if(!r)return;
    for(size_t i=0;i<r->count;i++)free(r->entries[i].path);
    free(r->entries);r->entries=NULL;r->count=0;
}
static const receipt_entry_v1 *receipt_find(const receipt_v1 *r,const char *path){
    for(size_t i=0;i<r->count;i++)if(!strcmp(r->entries[i].path,path))return &r->entries[i];
    hold("receipt_bound_entry_missing");return NULL;
}
static void bind_receipt_root(const receipt_v1 *r){
    struct stat st;if(lstat(FIXED_ROOT,&st))hold("closed_tree_root_missing");
    if(!S_ISDIR(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=0||st.st_gid!=0||(st.st_mode&07777)!=0555)hold("closed_tree_root_metadata_invalid");
    if((uintmax_t)st.st_dev!=r->root_dev||(uintmax_t)st.st_ino!=r->root_ino)hold("closed_tree_root_receipt_identity_mismatch");
}
static void bind_receipt_dir(const receipt_v1 *r,const char *rel,const char *path){
    const receipt_entry_v1 *e=receipt_find(r,rel);struct stat st;if(lstat(path,&st))hold("receipt_directory_missing");
    if(e->kind!='D'||!S_ISDIR(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=0||st.st_gid!=0||(st.st_mode&07777)!=e->mode||
       (uintmax_t)st.st_dev!=e->dev||(uintmax_t)st.st_ino!=e->ino||(uintmax_t)st.st_nlink!=e->nlink)hold("receipt_directory_binding_mismatch");
}
static void bind_receipt_file(const receipt_v1 *r,const char *rel,int fd,struct file_id id){
    const receipt_entry_v1 *e=receipt_find(r,rel);struct stat st;if(fstat(fd,&st))hold("receipt_file_fstat_failed");
    if(e->kind!='F'||!S_ISREG(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=0||st.st_gid!=0||st.st_nlink!=1||
       (st.st_mode&07777)!=e->mode||(uintmax_t)st.st_dev!=e->dev||(uintmax_t)st.st_ino!=e->ino||(uintmax_t)st.st_nlink!=e->nlink||
       (uint64_t)st.st_size!=e->size||!same_id(fid(st),id))hold("receipt_file_binding_mismatch");
    char observed[65];hash_exact_fd(fd,(size_t)e->size,observed);if(strcmp(observed,e->sha256))hold("receipt_file_hash_mismatch");
}
static void bind_receipt_directories(const receipt_v1 *r){
    bind_receipt_dir(r,"bin",FIXED_BIN);
    bind_receipt_dir(r,"runtime",FIXED_RUNTIME_ROOT);
    bind_receipt_dir(r,"runtime/bin",FIXED_PYTHON_BIN);
    bind_receipt_dir(r,"runtime/lib",FIXED_PYTHON_LIB);
    bind_receipt_dir(r,"source",FIXED_SOURCE_ROOT);
    bind_receipt_dir(r,"source/.git",FIXED_SOURCE_GIT);
    bind_receipt_dir(r,"source/.git/info",FIXED_SOURCE_GIT_INFO);
    bind_receipt_dir(r,"source/.git/objects",FIXED_SOURCE_GIT_OBJECTS);
    bind_receipt_dir(r,"source/.git/objects/info",FIXED_SOURCE_GIT_OBJECTS_INFO);
    bind_receipt_dir(r,"source/.git/refs",FIXED_SOURCE_GIT_REFS);
    bind_receipt_dir(r,"source/.git/refs/heads",FIXED_SOURCE_GIT_HEADS);
    bind_receipt_dir(r,"source/ops",FIXED_SOURCE_OPS);
    bind_receipt_dir(r,"source/ops/precision",FIXED_SOURCE_PRECISION);
}
static void require_closed_tree_root_entries(void){
    const char *expected[]={"bin",POLICY_REL,RECEIPT_REL,"runtime","source"};bool seen[5]={0};DIR *dir=opendir(FIXED_ROOT);if(!dir)hold("closed_tree_root_open_failed");errno=0;
    for(;;){struct dirent *entry=readdir(dir);if(!entry)break;if(!strcmp(entry->d_name,".")||!strcmp(entry->d_name,".."))continue;bool ok=false;for(size_t i=0;i<5;i++)if(!strcmp(entry->d_name,expected[i])){if(seen[i]){closedir(dir);hold("closed_tree_root_duplicate_entry");}seen[i]=true;ok=true;break;}if(!ok){closedir(dir);hold("closed_tree_root_extra_entry");}}
    if(errno){closedir(dir);hold("closed_tree_root_read_failed");}if(closedir(dir))hold("closed_tree_root_close_failed");for(size_t i=0;i<5;i++)if(!seen[i])hold("closed_tree_root_required_entry_missing");
}
static policy_v2 parse_policy(char *raw,size_t size){
    if(!size||raw[size-1]!='\n')hold("policy_final_lf_required");
    const char *keys[]={"schema","seal_mode","closed_tree_root","receipt","python_rel","python_bytes","python_sha256","stdlib_rel","stdlib_bytes","stdlib_sha256","installer_rel","installer_bytes","installer_sha256","acceptance_id"};
    char *vals[14]={0};char *p=raw;
    for(size_t i=0;i<14;i++){char *e=strchr(p,'\n');if(!e)hold("policy_row_missing");*e=0;if(!*p)hold("policy_blank_row");size_t kl=strlen(keys[i]);if(strncmp(p,keys[i],kl)||p[kl]!='=')hold("policy_key_or_order_invalid");vals[i]=p+kl+1;if(!*vals[i]||strchr(vals[i],'='))hold("policy_value_invalid");p=e+1;}
    if(*p)hold("policy_extra_rows");
    if(strcmp(vals[0],POLICY_SCHEMA)||strcmp(vals[1],SEAL_MODE)||strcmp(vals[2],FIXED_ROOT)||strcmp(vals[3],RECEIPT_REL)||
       strcmp(vals[4],PYTHON_REL)||strcmp(vals[7],STDLIB_REL)||strcmp(vals[10],INSTALLER_REL)||strcmp(vals[12],INSTALLER_SHA256)||strcmp(vals[13],ACCEPTANCE_ID))
        hold("policy_fixed_value_mismatch");
    size_t pybytes=0,stdlibbytes=0,insbytes=0;
    if(!decsz(vals[5],MAX_PYTHON_BYTES,&pybytes)||!pybytes||!hexn(vals[6],64)||
       !decsz(vals[8],MAX_STDLIB_BYTES,&stdlibbytes)||!stdlibbytes||!hexn(vals[9],64)||
       !decsz(vals[11],INSTALLER_BYTES,&insbytes)||insbytes!=INSTALLER_BYTES)
        hold("policy_numeric_or_hash_invalid");
    policy_v2 out={0};out.python_bytes=pybytes;strcpy(out.python_sha256,vals[6]);out.stdlib_bytes=stdlibbytes;strcpy(out.stdlib_sha256,vals[9]);return out;
}
static bool set_arg_once(const char **slot,const char *value,const char **reason){
    if(*slot){*reason="argument_duplicate";return false;}
    if(!value||!*value){*reason="argument_missing_value";return false;}
    *slot=value;return true;
}
static bool parse_request_inner(int argc,char **argv,request_v2 *out,const char **reason){
    request_v2 r={0};int i=1;
    if(argc<2){*reason="operation_required";return false;}
    if(!strcmp(argv[i],"--plan")){r.apply=false;i++;}
    else if(!strcmp(argv[i],"--apply")){r.apply=true;i++;}
    else {*reason="operation_invalid";return false;}
    while(i<argc){
        if(i+1>=argc){*reason="argument_missing_value";return false;}
        const char *key=argv[i],*value=argv[i+1];bool ok=false;
        if(!strcmp(key,"--expected-head"))ok=set_arg_once(&r.expected_head,value,reason);
        else if(!strcmp(key,"--expected-tree"))ok=set_arg_once(&r.expected_tree,value,reason);
        else if(!strcmp(key,"--expected-plan-id"))ok=set_arg_once(&r.expected_plan_id,value,reason);
        else if(!strcmp(key,"--confirm"))ok=set_arg_once(&r.confirm,value,reason);
        else {*reason="argument_invalid";return false;}
        if(!ok)return false;
        i+=2;
    }
    if(!hexn(r.expected_head,40)||!hexn(r.expected_tree,40)){
        *reason="request_identity_invalid";return false;
    }
    if(r.apply){
        if(!planid(r.expected_plan_id)||!r.confirm||strcmp(r.confirm,APPLY_CONFIRM)){
            *reason="apply_confirmation_invalid";return false;
        }
    }else if(r.expected_plan_id||r.confirm){
        *reason="plan_extra_authority_forbidden";return false;
    }
    *out=r;return true;
}
static request_v2 parse_request(int argc,char **argv){
    request_v2 r={0};const char *reason=NULL;
    if(!parse_request_inner(argc,argv,&r,&reason))hold(reason?reason:"request_invalid");
    return r;
}
static int selftest_fail(const char *reason){
    fprintf(stderr, MARKER "_SELF_TEST_HOLD reason=%s\\n", reason);
    return 1;
}
static int receipt_parser_selftest(void){
    char h[65];memset(h,'a',64);h[64]=0;char raw[65536];size_t off=0;
    int n=snprintf(raw+off,sizeof(raw)-off,
        "schema=%s\nseal_mode=%s\nplan_contract_id=%s\nplan_contract_blob=%s\nmanifest_sha256=%s\nmanifest_bytes=1\nsource_generation=%s\nbootstrap_sha256=%s\nroot_dev=1\nroot_ino=2\npayload_count=%u\n",
        RECEIPT_SCHEMA,SEAL_MODE,PLAN_CONTRACT_ID,PLAN_CONTRACT_BLOB,h,h,h,REQUIRED_RECEIPT_COUNT);
    if(n<0||(size_t)n>=sizeof(raw)-off)return selftest_fail("receipt_fixture_header_failed");
    off+=(size_t)n;
    for(size_t i=0;i<REQUIRED_RECEIPT_COUNT;i++){
        const required_receipt_entry_v1 *e=&REQUIRED_RECEIPT[i];const char *sha=e->kind=='F'?h:"-";unsigned long long size=e->kind=='F'?1ULL:0ULL;unsigned long long nl=e->kind=='F'?1ULL:2ULL;
        n=snprintf(raw+off,sizeof(raw)-off,"entry=%c|%04o|%s|%llu|%s|1|%llu|%llu\n",e->kind,e->mode,e->path,size,sha,(unsigned long long)(10+i),nl);
        if(n<0||(size_t)n>=sizeof(raw)-off)return selftest_fail("receipt_fixture_entry_failed");
        off+=(size_t)n;
    }
    receipt_v1 r=parse_receipt(raw,off);
    if(r.count!=REQUIRED_RECEIPT_COUNT){free_receipt(&r);return selftest_fail("receipt_fixture_count_mismatch");}
    if(strcmp(receipt_find(&r,SELF_REL)->path,SELF_REL)){free_receipt(&r);return selftest_fail("receipt_fixture_self_missing");}
    if(strcmp(receipt_find(&r,"source/.git/refs/heads/main")->path,"source/.git/refs/heads/main")){free_receipt(&r);return selftest_fail("receipt_fixture_git_main_missing");}
    free_receipt(&r);
    return 0;
}
static int selftest(void){
    unsigned char abc[32];char hx[65];sha256_buffer((const unsigned char*)"abc",3,abc);hex32(abc,hx);if(strcmp(hx,"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"))return selftest_fail("sha256_self_test_failed");
    if(receipt_parser_selftest())return 1;
    {
        uintmax_t v=0;
        if(!decu_receipt("0",&v)||v!=0)return selftest_fail("canonical_decimal_zero_rejected");
        if(!decu_receipt("1",&v)||v!=1)return selftest_fail("canonical_decimal_one_rejected");
        if(decu_receipt("+1",&v)||decu_receipt("-1",&v)||decu_receipt(" 1",&v)||decu_receipt("01",&v))
            return selftest_fail("noncanonical_receipt_decimal_accepted");
    }
    {
        char *valid[]={"launcher","--plan",
            "--expected-head","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "--expected-tree","bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"};
        request_v2 req={0};const char *reason=NULL;if(!parse_request_inner(6,valid,&req,&reason)||req.apply)return selftest_fail("valid_replica_plan_request_rejected");
    }
    {
        char *duplicate[]={"launcher","--plan",
            "--expected-head","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "--expected-head","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "--expected-tree","bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"};
        request_v2 req={0};const char *reason=NULL;if(parse_request_inner(8,duplicate,&req,&reason)||!reason||strcmp(reason,"argument_duplicate"))return selftest_fail("duplicate_argument_accepted");
    }
    char policy[4096];int pn=snprintf(policy,sizeof(policy),
        "schema=%s\nseal_mode=%s\nclosed_tree_root=%s\nreceipt=%s\npython_rel=%s\npython_bytes=6831736\npython_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\nstdlib_rel=%s\nstdlib_bytes=123456\nstdlib_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\ninstaller_rel=%s\ninstaller_bytes=%u\ninstaller_sha256=%s\nacceptance_id=%s\n",
        POLICY_SCHEMA,SEAL_MODE,FIXED_ROOT,RECEIPT_REL,PYTHON_REL,STDLIB_REL,INSTALLER_REL,INSTALLER_BYTES,INSTALLER_SHA256,ACCEPTANCE_ID);
    if(pn<=0||(size_t)pn>=sizeof(policy))return selftest_fail("policy_fixture_failed");
    policy_v2 p=parse_policy(policy,(size_t)pn);if(p.python_bytes!=6831736U||p.stdlib_bytes!=123456U)return selftest_fail("policy_parse_mismatch");
    puts(MARKER "_SELF_TEST_GREEN");
    puts("static_native_first_instruction_required=true");
    puts("closed_tree_receipt_before_python_exec_required=true");
    puts("closed_tree_receipt_schema_bound=true");
    puts("canonical_receipt_decimal_required=true");
    puts("closed_tree_plan_contract_bound=true");
    puts("closed_tree_acceptance_id_bound=true");
    puts("receipt_bound_inode_hash_mode_nlink_required=true");
    puts("closed_tree_fixed_runtime_and_complete_source_payload_required=true");
    puts("dynamic_bounded_receipt_entries_required=true");
    puts("minimal_git_authority_paths_required=true");
    puts("minimal_git_authority_exact_layout_required=true");
    puts("create_only_closed_tree_seal_mode_required=true");
    puts("existing_replica_launcher_v1_unchanged=true");
    puts("arbitrary_malicious_root_resistance_claimed=false");
    puts("installer_sha256_compile_bound=true");
    puts("python_content_hash_policy_bound=true");
    puts("static_python_runtime_required=true");
    puts("stdlib_zip_content_hash_policy_bound=true");
    puts("dynamic_python_runtime_forbidden=true");
    puts("python_retained_descriptor_exec_required=true");
    puts("python_isolated_no_site_no_bytecode_required=true");
    puts("minimal_environment_required=true");
    puts("runtime_uid_nonwritability_required=true");
    puts("fresh_operation_bound_plan_confirmation_required=true");
    puts("replica_expected_head_tree_required=true");
    puts("duplicate_request_arguments_rejected=true");
    puts("production_payload_manifest_lock_embedded=false");
    puts("bootstrap_manifest_lock_external_to_launcher=true");
    puts("manifest_hash_compile_cycle_avoided=true");
    puts("production_payload_manifest_accepted=false");
    puts("launcher_install_authorized=false");
    puts("root_execution_authorized=false");
    puts("protected_replica_apply_authorized=false");
    puts("service_mutation=false");
    puts("credential_access=false");
    puts("signing=false");
    puts("payment_acceptance=false");
    puts("public_presale_activation=false");
    puts("funds_movement=false");
    return 0;
}
int main(int argc,char **argv){
    if(argc==2&&!strcmp(argv[1],"--self-test"))return selftest();
    if(getuid()!=0||geteuid()!=0)hold("root_required");
    request_v2 req=parse_request(argc,argv);
    require_ancestors(FIXED_ROOT);require_ancestors(FIXED_SELF);require_ancestors(FIXED_POLICY);require_ancestors(FIXED_RECEIPT);require_ancestors(FIXED_PYTHON);require_ancestors(FIXED_STDLIB_ZIP);require_ancestors(FIXED_INSTALLER);
    require_dir(FIXED_ROOT,0555,true);require_dir(FIXED_BIN,0555,true);require_dir(FIXED_RUNTIME_ROOT,0555,true);require_dir(FIXED_PYTHON_BIN,0555,true);require_dir(FIXED_PYTHON_LIB,0555,true);require_dir(FIXED_SOURCE_ROOT,0555,true);require_dir(FIXED_SOURCE_GIT,0555,true);require_dir(FIXED_SOURCE_GIT_INFO,0555,true);require_dir(FIXED_SOURCE_GIT_OBJECTS,0555,true);require_dir(FIXED_SOURCE_GIT_OBJECTS_INFO,0555,true);require_dir(FIXED_SOURCE_GIT_REFS,0555,true);require_dir(FIXED_SOURCE_GIT_HEADS,0555,true);require_dir(FIXED_SOURCE_OPS,0555,true);require_dir(FIXED_SOURCE_PRECISION,0555,true);
    require_closed_tree_root_entries();
    require_exact_dir_entries(FIXED_BIN,"void_v7_full_history_protected_replica_root_launcher_v2",NULL);
    require_exact_dir_entries(FIXED_RUNTIME_ROOT,"bin","lib");
    require_exact_dir_entries(FIXED_PYTHON_BIN,"python3.12-static",NULL);
    require_exact_dir_entries(FIXED_PYTHON_LIB,"python312.zip",NULL);

    struct file_id receipt_id,self_id,policy_id,installer_id,python_id,stdlib_id,git_head_id,git_config_id,git_main_id;
    int receipt_fd=open_regular_mode(FIXED_RECEIPT,MAX_RECEIPT_BYTES,0444,false,&receipt_id);
    if(receipt_id.size<=0)hold("receipt_empty");
    char *receipt_raw=read_policy_bytes(receipt_fd,(size_t)receipt_id.size);
    receipt_v1 receipt=parse_receipt(receipt_raw,(size_t)receipt_id.size);free(receipt_raw);
    char receipt_hash[65];hash_exact_fd(receipt_fd,(size_t)receipt_id.size,receipt_hash);revalidate_file(FIXED_RECEIPT,receipt_fd,receipt_id);
    bind_receipt_root(&receipt);bind_receipt_directories(&receipt);

    int git_head_fd=open_regular_mode(FIXED_SOURCE_GIT_HEAD,4096U,0444,false,&git_head_id);bind_receipt_file(&receipt,"source/.git/HEAD",git_head_fd,git_head_id);
    int git_config_fd=open_regular_mode(FIXED_SOURCE_GIT_CONFIG,MAX_POLICY_BYTES,0444,false,&git_config_id);bind_receipt_file(&receipt,"source/.git/config",git_config_fd,git_config_id);
    int git_main_fd=open_regular_mode(FIXED_SOURCE_GIT_MAIN,4096U,0444,false,&git_main_id);bind_receipt_file(&receipt,"source/.git/refs/heads/main",git_main_fd,git_main_id);

    int self_fd=open_regular_mode(FIXED_SELF,16U*1024U*1024U,0555,true,&self_id);bind_receipt_file(&receipt,SELF_REL,self_fd,self_id);require_running_self(self_id);
    int policy_fd=open_regular_mode(FIXED_POLICY,MAX_POLICY_BYTES,0444,false,&policy_id);bind_receipt_file(&receipt,POLICY_REL,policy_fd,policy_id);
    char *policy_raw=read_policy_bytes(policy_fd,(size_t)policy_id.size);policy_v2 policy=parse_policy(policy_raw,(size_t)policy_id.size);free(policy_raw);revalidate_file(FIXED_POLICY,policy_fd,policy_id);
    int installer_fd=open_regular_mode(FIXED_INSTALLER,INSTALLER_BYTES,0444,false,&installer_id);bind_receipt_file(&receipt,INSTALLER_REL,installer_fd,installer_id);
    if((size_t)installer_id.size!=INSTALLER_BYTES)hold("installer_size_mismatch");
    char installer_hash[65];
    hash_exact_fd(installer_fd,INSTALLER_BYTES,installer_hash);
    if(strcmp(installer_hash,INSTALLER_SHA256))hold("installer_content_mismatch");
    revalidate_file(FIXED_INSTALLER,installer_fd,installer_id);
    int python_fd=open_regular_mode(FIXED_PYTHON,MAX_PYTHON_BYTES,0555,true,&python_id);bind_receipt_file(&receipt,PYTHON_REL,python_fd,python_id);
    if((size_t)python_id.size!=policy.python_bytes)hold("python_size_mismatch");
    require_static_python_elf(python_fd,policy.python_bytes);
    char python_hash[65];
    hash_exact_fd(python_fd,policy.python_bytes,python_hash);
    if(strcmp(python_hash,policy.python_sha256))hold("python_content_mismatch");
    revalidate_file(FIXED_PYTHON,python_fd,python_id);
    int stdlib_fd=open_regular_mode(FIXED_STDLIB_ZIP,MAX_STDLIB_BYTES,0444,false,&stdlib_id);bind_receipt_file(&receipt,STDLIB_REL,stdlib_fd,stdlib_id);
    if((size_t)stdlib_id.size!=policy.stdlib_bytes)hold("stdlib_zip_size_mismatch");
    char stdlib_hash[65];
    hash_exact_fd(stdlib_fd,policy.stdlib_bytes,stdlib_hash);
    if(strcmp(stdlib_hash,policy.stdlib_sha256))hold("stdlib_zip_content_mismatch");
    revalidate_file(FIXED_STDLIB_ZIP,stdlib_fd,stdlib_id);

    char *audit_paths[]={(char*)FIXED_ROOT,(char*)FIXED_SELF,(char*)FIXED_POLICY,(char*)FIXED_RECEIPT,(char*)FIXED_RUNTIME_ROOT,(char*)FIXED_PYTHON,(char*)FIXED_STDLIB_ZIP,(char*)FIXED_SOURCE_ROOT,(char*)FIXED_SOURCE_GIT_HEAD,(char*)FIXED_SOURCE_GIT_CONFIG,(char*)FIXED_SOURCE_GIT_MAIN,(char*)FIXED_INSTALLER};
    runtime_nonwritable(audit_paths,sizeof(audit_paths)/sizeof(audit_paths[0]));

    bind_receipt_root(&receipt);bind_receipt_directories(&receipt);
    revalidate_file(FIXED_RECEIPT,receipt_fd,receipt_id);char receipt_hash2[65];hash_exact_fd(receipt_fd,(size_t)receipt_id.size,receipt_hash2);if(strcmp(receipt_hash,receipt_hash2))hold("receipt_generation_changed");
    revalidate_file(FIXED_SOURCE_GIT_HEAD,git_head_fd,git_head_id);bind_receipt_file(&receipt,"source/.git/HEAD",git_head_fd,git_head_id);
    revalidate_file(FIXED_SOURCE_GIT_CONFIG,git_config_fd,git_config_id);bind_receipt_file(&receipt,"source/.git/config",git_config_fd,git_config_id);
    revalidate_file(FIXED_SOURCE_GIT_MAIN,git_main_fd,git_main_id);bind_receipt_file(&receipt,"source/.git/refs/heads/main",git_main_fd,git_main_id);
    revalidate_file(FIXED_SELF,self_fd,self_id);bind_receipt_file(&receipt,SELF_REL,self_fd,self_id);
    revalidate_file(FIXED_POLICY,policy_fd,policy_id);bind_receipt_file(&receipt,POLICY_REL,policy_fd,policy_id);
    revalidate_file(FIXED_INSTALLER,installer_fd,installer_id);bind_receipt_file(&receipt,INSTALLER_REL,installer_fd,installer_id);
    revalidate_file(FIXED_PYTHON,python_fd,python_id);bind_receipt_file(&receipt,PYTHON_REL,python_fd,python_id);
    revalidate_file(FIXED_STDLIB_ZIP,stdlib_fd,stdlib_id);bind_receipt_file(&receipt,STDLIB_REL,stdlib_fd,stdlib_id);

    free_receipt(&receipt);close(receipt_fd);close(git_head_fd);close(git_config_fd);close(git_main_fd);close(self_fd);close(policy_fd);close(installer_fd);close(stdlib_fd);
    char *args[16];size_t n=0;args[n++]=(char*)FIXED_PYTHON;args[n++]="-I";args[n++]="-B";args[n++]="-S";args[n++]=(char*)FIXED_INSTALLER;args[n++]=req.apply?"--apply":"--plan";args[n++]="--expected-head";args[n++]=(char*)req.expected_head;args[n++]="--expected-tree";args[n++]=(char*)req.expected_tree;if(req.apply){args[n++]="--expected-plan-id";args[n++]=(char*)req.expected_plan_id;args[n++]="--confirm";args[n++]=(char*)req.confirm;}args[n]=NULL;
    char *const envp[]={"PATH=/usr/bin:/bin","HOME=/nonexistent","LANG=C","LC_ALL=C","TZ=UTC","OPENSSL_CONF=/dev/null",NULL};
    fexecve(python_fd,args,envp);hold("python_fexecve_failed");
}
