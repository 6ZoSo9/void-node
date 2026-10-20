#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <grp.h>
#include <limits.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_V1"
#define POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_POLICY_V1"
#define FIXED_ROOT "/opt/void-buy-void-epoch2-v6r3-plan-first-entry-v1"
#define FIXED_SELF FIXED_ROOT "/void_buy_void_epoch2_v6r3_plan_first_entry_v1"
#define FIXED_POLICY FIXED_ROOT "/policy-v1.conf"
#define FIXED_PLANNER FIXED_ROOT "/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"
#define FIXED_PYTHON_LINK "/usr/bin/python3"
#define PLANNER_GIT_BLOB "19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff"
#define PLANNER_SHA256 "95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627"
#define PLANNER_BYTES 49025U
#define REQUIRED_UID 1000U
#define REQUIRED_GID 1000U
#define CHILD_PLANNER_FD 3
#define CHILD_PYTHON_FD 4
#define MAX_POLICY_BYTES 4096U
#define MAX_PYTHON_BYTES (512U * 1024U * 1024U)
#define CLOSE_FD_CAP 65536L

typedef struct {
    char python_realpath[PATH_MAX];
    char python_sha256[65];
    size_t python_bytes;
} policy_v1;

typedef struct {
    unsigned char data[64];
    uint32_t datalen;
    uint64_t bitlen;
    uint32_t state[8];
} sha256_ctx;

static const uint32_t SHA256_K[64] = {
    0x428a2f98U,0x71374491U,0xb5c0fbcfU,0xe9b5dba5U,
    0x3956c25bU,0x59f111f1U,0x923f82a4U,0xab1c5ed5U,
    0xd807aa98U,0x12835b01U,0x243185beU,0x550c7dc3U,
    0x72be5d74U,0x80deb1feU,0x9bdc06a7U,0xc19bf174U,
    0xe49b69c1U,0xefbe4786U,0x0fc19dc6U,0x240ca1ccU,
    0x2de92c6fU,0x4a7484aaU,0x5cb0a9dcU,0x76f988daU,
    0x983e5152U,0xa831c66dU,0xb00327c8U,0xbf597fc7U,
    0xc6e00bf3U,0xd5a79147U,0x06ca6351U,0x14292967U,
    0x27b70a85U,0x2e1b2138U,0x4d2c6dfcU,0x53380d13U,
    0x650a7354U,0x766a0abbU,0x81c2c92eU,0x92722c85U,
    0xa2bfe8a1U,0xa81a664bU,0xc24b8b70U,0xc76c51a3U,
    0xd192e819U,0xd6990624U,0xf40e3585U,0x106aa070U,
    0x19a4c116U,0x1e376c08U,0x2748774cU,0x34b0bcb5U,
    0x391c0cb3U,0x4ed8aa4aU,0x5b9cca4fU,0x682e6ff3U,
    0x748f82eeU,0x78a5636fU,0x84c87814U,0x8cc70208U,
    0x90befffaU,0xa4506cebU,0xbef9a3f7U,0xc67178f2U
};

static uint32_t rotr32(uint32_t x,uint32_t n){return (x>>n)|(x<<(32U-n));}

static void sha256_transform(sha256_ctx *c,const unsigned char d[64]){
    uint32_t m[64];
    for(size_t i=0;i<16;i++){
        const size_t j=i*4U;
        m[i]=((uint32_t)d[j]<<24)|((uint32_t)d[j+1]<<16)|
             ((uint32_t)d[j+2]<<8)|(uint32_t)d[j+3];
    }
    for(size_t i=16;i<64;i++){
        const uint32_t s0=rotr32(m[i-15],7)^rotr32(m[i-15],18)^(m[i-15]>>3);
        const uint32_t s1=rotr32(m[i-2],17)^rotr32(m[i-2],19)^(m[i-2]>>10);
        m[i]=m[i-16]+s0+m[i-7]+s1;
    }
    uint32_t a=c->state[0],b=c->state[1],cc=c->state[2],d0=c->state[3];
    uint32_t e=c->state[4],f=c->state[5],g=c->state[6],h=c->state[7];
    for(size_t i=0;i<64;i++){
        const uint32_t s1=rotr32(e,6)^rotr32(e,11)^rotr32(e,25);
        const uint32_t ch=(e&f)^((~e)&g);
        const uint32_t t1=h+s1+ch+SHA256_K[i]+m[i];
        const uint32_t s0=rotr32(a,2)^rotr32(a,13)^rotr32(a,22);
        const uint32_t maj=(a&b)^(a&cc)^(b&cc);
        const uint32_t t2=s0+maj;
        h=g;g=f;f=e;e=d0+t1;d0=cc;cc=b;b=a;a=t1+t2;
    }
    c->state[0]+=a;c->state[1]+=b;c->state[2]+=cc;c->state[3]+=d0;
    c->state[4]+=e;c->state[5]+=f;c->state[6]+=g;c->state[7]+=h;
}

static void sha256_init(sha256_ctx *c){
    c->datalen=0;c->bitlen=0;
    c->state[0]=0x6a09e667U;c->state[1]=0xbb67ae85U;
    c->state[2]=0x3c6ef372U;c->state[3]=0xa54ff53aU;
    c->state[4]=0x510e527fU;c->state[5]=0x9b05688cU;
    c->state[6]=0x1f83d9abU;c->state[7]=0x5be0cd19U;
}

static void sha256_update(sha256_ctx *c,const unsigned char *d,size_t n){
    for(size_t i=0;i<n;i++){
        c->data[c->datalen++]=d[i];
        if(c->datalen==64U){
            sha256_transform(c,c->data);
            c->bitlen+=512U;
            c->datalen=0;
        }
    }
}

static void sha256_final(sha256_ctx *c,unsigned char out[32]){
    uint32_t i=c->datalen;
    c->data[i++]=0x80U;
    if(i>56U){
        while(i<64U)c->data[i++]=0;
        sha256_transform(c,c->data);
        i=0;
    }
    while(i<56U)c->data[i++]=0;
    c->bitlen+=(uint64_t)c->datalen*8U;
    for(size_t j=0;j<8;j++)c->data[63U-j]=(unsigned char)(c->bitlen>>(j*8U));
    sha256_transform(c,c->data);
    for(size_t j=0;j<8;j++){
        out[j*4U]=(unsigned char)(c->state[j]>>24);
        out[j*4U+1U]=(unsigned char)(c->state[j]>>16);
        out[j*4U+2U]=(unsigned char)(c->state[j]>>8);
        out[j*4U+3U]=(unsigned char)c->state[j];
    }
}

static void sha256_buffer(const unsigned char *d,size_t n,unsigned char out[32]){
    sha256_ctx c;sha256_init(&c);sha256_update(&c,d,n);sha256_final(&c,out);
}

static void hold(const char *reason){
    fprintf(stderr,"%s_HOLD reason=%s\n",MARKER,reason);
    fprintf(stderr,"planner_python_started=false\n");
    fprintf(stderr,"filesystem_write=false\n");
    fprintf(stderr,"service_mutation=false\n");
    fprintf(stderr,"systemd_mutation=false\n");
    fprintf(stderr,"credential_access=false\n");
    fprintf(stderr,"private_key_access=false\n");
    fprintf(stderr,"signing=false\n");
    fprintf(stderr,"transaction=false\n");
    fprintf(stderr,"rpc_call=false\n");
    fprintf(stderr,"payment_acceptance=false\n");
    fprintf(stderr,"public_presale_activation=false\n");
    fprintf(stderr,"wc_void_market_activation=false\n");
    fprintf(stderr,"treasury_liquidity_action=false\n");
    fprintf(stderr,"funds_movement=false\n");
    exit(2);
}

static bool lower_hex_exact(const char *s,size_t n){
    if(!s||strlen(s)!=n)return false;
    for(size_t i=0;i<n;i++){
        if(!((s[i]>='0'&&s[i]<='9')||(s[i]>='a'&&s[i]<='f')))return false;
    }
    return true;
}

static bool decimal_size(const char *s,size_t maximum,size_t *out){
    if(!s||!*s)return false;
    size_t value=0;
    for(const char *p=s;*p;p++){
        if(*p<'0'||*p>'9')return false;
        const size_t digit=(size_t)(*p-'0');
        if(value>(maximum-digit)/10U)return false;
        value=value*10U+digit;
    }
    if(value==0||value>maximum)return false;
    *out=value;return true;
}

static bool same_generation(const struct stat *a,const struct stat *b){
    return a->st_dev==b->st_dev&&a->st_ino==b->st_ino&&
           a->st_mode==b->st_mode&&a->st_uid==b->st_uid&&a->st_gid==b->st_gid&&
           a->st_nlink==b->st_nlink&&a->st_size==b->st_size&&
           a->st_mtim.tv_sec==b->st_mtim.tv_sec&&a->st_mtim.tv_nsec==b->st_mtim.tv_nsec&&
           a->st_ctim.tv_sec==b->st_ctim.tv_sec&&a->st_ctim.tv_nsec==b->st_ctim.tv_nsec;
}

static void require_nonwritable(const char *path,const char *reason){
    /*
     * Root's DAC-bypass makes access(W_OK) unsuitable before privilege drop.
     * The same custody is revalidated after permanent UID/GID 1000 drop, where
     * the effective write check is authoritative for the runtime identity.
     */
    if(geteuid()==0)return;
    errno=0;
    if(access(path,W_OK)==0)hold(reason);
    if(!(errno==EACCES||errno==EPERM||errno==EROFS))hold("effective_write_audit_unavailable");
}

static void require_safe_directory(const char *path,const char *reason){
    struct stat st;
    if(lstat(path,&st)!=0||!S_ISDIR(st.st_mode)||S_ISLNK(st.st_mode)||
       st.st_uid!=0||st.st_gid!=0||(st.st_mode&0022)!=0)hold(reason);
    require_nonwritable(path,reason);
}

static void require_safe_ancestors(const char *path,const char *reason){
    char buffer[PATH_MAX];const size_t n=strlen(path);
    if(n<2U||n>=sizeof(buffer)||path[0]!='/')hold(reason);
    memcpy(buffer,path,n+1U);require_safe_directory("/",reason);
    for(size_t i=1;i<n;i++){
        if(buffer[i]!='/')continue;
        const char saved=buffer[i];buffer[i]='\0';
        require_safe_directory(buffer,reason);buffer[i]=saved;
    }
}

static bool safe_regular(const struct stat *st,bool executable,mode_t exact_mode){
    if(!S_ISREG(st->st_mode)||S_ISLNK(st->st_mode)||st->st_uid!=0||st->st_gid!=0||
       st->st_nlink!=1||(st->st_mode&0022)!=0||(st->st_mode&(S_ISUID|S_ISGID))!=0)return false;
    if(executable&&(st->st_mode&0111)==0)return false;
    if(exact_mode!=(mode_t)0&&(st->st_mode&0777)!=exact_mode)return false;
    return true;
}

static int open_trusted_regular(
    const char *path,bool executable,mode_t exact_mode,const char *reason,struct stat *opened_out
){
    require_safe_ancestors(path,reason);
    struct stat before;
    if(lstat(path,&before)!=0||!safe_regular(&before,executable,exact_mode))hold(reason);
    require_nonwritable(path,reason);
    const int fd=open(path,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);
    if(fd<0)hold(reason);
    struct stat opened,visible;
    if(fstat(fd,&opened)!=0||lstat(path,&visible)!=0||
       !same_generation(&before,&opened)||!same_generation(&opened,&visible)||
       !safe_regular(&opened,executable,exact_mode)){close(fd);hold(reason);}
    require_nonwritable(path,reason);
    if(opened_out)*opened_out=opened;
    return fd;
}

static void revalidate_trusted_regular(
    const char *path,int fd,const struct stat *expected,bool executable,mode_t exact_mode,const char *reason
){
    struct stat opened,visible;
    if(fstat(fd,&opened)!=0||lstat(path,&visible)!=0||
       !same_generation(expected,&opened)||!same_generation(&opened,&visible)||
       !safe_regular(&opened,executable,exact_mode))hold(reason);
    require_safe_ancestors(path,reason);require_nonwritable(path,reason);
}

static void sha256_fd_hex(int fd,char out[65]){
    if(lseek(fd,0,SEEK_SET)<0)hold("digest_seek_failed");
    sha256_ctx c;sha256_init(&c);unsigned char buf[8192];
    for(;;){
        ssize_t n=read(fd,buf,sizeof(buf));
        if(n<0&&errno==EINTR)continue;
        if(n<0)hold("digest_read_failed");
        if(n==0)break;
        sha256_update(&c,buf,(size_t)n);
    }
    unsigned char digest[32];sha256_final(&c,digest);
    static const char hex[]="0123456789abcdef";
    for(size_t i=0;i<32;i++){out[i*2U]=hex[digest[i]>>4];out[i*2U+1U]=hex[digest[i]&0x0fU];}
    out[64]='\0';if(lseek(fd,0,SEEK_SET)<0)hold("digest_rewind_failed");
}

static void require_digest_size(int fd,const char *expected_sha,size_t expected_bytes,const char *reason){
    struct stat st;
    if(fstat(fd,&st)!=0||st.st_size<0||(uintmax_t)st.st_size!=(uintmax_t)expected_bytes)hold(reason);
    char observed[65];sha256_fd_hex(fd,observed);if(strcmp(observed,expected_sha)!=0)hold(reason);
}

static void require_sealed_snapshot(int fd,size_t expected_bytes,const char *reason){
    struct stat st;
    if(fstat(fd,&st)!=0||st.st_size<0||(uintmax_t)st.st_size!=(uintmax_t)expected_bytes)hold(reason);
    const int want=F_SEAL_WRITE|F_SEAL_GROW|F_SEAL_SHRINK|F_SEAL_SEAL;
    const int observed=fcntl(fd,F_GET_SEALS);
    if(observed<0||(observed&want)!=want)hold(reason);
}

static int sealed_snapshot_fd(
    int source,const char *expected_sha,size_t expected_bytes,mode_t mode,const char *reason
){
    if(lseek(source,0,SEEK_SET)<0)hold(reason);
    const int fd=memfd_create("void-epoch2-v6r3-plan-snapshot",MFD_CLOEXEC|MFD_ALLOW_SEALING);
    if(fd<0)hold(reason);
    size_t remaining=expected_bytes;
    unsigned char buffer[8192];
    while(remaining){
        const size_t want=remaining<sizeof(buffer)?remaining:sizeof(buffer);
        ssize_t got=read(source,buffer,want);
        if(got<0&&errno==EINTR)continue;
        if(got<=0){close(fd);hold(reason);}
        size_t off=0;
        while(off<(size_t)got){
            ssize_t wrote=write(fd,buffer+off,(size_t)got-off);
            if(wrote<0&&errno==EINTR)continue;
            if(wrote<=0){close(fd);hold(reason);}
            off+=(size_t)wrote;
        }
        remaining-=(size_t)got;
    }
    unsigned char extra;
    for(;;){
        const ssize_t got=read(source,&extra,1U);
        if(got<0&&errno==EINTR)continue;
        if(got<0){close(fd);hold(reason);}
        if(got!=0){close(fd);hold(reason);}
        break;
    }
    if(fchmod(fd,mode)!=0){close(fd);hold(reason);}
    char observed_sha[65];sha256_fd_hex(fd,observed_sha);
    if(strcmp(observed_sha,expected_sha)!=0){close(fd);hold(reason);}
    if(fcntl(fd,F_ADD_SEALS,F_SEAL_WRITE|F_SEAL_GROW|F_SEAL_SHRINK|F_SEAL_SEAL)!=0){
        close(fd);hold(reason);
    }
    require_sealed_snapshot(fd,expected_bytes,reason);
    if(lseek(fd,0,SEEK_SET)<0){close(fd);hold(reason);}
    return fd;
}

static void require_self_identity(struct stat *opened_out){
    char observed[PATH_MAX];
    const ssize_t n=readlink("/proc/self/exe",observed,sizeof(observed)-1U);
    if(n<=0||(size_t)n>=sizeof(observed))hold("launcher_self_identity_unreadable");
    observed[n]='\0';if(strcmp(observed,FIXED_SELF)!=0)hold("launcher_fixed_path_required");
    struct stat opened;
    const int fd=open_trusted_regular(FIXED_SELF,true,0555,"launcher_self_custody_invalid",&opened);
    revalidate_trusted_regular(FIXED_SELF,fd,&opened,true,0555,"launcher_self_custody_invalid");
    close(fd);
    if(opened_out)*opened_out=opened;
}

static void revalidate_fixed_generation(
    const char *path,const struct stat *expected,bool executable,mode_t exact_mode,const char *reason
){
    struct stat observed;
    const int fd=open_trusted_regular(path,executable,exact_mode,reason,&observed);
    if(!same_generation(expected,&observed)){close(fd);hold(reason);}
    revalidate_trusted_regular(path,fd,expected,executable,exact_mode,reason);
    close(fd);
}

static policy_v1 parse_policy(char *text){
    policy_v1 p;memset(&p,0,sizeof(p));
    char *save=NULL;char *lines[9];size_t count=0;
    for(char *line=strtok_r(text,"\n",&save);line;line=strtok_r(NULL,"\n",&save)){
        if(count>=9U){
            hold("policy_line_count_invalid");
        }
        lines[count++]=line;
    }
    if(count!=9U)hold("policy_line_count_invalid");
    const char *prefixes[9]={
        "schema=","planner_git_blob=","planner_sha256=","planner_bytes=",
        "python_realpath=","python_sha256=","python_bytes=","runtime_uid=","runtime_gid="
    };
    for(size_t i=0;i<9;i++)if(strncmp(lines[i],prefixes[i],strlen(prefixes[i]))!=0)hold("policy_schema_invalid");
    if(strcmp(lines[0]+strlen(prefixes[0]),POLICY_SCHEMA)!=0)hold("policy_schema_invalid");
    const char *planner_blob=lines[1]+strlen(prefixes[1]);
    const char *planner_sha=lines[2]+strlen(prefixes[2]);
    const char *planner_bytes=lines[3]+strlen(prefixes[3]);
    const char *python_path=lines[4]+strlen(prefixes[4]);
    const char *python_sha=lines[5]+strlen(prefixes[5]);
    const char *python_bytes=lines[6]+strlen(prefixes[6]);
    const char *uid=lines[7]+strlen(prefixes[7]);const char *gid=lines[8]+strlen(prefixes[8]);
    size_t parsed_planner=0,parsed_python=0,parsed_uid=0,parsed_gid=0;
    if(!lower_hex_exact(planner_blob,40U)||strcmp(planner_blob,PLANNER_GIT_BLOB)!=0||
       !lower_hex_exact(planner_sha,64U)||strcmp(planner_sha,PLANNER_SHA256)!=0||
       !decimal_size(planner_bytes,4U*1024U*1024U,&parsed_planner)||parsed_planner!=PLANNER_BYTES||
       python_path[0]!='/'||strlen(python_path)>=sizeof(p.python_realpath)||
       !lower_hex_exact(python_sha,64U)||
       !decimal_size(python_bytes,MAX_PYTHON_BYTES,&parsed_python)||
       !decimal_size(uid,65535U,&parsed_uid)||parsed_uid!=REQUIRED_UID||
       !decimal_size(gid,65535U,&parsed_gid)||parsed_gid!=REQUIRED_GID)hold("policy_value_invalid");
    memcpy(p.python_realpath,python_path,strlen(python_path)+1U);
    memcpy(p.python_sha256,python_sha,65U);p.python_bytes=parsed_python;return p;
}

static policy_v1 read_policy(struct stat *opened_out){
    struct stat opened;
    const int fd=open_trusted_regular(FIXED_POLICY,false,0444,"policy_custody_invalid",&opened);
    if(opened.st_size<=0||(uintmax_t)opened.st_size>MAX_POLICY_BYTES){close(fd);hold("policy_size_invalid");}
    const size_t n=(size_t)opened.st_size;char *buf=calloc(n+1U,1U);
    if(!buf){close(fd);hold("policy_allocation_failed");}
    size_t off=0;
    while(off<n){
        ssize_t got=read(fd,buf+off,n-off);
        if(got<0&&errno==EINTR)continue;
        if(got<=0){free(buf);close(fd);hold("policy_read_failed");}
        off+=(size_t)got;
    }
    if(buf[n-1U]!='\n'){free(buf);close(fd);hold("policy_final_newline_required");}
    revalidate_trusted_regular(FIXED_POLICY,fd,&opened,false,0444,"policy_generation_changed");
    close(fd);
    if(opened_out)*opened_out=opened;
    policy_v1 p=parse_policy(buf);free(buf);return p;
}

static void require_python_link(const char *expected_realpath){
    require_safe_ancestors(FIXED_PYTHON_LINK,"python_link_ancestor_custody_invalid");
    struct stat st;
    if(lstat(FIXED_PYTHON_LINK,&st)!=0||st.st_uid!=0||st.st_gid!=0||
       !(S_ISLNK(st.st_mode)||S_ISREG(st.st_mode)))hold("python_link_custody_invalid");
    require_nonwritable(FIXED_PYTHON_LINK,"python_link_runtime_writable");
    char observed[PATH_MAX];
    if(!realpath(FIXED_PYTHON_LINK,observed)||strcmp(observed,expected_realpath)!=0)hold("python_realpath_mismatch");
}

static void close_unneeded(int keep_a,int keep_b){
    long maxfd=sysconf(_SC_OPEN_MAX);if(maxfd<0||maxfd>CLOSE_FD_CAP)maxfd=CLOSE_FD_CAP;
    for(int fd=5;fd<maxfd;fd++){if(fd==keep_a||fd==keep_b)continue;close(fd);}
}

static void drop_to_runtime(void){
    if(getuid()!=0U||geteuid()!=0U||getgid()!=0U||getegid()!=0U){
        hold("root_static_first_entry_required");
    }
    if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0)!=0)hold("no_new_privs_failed");
    if(setgroups(0,NULL)!=0)hold("supplementary_group_clear_failed");
    if(setresgid((gid_t)REQUIRED_GID,(gid_t)REQUIRED_GID,(gid_t)REQUIRED_GID)!=0){
        hold("runtime_gid_drop_failed");
    }
    if(setresuid((uid_t)REQUIRED_UID,(uid_t)REQUIRED_UID,(uid_t)REQUIRED_UID)!=0){
        hold("runtime_uid_drop_failed");
    }
    if(getuid()!=REQUIRED_UID||geteuid()!=REQUIRED_UID||
       getgid()!=REQUIRED_GID||getegid()!=REQUIRED_GID){
        hold("runtime_identity_drop_not_permanent");
    }
    if(prctl(PR_SET_DUMPABLE,0,0,0,0)!=0)hold("runtime_dumpable_disable_failed");
}

static int self_test(void){
    static const unsigned char expected[32]={
        0xba,0x78,0x16,0xbf,0x8f,0x01,0xcf,0xea,0x41,0x41,0x40,0xde,0x5d,0xae,0x22,0x23,
        0xb0,0x03,0x61,0xa3,0x96,0x17,0x7a,0x9c,0xb4,0x10,0xff,0x61,0xf2,0x00,0x15,0xad
    };
    unsigned char actual[32];sha256_buffer((const unsigned char *)"abc",3U,actual);
    if(memcmp(actual,expected,sizeof(actual))!=0)return 1;
    if(!lower_hex_exact(PLANNER_GIT_BLOB,40U)||!lower_hex_exact(PLANNER_SHA256,64U))return 1;
    size_t parsed=0;if(!decimal_size("49025",100000U,&parsed)||parsed!=PLANNER_BYTES)return 1;
    int seal_test=memfd_create("void-epoch2-v6r3-seal-self-test",MFD_CLOEXEC|MFD_ALLOW_SEALING);
    if(seal_test<0)return 1;
    if(write(seal_test,"abc",3)!=3||
       fcntl(seal_test,F_ADD_SEALS,F_SEAL_WRITE|F_SEAL_GROW|F_SEAL_SHRINK|F_SEAL_SEAL)!=0){
        close(seal_test);return 1;
    }
    errno=0;
    if(pwrite(seal_test,"x",1,0)!=-1||errno!=EPERM){close(seal_test);return 1;}
    close(seal_test);
    printf("%s_SELF_TEST_GREEN\n",MARKER);
    printf("planner_git_blob=%s\n",PLANNER_GIT_BLOB);
    printf("planner_sha256=%s\n",PLANNER_SHA256);
    printf("planner_bytes=%u\n",(unsigned)PLANNER_BYTES);
    printf("root_static_first_entry_required=true\n");
    printf("runtime_uid_gid_1000_required=true\n");
    printf("permanent_uid_gid_drop_before_python=true\n");
    printf("runtime_dumpable_disabled_before_python=true\n");
    printf("planner_retained_descriptor_required=true\n");
    printf("planner_sealed_memfd_execution=true\n");
    printf("python_sealed_memfd_fexecve=true\n");
    printf("sealed_memfd_write_rejected=true\n");
    printf("python_retained_descriptor_fexecve_required=true\n");
    printf("isolated_python_required=true\n");
    printf("python_site_import_disabled=true\n");
    printf("caller_stdin_python_source_authority=false\n");
    printf("filesystem_write=false\n");
    printf("credential_access=false\n");
    printf("signing=false\n");
    printf("transaction=false\n");
    printf("funds_movement=false\n");
    return 0;
}

static void prepare_child_fd(int source,int target,const char *reason){
    if(source!=target){if(dup2(source,target)<0)hold(reason);close(source);}
    int flags=fcntl(target,F_GETFD);
    if(flags<0||fcntl(target,F_SETFD,flags&~FD_CLOEXEC)<0)hold(reason);
}

int main(int argc,char **argv){
    if(argc==2&&strcmp(argv[1],"--self-test")==0)return self_test();
    if(argc!=2||strcmp(argv[1],"--plan")!=0)hold("launcher_arguments_invalid");

    struct stat self_stat;
    require_self_identity(&self_stat);
    if(getuid()!=0U||geteuid()!=0U||getgid()!=0U||getegid()!=0U){
        hold("root_static_first_entry_required");
    }

    struct stat policy_stat;
    policy_v1 policy=read_policy(&policy_stat);

    struct stat planner_stat;
    int planner_fd=open_trusted_regular(FIXED_PLANNER,false,0444,"planner_custody_invalid",&planner_stat);
    require_digest_size(planner_fd,PLANNER_SHA256,PLANNER_BYTES,"planner_identity_invalid");
    revalidate_trusted_regular(FIXED_PLANNER,planner_fd,&planner_stat,false,0444,"planner_generation_changed");

    require_python_link(policy.python_realpath);
    struct stat python_stat;
    int python_fd=open_trusted_regular(policy.python_realpath,true,0,"python_custody_invalid",&python_stat);
    require_digest_size(python_fd,policy.python_sha256,policy.python_bytes,"python_identity_invalid");
    revalidate_trusted_regular(policy.python_realpath,python_fd,&python_stat,true,0,"python_generation_changed");

    int planner_exec_fd=sealed_snapshot_fd(
        planner_fd,PLANNER_SHA256,PLANNER_BYTES,0444,"planner_sealed_snapshot_invalid"
    );
    int python_exec_fd=sealed_snapshot_fd(
        python_fd,policy.python_sha256,policy.python_bytes,0555,"python_sealed_snapshot_invalid"
    );

    umask(077);
    drop_to_runtime();

    /*
     * Now that DAC/ACL checks execute under the actual planner identity,
     * revalidate every protected generation before descriptor handoff.
     */
    revalidate_fixed_generation(
        FIXED_SELF,&self_stat,true,0555,"launcher_runtime_custody_invalid"
    );
    revalidate_fixed_generation(
        FIXED_POLICY,&policy_stat,false,0444,"policy_runtime_custody_invalid"
    );
    revalidate_trusted_regular(
        FIXED_PLANNER,planner_fd,&planner_stat,false,0444,"planner_runtime_generation_changed"
    );
    require_python_link(policy.python_realpath);
    revalidate_trusted_regular(
        policy.python_realpath,python_fd,&python_stat,true,0,"python_runtime_generation_changed"
    );
    require_sealed_snapshot(planner_exec_fd,PLANNER_BYTES,"planner_sealed_snapshot_changed");
    require_sealed_snapshot(python_exec_fd,policy.python_bytes,"python_sealed_snapshot_changed");
    close(planner_fd);
    close(python_fd);
    planner_fd=planner_exec_fd;
    python_fd=python_exec_fd;

    int nullfd=open("/dev/null",O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if(nullfd<0||dup2(nullfd,STDIN_FILENO)<0){
        if(nullfd>=0){
            close(nullfd);
        }
        close(planner_fd);
        close(python_fd);
        hold("devnull_stdin_install_failed");
    }
    close(nullfd);

    if(python_fd==CHILD_PLANNER_FD&&planner_fd!=CHILD_PLANNER_FD){
        const int moved=fcntl(python_fd,F_DUPFD_CLOEXEC,5);
        if(moved<0){close(planner_fd);close(python_fd);hold("python_fd_rehome_failed");}
        close(python_fd);python_fd=moved;
    }
    prepare_child_fd(planner_fd,CHILD_PLANNER_FD,"planner_child_fd_failed");
    if(python_fd!=CHILD_PYTHON_FD){
        if(dup2(python_fd,CHILD_PYTHON_FD)<0){close(python_fd);hold("python_child_fd_failed");}
        close(python_fd);python_fd=CHILD_PYTHON_FD;
    }
    int pyflags=fcntl(python_fd,F_GETFD);
    if(pyflags<0||fcntl(python_fd,F_SETFD,pyflags|FD_CLOEXEC)<0)hold("python_cloexec_failed");
    close_unneeded(CHILD_PLANNER_FD,CHILD_PYTHON_FD);

    char *const child_argv[]={
        policy.python_realpath,"-I","-B","-S","/proc/self/fd/3","--plan",NULL
    };
    char *const child_env[]={
        "PATH=/usr/bin:/bin","HOME=/home/zoso","LANG=C","LC_ALL=C","TZ=UTC","PYTHONNOUSERSITE=1",NULL
    };
    fexecve(python_fd,child_argv,child_env);
    hold("python_fexecve_failed");
    return 2;
}
