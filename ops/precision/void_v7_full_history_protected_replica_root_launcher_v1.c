#define _GNU_SOURCE
#include <errno.h>
#include <dirent.h>
#include <elf.h>
#include <linux/fsverity.h>
#include <fcntl.h>
#include <grp.h>
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

#define MARKER "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_V1"
#define POLICY_SCHEMA "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_POLICY_V1"
#define FIXED_ROOT "/opt/void-v7-full-history-protected-replica-root-launcher-v1"
#define FIXED_SELF FIXED_ROOT "/bin/void_v7_full_history_protected_replica_root_launcher_v1"
#define FIXED_BIN FIXED_ROOT "/bin"
#define FIXED_POLICY FIXED_ROOT "/policy-v1.conf"
#define FIXED_PYTHON_ROOT "/opt/void-buy-void-v7-python-runtime-v1"
#define FIXED_PYTHON_BIN FIXED_PYTHON_ROOT "/bin"
#define FIXED_PYTHON_LIB FIXED_PYTHON_ROOT "/lib"
#define FIXED_PYTHON FIXED_PYTHON_BIN "/python3.12-static"
#define FIXED_STDLIB_ZIP FIXED_PYTHON_LIB "/python312.zip"
#define FIXED_SOURCE_ROOT "/opt/void-v7-full-history-protected-replica-installer-source-v1"
#define INSTALLER_REL "ops/precision/void_v7_full_history_protected_replica_install_v1.py"
#define FIXED_INSTALLER FIXED_SOURCE_ROOT "/" INSTALLER_REL
#define INSTALLER_BYTES 126743U
#define INSTALLER_SHA256 "794e7ee6a12f59860482fc0c2f99840ee92c374c0a660f13560a498986407f37"
#define PLAN_PREFIX "voidv7fullhistoryreplicainstall1_"
#define APPLY_CONFIRM "INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY"
#define RUNTIME_UID 1000U
#define RUNTIME_GID 1000U
#define MAX_POLICY_BYTES 4096U
#define MAX_PYTHON_BYTES (512U * 1024U * 1024U)
#define MAX_STDLIB_BYTES (512U * 1024U * 1024U)
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
} policy_v1;

typedef struct {
    bool apply;
    const char *expected_head;
    const char *expected_tree;
    const char *expected_plan_id;
    const char *confirm;
} request_v1;

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
    fprintf(stderr, "source_snapshot_mutation=false\nprotected_replica_install_performed=false\nlive_release_mutation=false\nservice_mutation=false\ncredential_access=false\nsigning=false\ntransaction=false\npayment_acceptance=false\npublic_presale_activation=false\nwc_void_market_activation=false\nfunds_movement=false\n");
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
static void require_fsverity_sha256(int fd,const char *reason){
    size_t bytes=sizeof(struct fsverity_digest)+32U;
    struct fsverity_digest *digest=calloc(1,bytes);
    if(!digest)hold("fsverity_digest_allocation_failed");
    digest->digest_size=32U;
    if(ioctl(fd,FS_IOC_MEASURE_VERITY,digest)){
        free(digest);
        hold(reason);
    }
    if(digest->digest_algorithm!=FS_VERITY_HASH_ALG_SHA256||digest->digest_size!=32U){
        free(digest);
        hold("fsverity_sha256_digest_required");
    }
    free(digest);
}
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
static policy_v1 parse_policy(char *raw,size_t size){
    if(!size||raw[size-1]!='\n')hold("policy_final_lf_required");
    const char *keys[]={"schema","python_root","python_bytes","python_sha256","stdlib_zip","stdlib_bytes","stdlib_sha256","source_root","installer_rel","installer_bytes","installer_sha256"};
    char *vals[11]={0};char *p=raw;
    for(size_t i=0;i<11;i++){
        char *e=strchr(p,'\n');if(!e)hold("policy_row_missing");*e=0;if(!*p)hold("policy_blank_row");
        size_t kl=strlen(keys[i]);if(strncmp(p,keys[i],kl)||p[kl]!='=')hold("policy_key_or_order_invalid");
        vals[i]=p+kl+1;if(!*vals[i]||strchr(vals[i],'='))hold("policy_value_invalid");p=e+1;
    }
    if(*p)hold("policy_extra_rows");
    if(strcmp(vals[0],POLICY_SCHEMA)||strcmp(vals[1],FIXED_PYTHON_ROOT)||strcmp(vals[4],FIXED_STDLIB_ZIP)||
       strcmp(vals[7],FIXED_SOURCE_ROOT)||strcmp(vals[8],INSTALLER_REL)||strcmp(vals[10],INSTALLER_SHA256))
        hold("policy_fixed_value_mismatch");
    size_t pybytes=0,stdlibbytes=0,insbytes=0;
    if(!decsz(vals[2],MAX_PYTHON_BYTES,&pybytes)||!pybytes||!hexn(vals[3],64)||
       !decsz(vals[5],MAX_STDLIB_BYTES,&stdlibbytes)||!stdlibbytes||!hexn(vals[6],64)||
       !decsz(vals[9],INSTALLER_BYTES,&insbytes)||insbytes!=INSTALLER_BYTES)
        hold("policy_numeric_or_hash_invalid");
    policy_v1 out={0};out.python_bytes=pybytes;strcpy(out.python_sha256,vals[3]);
    out.stdlib_bytes=stdlibbytes;strcpy(out.stdlib_sha256,vals[6]);return out;
}
static bool set_arg_once(const char **slot,const char *value,const char **reason){
    if(*slot){*reason="argument_duplicate";return false;}
    if(!value||!*value){*reason="argument_missing_value";return false;}
    *slot=value;return true;
}
static bool parse_request_inner(int argc,char **argv,request_v1 *out,const char **reason){
    request_v1 r={0};int i=1;
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
static request_v1 parse_request(int argc,char **argv){
    request_v1 r={0};const char *reason=NULL;
    if(!parse_request_inner(argc,argv,&r,&reason))hold(reason?reason:"request_invalid");
    return r;
}
static int selftest_fail(const char *reason){
    fprintf(stderr, MARKER "_SELF_TEST_HOLD reason=%s\\n", reason);
    return 1;
}
static int selftest(void){
    static const unsigned char abc_expected[32]={0xba,0x78,0x16,0xbf,0x8f,0x01,0xcf,0xea,0x41,0x41,0x40,0xde,0x5d,0xae,0x22,0x23,0xb0,0x03,0x61,0xa3,0x96,0x17,0x7a,0x9c,0xb4,0x10,0xff,0x61,0xf2,0x00,0x15,0xad};
    unsigned char abc_digest[32];
    sha256_buffer((const unsigned char*)"abc",3U,abc_digest);
    if(memcmp(abc_digest,abc_expected,sizeof(abc_digest))!=0)return selftest_fail("sha256_vector_mismatch");
    if(!hexn("0123456789abcdef0123456789abcdef01234567",40))return selftest_fail("lower_hex40_rejected");
    if(hexn("ABCDEF",6))return selftest_fail("uppercase_hex_accepted");
    if(!planid(PLAN_PREFIX "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"))return selftest_fail("valid_plan_id_rejected");
    if(planid(PLAN_PREFIX "aa"))return selftest_fail("short_plan_id_accepted");
    if(!hexn("cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",64))return selftest_fail("lower_hex64_rejected");
    {
        char *valid[]={"launcher","--plan",
            "--expected-head","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "--expected-tree","bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"};
        request_v1 req={0};const char *reason=NULL;
        if(!parse_request_inner(6,valid,&req,&reason)||req.apply)return selftest_fail("valid_replica_plan_request_rejected");
    }
    {
        char *duplicate[]={"launcher","--plan",
            "--expected-head","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "--expected-head","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "--expected-tree","bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"};
        request_v1 req={0};const char *reason=NULL;
        if(parse_request_inner(8,duplicate,&req,&reason)||!reason||strcmp(reason,"argument_duplicate"))return selftest_fail("duplicate_argument_accepted");
    }
    {
        char *missing_tree[]={"launcher","--plan",
            "--expected-head","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"};
        request_v1 req={0};const char *reason=NULL;
        if(parse_request_inner(4,missing_tree,&req,&reason))return selftest_fail("missing_tree_accepted");
    }
    {
        char *valid_apply[]={"launcher","--apply",
            "--expected-head","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "--expected-tree","bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "--expected-plan-id",PLAN_PREFIX "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            "--confirm",APPLY_CONFIRM};
        request_v1 req={0};const char *reason=NULL;
        if(!parse_request_inner(10,valid_apply,&req,&reason)||!req.apply)return selftest_fail("valid_replica_apply_request_rejected");
    }
    char policy[]="schema=" POLICY_SCHEMA "\npython_root=" FIXED_PYTHON_ROOT "\npython_bytes=6831736\npython_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\nstdlib_zip=" FIXED_STDLIB_ZIP "\nstdlib_bytes=123456\nstdlib_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nsource_root=" FIXED_SOURCE_ROOT "\ninstaller_rel=" INSTALLER_REL "\ninstaller_bytes=126743\ninstaller_sha256=" INSTALLER_SHA256 "\n";
    policy_v1 p=parse_policy(policy,strlen(policy));
    if(p.python_bytes!=6831736U)return selftest_fail("policy_python_bytes_mismatch");
    if(p.stdlib_bytes!=123456U)return selftest_fail("policy_stdlib_bytes_mismatch");
    puts(MARKER "_SELF_TEST_GREEN");
    puts("static_native_first_instruction_required=true");
    puts("fixed_root_custodied_source_snapshot_required=true");
    puts("installer_sha256_compile_bound=true");
    puts("host_policy_root_custodied_required=true");
    puts("python_content_hash_policy_bound=true");
    puts("static_python_runtime_required=true");
    puts("stdlib_zip_content_hash_policy_bound=true");
    puts("python_runtime_tree_exact_entries_required=true");
    puts("dynamic_python_runtime_forbidden=true");
    puts("python_retained_descriptor_exec_required=true");
    puts("python_isolated_no_site_no_bytecode_required=true");
    puts("minimal_environment_required=true");
    puts("runtime_uid_nonwritability_required=true");
    puts("fsverity_sha256_kernel_seal_required=true");
    puts("launcher_self_fsverity_required=true");
    puts("launcher_policy_fsverity_required=true");
    puts("installer_fsverity_required=true");
    puts("python_fsverity_required=true");
    puts("stdlib_zip_fsverity_required=true");
    puts("fresh_operation_bound_plan_confirmation_required=true");
    puts("replica_expected_head_tree_required=true");
    puts("duplicate_request_arguments_rejected=true");
    puts("replica_source_snapshot_install_authorized=false");
    puts("protected_replica_install_performed=false");
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
    request_v1 req=parse_request(argc,argv);
    require_ancestors(FIXED_SELF);require_ancestors(FIXED_POLICY);require_ancestors(FIXED_PYTHON_ROOT);require_ancestors(FIXED_PYTHON);require_ancestors(FIXED_STDLIB_ZIP);require_ancestors(FIXED_SOURCE_ROOT);require_ancestors(FIXED_INSTALLER);
    require_dir(FIXED_ROOT,0755,true);require_dir(FIXED_BIN,0755,true);
    require_dir(FIXED_PYTHON_ROOT,0555,true);require_dir(FIXED_PYTHON_BIN,0555,true);require_dir(FIXED_PYTHON_LIB,0555,true);
    require_exact_dir_entries(FIXED_PYTHON_ROOT,"bin","lib");
    require_exact_dir_entries(FIXED_PYTHON_BIN,"python3.12-static",NULL);
    require_exact_dir_entries(FIXED_PYTHON_LIB,"python312.zip",NULL);
    require_dir(FIXED_SOURCE_ROOT,0555,true);
    struct file_id self_id,policy_id,installer_id,python_id,stdlib_id;
    int self_fd=open_regular_mode(FIXED_SELF,16U*1024U*1024U,0555,true,&self_id);
    require_fsverity_sha256(self_fd,"launcher_self_fsverity_required");
    require_running_self(self_id);
    int policy_fd=open_regular_mode(FIXED_POLICY,MAX_POLICY_BYTES,0444,false,&policy_id);
    require_fsverity_sha256(policy_fd,"launcher_policy_fsverity_required");
    int installer_fd=open_regular_mode(FIXED_INSTALLER,INSTALLER_BYTES,0444,false,&installer_id);
    require_fsverity_sha256(installer_fd,"installer_fsverity_required");
    char installer_hash[65];hash_exact_fd(installer_fd,INSTALLER_BYTES,installer_hash);if(strcmp(installer_hash,INSTALLER_SHA256))hold("installer_content_mismatch");revalidate_file(FIXED_INSTALLER,installer_fd,installer_id);
    char *policy_raw=read_policy_bytes(policy_fd,(size_t)policy_id.size);policy_v1 policy=parse_policy(policy_raw,(size_t)policy_id.size);free(policy_raw);revalidate_file(FIXED_POLICY,policy_fd,policy_id);
    int python_fd=open_regular_mode(FIXED_PYTHON,MAX_PYTHON_BYTES,0555,true,&python_id);
    require_fsverity_sha256(python_fd,"python_fsverity_required");
    if((size_t)python_id.size!=policy.python_bytes)hold("python_size_mismatch");
    require_static_python_elf(python_fd,policy.python_bytes);
    char python_hash[65];hash_exact_fd(python_fd,policy.python_bytes,python_hash);if(strcmp(python_hash,policy.python_sha256))hold("python_content_mismatch");revalidate_file(FIXED_PYTHON,python_fd,python_id);
    int stdlib_fd=open_regular_mode(FIXED_STDLIB_ZIP,MAX_STDLIB_BYTES,0444,false,&stdlib_id);
    require_fsverity_sha256(stdlib_fd,"stdlib_zip_fsverity_required");
    if((size_t)stdlib_id.size!=policy.stdlib_bytes)hold("stdlib_zip_size_mismatch");
    char stdlib_hash[65];hash_exact_fd(stdlib_fd,policy.stdlib_bytes,stdlib_hash);if(strcmp(stdlib_hash,policy.stdlib_sha256))hold("stdlib_zip_content_mismatch");revalidate_file(FIXED_STDLIB_ZIP,stdlib_fd,stdlib_id);
    char *audit_paths[]={ (char*)FIXED_SELF,(char*)FIXED_POLICY,(char*)FIXED_PYTHON_ROOT,(char*)FIXED_PYTHON,(char*)FIXED_STDLIB_ZIP,(char*)FIXED_SOURCE_ROOT,(char*)FIXED_INSTALLER };
    runtime_nonwritable(audit_paths,sizeof(audit_paths)/sizeof(audit_paths[0]));
    revalidate_file(FIXED_SELF,self_fd,self_id);revalidate_file(FIXED_POLICY,policy_fd,policy_id);revalidate_file(FIXED_PYTHON,python_fd,python_id);revalidate_file(FIXED_STDLIB_ZIP,stdlib_fd,stdlib_id);revalidate_file(FIXED_INSTALLER,installer_fd,installer_id);
    close(self_fd);close(policy_fd);close(installer_fd);close(stdlib_fd);
    char *args[16];size_t n=0;args[n++]=(char*)FIXED_PYTHON;args[n++]="-I";args[n++]="-B";args[n++]="-S";args[n++]=(char*)FIXED_INSTALLER;args[n++]=req.apply?"--apply":"--plan";args[n++]="--expected-head";args[n++]=(char*)req.expected_head;args[n++]="--expected-tree";args[n++]=(char*)req.expected_tree;if(req.apply){args[n++]="--expected-plan-id";args[n++]=(char*)req.expected_plan_id;args[n++]="--confirm";args[n++]=(char*)req.confirm;}args[n]=NULL;
    char *const envp[]={"PATH=/usr/bin:/bin","HOME=/nonexistent","LANG=C","LC_ALL=C","TZ=UTC","OPENSSL_CONF=/dev/null",NULL};
    fexecve(python_fd,args,envp);hold("python_fexecve_failed");
}
