#define _GNU_SOURCE
#include <errno.h>
#include <dirent.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <linux/if_alg.h>
#include <poll.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V5"
#define MANIFEST_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_SOURCE_GENERATION_V2"
#define POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V5"
#define PROOF_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V2"
#define PROOF_ENV "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_FD"
#define GENERATION_PREFIX "voidbuye2dormantsourcegen2_"
#define PLAN_PREFIX "voidbuye2dormantfirstentryinstall4_"
#define APPLY_CONFIRM "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V4_CREATE_ONLY"
#define FIXED_CHECKOUT "/home/zoso/dev/void-node"
#define FIXED_ROOT "/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v5"
#define FIXED_SELF FIXED_ROOT "/bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5"
#define FIXED_MANIFEST FIXED_ROOT "/source-generation-v2.conf"
#define FIXED_POLICY FIXED_ROOT "/policy-v1.conf"
#define FIXED_PYTHON "/usr/bin/python3"
#define FIXED_GIT "/usr/bin/git"
#define FIXED_DEVNULL "/dev/null"
#define MANIFEST_REL "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf"
#define INSTALLER_REL "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py"
#define BOOTSTRAP_SOURCE_REL "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c"
#define LOCK_REL "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json"
#define RUNTIME_REL "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
#define INSTALL_ROOT "/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1"
#define PAYLOAD_POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1"
#define ACCEPTED_LOCK_BLOB "f8ff6fbb855aecafc329cd60622cf3af782745a3"
#define ACCEPTED_LOCK_SHA256 "f10a73ceda4ce49b76039324a4d3a1a25bc23e1138f4c3ed5b0f1b82ba60e812"
#define ACCEPTED_LOCK_BYTES 3939U
#define ACCEPTED_RUNTIME_BLOB "f3d6b1559be7490303cf36338c4bfa38fdaa390a"
#define ACCEPTED_RUNTIME_SHA256 "602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9"
#define ACCEPTED_RUNTIME_BYTES 57255U
#define ACCEPTED_LAUNCHER_SHA256 "4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a"
#define ACCEPTED_LAUNCHER_BYTES 731072U
#define ACCEPTED_NATIVE_SHA256 "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
#define ACCEPTED_NATIVE_BYTES 726976U
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_MANIFEST_SHA256
#error manifest sha required
#endif
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_MANIFEST_BYTES
#error manifest bytes required
#endif
#define MANIFEST_SHA256 VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_MANIFEST_SHA256
#define MANIFEST_BYTES VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_MANIFEST_BYTES
#define MAX_MANIFEST_BYTES 16384U
#define MAX_POLICY_BYTES 1024U
#define MAX_PROOF_BYTES 8192U
#define MAX_SOURCE_BYTES (2U * 1024U * 1024U)
#define MAX_CANDIDATE_BYTES MAX_SOURCE_BYTES
#define MAX_PYTHON_BYTES (512U * 1024U * 1024U)
#define MAX_GIT_BYTES (64U * 1024U * 1024U)
#define MAX_GIT_OUTPUT (64U * 1024U * 1024U)
#define MAX_TRACKED_ENTRIES 200000U
#define MAX_TRACKED_FILE_BYTES (256U * 1024U * 1024U)
#define MAX_TRACKED_TOTAL_BYTES UINT64_C(4294967296)
#define REQUIRED_SEALS (F_SEAL_SEAL | F_SEAL_SHRINK | F_SEAL_GROW | F_SEAL_WRITE)
#define MAX_REPO_INDEX_BYTES MAX_GIT_OUTPUT

typedef enum { OP_NONE=0, OP_PLAN=1, OP_APPLY=2 } operation_v4;
typedef struct {
    operation_v4 op;
    char launcher[PATH_MAX], native[PATH_MAX], expected_head[41], plan[128];
} request_v4;
typedef struct { int fd; struct stat opened; char path[PATH_MAX]; } retained_v4;
typedef struct {
    retained_v4 target;
    struct stat alias;
    char fixed[PATH_MAX];
} tool_v4;
typedef struct { const char *rel; char blob[41], sha256[65]; size_t bytes; } source_v4;
typedef struct {
    source_v4 sources[4];
    char sha256[65], blob[41], generation[96];
    size_t bytes, launcher_bytes, native_bytes;
    char launcher_sha256[65], native_sha256[65];
} manifest_v4;
typedef struct { char python_sha256[65], git_sha256[65]; size_t python_bytes, git_bytes; } policy_v4;
enum role_v4 {
    R_PROOF, R_MANIFEST, R_INSTALLER, R_BOOTSTRAP_SOURCE, R_LOCK, R_RUNTIME,
    R_LAUNCHER, R_NATIVE, R_POLICY, R_PYTHON, R_GIT, R_CHECKOUT, R_GIT_DIR, R_COUNT
};
static const char *const role_names[R_COUNT] = {
    "proof", "manifest", "installer", "bootstrap_source", "lock", "runtime_installer",
    "launcher", "native", "policy", "python", "git", "checkout", "git_dir"
};
typedef struct {
    request_v4 request;
    manifest_v4 manifest;
    policy_v4 policy;
    int fds[R_COUNT];
    retained_v4 self, manifest_input, policy_input, sources[4], candidates[2];
    tool_v4 python, git;
    struct stat checkout_identity, git_dir_identity;
    char checkout_path[PATH_MAX], tree[41], policy_sha256[65];
    size_t policy_bytes;
    int repo_index_source_fd, repo_index_fd, repo_objects_fd;
    struct stat repo_index_source_identity, repo_objects_identity;
    char repo_index_sha256[65], repo_private_path[PATH_MAX];
    bool repo_witness_active;
} context_v4;
typedef struct { unsigned char *data; size_t size; } bytes_v4;
typedef struct { char *path; char mode[7], oid[41]; } entry_v4;
typedef struct { entry_v4 *entries; size_t count; } listing_v4;
static operation_v4 receipt_op=OP_NONE;
static bool installer_child_created=false;
static char repository_cleanup_path[PATH_MAX];

static bool repository_temp_cleanup(void) {
    if (!repository_cleanup_path[0]) return true;
    char path[PATH_MAX];
    bool green=true;
    const char *leaves[]={"refs/heads/main","refs/heads","refs","HEAD","config"};
    for (size_t i=0;i<sizeof(leaves)/sizeof(leaves[0]);i++) {
        int n=snprintf(path,sizeof(path),"%s/%s",repository_cleanup_path,leaves[i]);
        if (n<0 || (size_t)n>=sizeof(path)) { green=false; continue; }
        if (i==1 || i==2) {
            if (rmdir(path) && errno!=ENOENT) green=false;
        } else {
            if (unlink(path) && errno!=ENOENT) green=false;
        }
    }
    if (rmdir(repository_cleanup_path) && errno!=ENOENT) green=false;
    repository_cleanup_path[0]=0;
    return green;
}

static void hold(const char *reason) {
    bool repository_cleanup_green=repository_temp_cleanup();
    fprintf(stderr, "%s_HOLD reason=%s\n", MARKER, reason);
    fprintf(stderr, "temporary_repository_cleanup_green=%s\n", repository_cleanup_green ? "true" : "false");
    fprintf(stderr, "installer_python_started=%s\n", installer_child_created ? "true" : "false");
    if (installer_child_created && receipt_op==OP_APPLY)
        fprintf(stderr, "installer_apply_state=unknown_or_partial_if_child_created\n");
    else fprintf(stderr, "installer_apply_performed=false\n");
    fprintf(stderr, "privileged_first_entry_authenticated=false\ncredential_access=false\n"
        "private_key_access=false\nsigning=false\ntransaction=false\npayment_acceptance=false\n"
        "public_presale_activation=false\nwc_void_market_activation=false\nfunds_movement=false\n");
    exit(2);
}
static bool hexn(const char *s, size_t n) {
    if (!s || strlen(s)!=n) return false;
    for (size_t i=0;i<n;i++)
        if (!((s[i]>='0' && s[i]<='9') || (s[i]>='a' && s[i]<='f'))) return false;
    return true;
}
static bool decsz(const char *s, size_t maximum, size_t *out) {
    if (!s || !*s || *s=='0') return false;
    size_t value=0;
    for (;*s;s++) {
        if (*s<'0' || *s>'9') return false;
        size_t digit=(size_t)(*s-'0');
        if (digit>maximum || value>(maximum-digit)/10U) return false;
        value=value*10U+digit;
    }
    if (!value || value>maximum) return false;
    *out=value; return true;
}
static bool sameid(const struct stat *a, const struct stat *b) {
    return a->st_dev==b->st_dev && a->st_ino==b->st_ino && a->st_uid==b->st_uid &&
        a->st_gid==b->st_gid && a->st_mode==b->st_mode && a->st_nlink==b->st_nlink &&
        a->st_size==b->st_size && a->st_mtim.tv_sec==b->st_mtim.tv_sec &&
        a->st_mtim.tv_nsec==b->st_mtim.tv_nsec && a->st_ctim.tv_sec==b->st_ctim.tv_sec &&
        a->st_ctim.tv_nsec==b->st_ctim.tv_nsec;
}
static bool clean_path(const char *path, bool absolute) {
    if (!path || !*path || strlen(path)>=PATH_MAX || (path[0]=='/')!=absolute) return false;
    const char *p=path+(absolute?1:0);
    while (*p) {
        const char *end=strchr(p,'/'); size_t length=end?(size_t)(end-p):strlen(p);
        if (!length || length>NAME_MAX || (length==1 && p[0]=='.') ||
            (length==2 && !memcmp(p,"..",2))) return false;
        for (size_t i=0;i<length;i++) if (p[i]=='\n' || p[i]=='\r') return false;
        if (!end) return true;
        p=end+1; if (!*p) return false;
    }
    return false;
}
static bool tracked_path(const char *path) {
    if (!clean_path(path,false)) return false;
    const char *p=path;
    while (*p) {
        const char *end=strchr(p,'/'); size_t n=end?(size_t)(end-p):strlen(p);
        if (n==4 && !memcmp(p,".git",4)) return false;
        if (!end) break;
        p=end+1;
    }
    return true;
}
static int directory_path(const char *path) {
    if (!clean_path(path,true)) hold("bootstrap_directory_path_invalid");
    int fd=open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
    if (fd<0) hold("bootstrap_root_directory_open_failed");
    char copy[PATH_MAX]; snprintf(copy,sizeof(copy),"%s",path+1);
    char *save=NULL;
    for (char *part=strtok_r(copy,"/",&save);part;part=strtok_r(NULL,"/",&save)) {
        int child=openat(fd,part,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
        if (child<0) { close(fd); hold("bootstrap_physical_directory_required"); }
        close(fd); fd=child;
    }
    return fd;
}
static void safeanc(const char *path) {
    if (!clean_path(path,true)) hold("bootstrap_root_path_invalid");
    char copy[PATH_MAX]; snprintf(copy,sizeof(copy),"%s",path);
    struct stat st;
    if (lstat("/",&st) || !S_ISDIR(st.st_mode) || st.st_uid!=0 || st.st_gid!=0 || (st.st_mode&0022))
        hold("bootstrap_root_ancestor_invalid");
    for (size_t i=1;copy[i];i++) if (copy[i]=='/') {
        copy[i]=0;
        if (lstat(copy,&st) || !S_ISDIR(st.st_mode) || st.st_uid!=0 || st.st_gid!=0 || (st.st_mode&0022))
            hold("bootstrap_root_ancestor_invalid");
        copy[i]='/';
    }
}
static bool root_regular(const struct stat *st, bool executable) {
    return S_ISREG(st->st_mode) && st->st_uid==0 && st->st_gid==0 && st->st_nlink==1 &&
        !(st->st_mode&0022) && !(st->st_mode&(S_ISUID|S_ISGID)) &&
        (!executable || (st->st_mode&0111));
}
static retained_v4 open_input(const char *path, size_t maximum) {
    if (!clean_path(path,true)) hold("bootstrap_input_path_invalid");
    char parent[PATH_MAX]; snprintf(parent,sizeof(parent),"%s",path);
    char *slash=strrchr(parent,'/'); char leaf[NAME_MAX+1];
    snprintf(leaf,sizeof(leaf),"%s",slash+1);
    int dir;
    if (slash==parent) dir=open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
    else { *slash=0; dir=directory_path(parent); }
    if (dir<0) hold("bootstrap_input_parent_unavailable");
    struct stat before, opened, after;
    if (fstatat(dir,leaf,&before,AT_SYMLINK_NOFOLLOW) || !S_ISREG(before.st_mode) ||
        before.st_nlink!=1 || before.st_size<=0 || (uintmax_t)before.st_size>maximum)
        hold("bootstrap_input_metadata_invalid");
    int fd=openat(dir,leaf,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);
    if (fd<0 || fstat(fd,&opened) || fstatat(dir,leaf,&after,AT_SYMLINK_NOFOLLOW) ||
        !sameid(&before,&opened) || !sameid(&opened,&after)) hold("bootstrap_input_rebound");
    close(dir);
    retained_v4 result={.fd=fd,.opened=opened};
    snprintf(result.path,sizeof(result.path),"%s",path);
    return result;
}
static retained_v4 open_root(const char *path, size_t maximum, bool executable) {
    safeanc(path);
    retained_v4 result=open_input(path,maximum);
    if (!root_regular(&result.opened,executable)) hold("bootstrap_root_file_custody_invalid");
    return result;
}
static void reinput(const retained_v4 *input) {
    struct stat current, visible;
    if (fstat(input->fd,&current) || lstat(input->path,&visible) ||
        !sameid(&input->opened,&current) || !sameid(&current,&visible)) hold("bootstrap_input_generation_changed");
}
static tool_v4 open_tool(const char *fixed, size_t maximum) {
    tool_v4 result={0};
    safeanc(fixed);
    if (lstat(fixed,&result.alias) || result.alias.st_uid!=0 || result.alias.st_gid!=0 ||
        (!S_ISREG(result.alias.st_mode) && !S_ISLNK(result.alias.st_mode)))
        hold("bootstrap_tool_alias_invalid");
    char canonical[PATH_MAX];
    if (!realpath(fixed,canonical)) hold("bootstrap_tool_target_unavailable");
    result.target=open_root(canonical,maximum,true);
    snprintf(result.fixed,sizeof(result.fixed),"%s",fixed);
    return result;
}
static void retool(const tool_v4 *tool) {
    struct stat alias; char canonical[PATH_MAX];
    if (lstat(tool->fixed,&alias) || !sameid(&alias,&tool->alias) ||
        !realpath(tool->fixed,canonical) || strcmp(canonical,tool->target.path))
        hold("bootstrap_tool_alias_changed");
    reinput(&tool->target);
}
static void write_all(int fd, const unsigned char *raw, size_t size) {
    size_t offset=0;
    while (offset<size) {
        ssize_t wrote=write(fd,raw+offset,size-offset);
        if (wrote<0 && errno==EINTR) continue;
        if (wrote<=0) hold("bootstrap_write_failed");
        offset+=(size_t)wrote;
    }
}
/* SHA-1 is used only for Git blob compatibility, never for manifest authority.
 * Streaming computation follows FIPS 180-4 sections 5.1.1, 5.3.1 and 6.1:
 * https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
 * This avoids requiring a separately available kernel SHA-1 algorithm.
 */
typedef struct {
    uint32_t words[5];
    uint64_t total_bytes;
    unsigned char block[64];
    size_t used;
} git_sha1_v4;
static uint32_t rotate_left32(uint32_t word, unsigned int shift) {
    /* Callers use only the fixed nonzero shifts 1, 5 and 30. */
    return (word<<shift)|(word>>(32U-shift));
}
static void git_sha1_block(git_sha1_v4 *hash, const unsigned char block[64]) {
    uint32_t schedule[80];
    for (size_t i=0;i<16;i++)
        schedule[i]=((uint32_t)block[4*i]<<24)|((uint32_t)block[4*i+1]<<16)|
            ((uint32_t)block[4*i+2]<<8)|(uint32_t)block[4*i+3];
    for (size_t i=16;i<80;i++)
        schedule[i]=rotate_left32(schedule[i-3]^schedule[i-8]^schedule[i-14]^schedule[i-16],1);
    uint32_t a=hash->words[0],b=hash->words[1],c=hash->words[2],d=hash->words[3],e=hash->words[4];
    for (size_t i=0;i<80;i++) {
        uint32_t function,constant;
        if (i<20) { function=(b&c)^((~b)&d); constant=UINT32_C(0x5a827999); }
        else if (i<40) { function=b^c^d; constant=UINT32_C(0x6ed9eba1); }
        else if (i<60) { function=(b&c)^(b&d)^(c&d); constant=UINT32_C(0x8f1bbcdc); }
        else { function=b^c^d; constant=UINT32_C(0xca62c1d6); }
        uint32_t next=rotate_left32(a,5)+function+e+constant+schedule[i];
        e=d; d=c; c=rotate_left32(b,30); b=a; a=next;
    }
    hash->words[0]+=a; hash->words[1]+=b; hash->words[2]+=c; hash->words[3]+=d; hash->words[4]+=e;
}
static void git_sha1_update(git_sha1_v4 *hash, const unsigned char *raw, size_t size) {
    if ((uintmax_t)size>UINT64_MAX/8U-hash->total_bytes) hold("bootstrap_git_blob_length_overflow");
    hash->total_bytes+=(uint64_t)size;
    while (size) {
        size_t count=sizeof(hash->block)-hash->used; if (count>size) count=size;
        memcpy(hash->block+hash->used,raw,count); hash->used+=count; raw+=count; size-=count;
        if (hash->used==sizeof(hash->block)) { git_sha1_block(hash,hash->block); hash->used=0; }
    }
}
static void git_sha1_end(git_sha1_v4 *hash, unsigned char digest[20]) {
    uint64_t bits=hash->total_bytes*8U;
    hash->block[hash->used++]=0x80;
    if (hash->used>56) {
        memset(hash->block+hash->used,0,sizeof(hash->block)-hash->used);
        git_sha1_block(hash,hash->block); hash->used=0;
    }
    memset(hash->block+hash->used,0,56-hash->used);
    for (size_t i=0;i<8;i++) hash->block[63-i]=(unsigned char)(bits>>(8*i));
    git_sha1_block(hash,hash->block); hash->used=0;
    for (size_t i=0;i<5;i++) for (size_t j=0;j<4;j++)
        digest[4*i+j]=(unsigned char)(hash->words[i]>>(24-8*j));
}
typedef struct { int socket, operation; size_t bytes; bool git_blob; git_sha1_v4 sha1; } hash_v4;
static hash_v4 hash_begin(const char *name, size_t digest_bytes) {
    if (!strcmp(name,"sha1") && digest_bytes==20) {
        hash_v4 result={.socket=-1,.operation=-1,.bytes=20,.git_blob=true,
            .sha1={.words={UINT32_C(0x67452301),UINT32_C(0xefcdab89),UINT32_C(0x98badcfe),
                UINT32_C(0x10325476),UINT32_C(0xc3d2e1f0)}}};
        return result;
    }
    if (strcmp(name,"sha256") || digest_bytes!=32) hold("bootstrap_hash_algorithm_invalid");
    int sock=socket(AF_ALG,SOCK_SEQPACKET|SOCK_CLOEXEC,0);
    if (sock<0) hold("bootstrap_hash_socket_failed");
    struct sockaddr_alg address={.salg_family=AF_ALG};
    strcpy((char *)address.salg_type,"hash");
    snprintf((char *)address.salg_name,sizeof(address.salg_name),"%s",name);
    if (bind(sock,(void *)&address,sizeof(address))) hold("bootstrap_hash_bind_failed");
    int op=accept4(sock,NULL,NULL,SOCK_CLOEXEC);
    if (op<0) hold("bootstrap_hash_accept_failed");
    return (hash_v4){.socket=sock,.operation=op,.bytes=digest_bytes};
}
static void hash_update(hash_v4 *hash, const unsigned char *raw, size_t size) {
    if (hash->git_blob) { git_sha1_update(&hash->sha1,raw,size); return; }
    size_t offset=0;
    while (offset<size) {
        ssize_t count=send(hash->operation,raw+offset,size-offset,MSG_MORE);
        if (count<0 && errno==EINTR) continue;
        if (count<=0) hold("bootstrap_hash_write_failed");
        offset+=(size_t)count;
    }
}
static void hash_end(hash_v4 *hash, char *out) {
    unsigned char digest[32];
    if (hash->git_blob) git_sha1_end(&hash->sha1,digest);
    else {
        if (send(hash->operation,NULL,0,0)<0) hold("bootstrap_hash_finalize_failed");
        ssize_t count;
        do { count=read(hash->operation,digest,hash->bytes); } while (count<0 && errno==EINTR);
        if (count!=(ssize_t)hash->bytes) hold("bootstrap_hash_result_failed");
        close(hash->operation); close(hash->socket);
    }
    static const char digits[]="0123456789abcdef";
    for (size_t i=0;i<hash->bytes;i++) { out[2*i]=digits[digest[i]>>4]; out[2*i+1]=digits[digest[i]&15]; }
    out[2*hash->bytes]=0;
}
static void hash_bytes(const unsigned char *raw, size_t size, bool blob, char *out) {
    hash_v4 hash=hash_begin(blob?"sha1":"sha256",blob?20:32);
    if (blob) { char prefix[64]; int n=snprintf(prefix,sizeof(prefix),"blob %zu",size); hash_update(&hash,(unsigned char *)prefix,(size_t)n+1); }
    hash_update(&hash,raw,size); hash_end(&hash,out);
}
static void hash_git_object(const char *type, const unsigned char *raw, size_t size, char out[41]) {
    hash_v4 hash=hash_begin("sha1",20);
    char prefix[64];
    int n=snprintf(prefix,sizeof(prefix),"%s %zu",type,size);
    if (n<=0 || (size_t)n+1U>sizeof(prefix)) hold("bootstrap_git_object_hash_prefix_invalid");
    hash_update(&hash,(unsigned char *)prefix,(size_t)n+1U);
    hash_update(&hash,raw,size);
    hash_end(&hash,out);
}
static void hash_fd(int fd, size_t size, bool blob, char *out) {
    hash_v4 hash=hash_begin(blob?"sha1":"sha256",blob?20:32);
    if (blob) { char prefix[64]; int n=snprintf(prefix,sizeof(prefix),"blob %zu",size); hash_update(&hash,(unsigned char *)prefix,(size_t)n+1); }
    unsigned char buffer[65536]; size_t offset=0;
    while (offset<size) {
        size_t want=size-offset; if (want>sizeof(buffer)) want=sizeof(buffer);
        ssize_t count=pread(fd,buffer,want,(off_t)offset);
        if (count<0 && errno==EINTR) continue;
        if (count<=0) hold("bootstrap_hash_short_read");
        hash_update(&hash,buffer,(size_t)count); offset+=(size_t)count;
    }
    if (pread(fd,buffer,1,(off_t)size)!=0) hold("bootstrap_hash_file_size_changed");
    hash_end(&hash,out);
}
static bytes_v4 read_fd(int fd, size_t maximum) {
    struct stat st;
    if (fstat(fd,&st) || !S_ISREG(st.st_mode) || st.st_size<=0 || (uintmax_t)st.st_size>maximum)
        hold("bootstrap_read_size_invalid");
    bytes_v4 result={.size=(size_t)st.st_size}; result.data=calloc(result.size+1,1);
    if (!result.data) hold("bootstrap_read_allocation_failed");
    size_t offset=0;
    while (offset<result.size) {
        ssize_t n=pread(fd,result.data+offset,result.size-offset,(off_t)offset);
        if (n<0 && errno==EINTR) continue;
        if (n<=0) hold("bootstrap_read_short");
        offset+=(size_t)n;
    }
    unsigned char extra;
    if (pread(fd,&extra,1,(off_t)result.size)!=0) hold("bootstrap_read_grew");
    return result;
}
static int readonly_memfd(int writer) {
    char path[64]; snprintf(path,sizeof(path),"/proc/self/fd/%d",writer);
    int fd=open(path,O_RDONLY|O_CLOEXEC);
    if (fd<0) hold("bootstrap_snapshot_readonly_open_failed");
    return fd;
}
static void seal_writer(int fd, mode_t mode) {
    if ((geteuid()==0 && fchown(fd,0,0)) || fchmod(fd,mode) || fcntl(fd,F_ADD_SEALS,REQUIRED_SEALS))
        hold("bootstrap_snapshot_seal_failed");
    int seals=fcntl(fd,F_GET_SEALS);
    if (seals<0 || (seals&REQUIRED_SEALS)!=REQUIRED_SEALS) hold("bootstrap_snapshot_seals_missing");
}
static int snapshot_input(const retained_v4 *input, size_t expected_size, const char *expected_sha, bool executable) {
    if ((uintmax_t)input->opened.st_size!=expected_size) hold("bootstrap_snapshot_size_mismatch");
    int writer=memfd_create("void-e2-source-generation-v2",MFD_CLOEXEC|MFD_ALLOW_SEALING);
    if (writer<0) hold("bootstrap_snapshot_create_failed");
    unsigned char buffer[65536]; size_t offset=0;
    while (offset<expected_size) {
        size_t want=expected_size-offset; if (want>sizeof(buffer)) want=sizeof(buffer);
        ssize_t n=pread(input->fd,buffer,want,(off_t)offset);
        if (n<0 && errno==EINTR) continue;
        if (n<=0) hold("bootstrap_snapshot_source_short_read");
        write_all(writer,buffer,(size_t)n); offset+=(size_t)n;
    }
    if (pread(input->fd,buffer,1,(off_t)expected_size)!=0) hold("bootstrap_snapshot_source_grew");
    reinput(input); seal_writer(writer,executable?0500:0400);
    char digest[65]; hash_fd(writer,expected_size,false,digest);
    if (strcmp(digest,expected_sha)) hold("bootstrap_snapshot_sha256_mismatch");
    int fd=readonly_memfd(writer); close(writer); return fd;
}

/* Canonical data parsers: no repository content is ever evaluated as code. */
static char *canonical_rows(bytes_v4 raw, const char *const *keys, size_t count, char **values) {
    if (!raw.data || !raw.size || raw.data[raw.size-1]!='\n') hold("bootstrap_contract_framing_invalid");
    for (size_t i=0;i<raw.size;i++)
        if (raw.data[i]!='\n' && (raw.data[i]<32 || raw.data[i]>126))
            hold("bootstrap_contract_ascii_invalid");
    char *copy=malloc(raw.size+1);
    if (!copy) hold("bootstrap_contract_allocation_failed");
    memcpy(copy,raw.data,raw.size); copy[raw.size]=0;
    char *row=copy;
    for (size_t i=0;i<count;i++) {
        char *end=strchr(row,'\n'); size_t n=strlen(keys[i]);
        if (!end || (size_t)(end-row)<=n+1 || memcmp(row,keys[i],n) || row[n]!='=')
            hold("bootstrap_contract_row_invalid");
        *end=0; values[i]=row+n+1;
        if (strchr(values[i],'=')) hold("bootstrap_contract_value_invalid");
        row=end+1;
    }
    if (*row) hold("bootstrap_contract_extra_rows");
    return copy;
}
static void exact_value(const char *actual, const char *expected) {
    if (strcmp(actual,expected)) hold("bootstrap_contract_identity_mismatch");
}
static manifest_v4 parse_manifest(bytes_v4 raw) {
    static const char *const keys[]={
        "schema","repository","trusted_os_runtime","checkout_path","bootstrap_root","bootstrap_self",
        "manifest_rel","installer_rel","installer_blob_sha1","installer_bytes","installer_sha256",
        "bootstrap_source_rel","bootstrap_source_blob_sha1","bootstrap_source_bytes","bootstrap_source_sha256",
        "lock_rel","lock_blob_sha1","lock_bytes","lock_sha256",
        "runtime_installer_rel","runtime_installer_blob_sha1","runtime_installer_bytes","runtime_installer_sha256",
        "launcher_bytes","launcher_sha256","native_bytes","native_sha256","python_path","git_path",
        "install_root","payload_policy_schema","host_policy_schema","parent_proof_schema","plan_prefix","confirm_token"
    };
    if (raw.size>MAX_MANIFEST_BYTES) hold("bootstrap_manifest_oversize");
    char *values[35]; char *copy=canonical_rows(raw,keys,35,values);
    exact_value(values[0],MANIFEST_SCHEMA); exact_value(values[1],"6ZoSo9/void-node");
    exact_value(values[2],"root_custodied_linux_loader_python_stdlib_libc_v1");
    exact_value(values[3],FIXED_CHECKOUT); exact_value(values[4],FIXED_ROOT);
    exact_value(values[5],FIXED_SELF); exact_value(values[6],MANIFEST_REL);
    manifest_v4 result={0};
    const char *const paths[]={INSTALLER_REL,BOOTSTRAP_SOURCE_REL,LOCK_REL,RUNTIME_REL};
    for (size_t i=0;i<4;i++) {
        size_t k=7+4*i; source_v4 *source=&result.sources[i];
        exact_value(values[k],paths[i]); source->rel=paths[i];
        if (!hexn(values[k+1],40) || !decsz(values[k+2],MAX_SOURCE_BYTES,&source->bytes) ||
            !hexn(values[k+3],64)) hold("bootstrap_manifest_source_tuple_invalid");
        memcpy(source->blob,values[k+1],41); memcpy(source->sha256,values[k+3],65);
    }
    if (!decsz(values[23],MAX_CANDIDATE_BYTES,&result.launcher_bytes) || !hexn(values[24],64) ||
        !decsz(values[25],MAX_CANDIDATE_BYTES,&result.native_bytes) || !hexn(values[26],64))
        hold("bootstrap_manifest_candidate_tuple_invalid");
    memcpy(result.launcher_sha256,values[24],65); memcpy(result.native_sha256,values[26],65);
    exact_value(result.sources[2].blob,ACCEPTED_LOCK_BLOB);
    exact_value(result.sources[2].sha256,ACCEPTED_LOCK_SHA256);
    exact_value(result.sources[3].blob,ACCEPTED_RUNTIME_BLOB);
    exact_value(result.sources[3].sha256,ACCEPTED_RUNTIME_SHA256);
    exact_value(result.launcher_sha256,ACCEPTED_LAUNCHER_SHA256);
    exact_value(result.native_sha256,ACCEPTED_NATIVE_SHA256);
    if (result.sources[2].bytes!=ACCEPTED_LOCK_BYTES || result.sources[3].bytes!=ACCEPTED_RUNTIME_BYTES ||
        result.launcher_bytes!=ACCEPTED_LAUNCHER_BYTES || result.native_bytes!=ACCEPTED_NATIVE_BYTES)
        hold("bootstrap_manifest_accepted_candidate_mismatch");
    exact_value(values[27],FIXED_PYTHON); exact_value(values[28],FIXED_GIT);
    exact_value(values[29],INSTALL_ROOT); exact_value(values[30],PAYLOAD_POLICY_SCHEMA);
    exact_value(values[31],POLICY_SCHEMA); exact_value(values[32],PROOF_SCHEMA);
    exact_value(values[33],PLAN_PREFIX); exact_value(values[34],APPLY_CONFIRM);
    result.bytes=raw.size;
    hash_bytes(raw.data,raw.size,false,result.sha256); hash_bytes(raw.data,raw.size,true,result.blob);
    int n=snprintf(result.generation,sizeof(result.generation),"%s%s",GENERATION_PREFIX,result.sha256);
    if (n<0 || (size_t)n>=sizeof(result.generation)) hold("bootstrap_generation_identity_overflow");
    free(copy); return result;
}
static policy_v4 parse_policy(bytes_v4 raw) {
    static const char *const keys[]={"schema","python_sha256","python_bytes","git_sha256","git_bytes"};
    if (raw.size>MAX_POLICY_BYTES) hold("bootstrap_host_policy_oversize");
    char *values[5]; char *copy=canonical_rows(raw,keys,5,values); policy_v4 result={0};
    exact_value(values[0],POLICY_SCHEMA);
    if (!hexn(values[1],64) || !decsz(values[2],MAX_PYTHON_BYTES,&result.python_bytes) ||
        !hexn(values[3],64) || !decsz(values[4],MAX_GIT_BYTES,&result.git_bytes))
        hold("bootstrap_host_policy_tool_tuple_invalid");
    memcpy(result.python_sha256,values[1],65); memcpy(result.git_sha256,values[3],65);
    free(copy); return result;
}
static void init_context(context_v4 *ctx) {
    memset(ctx,0,sizeof(*ctx));
    for (size_t i=0;i<R_COUNT;i++) ctx->fds[i]=-1;
    ctx->self.fd=ctx->manifest_input.fd=ctx->policy_input.fd=-1;
    ctx->repo_index_source_fd=ctx->repo_index_fd=ctx->repo_objects_fd=-1;
    ctx->python.target.fd=ctx->git.target.fd=-1;
    for (size_t i=0;i<4;i++) ctx->sources[i].fd=-1;
    for (size_t i=0;i<2;i++) ctx->candidates[i].fd=-1;
}
/* A fixture may bind a disposable physical checkout; production supplies FIXED_CHECKOUT. */
static void bind_checkout(context_v4 *ctx, const char *path) {
    if (ctx->fds[R_CHECKOUT]>=0 || ctx->fds[R_GIT_DIR]>=0) hold("bootstrap_checkout_already_bound");
    ctx->fds[R_CHECKOUT]=directory_path(path);
    ctx->fds[R_GIT_DIR]=openat(ctx->fds[R_CHECKOUT],".git",O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
    if (ctx->fds[R_GIT_DIR]<0 || fstat(ctx->fds[R_CHECKOUT],&ctx->checkout_identity) ||
        fstat(ctx->fds[R_GIT_DIR],&ctx->git_dir_identity)) hold("bootstrap_checkout_git_directory_invalid");
    snprintf(ctx->checkout_path,sizeof(ctx->checkout_path),"%s",path);
}
static void require_absent(int parent, const char *name) {
    struct stat st;
    if (!fstatat(parent,name,&st,AT_SYMLINK_NOFOLLOW) || errno!=ENOENT)
        hold("bootstrap_git_external_object_store_unsupported");
}
static int optional_directory(int parent, const char *name) {
    struct stat before,opened,after;
    if (fstatat(parent,name,&before,AT_SYMLINK_NOFOLLOW)) {
        if (errno==ENOENT) return -1;
        hold("bootstrap_git_store_directory_unavailable");
    }
    if (!S_ISDIR(before.st_mode)) hold("bootstrap_git_store_physical_directory_required");
    int fd=openat(parent,name,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
    if (fd<0 || fstat(fd,&opened) || fstatat(parent,name,&after,AT_SYMLINK_NOFOLLOW) ||
        !sameid(&before,&opened) || !sameid(&opened,&after)) hold("bootstrap_git_store_directory_rebound");
    return fd;
}
static void verify_local_object_store(const context_v4 *ctx) {
    int git=ctx->fds[R_GIT_DIR];
    require_absent(git,"commondir"); require_absent(git,"shallow"); require_absent(git,"gitdir");
    int objects=optional_directory(git,"objects");
    if (objects<0) hold("bootstrap_git_object_directory_required");
    int info=optional_directory(objects,"info");
    if (info>=0) { require_absent(info,"alternates"); require_absent(info,"http-alternates"); close(info); }
    int pack=optional_directory(objects,"pack"); if (pack>=0) close(pack);
    info=optional_directory(git,"info");
    if (info>=0) { require_absent(info,"grafts"); close(info); }
    close(objects);
}
static void recheckout(const context_v4 *ctx) {
    struct stat root,git,visible_root,visible_git;
    int now=directory_path(ctx->checkout_path);
    int git_now=openat(now,".git",O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
    if (git_now<0 || fstat(ctx->fds[R_CHECKOUT],&root) || fstat(ctx->fds[R_GIT_DIR],&git) ||
        fstat(now,&visible_root) || fstat(git_now,&visible_git) ||
        !sameid(&ctx->checkout_identity,&root) || !sameid(&ctx->git_dir_identity,&git) ||
        !sameid(&root,&visible_root) || !sameid(&git,&visible_git)) hold("bootstrap_checkout_directory_changed");
    close(git_now); close(now); verify_local_object_store(ctx);
}
static bytes_v4 read_at_bounded(int parent, const char *name, size_t maximum, int *retained, struct stat *identity) {
    struct stat before,opened,visible,after;
    if (fstatat(parent,name,&before,AT_SYMLINK_NOFOLLOW) || !S_ISREG(before.st_mode) ||
        before.st_size<=0 || (uintmax_t)before.st_size>maximum)
        hold("bootstrap_repository_input_invalid");
    int fd=openat(parent,name,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);
    if (fd<0 || fstat(fd,&opened) || fstatat(parent,name,&visible,AT_SYMLINK_NOFOLLOW) ||
        !sameid(&before,&opened) || !sameid(&opened,&visible))
        hold("bootstrap_repository_input_rebound");
    bytes_v4 raw=read_fd(fd,maximum);
    if (fstat(fd,&after) || !sameid(&opened,&after)) hold("bootstrap_repository_input_changed");
    if (identity) *identity=opened;
    if (retained) *retained=fd; else close(fd);
    return raw;
}
static void private_write_file(const char *path, const unsigned char *raw, size_t size) {
    int fd=open(path,O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW,0600);
    if (fd<0) hold("bootstrap_repository_private_file_create_failed");
    write_all(fd,raw,size);
    if (close(fd)) hold("bootstrap_repository_private_file_close_failed");
}
static void reject_split_index(const context_v4 *ctx) {
    int copy=fcntl(ctx->fds[R_GIT_DIR],F_DUPFD_CLOEXEC,3);
    if (copy<0) hold("bootstrap_repository_git_dir_dup_failed");
    DIR *dir=fdopendir(copy);
    if (!dir) { close(copy); hold("bootstrap_repository_git_dir_scan_failed"); }
    errno=0;
    for (;;) {
        struct dirent *entry=readdir(dir);
        if (!entry) break;
        if (!strncmp(entry->d_name,"sharedindex.",12)) {
            const char *suffix=entry->d_name+12;
            if (strlen(suffix)==40 && hexn(suffix,40)) {
                closedir(dir);
                hold("bootstrap_repository_split_index_unsupported");
            }
        }
        if (!strcmp(entry->d_name,"index.lock")) {
            closedir(dir);
            hold("bootstrap_repository_index_lock_present");
        }
    }
    if (errno) { closedir(dir); hold("bootstrap_repository_git_dir_scan_failed"); }
    closedir(dir);
}
static void source_head_main_exact(const context_v4 *ctx) {
    bytes_v4 head=read_at_bounded(ctx->fds[R_GIT_DIR],"HEAD",256,NULL,NULL);
    static const char expected_head_ref[]="ref: refs/heads/main\n";
    if (head.size!=sizeof(expected_head_ref)-1U || memcmp(head.data,expected_head_ref,head.size))
        hold("bootstrap_checkout_branch_not_main");
    free(head.data);
    int refs=optional_directory(ctx->fds[R_GIT_DIR],"refs");
    if (refs<0) hold("bootstrap_repository_refs_directory_required");
    int heads=optional_directory(refs,"heads");
    if (heads<0) { close(refs); hold("bootstrap_repository_heads_directory_required"); }
    bytes_v4 main=read_at_bounded(heads,"main",128,NULL,NULL);
    char expected[42]; int n=snprintf(expected,sizeof(expected),"%s\n",ctx->request.expected_head);
    if (n!=41 || main.size!=41 || memcmp(main.data,expected,41))
        hold("bootstrap_checkout_head_mismatch");
    free(main.data); close(heads); close(refs);
}
static void repository_index_snapshot(context_v4 *ctx) {
    reject_split_index(ctx);
    bytes_v4 index=read_at_bounded(ctx->fds[R_GIT_DIR],"index",MAX_REPO_INDEX_BYTES,
                                   &ctx->repo_index_source_fd,&ctx->repo_index_source_identity);
    hash_bytes(index.data,index.size,false,ctx->repo_index_sha256);
    int writer=memfd_create("void-e2-repository-index-v5",MFD_CLOEXEC|MFD_ALLOW_SEALING);
    if (writer<0) hold("bootstrap_repository_index_snapshot_create_failed");
    write_all(writer,index.data,index.size); free(index.data);
    seal_writer(writer,0400);
    ctx->repo_index_fd=readonly_memfd(writer); close(writer);
}
static void repository_private_metadata(context_v4 *ctx) {
    char pattern[]="/tmp/void-e2-git-witness-v5-XXXXXX";
    char *created=mkdtemp(pattern);
    if (!created || chmod(created,0700)) hold("bootstrap_repository_private_dir_create_failed");
    snprintf(ctx->repo_private_path,sizeof(ctx->repo_private_path),"%s",created);
    snprintf(repository_cleanup_path,sizeof(repository_cleanup_path),"%s",created);
    char refs[PATH_MAX],heads[PATH_MAX],path[PATH_MAX];
    int n=snprintf(refs,sizeof(refs),"%s/refs",created);
    if (n<0 || (size_t)n>=sizeof(refs)) hold("bootstrap_repository_private_path_overflow");
    n=snprintf(heads,sizeof(heads),"%s/refs/heads",created);
    if (n<0 || (size_t)n>=sizeof(heads)) hold("bootstrap_repository_private_path_overflow");
    if (mkdir(refs,0700) || mkdir(heads,0700)) hold("bootstrap_repository_private_refs_create_failed");
    n=snprintf(path,sizeof(path),"%s/HEAD",created);
    if (n<0 || (size_t)n>=sizeof(path)) hold("bootstrap_repository_private_path_overflow");
    static const unsigned char head_value[]="ref: refs/heads/main\n";
    private_write_file(path,head_value,sizeof(head_value)-1U);
    char mainraw[42]; n=snprintf(mainraw,sizeof(mainraw),"%s\n",ctx->request.expected_head);
    if (n!=41) hold("bootstrap_repository_private_head_invalid");
    n=snprintf(path,sizeof(path),"%s/refs/heads/main",created);
    if (n<0 || (size_t)n>=sizeof(path)) hold("bootstrap_repository_private_path_overflow");
    private_write_file(path,(unsigned char *)mainraw,41);
    static const unsigned char config[]=
        "[core]\nrepositoryFormatVersion = 0\nbare = false\nfileMode = true\n"
        "logAllRefUpdates = false\nfsmonitor = false\nhooksPath = /dev/null\n"
        "attributesFile = /dev/null\nexcludesFile = /dev/null\nuntrackedCache = false\n"
        "splitIndex = false\nautocrlf = false\n[gc]\nauto = 0\n[maintenance]\nauto = false\n";
    n=snprintf(path,sizeof(path),"%s/config",created);
    if (n<0 || (size_t)n>=sizeof(path)) hold("bootstrap_repository_private_path_overflow");
    private_write_file(path,config,sizeof(config)-1U);
}
static void repository_witness_begin(context_v4 *ctx) {
    if (ctx->repo_witness_active) hold("bootstrap_repository_witness_already_active");
    recheckout(ctx); source_head_main_exact(ctx); repository_index_snapshot(ctx);
    ctx->repo_objects_fd=openat(ctx->fds[R_GIT_DIR],"objects",O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
    if (ctx->repo_objects_fd<0 || fstat(ctx->repo_objects_fd,&ctx->repo_objects_identity))
        hold("bootstrap_repository_objects_unavailable");
    repository_private_metadata(ctx);
    ctx->repo_witness_active=true;
}
static void git_inherit_fd_or_exit(int fd) {
    int flags=fcntl(fd,F_GETFD);
    if (flags<0 || fcntl(fd,F_SETFD,flags&~FD_CLOEXEC)) _exit(125);
}
static void require_waitable_children(void) {
    struct sigaction disposition;
    if (sigaction(SIGCHLD,NULL,&disposition) || disposition.sa_handler!=SIG_DFL ||
        (disposition.sa_flags&SA_NOCLDWAIT)) hold("bootstrap_waitable_children_required");
}
static int64_t monotonic_millis(void) {
    struct timespec now;
    if (clock_gettime(CLOCK_MONOTONIC,&now)) hold("bootstrap_monotonic_clock_failed");
    return (int64_t)now.tv_sec*1000+now.tv_nsec/1000000;
}
static void stop_git(pid_t pid) {
    (void)kill(-pid,SIGKILL); (void)kill(pid,SIGKILL);
    int64_t deadline=monotonic_millis()+2000;
    for (;;) {
        int status; pid_t waited=waitpid(pid,&status,WNOHANG);
        if (waited==pid) return;
        if (waited<0 && errno!=EINTR) hold("bootstrap_git_termination_wait_failed");
        if (monotonic_millis()>=deadline) hold("bootstrap_git_termination_incomplete");
        if (poll(NULL,0,10)<0 && errno!=EINTR) hold("bootstrap_git_termination_poll_failed");
    }
}
static bytes_v4 git_capture(const context_v4 *ctx, const char *const *command, size_t maximum) {
    if (!ctx->repo_witness_active || ctx->fds[R_GIT]<3 || ctx->repo_index_fd<3 ||
        ctx->repo_objects_fd<3 || !ctx->repo_private_path[0] ||
        !maximum || maximum>MAX_GIT_OUTPUT)
        hold("bootstrap_git_capture_contract_invalid");
    char git_dir[PATH_MAX+16],work_tree[PATH_MAX+16],safe[PATH_MAX+32];
    char index_env[96],objects_env[96];
    if (snprintf(git_dir,sizeof(git_dir),"--git-dir=%s",ctx->repo_private_path)>=(int)sizeof(git_dir) ||
        snprintf(work_tree,sizeof(work_tree),"--work-tree=%s",ctx->checkout_path)>=(int)sizeof(work_tree) ||
        snprintf(safe,sizeof(safe),"safe.directory=%s",ctx->checkout_path)>=(int)sizeof(safe) ||
        snprintf(index_env,sizeof(index_env),"GIT_INDEX_FILE=/proc/self/fd/%d",ctx->repo_index_fd)>=(int)sizeof(index_env) ||
        snprintf(objects_env,sizeof(objects_env),"GIT_OBJECT_DIRECTORY=/proc/self/fd/%d",ctx->repo_objects_fd)>=(int)sizeof(objects_env))
        hold("bootstrap_git_path_overflow");
    char *args[100]; size_t n=0;
    args[n++]=(char *)FIXED_GIT; args[n++]="--no-pager"; args[n++]="--no-replace-objects";
    args[n++]="--no-optional-locks"; args[n++]=(char *)git_dir; args[n++]=(char *)work_tree;
    args[n++]="-c"; args[n++]=(char *)safe;
    static const char *const settings[]={
        "core.bare=false","core.fsmonitor=false","core.hooksPath=/dev/null","core.attributesFile=/dev/null",
        "core.excludesFile=/dev/null","core.untrackedCache=false","core.preloadIndex=false","core.ignoreCase=false",
        "core.fileMode=true","core.commitGraph=false","submodule.recurse=false","protocol.allow=never",
        "gc.auto=0","maintenance.auto=false","fetch.writeCommitGraph=false"
    };
    for (size_t i=0;i<sizeof(settings)/sizeof(settings[0]);i++) { args[n++]="-c"; args[n++]=(char *)settings[i]; }
    for (size_t i=0;command[i];i++) {
        if (n+1>=sizeof(args)/sizeof(args[0])) hold("bootstrap_git_argument_limit");
        args[n++]=(char *)command[i];
    }
    args[n]=NULL;
    char *const env[]={"PATH=/usr/bin:/bin","HOME=/nonexistent","LANG=C","LC_ALL=C","TZ=UTC",
        "GIT_CONFIG_NOSYSTEM=1","GIT_CONFIG_GLOBAL=/dev/null","GIT_CONFIG_SYSTEM=/dev/null",
        "GIT_NO_REPLACE_OBJECTS=1","GIT_OPTIONAL_LOCKS=0","GIT_TERMINAL_PROMPT=0","GIT_ALLOW_PROTOCOL=",
        "GIT_PROTOCOL_FROM_USER=0","GIT_NO_LAZY_FETCH=1","GIT_ATTR_NOSYSTEM=1",index_env,objects_env,NULL};
    require_waitable_children();
    int output[2]; if (pipe2(output,O_CLOEXEC)) hold("bootstrap_git_pipe_failed");
    pid_t pid=fork();
    if (pid<0) hold("bootstrap_git_fork_failed");
    if (pid==0) {
        if (setpgid(0,0)) _exit(121);
        int nullfd=open(FIXED_DEVNULL,O_RDWR|O_CLOEXEC|O_NOFOLLOW);
        if (nullfd<0 || dup2(nullfd,STDIN_FILENO)<0 || dup2(output[1],STDOUT_FILENO)<0 ||
            dup2(nullfd,STDERR_FILENO)<0) _exit(122);
        if (close_range(3,~0U,CLOSE_RANGE_CLOEXEC)) _exit(123);
        git_inherit_fd_or_exit(ctx->repo_index_fd);
        git_inherit_fd_or_exit(ctx->repo_objects_fd);
        fexecve(ctx->fds[R_GIT],args,env); _exit(124);
    }
    close(output[1]); (void)setpgid(pid,pid);
    int flags=fcntl(output[0],F_GETFL);
    if (flags<0 || fcntl(output[0],F_SETFL,flags|O_NONBLOCK)) { stop_git(pid); hold("bootstrap_git_pipe_flags_failed"); }
    bytes_v4 result={.data=malloc(maximum+1),.size=0};
    if (!result.data) { stop_git(pid); hold("bootstrap_git_output_allocation_failed"); }
    int status=0; bool eof=false,finished=false; int64_t deadline=monotonic_millis()+20000;
    while (!eof || !finished) {
        if (monotonic_millis()>=deadline) { stop_git(pid); hold("bootstrap_git_timeout"); }
        if (!eof) {
            unsigned char chunk[65536];
            for (;;) {
                ssize_t count=read(output[0],chunk,sizeof(chunk));
                if (count<0 && errno==EINTR) continue;
                if (count<0 && (errno==EAGAIN || errno==EWOULDBLOCK)) break;
                if (count<0) { stop_git(pid); hold("bootstrap_git_read_failed"); }
                if (!count) { eof=true; break; }
                if ((size_t)count>maximum-result.size) { stop_git(pid); hold("bootstrap_git_output_limit"); }
                memcpy(result.data+result.size,chunk,(size_t)count); result.size+=(size_t)count;
                if (monotonic_millis()>=deadline) { stop_git(pid); hold("bootstrap_git_timeout"); }
            }
        }
        if (!finished && eof) {
            pid_t waited=waitpid(pid,&status,WNOHANG);
            if (waited==pid) finished=true;
            else if (waited<0 && errno!=EINTR) { stop_git(pid); hold("bootstrap_git_wait_failed"); }
        }
        if (!eof || !finished) {
            struct pollfd pfd={.fd=eof?-1:output[0],.events=POLLIN};
            int rc=poll(&pfd,1,20);
            if (rc<0 && errno!=EINTR) { stop_git(pid); hold("bootstrap_git_poll_failed"); }
        }
    }
    close(output[0]); result.data[result.size]=0;
    if (!WIFEXITED(status) || WEXITSTATUS(status)!=0) hold("bootstrap_git_command_failed");
    return result;
}
static void repository_source_index_recheck(context_v4 *ctx) {
    struct stat current,visible;
    if (fstat(ctx->repo_index_source_fd,&current) ||
        fstatat(ctx->fds[R_GIT_DIR],"index",&visible,AT_SYMLINK_NOFOLLOW) ||
        !sameid(&ctx->repo_index_source_identity,&current) ||
        !sameid(&current,&visible))
        hold("bootstrap_repository_index_changed");
    char digest[65]; hash_fd(ctx->repo_index_source_fd,(size_t)current.st_size,false,digest);
    if (strcmp(digest,ctx->repo_index_sha256)) hold("bootstrap_repository_index_changed");
}
static void repository_witness_recheck(context_v4 *ctx) {
    source_head_main_exact(ctx); reject_split_index(ctx); repository_source_index_recheck(ctx);
    struct stat objects;
    if (fstat(ctx->repo_objects_fd,&objects) || !sameid(&ctx->repo_objects_identity,&objects))
        hold("bootstrap_repository_objects_directory_changed");
    recheckout(ctx);
}
static void repository_witness_end(context_v4 *ctx) {
    if (!ctx->repo_witness_active) hold("bootstrap_repository_witness_not_active");
    repository_witness_recheck(ctx);
    if (ctx->repo_index_source_fd>=0) close(ctx->repo_index_source_fd);
    if (ctx->repo_index_fd>=0) close(ctx->repo_index_fd);
    if (ctx->repo_objects_fd>=0) close(ctx->repo_objects_fd);
    ctx->repo_index_source_fd=ctx->repo_index_fd=ctx->repo_objects_fd=-1;
    ctx->repo_witness_active=false;
    if (!repository_temp_cleanup()) hold("bootstrap_repository_private_cleanup_failed");
    ctx->repo_private_path[0]=0;
}
static void verify_repository_objects(const context_v4 *ctx) {
    const char *const args[]={"fsck","--strict","--no-reflogs","--no-progress","--no-dangling",ctx->request.expected_head,NULL};
    bytes_v4 raw=git_capture(ctx,args,MAX_GIT_OUTPUT);
    if (raw.size) hold("bootstrap_repository_fsck_unexpected_stdout");
    free(raw.data);
}
static void verify_raw_head_tree(context_v4 *ctx) {
    const char *const commit_args[]={"cat-file","commit",ctx->request.expected_head,NULL};
    bytes_v4 commit=git_capture(ctx,commit_args,1024U*1024U);
    char observed[41]; hash_git_object("commit",commit.data,commit.size,observed);
    if (strcmp(observed,ctx->request.expected_head)) hold("bootstrap_repository_commit_identity_invalid");
    unsigned char *line=memchr(commit.data,'\n',commit.size);
    if (!line || (size_t)(line-commit.data)!=45U || memcmp(commit.data,"tree ",5))
        hold("bootstrap_repository_commit_tree_invalid");
    char tree_oid[41]; memcpy(tree_oid,commit.data+5,40); tree_oid[40]=0;
    if (!hexn(tree_oid,40)) hold("bootstrap_repository_commit_tree_invalid");
    memcpy(ctx->tree,tree_oid,41); free(commit.data);
    const char *const tree_args[]={"cat-file","tree",ctx->tree,NULL};
    bytes_v4 tree=git_capture(ctx,tree_args,MAX_GIT_OUTPUT);
    hash_git_object("tree",tree.data,tree.size,observed);
    if (strcmp(observed,ctx->tree)) hold("bootstrap_repository_root_tree_identity_invalid");
    free(tree.data);
}

static int entry_compare(const void *left, const void *right) {
    return strcmp(((const entry_v4 *)left)->path,((const entry_v4 *)right)->path);
}
static bool tracked_mode(const char *mode) {
    return !strcmp(mode,"100644") || !strcmp(mode,"100755") || !strcmp(mode,"120000");
}
static listing_v4 parse_listing(bytes_v4 raw, bool from_index) {
    listing_v4 result={0};
    if (raw.size>MAX_GIT_OUTPUT || (raw.size && raw.data[raw.size-1]!=0)) hold("bootstrap_git_listing_framing_invalid");
    size_t capacity=0,offset=0;
    while (offset<raw.size) {
        unsigned char *record=raw.data+offset;
        unsigned char *end=memchr(record,0,raw.size-offset);
        if (!end || end==record || result.count>=MAX_TRACKED_ENTRIES) hold("bootstrap_git_listing_count_invalid");
        unsigned char *tab=memchr(record,'\t',(size_t)(end-record));
        size_t header=tab?(size_t)(tab-record):0;
        if (!tab || tab+1==end || (size_t)(end-tab-1)>=PATH_MAX) hold("bootstrap_git_listing_entry_invalid");
        entry_v4 entry={0};
        if (from_index) {
            if (header!=51 || memcmp(record,"H ",2) || record[8]!=' ' || record[49]!=' ' || record[50]!='0')
                hold("bootstrap_git_index_flags_or_stage_unsupported");
            memcpy(entry.mode,record+2,6); memcpy(entry.oid,record+9,40);
        } else {
            if (header!=52 || memcmp(record+6," blob ",6)) hold("bootstrap_git_tree_type_unsupported");
            memcpy(entry.mode,record,6); memcpy(entry.oid,record+12,40);
        }
        if (!tracked_mode(entry.mode) || !hexn(entry.oid,40)) hold("bootstrap_git_listing_mode_or_oid_invalid");
        entry.path=strdup((char *)tab+1);
        if (!entry.path) hold("bootstrap_git_listing_allocation_failed");
        if (!tracked_path(entry.path)) hold("bootstrap_git_tracked_path_invalid");
        if (result.count==capacity) {
            capacity=capacity?capacity*2:256; if (capacity>MAX_TRACKED_ENTRIES) capacity=MAX_TRACKED_ENTRIES;
            entry_v4 *entries=realloc(result.entries,capacity*sizeof(*entries));
            if (!entries) hold("bootstrap_git_listing_allocation_failed");
            result.entries=entries;
        }
        result.entries[result.count++]=entry; offset=(size_t)(end-raw.data)+1;
    }
    if (result.count>1) qsort(result.entries,result.count,sizeof(*result.entries),entry_compare);
    for (size_t i=1;i<result.count;i++)
        if (!strcmp(result.entries[i-1].path,result.entries[i].path)) hold("bootstrap_git_listing_duplicate_path");
    return result;
}
static void free_listing(listing_v4 *listing) {
    for (size_t i=0;i<listing->count;i++) free(listing->entries[i].path);
    free(listing->entries); listing->entries=NULL; listing->count=0;
}
typedef struct { int fd; char *name; struct stat identity; } directory_link_v4;
static size_t verify_tracked_blob(const context_v4 *ctx, const entry_v4 *entry, uint64_t budget) {
    char path[PATH_MAX]; snprintf(path,sizeof(path),"%s",entry->path);
    size_t links=1;
    for (const char *p=path;*p;p++) if (*p=='/') links++;
    directory_link_v4 *parents=calloc(links,sizeof(*parents));
    if (!parents) hold("bootstrap_tracked_directory_allocation_failed");
    parents[0].fd=fcntl(ctx->fds[R_CHECKOUT],F_DUPFD_CLOEXEC,3);
    if (parents[0].fd<0 || fstat(parents[0].fd,&parents[0].identity)) hold("bootstrap_tracked_root_unavailable");
    size_t used=1; char *leaf=path;
    for (char *slash=strchr(leaf,'/');slash;slash=strchr(leaf,'/')) {
        *slash=0; int parent=parents[used-1].fd; struct stat before,opened,visible;
        if (fstatat(parent,leaf,&before,AT_SYMLINK_NOFOLLOW) || !S_ISDIR(before.st_mode))
            hold("bootstrap_tracked_directory_type_invalid");
        int child=openat(parent,leaf,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
        if (child<0 || fstat(child,&opened) || fstatat(parent,leaf,&visible,AT_SYMLINK_NOFOLLOW) ||
            !sameid(&before,&opened) || !sameid(&opened,&visible)) hold("bootstrap_tracked_directory_rebound");
        parents[used++]=(directory_link_v4){.fd=child,.name=leaf,.identity=opened}; leaf=slash+1;
    }
    int parent=parents[used-1].fd; struct stat before,after; char actual[41];
    if (fstatat(parent,leaf,&before,AT_SYMLINK_NOFOLLOW) || before.st_size<0 ||
        (uintmax_t)before.st_size>MAX_TRACKED_FILE_BYTES || (uintmax_t)before.st_size>budget)
        hold("bootstrap_tracked_read_budget_or_metadata_invalid");
    size_t size=(size_t)before.st_size;
    if (!strcmp(entry->mode,"120000")) {
        if (!S_ISLNK(before.st_mode)) hold("bootstrap_tracked_symlink_type_mismatch");
        unsigned char *raw=malloc(size+1);
        if (!raw) hold("bootstrap_tracked_link_allocation_failed");
        ssize_t count=readlinkat(parent,leaf,(char *)raw,size+1);
        if (count<0 || (size_t)count!=size) hold("bootstrap_tracked_symlink_size_changed");
        hash_bytes(raw,size,true,actual); free(raw);
    } else {
        if (!S_ISREG(before.st_mode) || !!(before.st_mode&S_IXUSR)!=!strcmp(entry->mode,"100755"))
            hold("bootstrap_tracked_regular_mode_mismatch");
        int fd=openat(parent,leaf,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);
        struct stat opened;
        if (fd<0 || fstat(fd,&opened) || !sameid(&before,&opened)) hold("bootstrap_tracked_file_rebound");
        hash_fd(fd,size,true,actual);
        if (fstat(fd,&after) || !sameid(&opened,&after)) hold("bootstrap_tracked_file_changed");
        close(fd);
    }
    if (fstatat(parent,leaf,&after,AT_SYMLINK_NOFOLLOW) || !sameid(&before,&after))
        hold("bootstrap_tracked_file_changed");
    if (strcmp(actual,entry->oid)) hold("bootstrap_tracked_raw_blob_mismatch");
    for (size_t i=0;i<used;i++) {
        struct stat current,visible;
        if (fstat(parents[i].fd,&current) || !sameid(&parents[i].identity,&current))
            hold("bootstrap_tracked_directory_changed");
        if (i && (fstatat(parents[i-1].fd,parents[i].name,&visible,AT_SYMLINK_NOFOLLOW) ||
            !sameid(&parents[i].identity,&visible))) hold("bootstrap_tracked_directory_changed");
    }
    for (size_t i=used;i>0;i--) close(parents[i-1].fd);
    free(parents); return size;
}
static void require_bytes(bytes_v4 raw, const char *expected, const char *reason) {
    size_t size=strlen(expected);
    if (raw.size!=size || memcmp(raw.data,expected,size)) hold(reason);
}
static void verify_head_branch(const context_v4 *ctx) {
    char head[42]; snprintf(head,sizeof(head),"%s\n",ctx->request.expected_head);
    const char *const head_args[]={"rev-parse","--verify","HEAD^{commit}",NULL};
    bytes_v4 raw=git_capture(ctx,head_args,128); require_bytes(raw,head,"bootstrap_checkout_head_mismatch"); free(raw.data);
    const char *const branch_args[]={"symbolic-ref","-q","HEAD",NULL};
    raw=git_capture(ctx,branch_args,128); require_bytes(raw,"refs/heads/main\n","bootstrap_checkout_branch_not_main"); free(raw.data);
}
static void verify_bound_blob(const context_v4 *ctx, const listing_v4 *tree, const source_v4 *source) {
    entry_v4 key={.path=(char *)source->rel};
    const entry_v4 *entry=tree->count?bsearch(&key,tree->entries,tree->count,sizeof(*tree->entries),entry_compare):NULL;
    if (!entry || strcmp(entry->mode,"100644") || strcmp(entry->oid,source->blob))
        hold("bootstrap_bound_source_tree_identity_mismatch");
    const char *const args[]={"cat-file","blob",source->blob,NULL};
    bytes_v4 raw=git_capture(ctx,args,source->bytes); char blob[41],digest[65];
    if (raw.size!=source->bytes) hold("bootstrap_bound_source_size_mismatch");
    hash_bytes(raw.data,raw.size,true,blob); hash_bytes(raw.data,raw.size,false,digest);
    if (strcmp(blob,source->blob) || strcmp(digest,source->sha256)) hold("bootstrap_bound_source_digest_mismatch");
    free(raw.data);
}
static void verify_checkout(context_v4 *ctx) {
    if (!hexn(ctx->request.expected_head,40)) hold("bootstrap_expected_head_invalid");
    repository_witness_begin(ctx);
    repository_witness_recheck(ctx);
    verify_head_branch(ctx);
    verify_repository_objects(ctx);
    verify_raw_head_tree(ctx);

    const char *const list_args[]={"ls-tree","-r","--full-tree","-z",ctx->request.expected_head,NULL};
    const char *const index_args[]={"ls-files","--stage","-v","-z","--full-name","--sparse",NULL};
    bytes_v4 tree_raw=git_capture(ctx,list_args,MAX_GIT_OUTPUT);
    bytes_v4 index_raw=git_capture(ctx,index_args,MAX_GIT_OUTPUT);
    listing_v4 tree=parse_listing(tree_raw,false),index=parse_listing(index_raw,true);
    if (tree.count!=index.count) hold("bootstrap_checkout_index_tree_mismatch");
    for (size_t i=0;i<tree.count;i++)
        if (strcmp(tree.entries[i].path,index.entries[i].path) || strcmp(tree.entries[i].mode,index.entries[i].mode) ||
            strcmp(tree.entries[i].oid,index.entries[i].oid)) hold("bootstrap_checkout_index_tree_mismatch");

    uint64_t total=0;
    for (size_t i=0;i<tree.count;i++)
        total+=verify_tracked_blob(ctx,&tree.entries[i],MAX_TRACKED_TOTAL_BYTES-total);

    for (size_t i=0;i<4;i++) verify_bound_blob(ctx,&tree,&ctx->manifest.sources[i]);
    source_v4 manifest_source={.rel=MANIFEST_REL,.bytes=ctx->manifest.bytes};
    memcpy(manifest_source.blob,ctx->manifest.blob,41);
    memcpy(manifest_source.sha256,ctx->manifest.sha256,65);
    verify_bound_blob(ctx,&tree,&manifest_source);

    const char *const others_args[]={"ls-files","--others","--exclude-standard","-z","--full-name",NULL};
    bytes_v4 raw=git_capture(ctx,others_args,MAX_GIT_OUTPUT);
    if (raw.size) hold("bootstrap_checkout_untracked_files_present");
    free(raw.data);
    raw=git_capture(ctx,index_args,MAX_GIT_OUTPUT);
    if (raw.size!=index_raw.size || memcmp(raw.data,index_raw.data,raw.size))
        hold("bootstrap_checkout_private_index_changed");
    free(raw.data);

    total=0;
    for (size_t i=0;i<tree.count;i++)
        total+=verify_tracked_blob(ctx,&tree.entries[i],MAX_TRACKED_TOTAL_BYTES-total);

    verify_repository_objects(ctx);
    char first_tree[41]; memcpy(first_tree,ctx->tree,41);
    verify_raw_head_tree(ctx);
    if (strcmp(first_tree,ctx->tree)) hold("bootstrap_repository_tree_changed");
    verify_head_branch(ctx);
    repository_witness_end(ctx);

    free(tree_raw.data); free(index_raw.data); free_listing(&tree); free_listing(&index);
}

static bool planid(const char *value) {
    size_t prefix=strlen(PLAN_PREFIX);
    return value && strlen(value)==prefix+64 && !strncmp(value,PLAN_PREFIX,prefix) && hexn(value+prefix,64);
}
static request_v4 parse_request(int argc, char **argv) {
    request_v4 result={0};
    if ((argc==8 || argc==12) && !strcmp(argv[2],"--launcher") && clean_path(argv[3],true) &&
        !strcmp(argv[4],"--native") && clean_path(argv[5],true) &&
        !strcmp(argv[6],"--expected-head") && hexn(argv[7],40)) {
        if (argc==8 && !strcmp(argv[1],"--installer-plan")) result.op=OP_PLAN;
        if (argc==12 && !strcmp(argv[1],"--installer-apply") && !strcmp(argv[8],"--expected-plan-id") &&
            planid(argv[9]) && !strcmp(argv[10],"--confirm") && !strcmp(argv[11],APPLY_CONFIRM)) {
            result.op=OP_APPLY; snprintf(result.plan,sizeof(result.plan),"%s",argv[9]);
        }
        if (result.op!=OP_NONE) {
            snprintf(result.launcher,sizeof(result.launcher),"%s",argv[3]);
            snprintf(result.native,sizeof(result.native),"%s",argv[5]);
            memcpy(result.expected_head,argv[7],41); return result;
        }
    }
    hold("bootstrap_arguments_invalid"); return result;
}
static void validate_caller_environment(char *const env[]) {
    static const char *const prefixes[]={"LD_","PYTHON","GIT_","MALLOC_"};
    static const char *const names[]={"GLIBC_TUNABLES","GCONV_PATH","LOCPATH","NLSPATH","ENV","BASH_ENV"};
    for (size_t i=0;env && env[i];i++) {
        const char *equals=strchr(env[i],'=');
        if (!equals || equals==env[i]) hold("bootstrap_caller_environment_malformed");
        size_t length=(size_t)(equals-env[i]);
        for (size_t j=0;j<sizeof(prefixes)/sizeof(prefixes[0]);j++)
            if (length>=strlen(prefixes[j]) && !strncmp(env[i],prefixes[j],strlen(prefixes[j])))
                hold("bootstrap_hostile_caller_environment");
        for (size_t j=0;j<sizeof(names)/sizeof(names[0]);j++)
            if (length==strlen(names[j]) && !memcmp(env[i],names[j],length))
                hold("bootstrap_hostile_caller_environment");
    }
}
static void require_devnull(void) {
    struct stat stdin_state,null_state;
    if (fstat(STDIN_FILENO,&stdin_state) || lstat(FIXED_DEVNULL,&null_state) ||
        !S_ISCHR(stdin_state.st_mode) || !S_ISCHR(null_state.st_mode) ||
        stdin_state.st_dev!=null_state.st_dev || stdin_state.st_ino!=null_state.st_ino ||
        stdin_state.st_rdev!=null_state.st_rdev) hold("bootstrap_stdin_must_be_devnull");
    if (fcntl(STDOUT_FILENO,F_GETFD)<0 || fcntl(STDERR_FILENO,F_GETFD)<0) hold("bootstrap_output_descriptors_required");
}
static void exact_mode(const retained_v4 *file, mode_t expected) {
    if ((file->opened.st_mode&07777)!=expected) hold("bootstrap_custody_file_mode_invalid");
}
static void verify_self(const retained_v4 *self) {
    safeanc(FIXED_SELF); reinput(self); struct stat running;
    if (stat("/proc/self/exe",&running) || !sameid(&self->opened,&running))
        hold("bootstrap_fixed_native_executable_required");
}
static void validate_compilation(void) {
    if (!hexn(MANIFEST_SHA256,64) || (uintmax_t)MANIFEST_BYTES==0 ||
        (uintmax_t)MANIFEST_BYTES>MAX_MANIFEST_BYTES) hold("bootstrap_compiled_manifest_identity_invalid");
}
static void capture_generation(context_v4 *ctx) {
    validate_compilation();
    ctx->self=open_root(FIXED_SELF,MAX_CANDIDATE_BYTES,true); exact_mode(&ctx->self,0555); verify_self(&ctx->self);
    ctx->manifest_input=open_root(FIXED_MANIFEST,MAX_MANIFEST_BYTES,false); exact_mode(&ctx->manifest_input,0444);
    bytes_v4 raw=read_fd(ctx->manifest_input.fd,MAX_MANIFEST_BYTES);
    ctx->manifest=parse_manifest(raw); free(raw.data);
    if (ctx->manifest.bytes!=(size_t)MANIFEST_BYTES || strcmp(ctx->manifest.sha256,MANIFEST_SHA256))
        hold("bootstrap_compile_authenticated_manifest_mismatch");
    ctx->fds[R_MANIFEST]=snapshot_input(&ctx->manifest_input,ctx->manifest.bytes,ctx->manifest.sha256,false);
    ctx->policy_input=open_root(FIXED_POLICY,MAX_POLICY_BYTES,false); exact_mode(&ctx->policy_input,0444);
    raw=read_fd(ctx->policy_input.fd,MAX_POLICY_BYTES); ctx->policy=parse_policy(raw);
    ctx->policy_bytes=raw.size; hash_bytes(raw.data,raw.size,false,ctx->policy_sha256); free(raw.data);
    ctx->fds[R_POLICY]=snapshot_input(&ctx->policy_input,ctx->policy_bytes,ctx->policy_sha256,false);
    ctx->python=open_tool(FIXED_PYTHON,MAX_PYTHON_BYTES); ctx->git=open_tool(FIXED_GIT,MAX_GIT_BYTES);
    ctx->fds[R_PYTHON]=snapshot_input(&ctx->python.target,ctx->policy.python_bytes,ctx->policy.python_sha256,true);
    ctx->fds[R_GIT]=snapshot_input(&ctx->git.target,ctx->policy.git_bytes,ctx->policy.git_sha256,true);
    bind_checkout(ctx,FIXED_CHECKOUT);
    for (size_t i=0;i<4;i++) {
        char path[PATH_MAX]; int n=snprintf(path,sizeof(path),"%s/%s",FIXED_CHECKOUT,ctx->manifest.sources[i].rel);
        if (n<0 || (size_t)n>=sizeof(path)) hold("bootstrap_source_path_overflow");
        ctx->sources[i]=open_input(path,MAX_SOURCE_BYTES);
        ctx->fds[R_INSTALLER+i]=snapshot_input(&ctx->sources[i],ctx->manifest.sources[i].bytes,
            ctx->manifest.sources[i].sha256,false);
    }
    ctx->candidates[0]=open_input(ctx->request.launcher,MAX_CANDIDATE_BYTES);
    ctx->candidates[1]=open_input(ctx->request.native,MAX_CANDIDATE_BYTES);
    ctx->fds[R_LAUNCHER]=snapshot_input(&ctx->candidates[0],ctx->manifest.launcher_bytes,ctx->manifest.launcher_sha256,false);
    ctx->fds[R_NATIVE]=snapshot_input(&ctx->candidates[1],ctx->manifest.native_bytes,ctx->manifest.native_sha256,false);
}
static void revalidate_inputs(const context_v4 *ctx) {
    verify_self(&ctx->self); safeanc(FIXED_MANIFEST); safeanc(FIXED_POLICY);
    reinput(&ctx->manifest_input); reinput(&ctx->policy_input);
    retool(&ctx->python); retool(&ctx->git);
    for (size_t i=0;i<4;i++) reinput(&ctx->sources[i]);
    for (size_t i=0;i<2;i++) reinput(&ctx->candidates[i]);
    recheckout(ctx);
}
static size_t parent_start_ticks(void) {
    int fd=open("/proc/self/stat",O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if (fd<0) hold("bootstrap_parent_stat_unavailable");
    char raw[4097]; size_t size=0;
    for (;;) {
        ssize_t count=read(fd,raw+size,sizeof(raw)-1-size);
        if (count<0 && errno==EINTR) continue;
        if (count<0) hold("bootstrap_parent_stat_read_failed");
        if (!count) break;
        size+=(size_t)count;
        if (size==sizeof(raw)-1) hold("bootstrap_parent_stat_oversize");
    }
    close(fd); raw[size]=0; char *end=strrchr(raw,')');
    if (!end || end[1]!=' ') hold("bootstrap_parent_stat_invalid");
    char *save=NULL,*field=strtok_r(end+2," \n",&save);
    for (size_t i=0;i<19 && field;i++) field=strtok_r(NULL," \n",&save);
    size_t result;
    if (!decsz(field,SIZE_MAX,&result)) hold("bootstrap_parent_start_ticks_invalid");
    return result;
}
static void create_private_proof(context_v4 *ctx) {
    int writer=memfd_create("void-e2-private-parent-proof-v2",MFD_CLOEXEC|MFD_ALLOW_SEALING);
    if (writer<0) hold("bootstrap_parent_proof_create_failed");
    ctx->fds[R_PROOF]=readonly_memfd(writer);
    char proof[MAX_PROOF_BYTES+1];
    int n=snprintf(proof,sizeof(proof),
        "schema=%s\nparent_pid=%jd\nparent_start_ticks=%zu\nparent_exe_dev=%ju\nparent_exe_ino=%ju\n"
        "operation=%s\nexpected_head=%s\nexpected_tree=%s\nexpected_plan_id=%s\n"
        "source_generation_id=%s\nmanifest_sha256=%s\nmanifest_bytes=%zu\n"
        "host_policy_sha256=%s\nhost_policy_bytes=%zu\n",
        PROOF_SCHEMA,(intmax_t)getpid(),parent_start_ticks(),(uintmax_t)ctx->self.opened.st_dev,
        (uintmax_t)ctx->self.opened.st_ino,ctx->request.op==OP_APPLY?"installer_apply":"installer_plan",
        ctx->request.expected_head,ctx->tree,ctx->request.op==OP_APPLY?ctx->request.plan:"none",
        ctx->manifest.generation,ctx->manifest.sha256,ctx->manifest.bytes,ctx->policy_sha256,ctx->policy_bytes);
    if (n<0 || (size_t)n>=sizeof(proof)) hold("bootstrap_parent_proof_size_invalid");
    size_t size=(size_t)n;
    for (size_t i=0;i<R_COUNT;i++) {
        struct stat st;
        if (ctx->fds[i]<3 || fstat(ctx->fds[i],&st)) hold("bootstrap_parent_proof_descriptor_invalid");
        for (size_t j=0;j<i;j++) if (ctx->fds[i]==ctx->fds[j]) hold("bootstrap_parent_proof_descriptor_reused");
        n=snprintf(proof+size,sizeof(proof)-size,"%s_fd=%d\n%s_dev=%ju\n%s_ino=%ju\n",
            role_names[i],ctx->fds[i],role_names[i],(uintmax_t)st.st_dev,role_names[i],(uintmax_t)st.st_ino);
        if (n<0 || (size_t)n>=sizeof(proof)-size) hold("bootstrap_parent_proof_size_invalid");
        size+=(size_t)n;
    }
    write_all(writer,(unsigned char *)proof,size); seal_writer(writer,0400); close(writer);
}
static void inherited_descriptor(int fd) {
    int flags=fcntl(fd,F_GETFD);
    if (flags<0 || fcntl(fd,F_SETFD,flags&~FD_CLOEXEC)) _exit(126);
}
static int run_installer(context_v4 *ctx) {
    require_devnull(); revalidate_inputs(ctx);
    require_waitable_children();
    pid_t child=fork();
    if (child<0) hold("bootstrap_installer_fork_failed");
    installer_child_created=true;
    if (child==0) {
        if (close_range(3,~0U,CLOSE_RANGE_CLOEXEC)) _exit(126);
        for (size_t i=0;i<R_COUNT;i++) inherited_descriptor(ctx->fds[i]);
        char script[64],launcher[64],native[64],proof_env[128];
        snprintf(script,sizeof(script),"/proc/self/fd/%d",ctx->fds[R_INSTALLER]);
        snprintf(launcher,sizeof(launcher),"/proc/self/fd/%d",ctx->fds[R_LAUNCHER]);
        snprintf(native,sizeof(native),"/proc/self/fd/%d",ctx->fds[R_NATIVE]);
        snprintf(proof_env,sizeof(proof_env),"%s=%d",PROOF_ENV,ctx->fds[R_PROOF]);
        char *args[20]; size_t n=0;
        args[n++]=(char *)FIXED_PYTHON; args[n++]="-I"; args[n++]="-S"; args[n++]="-B"; args[n++]=script;
        args[n++]=ctx->request.op==OP_APPLY?"--apply":"--plan";
        args[n++]="--launcher"; args[n++]=launcher; args[n++]="--native"; args[n++]=native;
        args[n++]="--expected-head"; args[n++]=ctx->request.expected_head;
        if (ctx->request.op==OP_APPLY) {
            args[n++]="--expected-plan-id"; args[n++]=ctx->request.plan;
            args[n++]="--confirm"; args[n++]=(char *)APPLY_CONFIRM;
        }
        args[n]=NULL;
        char *const env[]={"PATH=/usr/bin:/bin","HOME=/nonexistent","LANG=C","LC_ALL=C","TZ=UTC",proof_env,NULL};
        fexecve(ctx->fds[R_PYTHON],args,env); _exit(126);
    }
    int status=0; pid_t waited;
    do { waited=waitpid(child,&status,0); } while (waited<0 && errno==EINTR);
    if (waited!=child) hold("bootstrap_installer_wait_failed");
    return status;
}
static void close_context(context_v4 *ctx) {
    bool failed=false;
    for (size_t i=0;i<R_COUNT;i++) if (ctx->fds[i]>=0 && close(ctx->fds[i])) failed=true;
    retained_v4 *files[]={&ctx->self,&ctx->manifest_input,&ctx->policy_input,&ctx->python.target,&ctx->git.target,
        &ctx->sources[0],&ctx->sources[1],&ctx->sources[2],&ctx->sources[3],&ctx->candidates[0],&ctx->candidates[1]};
    for (size_t i=0;i<sizeof(files)/sizeof(files[0]);i++) if (files[i]->fd>=0 && close(files[i]->fd)) failed=true;
    if (failed) hold("bootstrap_retained_descriptor_close_failed");
}
static int selftest(void) {
    validate_compilation();
    if (!hexn("0123456789abcdef0123456789abcdef01234567",40) || hexn("ABCDEF",6) ||
        !clean_path(FIXED_SELF,true) || clean_path("/tmp/../source",true) || tracked_path("nested/.git/config") ||
        !planid(PLAN_PREFIX "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") ||
        strcmp(APPLY_CONFIRM,"INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V4_CREATE_ONLY")) return 1;
    size_t value;
    if (!decsz("1",1,&value) || value!=1 || decsz("01",10,&value) || decsz("0",10,&value)) return 1;
    puts(MARKER "_SELF_TEST_GREEN");
    printf("source_generation_manifest_sha256=%s\nsource_generation_manifest_bytes=%ju\n",MANIFEST_SHA256,(uintmax_t)MANIFEST_BYTES);
    printf("source_generation_id=%s%s\n",GENERATION_PREFIX,MANIFEST_SHA256);
    puts("static_native_first_instruction_required=true");
    puts("complete_source_generation_compile_bound=true");
    puts("runtime_expected_head_strict_hex_required=true");
    puts("runtime_expected_head_forwarded_to_authenticated_child=true");
    puts("native_raw_checkout_gate_before_installer_child=true");
    puts("private_git_metadata_required=true");
    puts("sealed_private_index_required=true");
    puts("split_index_rejected=true");
    puts("strict_git_fsck_before_after_required=true");
    puts("raw_commit_root_tree_sha1_reverified=true");
    puts("tracked_worktree_double_hash_required=true");
    puts("temporary_repository_cleanup_required=true");
    puts("sealed_input_and_tool_memfds_required=true");
    puts("private_live_native_parent_proof_required=true");
    puts("fixed_python_and_git_host_policy_bound=true");
    puts("caller_stdin_must_be_devnull=true");
    puts("strict_plan_apply_argv=true");
    puts("child_environment_closed=true");
    puts("python_site_startup_disabled=true");
    puts("direct_root_python_authoritative=false");
    puts("protected_install_authorized=false");
    puts("funds_movement=false");
    return 0;
}
int main(int argc, char **argv) {
    if (argc==2 && !strcmp(argv[1],"--self-test")) return selftest();
    if (getuid()!=0 || geteuid()!=0 || getgid()!=0 || getegid()!=0) hold("bootstrap_root_identity_required");
    require_devnull(); context_v4 ctx; init_context(&ctx); ctx.request=parse_request(argc,argv); receipt_op=ctx.request.op;
    validate_caller_environment(environ);
    /* No ambient descriptor or environment becomes authority for either child. */
    if (close_range(3,~0U,0) || clearenv()) hold("bootstrap_ambient_authority_close_failed");
    capture_generation(&ctx);
    verify_checkout(&ctx);
    revalidate_inputs(&ctx);
    create_private_proof(&ctx);
    int status=run_installer(&ctx);
    revalidate_inputs(&ctx); verify_checkout(&ctx); revalidate_inputs(&ctx);
    close_context(&ctx);
    if (!WIFEXITED(status) || WEXITSTATUS(status)!=0) hold("bootstrap_installer_child_failed");
    printf("%s_GREEN\n",MARKER);
    printf("source_generation_id=%s\nexpected_head=%s\nexpected_tree=%s\n",ctx.manifest.generation,ctx.request.expected_head,ctx.tree);
    puts("native_prechild_source_generation_verified=true");
    puts("private_parent_proof_and_inputs_retained_through_child_exit=true");
    puts("installer_python_started=true");
    puts("installer_child_exit_zero=true");
    puts("installer_apply_result=see_authenticated_inner_terminal_receipt");
    puts("credential_access=false\nprivate_key_access=false\nsigning=false\ntransaction=false\npayment_acceptance=false\n"
        "public_presale_activation=false\nwc_void_market_activation=false\nfunds_movement=false");
    return 0;
}
