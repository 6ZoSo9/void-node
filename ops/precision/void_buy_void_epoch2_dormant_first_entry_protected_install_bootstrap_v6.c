#define _GNU_SOURCE
#include <dirent.h>
#include <errno.h>
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
#include <sys/resource.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V6"
#define MANIFEST_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_SOURCE_GENERATION_V3"
#define POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"
#define PROOF_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V1"
#define PROOF_ENV "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_FD"
#define GENERATION_PREFIX "voidbuye2dormantsourcegen3_"
#define PLAN_PREFIX "voidbuye2dormantfirstentryinstall5_"
#define APPLY_CONFIRM "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V5_CREATE_ONLY"
#define FIXED_CHECKOUT "/home/zoso/dev/void-node"
#define FIXED_ROOT "/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6"
#define FIXED_SELF FIXED_ROOT "/bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6"
#define FIXED_MANIFEST FIXED_ROOT "/source-generation-v3.conf"
#define FIXED_POLICY FIXED_ROOT "/policy-v1.conf"
#define FIXED_PYTHON "/usr/bin/python3"
#define FIXED_GIT "/usr/bin/git"
#define FIXED_DEVNULL "/dev/null"
#define MANIFEST_REL "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
#define INSTALLER_REL "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v5.py"
#define BOOTSTRAP_SOURCE_REL "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6.c"
#define LOCK_REL "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.json"
#define RUNTIME_REL "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
#define INSTALL_ROOT "/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1"
#define PAYLOAD_POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1"
#define ACCEPTED_LOCK_BLOB "227c2fa449abf1387925373c706ecd07775d5898"
#define ACCEPTED_LOCK_SHA256 "7c4c207fb01d9bb4d8f6ab72b458464bf258373c7601e40e7a8e2719e3b4630a"
#define ACCEPTED_LOCK_BYTES 4548U
#define ACCEPTED_RUNTIME_BLOB "f3d6b1559be7490303cf36338c4bfa38fdaa390a"
#define ACCEPTED_RUNTIME_SHA256 "602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9"
#define ACCEPTED_RUNTIME_BYTES 57255U
#define ACCEPTED_LAUNCHER_SHA256 "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
#define ACCEPTED_LAUNCHER_BYTES 731072U
#define ACCEPTED_NATIVE_SHA256 "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
#define ACCEPTED_NATIVE_BYTES 726976U
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MANIFEST_SHA256
#error manifest sha required
#endif
#ifndef VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MANIFEST_BYTES
#error manifest bytes required
#endif
#define MANIFEST_SHA256 VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MANIFEST_SHA256
#define MANIFEST_BYTES VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MANIFEST_BYTES
#define MAX_MANIFEST_BYTES 16384U
#define MAX_POLICY_BYTES 1024U
#define MAX_PROOF_BYTES 8192U
#define MAX_SOURCE_BYTES (2U * 1024U * 1024U)
#define MAX_CANDIDATE_BYTES MAX_SOURCE_BYTES
#define MAX_PYTHON_BYTES (512U * 1024U * 1024U)
#define MAX_GIT_BYTES (64U * 1024U * 1024U)
#define MAX_GIT_OUTPUT (64U * 1024U * 1024U)
#define MAX_TRACKED_ENTRIES 100000U
#define MAX_TRACKED_FILE_BYTES (512U * 1024U * 1024U)
#define MAX_TRACKED_TOTAL_BYTES UINT64_C(4294967296)
#define GIT_BOUNDARY_POLICY "private_metadata_pinned_objects_raw_checkout_v4"
#define MAX_INDEX_BYTES (64U * 1024U * 1024U)
#define MAX_PATH_AGGREGATE (64U * 1024U * 1024U)
#define MAX_LOOSE_BYTES (256U * 1024U * 1024U)
#define MAX_LOOSE_TOTAL UINT64_C(536870912)
#define MAX_PACK_PAIRS 128U
#define MAX_PACK_FILE UINT64_C(8589934592)
#define MAX_PACK_TOTAL UINT64_C(34359738368)
#define MAX_TREE_DEPTH 32U
#define MAX_TREE_BYTES (64U * 1024U * 1024U)
#define MAX_COMMIT_BYTES (1024U * 1024U)
#define MAX_OBSERVATIONS (4U * MAX_TRACKED_ENTRIES + 1024U)
#define OBSERVATION_SLOTS (1U << 20)
#define MAX_OBJECT_BATCH 64U
#define REQUIRED_SEALS (F_SEAL_SEAL | F_SEAL_SHRINK | F_SEAL_GROW | F_SEAL_WRITE)

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
struct private_git_v5;
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
    struct private_git_v5 *reader;
} context_v4;
typedef struct { unsigned char *data; size_t size; } bytes_v4;
typedef struct { char *path; char mode[7], oid[41]; } entry_v4;
typedef struct { entry_v4 *entries; size_t count; } listing_v4;
static operation_v4 receipt_op=OP_NONE;
static bool installer_child_created=false;
static bool temporary_git_write_started=false;
static bool temporary_git_cleanup_complete=true;
static bool private_cleanup(void);
static int64_t monotonic_millis(void);
static void witness_progress(void);

static void hold(const char *reason) {
    bool cleaned=private_cleanup();
    temporary_git_cleanup_complete=temporary_git_cleanup_complete && cleaned;
    fprintf(stderr, "%s_HOLD reason=%s\n", MARKER, reason);
    fprintf(stderr, "installer_python_started=%s\n", installer_child_created ? "true" : "false");
    if (installer_child_created && receipt_op==OP_APPLY)
        fprintf(stderr, "installer_apply_state=unknown_or_partial_if_child_created\n");
    else fprintf(stderr, "installer_apply_performed=false\n");
    if (temporary_git_write_started)
        fprintf(stderr,"filesystem_write=true\ntemporary_git_metadata_mutation_performed=true\n"
            "temporary_git_metadata_cleanup_complete=%s\nsource_repository_mutation=false\nsource_object_fetch=false\n",
            temporary_git_cleanup_complete ? "true" : "false");
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
static void hash_fd(int fd, size_t size, bool blob, char *out) {
    hash_v4 hash=hash_begin(blob?"sha1":"sha256",blob?20:32);
    if (blob) { char prefix[64]; int n=snprintf(prefix,sizeof(prefix),"blob %zu",size); hash_update(&hash,(unsigned char *)prefix,(size_t)n+1); }
    unsigned char buffer[65536]; size_t offset=0;
    while (offset<size) {
        witness_progress();
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
        witness_progress();
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
    require_absent(git,"commondir"); require_absent(git,"shallow");
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


/* Each witness owns a private Git directory. Source paths are observed through
 * retained checkout descriptors; no repository configuration enters Git. */
typedef struct {
    int root_role;
    char *relative;
    struct stat identity;
    bool exists;
} observation_v5;
typedef struct private_git_v5 {
    const context_v4 *owner;
    int temporary_parent, directory, index;
    int pack_fds[2U * MAX_PACK_PAIRS];
    struct stat pack_identity[2U * MAX_PACK_PAIRS];
    size_t pack_count;
    char path[PATH_MAX], name[NAME_MAX+1];
    struct stat directory_identity;
    bool created;
    observation_v5 *observations;
    size_t count, capacity, path_bytes;
    size_t *slots;
    uint64_t loose_bytes, pack_bytes;
    size_t object_entries;
    int64_t deadline;
} private_git_v5;
static private_git_v5 *active_private=NULL;

static void witness_deadline(const private_git_v5 *reader) {
    if (monotonic_millis()>=reader->deadline) hold("bootstrap_repository_witness_timeout");
}
static void witness_progress(void) {
    if (active_private) witness_deadline(active_private);
}
static uint64_t observation_hash(int role, const char *path) {
    uint64_t value=UINT64_C(1469598103934665603)^(uint64_t)role;
    for (const unsigned char *p=(const unsigned char *)path;*p;p++) {
        value^=*p; value*=UINT64_C(1099511628211);
    }
    return value;
}
static void observe_path(private_git_v5 *reader, int role, const char *relative,
                         const struct stat *identity, bool exists) {
    witness_deadline(reader);
    if ((role!=R_CHECKOUT && role!=R_GIT_DIR) || (*relative && !clean_path(relative,false)))
        hold("bootstrap_observation_path_invalid");
    size_t slot=(size_t)(observation_hash(role,relative)&(OBSERVATION_SLOTS-1U));
    while (reader->slots[slot]) {
        observation_v5 *prior=&reader->observations[reader->slots[slot]-1U];
        if (prior->root_role==role && !strcmp(prior->relative,relative)) {
            if (prior->exists!=exists || (exists && !sameid(&prior->identity,identity)))
                hold("bootstrap_repository_observation_changed");
            return;
        }
        slot=(slot+1U)&(OBSERVATION_SLOTS-1U);
    }
    size_t length=strlen(relative)+1U;
    if (reader->count>=MAX_OBSERVATIONS || length>MAX_PATH_AGGREGATE-reader->path_bytes)
        hold("bootstrap_repository_observation_limit");
    if (reader->count==reader->capacity) {
        size_t capacity=reader->capacity?reader->capacity*2U:256U;
        if (capacity>MAX_OBSERVATIONS) capacity=MAX_OBSERVATIONS;
        observation_v5 *grown=realloc(reader->observations,capacity*sizeof(*grown));
        if (!grown) hold("bootstrap_observation_allocation_failed");
        reader->observations=grown; reader->capacity=capacity;
    }
    char *copy=strdup(relative);
    if (!copy) hold("bootstrap_observation_path_allocation_failed");
    observation_v5 *entry=&reader->observations[reader->count];
    *entry=(observation_v5){.root_role=role,.relative=copy,.exists=exists};
    if (exists) entry->identity=*identity;
    reader->slots[slot]=++reader->count; reader->path_bytes+=length;
}
/* Opens only physical parents. When recording, every intermediate directory
 * becomes part of the same first-observation fence as the leaf. */
static int relative_parent(private_git_v5 *reader, int root, int role,
                           const char *relative, char leaf[NAME_MAX+1], bool record) {
    if (!clean_path(relative,false)) hold("bootstrap_relative_source_path_invalid");
    char copy[PATH_MAX],prefix[PATH_MAX]="";
    snprintf(copy,sizeof(copy),"%s",relative);
    int current=fcntl(root,F_DUPFD_CLOEXEC,3);
    if (current<0) hold("bootstrap_relative_root_unavailable");
    struct stat initial;
    if (fstat(current,&initial) || !S_ISDIR(initial.st_mode)) hold("bootstrap_relative_root_invalid");
    if (record) observe_path(reader,role,"",&initial,true);
    char *part=copy;
    for (char *slash=strchr(part,'/');slash;slash=strchr(part,'/')) {
        *slash=0;
        struct stat before,opened,visible;
        if (fstatat(current,part,&before,AT_SYMLINK_NOFOLLOW) || !S_ISDIR(before.st_mode))
            hold("bootstrap_relative_parent_not_physical");
        int next=openat(current,part,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
        if (next<0 || fstat(next,&opened) || fstatat(current,part,&visible,AT_SYMLINK_NOFOLLOW) ||
            !sameid(&before,&opened) || !sameid(&opened,&visible))
            hold("bootstrap_relative_parent_rebound");
        size_t used=strlen(prefix),size=strlen(part);
        if (used+size+2U>sizeof(prefix)) hold("bootstrap_relative_parent_path_limit");
        if (used) prefix[used++]='/';
        memcpy(prefix+used,part,size+1U);
        if (record) observe_path(reader,role,prefix,&opened,true);
        close(current); current=next; part=slash+1;
    }
    size_t leaf_size=strlen(part);
    if (!leaf_size || leaf_size>NAME_MAX) hold("bootstrap_relative_leaf_invalid");
    memcpy(leaf,part,leaf_size+1U);
    return current;
}
static bool source_file(private_git_v5 *reader, const char *relative, uint64_t maximum,
                        bool optional, int *retained, struct stat *identity) {
    char leaf[NAME_MAX+1];
    int parent=relative_parent(reader,reader->owner->fds[R_GIT_DIR],R_GIT_DIR,relative,leaf,true);
    struct stat before,opened,visible;
    if (fstatat(parent,leaf,&before,AT_SYMLINK_NOFOLLOW)) {
        if (optional && errno==ENOENT) {
            observe_path(reader,R_GIT_DIR,relative,NULL,false);
            close(parent); *retained=-1; return false;
        }
        hold("bootstrap_git_source_file_unavailable");
    }
    if (!S_ISREG(before.st_mode) || before.st_nlink!=1 || before.st_size<0 ||
        (uintmax_t)before.st_size>maximum) hold("bootstrap_git_source_file_metadata_invalid");
    int fd=openat(parent,leaf,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);
    if (fd<0 || fstat(fd,&opened) || fstatat(parent,leaf,&visible,AT_SYMLINK_NOFOLLOW) ||
        !sameid(&before,&opened) || !sameid(&opened,&visible)) hold("bootstrap_git_source_file_rebound");
    observe_path(reader,R_GIT_DIR,relative,&opened,true);
    close(parent); *retained=fd; *identity=opened; return true;
}
static bytes_v4 source_bytes(private_git_v5 *reader, const char *relative, size_t maximum,
                             bool optional, bool *present) {
    int fd=-1; struct stat identity,after;
    *present=source_file(reader,relative,maximum,optional,&fd,&identity);
    if (!*present) return (bytes_v4){0};
    bytes_v4 result;
    if (!identity.st_size) {
        result=(bytes_v4){.data=calloc(1,1),.size=0};
        if (!result.data) hold("bootstrap_git_empty_source_allocation_failed");
    } else result=read_fd(fd,maximum);
    if (fstat(fd,&after) || !sameid(&identity,&after)) hold("bootstrap_git_source_changed_during_read");
    close(fd); return result;
}
static int private_parent_fd(private_git_v5 *reader, const char *relative, char leaf[NAME_MAX+1]) {
    return relative_parent(reader,reader->directory,R_GIT_DIR,relative,leaf,false);
}
static void private_mkdir(private_git_v5 *reader, const char *relative) {
    char leaf[NAME_MAX+1]; int parent=private_parent_fd(reader,relative,leaf);
    if (mkdirat(parent,leaf,0700)) hold("bootstrap_private_directory_create_failed");
    close(parent);
}
static int private_file_create(private_git_v5 *reader, const char *relative) {
    char leaf[NAME_MAX+1]; int parent=private_parent_fd(reader,relative,leaf);
    int fd=openat(parent,leaf,O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW,0600);
    close(parent);
    if (fd<0) hold("bootstrap_private_file_create_failed");
    return fd;
}
static void private_file(private_git_v5 *reader, const char *relative,
                         const unsigned char *raw, size_t size) {
    int fd=private_file_create(reader,relative);
    write_all(fd,raw,size);
    if (fchmod(fd,0400) || close(fd)) hold("bootstrap_private_file_close_failed");
}
static bool cleanup_directory(int fd, size_t *entries, unsigned depth) {
    if (depth>8U) return false;
    int copy=fcntl(fd,F_DUPFD_CLOEXEC,3);
    if (copy<0) return false;
    DIR *directory=fdopendir(copy);
    if (!directory) { close(copy); return false; }
    bool complete=true;
    for (;;) {
        errno=0; struct dirent *entry=readdir(directory);
        if (!entry) { if (errno) complete=false; break; }
        if (!strcmp(entry->d_name,".") || !strcmp(entry->d_name,"..")) continue;
        if (++*entries>MAX_OBSERVATIONS) { complete=false; break; }
        struct stat before,opened,visible;
        if (fstatat(fd,entry->d_name,&before,AT_SYMLINK_NOFOLLOW) || before.st_uid!=geteuid()) {
            complete=false; continue;
        }
        if (S_ISDIR(before.st_mode)) {
            int child=openat(fd,entry->d_name,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
            if (child<0) { complete=false; continue; }
            bool safe=!fstat(child,&opened) && opened.st_dev==before.st_dev && opened.st_ino==before.st_ino;
            bool removed=safe && cleanup_directory(child,entries,depth+1U);
            close(child);
            if (!removed || fstatat(fd,entry->d_name,&visible,AT_SYMLINK_NOFOLLOW) ||
                visible.st_dev!=before.st_dev || visible.st_ino!=before.st_ino ||
                unlinkat(fd,entry->d_name,AT_REMOVEDIR)) complete=false;
        } else if (unlinkat(fd,entry->d_name,0)) complete=false;
    }
    if (closedir(directory)) complete=false;
    return complete;
}
static bool private_cleanup(void) {
    private_git_v5 *reader=active_private;
    if (!reader) return true;
    active_private=NULL;
    bool complete=true;
    if (reader->index>=0 && close(reader->index)) complete=false;
    for (size_t i=0;i<reader->pack_count;i++) if (close(reader->pack_fds[i])) complete=false;
    if (reader->created) {
        struct stat visible,opened;
        bool same=reader->temporary_parent>=0 && reader->directory>=0 &&
            !fstat(reader->directory,&opened) &&
            !fstatat(reader->temporary_parent,reader->name,&visible,AT_SYMLINK_NOFOLLOW) &&
            S_ISDIR(visible.st_mode) && visible.st_uid==geteuid() &&
            visible.st_dev==reader->directory_identity.st_dev &&
            visible.st_ino==reader->directory_identity.st_ino &&
            opened.st_dev==visible.st_dev && opened.st_ino==visible.st_ino;
        size_t entries=0;
        if (!same || !cleanup_directory(reader->directory,&entries,0) ||
            unlinkat(reader->temporary_parent,reader->name,AT_REMOVEDIR)) complete=false;
    }
    if (reader->directory>=0 && close(reader->directory)) complete=false;
    if (reader->temporary_parent>=0 && close(reader->temporary_parent)) complete=false;
    for (size_t i=0;i<reader->count;i++) free(reader->observations[i].relative);
    free(reader->observations); free(reader->slots); free(reader);
    return complete;
}
static void private_fence(private_git_v5 *reader) {
    recheckout(reader->owner);
    for (size_t i=0;i<reader->count;i++) {
        witness_deadline(reader);
        observation_v5 *entry=&reader->observations[i];
        struct stat current;
        int root=reader->owner->fds[entry->root_role];
        if (!*entry->relative) {
            if (fstat(root,&current) || !sameid(&entry->identity,&current))
                hold("bootstrap_repository_final_observation_changed");
            continue;
        }
        char leaf[NAME_MAX+1];
        int parent=relative_parent(reader,root,entry->root_role,entry->relative,leaf,false);
        int result=fstatat(parent,leaf,&current,AT_SYMLINK_NOFOLLOW);
        int error=errno;
        close(parent);
        if (entry->exists ? result!=0 || !sameid(&entry->identity,&current) : result==0 || error!=ENOENT)
            hold("bootstrap_repository_final_observation_changed");
    }
    for (size_t i=0;i<reader->pack_count;i++) {
        struct stat st;
        if (fstat(reader->pack_fds[i],&st) || !sameid(&reader->pack_identity[i],&st))
            hold("bootstrap_repository_pack_descriptor_changed");
    }
    recheckout(reader->owner);
}
static uint32_t read_be32(const unsigned char *raw) {
    return ((uint32_t)raw[0]<<24)|((uint32_t)raw[1]<<16)|((uint32_t)raw[2]<<8)|(uint32_t)raw[3];
}
static void raw_sha1(const unsigned char *raw, size_t size, char digest[41]) {
    hash_v4 state=hash_begin("sha1",20); hash_update(&state,raw,size); hash_end(&state,digest);
}
static void raw_oid_hex(const unsigned char *raw, char out[41]) {
    static const char alphabet[]="0123456789abcdef";
    for (size_t i=0;i<20;i++) { out[2*i]=alphabet[raw[i]>>4]; out[2*i+1]=alphabet[raw[i]&15]; }
    out[40]=0;
}
static void verify_reference_snapshot(private_git_v5 *reader, const char *expected) {
    bool present;
    bytes_v4 head=source_bytes(reader,"HEAD",4096,false,&present);
    static const char literal[]="ref: refs/heads/main\n";
    if (head.size!=sizeof(literal)-1 || memcmp(head.data,literal,sizeof(literal)-1))
        hold("bootstrap_checkout_branch_not_main");
    free(head.data);
    /* Parent directories are physical even when the final loose ref is absent. */
    bytes_v4 ref=source_bytes(reader,"refs/heads/main",4096,true,&present);
    char actual[41]="";
    if (present) {
        if (ref.size!=41 || ref.data[40]!='\n') hold("bootstrap_checkout_main_reference_invalid");
        memcpy(actual,ref.data,40); free(ref.data);
    } else {
        bytes_v4 packed=source_bytes(reader,"packed-refs",MAX_INDEX_BYTES,false,&present);
        size_t offset=0; bool found=false;
        while (offset<packed.size) {
            unsigned char *line=packed.data+offset;
            unsigned char *end=memchr(line,'\n',packed.size-offset);
            if (!end) hold("bootstrap_packed_references_framing_invalid");
            size_t size=(size_t)(end-line);
            if (memchr(line,0,size) || memchr(line,'\r',size)) hold("bootstrap_packed_references_invalid");
            if (size && line[0]=='#') { offset+=(size+1U); continue; }
            if (size==41 && line[0]=='^') {
                char peeled[41]; memcpy(peeled,line+1,40); peeled[40]=0;
                if (!hexn(peeled,40)) hold("bootstrap_packed_references_invalid");
            } else {
                if (size<42 || line[40]!=' ') hold("bootstrap_packed_references_invalid");
                char oid[41]; memcpy(oid,line,40); oid[40]=0;
                if (!hexn(oid,40)) hold("bootstrap_packed_references_invalid");
                if (size==56 && !memcmp(line+41,"refs/heads/main",15)) {
                    if (found) hold("bootstrap_packed_main_reference_duplicate");
                    memcpy(actual,oid,41); found=true;
                }
            }
            offset+=size+1U;
        }
        free(packed.data);
        if (!found) hold("bootstrap_checkout_main_reference_missing");
    }
    if (!hexn(actual,40) || strcmp(actual,expected)) hold("bootstrap_checkout_head_mismatch");
}
static void private_index_snapshot(private_git_v5 *reader) {
    bool present; bytes_v4 raw=source_bytes(reader,"index",MAX_INDEX_BYTES,false,&present);
    if (raw.size<32 || memcmp(raw.data,"DIRC",4) || read_be32(raw.data+4)!=2U)
        hold("bootstrap_git_index_version_unsupported");
    char expected[41],actual[41]; raw_oid_hex(raw.data+raw.size-20,expected);
    raw_sha1(raw.data,raw.size-20,actual);
    if (strcmp(expected,actual)) hold("bootstrap_git_index_checksum_invalid");
    size_t count=read_be32(raw.data+8),offset=12,end=raw.size-20,path_bytes=0;
    if (count>MAX_TRACKED_ENTRIES) hold("bootstrap_git_index_entry_limit");
    char previous[PATH_MAX]="";
    for (size_t i=0;i<count;i++) {
        witness_deadline(reader);
        size_t start=offset;
        if (end-offset<63) hold("bootstrap_git_index_entry_truncated");
        uint32_t mode=read_be32(raw.data+offset+24);
        unsigned flags=((unsigned)raw.data[offset+60]<<8)|(unsigned)raw.data[offset+61];
        if (flags&0xf000U) hold("bootstrap_git_index_flags_or_stage_unsupported");
        if (mode!=0100644U && mode!=0100755U && mode!=0120000U)
            hold("bootstrap_git_index_mode_unsupported");
        unsigned char *name=raw.data+offset+62;
        unsigned char *zero=memchr(name,0,end-(offset+62));
        if (!zero) hold("bootstrap_git_index_path_unterminated");
        size_t length=(size_t)(zero-name);
        if (!length || length>=PATH_MAX || length>MAX_PATH_AGGREGATE-path_bytes ||
            (flags&0xfffU)!=(length<0xfffU?length:0xfffU))
            hold("bootstrap_git_index_path_invalid");
        char path[PATH_MAX]; memcpy(path,name,length); path[length]=0;
        if (!tracked_path(path) || (i && strcmp(previous,path)>=0))
            hold("bootstrap_git_index_path_order_invalid");
        snprintf(previous,sizeof(previous),"%s",path); path_bytes+=length;
        size_t entry_size=(62U+length+1U+7U)&~(size_t)7U;
        if (entry_size>end-start) hold("bootstrap_git_index_padding_truncated");
        for (size_t j=62U+length;j<entry_size;j++) if (raw.data[start+j])
            hold("bootstrap_git_index_padding_invalid");
        offset=start+entry_size;
    }
    size_t entries_end=offset,extension_count=0;
    unsigned char extension_names[64][4];
    while (offset<end) {
        if (end-offset<8) hold("bootstrap_git_index_extension_truncated");
        if (extension_count>=64U) hold("bootstrap_git_index_extension_count_limit");
        for (size_t i=0;i<extension_count;i++)
            if (!memcmp(extension_names[i],raw.data+offset,4)) hold("bootstrap_git_index_extension_duplicate");
        memcpy(extension_names[extension_count++],raw.data+offset,4);
        unsigned char first=raw.data[offset];
        size_t size=read_be32(raw.data+offset+4);
        if (first<'A' || first>'Z') hold("bootstrap_git_index_mandatory_extension_unsupported");
        if (size>end-offset-8) hold("bootstrap_git_index_extension_size_invalid");
        offset+=8U+size;
    }
    /* Drop optional cached extensions; Git receives only this sealed ordinary index. */
    raw_sha1(raw.data,entries_end,actual);
    unsigned char checksum[20];
    for (size_t i=0;i<20;i++) {
        unsigned a=(unsigned)(actual[2*i]<='9'?actual[2*i]-'0':actual[2*i]-'a'+10);
        unsigned b=(unsigned)(actual[2*i+1]<='9'?actual[2*i+1]-'0':actual[2*i+1]-'a'+10);
        checksum[i]=(unsigned char)((a<<4)|b);
    }
    int writer=memfd_create("void-e2-private-index-v4",MFD_CLOEXEC|MFD_ALLOW_SEALING);
    if (writer<0) hold("bootstrap_private_index_create_failed");
    write_all(writer,raw.data,entries_end); write_all(writer,checksum,sizeof(checksum));
    seal_writer(writer,0400); reader->index=readonly_memfd(writer);
    close(writer); free(raw.data);
}


static int source_directory(private_git_v5 *reader, const char *relative) {
    char leaf[NAME_MAX+1];
    int parent=relative_parent(reader,reader->owner->fds[R_GIT_DIR],R_GIT_DIR,relative,leaf,true);
    struct stat before,opened,visible;
    if (fstatat(parent,leaf,&before,AT_SYMLINK_NOFOLLOW) || !S_ISDIR(before.st_mode))
        hold("bootstrap_git_source_directory_not_physical");
    int fd=openat(parent,leaf,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
    if (fd<0 || fstat(fd,&opened) || fstatat(parent,leaf,&visible,AT_SYMLINK_NOFOLLOW) ||
        !sameid(&before,&opened) || !sameid(&opened,&visible))
        hold("bootstrap_git_source_directory_rebound");
    close(parent); observe_path(reader,R_GIT_DIR,relative,&opened,true); return fd;
}
static DIR *source_scan(private_git_v5 *reader, const char *relative) {
    int fd=source_directory(reader,relative);
    DIR *directory=fdopendir(fd);
    if (!directory) { close(fd); hold("bootstrap_git_source_directory_scan_failed"); }
    return directory;
}
static struct dirent *source_next(private_git_v5 *reader, DIR *directory) {
    for (;;) {
        witness_deadline(reader); errno=0;
        struct dirent *entry=readdir(directory);
        if (!entry) { if (errno) hold("bootstrap_git_source_directory_read_failed"); return NULL; }
        if (!strcmp(entry->d_name,".") || !strcmp(entry->d_name,"..")) continue;
        if (++reader->object_entries>MAX_TRACKED_ENTRIES) hold("bootstrap_git_object_entry_limit");
        return entry;
    }
}
static void copy_loose_object(private_git_v5 *reader, const char *relative) {
    int source=-1; struct stat identity,after;
    (void)source_file(reader,relative,MAX_LOOSE_BYTES,false,&source,&identity);
    if (identity.st_size<=0 || (uint64_t)identity.st_size>MAX_LOOSE_TOTAL-reader->loose_bytes)
        hold("bootstrap_git_loose_object_bytes_limit");
    reader->loose_bytes+=(uint64_t)identity.st_size;
    int target=private_file_create(reader,relative);
    unsigned char buffer[65536]; size_t offset=0,size=(size_t)identity.st_size;
    while (offset<size) {
        witness_deadline(reader);
        size_t want=size-offset; if (want>sizeof(buffer)) want=sizeof(buffer);
        ssize_t count=pread(source,buffer,want,(off_t)offset);
        if (count<0 && errno==EINTR) continue;
        if (count<=0) hold("bootstrap_git_loose_object_short_read");
        write_all(target,buffer,(size_t)count); offset+=(size_t)count;
    }
    if (pread(source,buffer,1,(off_t)size)!=0 || fstat(source,&after) || !sameid(&identity,&after))
        hold("bootstrap_git_loose_object_generation_changed");
    if (close(source) || fchmod(target,0400) || close(target))
        hold("bootstrap_git_loose_snapshot_close_failed");
}
typedef struct { char stem[46]; bool pack,idx; } pack_pair_v5;
static void pin_pack_file(private_git_v5 *reader, const char *relative) {
    if (reader->pack_count>=2U*MAX_PACK_PAIRS) hold("bootstrap_git_pack_descriptor_limit");
    int fd=-1; struct stat identity;
    size_t length=strlen(relative);
    uint64_t maximum=length>4U && !strcmp(relative+length-4U,".idx") ? MAX_LOOSE_BYTES : MAX_PACK_FILE;
    (void)source_file(reader,relative,maximum,false,&fd,&identity);
    if (identity.st_size<=0 || (uint64_t)identity.st_size>MAX_PACK_TOTAL-reader->pack_bytes)
        hold("bootstrap_git_pack_bytes_limit");
    reader->pack_bytes+=(uint64_t)identity.st_size;
    reader->pack_fds[reader->pack_count]=fd;
    reader->pack_identity[reader->pack_count++]=identity;
    char leaf[NAME_MAX+1],target[64];
    int parent=private_parent_fd(reader,relative,leaf);
    snprintf(target,sizeof(target),"/proc/self/fd/%d",fd);
    if (symlinkat(target,parent,leaf)) hold("bootstrap_git_private_pack_link_failed");
    close(parent);
}
static void snapshot_pack_directory(private_git_v5 *reader) {
    DIR *directory=source_scan(reader,"objects/pack");
    pack_pair_v5 pairs[MAX_PACK_PAIRS]; memset(pairs,0,sizeof(pairs)); size_t count=0;
    struct dirent *entry;
    while ((entry=source_next(reader,directory))!=NULL) {
        const char *name=entry->d_name;
        if (!strcmp(name,"multi-pack-index") || !strcmp(name,"multi-pack-index.d")) {
            /* These caches are never installed into the private object view. */
            struct stat identity;
            if (fstatat(dirfd(directory),name,&identity,AT_SYMLINK_NOFOLLOW) ||
                (!S_ISREG(identity.st_mode) && !S_ISDIR(identity.st_mode)))
                hold("bootstrap_git_pack_auxiliary_type_invalid");
            continue;
        }
        size_t length=strlen(name);
        char oid[41]="";
        if (length>=45) { memcpy(oid,name+5,40); oid[40]=0; }
        if (length<49 || memcmp(name,"pack-",5) || !hexn(oid,40))
            hold("bootstrap_git_pack_name_unsupported");
        const char *suffix=name+45;
        if (!strcmp(suffix,".promisor")) hold("bootstrap_git_promisor_storage_unsupported");
        bool pack=!strcmp(suffix,".pack"),index=!strcmp(suffix,".idx");
        if (!pack && !index) {
            if (strcmp(suffix,".rev") && strcmp(suffix,".bitmap") && strcmp(suffix,".keep") && strcmp(suffix,".mtimes"))
                hold("bootstrap_git_pack_auxiliary_unsupported");
            struct stat identity;
            if (fstatat(dirfd(directory),name,&identity,AT_SYMLINK_NOFOLLOW) ||
                !S_ISREG(identity.st_mode) || identity.st_nlink!=1)
                hold("bootstrap_git_pack_auxiliary_type_invalid");
            continue;
        }
        char stem[46]; memcpy(stem,name,45); stem[45]=0;
        size_t i=0; while (i<count && strcmp(pairs[i].stem,stem)) i++;
        if (i==count) {
            if (count>=MAX_PACK_PAIRS) hold("bootstrap_git_pack_pair_limit");
            snprintf(pairs[count++].stem,sizeof(pairs[0].stem),"%s",stem);
        }
        if (pack ? pairs[i].pack : pairs[i].idx) hold("bootstrap_git_pack_pair_duplicate");
        if (pack) pairs[i].pack=true; else pairs[i].idx=true;
        char relative[PATH_MAX]; snprintf(relative,sizeof(relative),"objects/pack/%s",name);
        pin_pack_file(reader,relative);
    }
    if (closedir(directory)) hold("bootstrap_git_pack_scan_close_failed");
    for (size_t i=0;i<count;i++) if (!pairs[i].pack || !pairs[i].idx)
        hold("bootstrap_git_pack_pair_incomplete");
}
static void private_object_snapshot(private_git_v5 *reader) {
    DIR *objects=source_scan(reader,"objects");
    bool saw_pack=false;
    struct dirent *entry;
    while ((entry=source_next(reader,objects))!=NULL) {
        if (!strcmp(entry->d_name,"info")) {
            int fd=source_directory(reader,"objects/info"); close(fd); continue;
        }
        if (!strcmp(entry->d_name,"pack")) {
            if (saw_pack) hold("bootstrap_git_pack_directory_duplicate");
            saw_pack=true; snapshot_pack_directory(reader); continue;
        }
        if (!hexn(entry->d_name,2)) hold("bootstrap_git_object_directory_name_unsupported");
        char relative[PATH_MAX]; snprintf(relative,sizeof(relative),"objects/%s",entry->d_name);
        private_mkdir(reader,relative);
        DIR *loose=source_scan(reader,relative);
        struct dirent *object;
        while ((object=source_next(reader,loose))!=NULL) {
            if (!hexn(object->d_name,38)) hold("bootstrap_git_loose_object_name_unsupported");
            char path[PATH_MAX]; snprintf(path,sizeof(path),"objects/%s/%s",entry->d_name,object->d_name);
            copy_loose_object(reader,path);
        }
        if (closedir(loose)) hold("bootstrap_git_loose_scan_close_failed");
    }
    if (closedir(objects)) hold("bootstrap_git_object_scan_close_failed");
}
static void observe_absent_guard(private_git_v5 *reader, const char *relative) {
    char leaf[NAME_MAX+1];
    int parent=relative_parent(reader,reader->owner->fds[R_GIT_DIR],R_GIT_DIR,relative,leaf,true);
    struct stat identity;
    if (!fstatat(parent,leaf,&identity,AT_SYMLINK_NOFOLLOW) || errno!=ENOENT)
        hold("bootstrap_git_external_object_store_unsupported");
    close(parent); observe_path(reader,R_GIT_DIR,relative,NULL,false);
}
static bool observe_optional_guard_directory(private_git_v5 *reader, const char *relative) {
    char leaf[NAME_MAX+1];
    int parent=relative_parent(reader,reader->owner->fds[R_GIT_DIR],R_GIT_DIR,relative,leaf,true);
    struct stat identity;
    int result=fstatat(parent,leaf,&identity,AT_SYMLINK_NOFOLLOW),error=errno;
    close(parent);
    if (result) {
        if (error!=ENOENT) hold("bootstrap_git_guard_directory_unavailable");
        observe_path(reader,R_GIT_DIR,relative,NULL,false); return false;
    }
    if (!S_ISDIR(identity.st_mode)) hold("bootstrap_git_guard_directory_not_physical");
    int fd=source_directory(reader,relative); close(fd); return true;
}
static void observe_redirect_guards(private_git_v5 *reader) {
    observe_absent_guard(reader,"commondir"); observe_absent_guard(reader,"shallow");
    if (observe_optional_guard_directory(reader,"objects/info")) {
        observe_absent_guard(reader,"objects/info/alternates");
        observe_absent_guard(reader,"objects/info/http-alternates");
    }
    if (observe_optional_guard_directory(reader,"info")) {
        observe_absent_guard(reader,"info/grafts");
        bool present;
        bytes_v4 exclude=source_bytes(reader,"info/exclude",MAX_INDEX_BYTES,true,&present);
        if (present) { private_file(reader,"info/exclude",exclude.data,exclude.size); free(exclude.data); }
    }
}
static void private_begin(context_v4 *ctx) {
    if (ctx->reader || active_private) hold("bootstrap_private_reader_already_active");
    /* This receipt precedes every temporary directory/file acquisition. */
    printf("git_boundary_policy=%s\n",GIT_BOUNDARY_POLICY);
    puts("temporary_git_metadata_write_authorized=true");
    puts("temporary_git_metadata_mutation_possible=true");
    puts("source_repository_mutation=false");
    puts("source_object_fetch=false");
    if (fflush(stdout)) hold("bootstrap_private_authority_receipt_failed");
    private_git_v5 *reader=calloc(1,sizeof(*reader));
    if (!reader) hold("bootstrap_private_reader_allocation_failed");
    reader->owner=ctx; reader->directory=reader->temporary_parent=reader->index=-1;
    reader->deadline=monotonic_millis()+180000;
    ctx->reader=reader; active_private=reader;
    reader->slots=calloc(OBSERVATION_SLOTS,sizeof(*reader->slots));
    if (!reader->slots) hold("bootstrap_private_observation_table_allocation_failed");
    reader->temporary_parent=open("/tmp",O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
    struct stat parent;
    if (reader->temporary_parent<0 || fstat(reader->temporary_parent,&parent) ||
        !S_ISDIR(parent.st_mode) || parent.st_uid!=0 || parent.st_gid!=0 ||
        ((parent.st_mode&0022) && !(parent.st_mode&S_ISVTX)))
        hold("bootstrap_private_temporary_parent_invalid");
    snprintf(reader->path,sizeof(reader->path),"/tmp/void-e2-native-git-v5-XXXXXX");
    if (!mkdtemp(reader->path)) hold("bootstrap_private_directory_unavailable");
    reader->created=true; temporary_git_write_started=true;
    snprintf(reader->name,sizeof(reader->name),"%s",strrchr(reader->path,'/')+1);
    reader->directory=openat(reader->temporary_parent,reader->name,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
    struct stat visible;
    if (reader->directory<0 || fstat(reader->directory,&reader->directory_identity) ||
        fstatat(reader->temporary_parent,reader->name,&visible,AT_SYMLINK_NOFOLLOW) ||
        !sameid(&reader->directory_identity,&visible) || visible.st_uid!=geteuid() ||
        (visible.st_mode&07777)!=0700) hold("bootstrap_private_directory_identity_invalid");
    private_mkdir(reader,"refs"); private_mkdir(reader,"refs/heads");
    private_mkdir(reader,"objects"); private_mkdir(reader,"objects/info"); private_mkdir(reader,"objects/pack");
    static const unsigned char config[]=
        "[core]\nrepositoryFormatVersion = 0\nbare = false\nfsmonitor = false\n"
        "hooksPath = /dev/null\nattributesFile = /dev/null\nexcludesFile = /dev/null\n"
        "untrackedCache = false\nsplitIndex = false\npreloadIndex = false\nignoreCase = false\n"
        "fileMode = true\ncommitGraph = false\npackedGitWindowSize = 16m\npackedGitLimit = 256m\n"
        "[index]\nthreads = 1\n[pack]\nthreads = 1\nwriteReverseIndex = false\n"
        "[protocol]\nallow = never\n[gc]\nauto = 0\n[maintenance]\nauto = false\n";
    private_file(reader,"config",config,sizeof(config)-1);
    private_mkdir(reader,"info"); observe_redirect_guards(reader);
    verify_reference_snapshot(reader,ctx->request.expected_head);
    private_index_snapshot(reader);
    static const unsigned char head[]="ref: refs/heads/main\n";
    private_file(reader,"HEAD",head,sizeof(head)-1);
    char ref[42]; snprintf(ref,sizeof(ref),"%s\n",ctx->request.expected_head);
    private_file(reader,"refs/heads/main",(unsigned char *)ref,41);
    private_object_snapshot(reader); private_fence(reader);
}
static void private_end(context_v4 *ctx) {
    if (!ctx->reader || ctx->reader!=active_private) hold("bootstrap_private_reader_identity_invalid");
    private_fence(ctx->reader);
    bool complete=private_cleanup(); ctx->reader=NULL;
    temporary_git_cleanup_complete=temporary_git_cleanup_complete && complete;
    puts("filesystem_write=true");
    puts("temporary_git_metadata_mutation_performed=true");
    printf("temporary_git_metadata_cleanup_complete=%s\n",complete?"true":"false");
    if (!complete) hold("bootstrap_private_metadata_cleanup_incomplete");
}

/* The Git process is a bounded data reader, never an installer child. */
static void require_waitable_children(void) {
    /* The unreaped child PID must remain reserved until this parent waits. */
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
typedef enum { GIT_OBJECTS_V5, GIT_INDEX_V5, GIT_UNTRACKED_V5 } git_operation_v5;
static bool git_child_limits(void) {
    static const struct { int resource; rlim_t maximum; } bounds[]={
        {RLIMIT_AS,(rlim_t)UINT64_C(2147483648)},{RLIMIT_CPU,(rlim_t)20},{RLIMIT_CORE,(rlim_t)0}
    };
    for (size_t i=0;i<sizeof(bounds)/sizeof(bounds[0]);i++) {
        struct rlimit inherited;
        if (getrlimit(bounds[i].resource,&inherited)) return false;
        rlim_t maximum=bounds[i].maximum;
        if (inherited.rlim_cur!=RLIM_INFINITY && inherited.rlim_cur<maximum) maximum=inherited.rlim_cur;
        if (inherited.rlim_max!=RLIM_INFINITY && inherited.rlim_max<maximum) maximum=inherited.rlim_max;
        struct rlimit bounded={.rlim_cur=maximum,.rlim_max=maximum};
        if (setrlimit(bounds[i].resource,&bounded)) return false;
    }
    return true;
}
static bool git_inherited_descriptor(int fd) {
    int flags=fcntl(fd,F_GETFD);
    return flags>=0 && fcntl(fd,F_SETFD,flags&~FD_CLOEXEC)==0;
}
static bytes_v4 git_capture(const context_v4 *ctx, git_operation_v5 operation,
                            const char *const *oids, size_t oid_count, size_t maximum) {
    private_git_v5 *reader=ctx->reader;
    if (ctx->fds[R_GIT]<3 || !reader || reader!=active_private || reader->owner!=ctx ||
        reader->index<3 || !maximum || maximum>MAX_GIT_OUTPUT)
        hold("bootstrap_git_capture_contract_invalid");
    witness_deadline(reader); recheckout(ctx);
    static const char *const object_args[]={"cat-file","--batch",NULL};
    static const char *const index_args[]={"ls-files","--stage","-v","-z","--full-name","--sparse",NULL};
    static const char *const untracked_args[]={
        "ls-files","--others","--exclude-standard","-z","--full-name","--exclude=/.git/",NULL
    };
    const char *const *command=NULL;
    int request_fd=-1;
    if (operation==GIT_OBJECTS_V5) {
        if (!oids || !oid_count || oid_count>MAX_OBJECT_BATCH) hold("bootstrap_git_object_request_invalid");
        char request[MAX_OBJECT_BATCH*41U]; size_t size=0;
        for (size_t i=0;i<oid_count;i++) {
            if (!hexn(oids[i],40)) hold("bootstrap_git_object_request_invalid");
            memcpy(request+size,oids[i],40); request[size+40]='\n'; size+=41;
        }
        int writer=memfd_create("void-e2-private-object-request-v4",MFD_CLOEXEC|MFD_ALLOW_SEALING);
        if (writer<0) hold("bootstrap_git_request_snapshot_failed");
        write_all(writer,(unsigned char *)request,size); seal_writer(writer,0400);
        request_fd=readonly_memfd(writer); close(writer); command=object_args;
    } else {
        if (oids || oid_count) hold("bootstrap_git_unexpected_object_request");
        if (operation==GIT_INDEX_V5) command=index_args;
        else if (operation==GIT_UNTRACKED_V5) command=untracked_args;
        else hold("bootstrap_git_operation_not_allowed");
    }
    char git_dir[PATH_MAX+16],work_tree[PATH_MAX+16],safe[PATH_MAX+32];
    char directory_env[PATH_MAX+16],index_env[96],objects_env[PATH_MAX+32];
    if (snprintf(git_dir,sizeof(git_dir),"--git-dir=%s",reader->path)>=(int)sizeof(git_dir) ||
        snprintf(work_tree,sizeof(work_tree),"--work-tree=%s",ctx->checkout_path)>=(int)sizeof(work_tree) ||
        snprintf(safe,sizeof(safe),"safe.directory=%s",ctx->checkout_path)>=(int)sizeof(safe) ||
        snprintf(directory_env,sizeof(directory_env),"GIT_DIR=%s",reader->path)>=(int)sizeof(directory_env) ||
        snprintf(index_env,sizeof(index_env),"GIT_INDEX_FILE=/proc/self/fd/%d",reader->index)>=(int)sizeof(index_env) ||
        snprintf(objects_env,sizeof(objects_env),"GIT_OBJECT_DIRECTORY=%s/objects",reader->path)>=(int)sizeof(objects_env))
        hold("bootstrap_git_path_overflow");
    char *args[100]; size_t n=0;
    args[n++]=(char *)FIXED_GIT; args[n++]="--no-pager"; args[n++]="--no-replace-objects";
    args[n++]="--no-optional-locks"; args[n++]="-C"; args[n++]=(char *)ctx->checkout_path;
    args[n++]=git_dir; args[n++]=work_tree; args[n++]="-c"; args[n++]=safe;
    static const char *const settings[]={
        "core.bare=false","core.fsmonitor=false","core.hooksPath=/dev/null","core.attributesFile=/dev/null",
        "core.excludesFile=/dev/null","core.untrackedCache=false","core.preloadIndex=false","core.ignoreCase=false",
        "core.fileMode=true","core.commitGraph=false","submodule.recurse=false","protocol.allow=never",
        "gc.auto=0","maintenance.auto=false","fetch.writeCommitGraph=false","core.splitIndex=false"
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
        "GIT_PROTOCOL_FROM_USER=0","GIT_NO_LAZY_FETCH=1","GIT_ATTR_NOSYSTEM=1",
        directory_env,index_env,objects_env,NULL};
    require_waitable_children();
    int output[2]; if (pipe2(output,O_CLOEXEC)) hold("bootstrap_git_pipe_failed");
    pid_t pid=fork();
    if (pid<0) hold("bootstrap_git_fork_failed");
    if (pid==0) {
        if (setpgid(0,0) || !git_child_limits()) _exit(121);
        int nullfd=open(FIXED_DEVNULL,O_RDWR|O_CLOEXEC|O_NOFOLLOW);
        int input=request_fd>=0?request_fd:nullfd;
        if (nullfd<0 || dup2(input,STDIN_FILENO)<0 || dup2(output[1],STDOUT_FILENO)<0 ||
            dup2(nullfd,STDERR_FILENO)<0) _exit(122);
        /* Only the immutable private index and retained pack/idx view survive
         * exec; all thirteen application roles remain closed to this Git child. */
        if (close_range(3,~0U,CLOSE_RANGE_CLOEXEC) || !git_inherited_descriptor(reader->index)) _exit(123);
        for (size_t i=0;i<reader->pack_count;i++)
            if (!git_inherited_descriptor(reader->pack_fds[i])) _exit(123);
        fexecve(ctx->fds[R_GIT],args,env); _exit(124);
    }
    if (request_fd>=0) close(request_fd);
    close(output[1]); (void)setpgid(pid,pid);
    int flags=fcntl(output[0],F_GETFL);
    if (flags<0 || fcntl(output[0],F_SETFL,flags|O_NONBLOCK)) { stop_git(pid); hold("bootstrap_git_pipe_flags_failed"); }
    bytes_v4 result={.data=malloc(maximum+1),.size=0};
    if (!result.data) { stop_git(pid); hold("bootstrap_git_output_allocation_failed"); }
    int status=0; bool eof=false,finished=false; int64_t deadline=monotonic_millis()+20000;
    if (reader->deadline<deadline) deadline=reader->deadline;
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
        /* Keep the unreaped child PID reserved through every pipe error path. */
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
    witness_deadline(reader); recheckout(ctx); return result;
}
/* Full hexadecimal object requests are private, closed data. Authenticate every
 * raw body before any commit/tree structure can acquire checkout authority. */
static bytes_v4 object_batch(const context_v4 *ctx, const char *const *oids,
                              size_t count, const char *kind, size_t object_maximum,
                              bytes_v4 *parts) {
    if (!count || count>MAX_OBJECT_BATCH || !parts ||
        (!strcmp(kind,"commit") && object_maximum!=MAX_COMMIT_BYTES) ||
        (!strcmp(kind,"tree") && object_maximum!=MAX_TREE_BYTES) ||
        (!strcmp(kind,"blob") && object_maximum>MAX_SOURCE_BYTES) ||
        (strcmp(kind,"commit") && strcmp(kind,"tree") && strcmp(kind,"blob")))
        hold("bootstrap_git_object_kind_invalid");
    size_t maximum=MAX_GIT_OUTPUT,framing=count*98U;
    if (object_maximum<=(MAX_GIT_OUTPUT-framing)/count) maximum=object_maximum*count+framing;
    bytes_v4 raw=git_capture(ctx,GIT_OBJECTS_V5,oids,count,maximum);
    size_t offset=0,kind_size=strlen(kind);
    for (size_t i=0;i<count;i++) {
        if (offset>=raw.size) hold("bootstrap_git_object_batch_truncated");
        unsigned char *start=raw.data+offset;
        unsigned char *end=memchr(start,'\n',raw.size-offset);
        size_t header=end?(size_t)(end-start):0;
        if (!end || header<43U+kind_size || header>96U || memcmp(start,oids[i],40) || start[40]!=' ' ||
            memcmp(start+41,kind,kind_size) || start[41+kind_size]!=' ')
            hold("bootstrap_git_object_header_invalid");
        size_t number_start=42U+kind_size,number_size=header-number_start;
        if (!number_size || number_size>20U) hold("bootstrap_git_object_size_invalid");
        char number[21]; memcpy(number,start+number_start,number_size); number[number_size]=0;
        size_t size=0;
        if (strcmp(number,"0") && !decsz(number,object_maximum,&size)) hold("bootstrap_git_object_size_invalid");
        size_t body_offset=offset+header+1U;
        if (body_offset>raw.size || size>=raw.size-body_offset || raw.data[body_offset+size]!='\n')
            hold("bootstrap_git_object_body_truncated");
        unsigned char *body=raw.data+body_offset;
        char prefix[96],digest[41];
        int length=snprintf(prefix,sizeof(prefix),"%s %zu",kind,size);
        if (length<0 || (size_t)length>=sizeof(prefix)) hold("bootstrap_git_object_prefix_invalid");
        hash_v4 hash=hash_begin("sha1",20);
        hash_update(&hash,(unsigned char *)prefix,(size_t)length+1U);
        hash_update(&hash,body,size); hash_end(&hash,digest);
        if (strcmp(digest,oids[i])) hold("bootstrap_git_raw_object_hash_mismatch");
        parts[i]=(bytes_v4){.data=body,.size=size}; offset=body_offset+size+1U;
    }
    if (offset!=raw.size) hold("bootstrap_git_object_batch_extra_bytes");
    return raw;
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
    if (!ctx->reader || ctx->reader!=active_private) hold("bootstrap_tracked_witness_required");
    char path[PATH_MAX]; snprintf(path,sizeof(path),"%s",entry->path);
    size_t links=1;
    for (const char *p=path;*p;p++) if (*p=='/') links++;
    directory_link_v4 *parents=calloc(links,sizeof(*parents));
    if (!parents) hold("bootstrap_tracked_directory_allocation_failed");
    parents[0].fd=fcntl(ctx->fds[R_CHECKOUT],F_DUPFD_CLOEXEC,3);
    if (parents[0].fd<0 || fstat(parents[0].fd,&parents[0].identity)) hold("bootstrap_tracked_root_unavailable");
    observe_path(ctx->reader,R_CHECKOUT,"",&parents[0].identity,true);
    size_t used=1; char *leaf=path;
    for (char *slash=strchr(leaf,'/');slash;slash=strchr(leaf,'/')) {
        *slash=0; int parent=parents[used-1].fd; struct stat before,opened,visible;
        if (fstatat(parent,leaf,&before,AT_SYMLINK_NOFOLLOW) || !S_ISDIR(before.st_mode))
            hold("bootstrap_tracked_directory_type_invalid");
        int child=openat(parent,leaf,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
        if (child<0 || fstat(child,&opened) || fstatat(parent,leaf,&visible,AT_SYMLINK_NOFOLLOW) ||
            !sameid(&before,&opened) || !sameid(&opened,&visible)) hold("bootstrap_tracked_directory_rebound");
        parents[used++]=(directory_link_v4){.fd=child,.name=leaf,.identity=opened}; leaf=slash+1;
        char prefix[PATH_MAX]; size_t prefix_size=(size_t)(slash-path);
        memcpy(prefix,entry->path,prefix_size); prefix[prefix_size]=0;
        observe_path(ctx->reader,R_CHECKOUT,prefix,&opened,true);
    }
    int parent=parents[used-1].fd; struct stat before,after; char actual[41];
    if (fstatat(parent,leaf,&before,AT_SYMLINK_NOFOLLOW) || before.st_size<0 ||
        (uintmax_t)before.st_size>MAX_TRACKED_FILE_BYTES || (uintmax_t)before.st_size>budget)
        hold("bootstrap_tracked_read_budget_or_metadata_invalid");
    size_t size=(size_t)before.st_size;
    observe_path(ctx->reader,R_CHECKOUT,entry->path,&before,true);
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
typedef struct { char oid[41]; char *prefix; unsigned depth; } tree_request_v5;
static int name_compare(const void *left, const void *right) {
    return strcmp(*(char *const *)left,*(char *const *)right);
}
static void append_tree_entry(listing_v4 *tree, size_t *capacity, const char *path,
                               const char *mode, const char *oid) {
    if (tree->count>=MAX_TRACKED_ENTRIES) hold("bootstrap_git_tree_entry_limit");
    if (tree->count==*capacity) {
        size_t grown=*capacity?*capacity*2U:256U;
        if (grown>MAX_TRACKED_ENTRIES) grown=MAX_TRACKED_ENTRIES;
        entry_v4 *entries=realloc(tree->entries,grown*sizeof(*entries));
        if (!entries) hold("bootstrap_git_tree_allocation_failed");
        tree->entries=entries; *capacity=grown;
    }
    entry_v4 *entry=&tree->entries[tree->count++];
    memset(entry,0,sizeof(*entry)); entry->path=strdup(path);
    if (!entry->path) hold("bootstrap_git_tree_path_allocation_failed");
    snprintf(entry->mode,sizeof(entry->mode),"%s",mode); memcpy(entry->oid,oid,41);
}
static void append_tree_request(tree_request_v5 **queue, size_t *count, size_t *capacity,
                                const char *path, const char *oid, unsigned depth) {
    if (depth>=MAX_TREE_DEPTH || *count>MAX_TRACKED_ENTRIES) hold("bootstrap_git_tree_depth_or_count_limit");
    if (*count==*capacity) {
        size_t grown=*capacity?*capacity*2U:256U;
        if (grown>MAX_TRACKED_ENTRIES+1U) grown=MAX_TRACKED_ENTRIES+1U;
        tree_request_v5 *entries=realloc(*queue,grown*sizeof(*entries));
        if (!entries) hold("bootstrap_git_tree_queue_allocation_failed");
        *queue=entries; *capacity=grown;
    }
    tree_request_v5 *entry=&(*queue)[(*count)++];
    memcpy(entry->oid,oid,41); entry->depth=depth; entry->prefix=strdup(path);
    if (!entry->prefix) hold("bootstrap_git_tree_path_allocation_failed");
}
static listing_v4 authenticated_tree(context_v4 *ctx) {
    const char *commit_oid[]={ctx->request.expected_head}; bytes_v4 commit;
    bytes_v4 commit_raw=object_batch(ctx,commit_oid,1,"commit",MAX_COMMIT_BYTES,&commit);
    if (commit.size<46U || memcmp(commit.data,"tree ",5) || commit.data[45]!='\n')
        hold("bootstrap_checkout_commit_tree_invalid");
    memcpy(ctx->tree,commit.data+5,40); ctx->tree[40]=0;
    if (!hexn(ctx->tree,40)) hold("bootstrap_checkout_commit_tree_invalid");
    free(commit_raw.data);
    listing_v4 result={0}; size_t leaf_capacity=0;
    tree_request_v5 *queue=NULL; size_t queued=0,capacity=0,done=0;
    append_tree_request(&queue,&queued,&capacity,"",ctx->tree,0);
    size_t members=0,total_bytes=0,total_paths=0;
    while (done<queued) {
        witness_deadline(ctx->reader);
        size_t count=queued-done; if (count>MAX_OBJECT_BATCH) count=MAX_OBJECT_BATCH;
        const char *oids[MAX_OBJECT_BATCH];
        bytes_v4 parts[MAX_OBJECT_BATCH];
        for (size_t i=0;i<count;i++) oids[i]=queue[done+i].oid;
        bytes_v4 raw=object_batch(ctx,oids,count,"tree",MAX_TREE_BYTES,parts);
        for (size_t i=0;i<count;i++) {
            /* Appending children can realloc the queue; retain this row by value. */
            tree_request_v5 parent=queue[done+i];
            bytes_v4 body=parts[i]; size_t offset=0;
            if (body.size>MAX_TREE_BYTES-total_bytes) hold("bootstrap_git_tree_bytes_limit");
            total_bytes+=body.size;
            char previous_key[NAME_MAX+2]="";
            char **names=NULL; size_t named=0,name_capacity=0;
            while (offset<body.size) {
                witness_deadline(ctx->reader);
                if (++members>MAX_TRACKED_ENTRIES) hold("bootstrap_git_tree_member_limit");
                unsigned char *start=body.data+offset;
                unsigned char *space=memchr(start,' ',body.size-offset);
                size_t mode_size=space?(size_t)(space-start):0;
                if (!space || (mode_size!=5U && mode_size!=6U)) hold("bootstrap_git_raw_tree_mode_invalid");
                char mode[7]; memcpy(mode,start,mode_size); mode[mode_size]=0;
                bool directory=!strcmp(mode,"40000");
                if (!directory && !tracked_mode(mode)) hold("bootstrap_git_tree_type_unsupported");
                unsigned char *name=space+1;
                size_t name_offset=(size_t)(name-body.data);
                unsigned char *zero=memchr(name,0,body.size-name_offset);
                size_t name_size=zero?(size_t)(zero-name):0;
                if (!zero || !name_size || name_size>NAME_MAX || memchr(name,'/',name_size) ||
                    (name_size==1U && name[0]=='.') || (name_size==2U && !memcmp(name,"..",2)) ||
                    (name_size==4U && !memcmp(name,".git",4)))
                    hold("bootstrap_git_raw_tree_name_invalid");
                size_t oid_offset=(size_t)(zero-body.data)+1U;
                if (oid_offset>body.size || body.size-oid_offset<20U) hold("bootstrap_git_raw_tree_oid_truncated");
                char key[NAME_MAX+2]; memcpy(key,name,name_size);
                key[name_size]=directory?'/':0; key[name_size+(directory?1U:0U)]=0;
                if (named && strcmp(previous_key,key)>=0) hold("bootstrap_git_raw_tree_order_invalid");
                snprintf(previous_key,sizeof(previous_key),"%s",key);
                if (named==name_capacity) {
                    size_t grown=name_capacity?name_capacity*2U:64U;
                    if (grown>MAX_TRACKED_ENTRIES) grown=MAX_TRACKED_ENTRIES;
                    char **grown_names=realloc(names,grown*sizeof(*grown_names));
                    if (!grown_names) hold("bootstrap_git_tree_names_allocation_failed");
                    names=grown_names; name_capacity=grown;
                }
                names[named++]=(char *)name;
                char path[PATH_MAX],oid[41];
                int length=snprintf(path,sizeof(path),"%s%s%s",parent.prefix,*parent.prefix?"/":"",(char *)name);
                if (length<0 || (size_t)length>=sizeof(path) || !tracked_path(path) ||
                    (size_t)length+1U>MAX_PATH_AGGREGATE-total_paths)
                    hold("bootstrap_git_tree_path_limit");
                total_paths+=(size_t)length+1U;
                raw_oid_hex(body.data+oid_offset,oid);
                if (directory) append_tree_request(&queue,&queued,&capacity,path,oid,parent.depth+1U);
                else append_tree_entry(&result,&leaf_capacity,path,mode,oid);
                offset=oid_offset+20U;
            }
            if (named>1U) qsort(names,named,sizeof(*names),name_compare);
            for (size_t k=1;k<named;k++) if (!strcmp(names[k-1],names[k]))
                hold("bootstrap_git_raw_tree_duplicate_name");
            free(names);
        }
        free(raw.data); done+=count;
    }
    for (size_t i=0;i<queued;i++) free(queue[i].prefix);
    free(queue);
    if (result.count>1U) qsort(result.entries,result.count,sizeof(*result.entries),entry_compare);
    for (size_t i=1;i<result.count;i++) if (!strcmp(result.entries[i-1].path,result.entries[i].path))
        hold("bootstrap_git_tree_duplicate_path");
    return result;
}
static void verify_bound_blob(const context_v4 *ctx, const listing_v4 *tree, const source_v4 *source) {
    entry_v4 key={.path=(char *)source->rel};
    const entry_v4 *entry=tree->count?bsearch(&key,tree->entries,tree->count,sizeof(*tree->entries),entry_compare):NULL;
    if (!entry || strcmp(entry->mode,"100644") || strcmp(entry->oid,source->blob))
        hold("bootstrap_bound_source_tree_identity_mismatch");
    const char *oids[]={source->blob}; bytes_v4 body;
    bytes_v4 raw=object_batch(ctx,oids,1,"blob",source->bytes,&body); char digest[65];
    if (body.size!=source->bytes) hold("bootstrap_bound_source_size_mismatch");
    hash_bytes(body.data,body.size,false,digest);
    if (strcmp(digest,source->sha256)) hold("bootstrap_bound_source_digest_mismatch");
    free(raw.data);
}
/* This complete native pre-installer gate retains its witness until private_end.
 * The final fence therefore follows the caller's later parent/input validation. */
static void verify_checkout(context_v4 *ctx) {
    if (!hexn(ctx->request.expected_head,40)) hold("bootstrap_expected_head_invalid");
    recheckout(ctx); private_begin(ctx);
    listing_v4 tree=authenticated_tree(ctx);
    bytes_v4 index_raw=git_capture(ctx,GIT_INDEX_V5,NULL,0,MAX_GIT_OUTPUT);
    listing_v4 index=parse_listing(index_raw,true);
    if (tree.count!=index.count) hold("bootstrap_checkout_index_tree_mismatch");
    for (size_t i=0;i<tree.count;i++)
        if (strcmp(tree.entries[i].path,index.entries[i].path) || strcmp(tree.entries[i].mode,index.entries[i].mode) ||
            strcmp(tree.entries[i].oid,index.entries[i].oid)) hold("bootstrap_checkout_index_tree_mismatch");
    uint64_t total=0;
    for (size_t i=0;i<tree.count;i++) {
        witness_deadline(ctx->reader);
        total+=verify_tracked_blob(ctx,&tree.entries[i],MAX_TRACKED_TOTAL_BYTES-total);
    }
    for (size_t i=0;i<4;i++) verify_bound_blob(ctx,&tree,&ctx->manifest.sources[i]);
    source_v4 manifest_source={.rel=MANIFEST_REL,.bytes=ctx->manifest.bytes};
    memcpy(manifest_source.blob,ctx->manifest.blob,41); memcpy(manifest_source.sha256,ctx->manifest.sha256,65);
    verify_bound_blob(ctx,&tree,&manifest_source);
    bytes_v4 raw=git_capture(ctx,GIT_UNTRACKED_V5,NULL,0,MAX_GIT_OUTPUT);
    if (raw.size) hold("bootstrap_checkout_untracked_files_present");
    free(raw.data);
    free(index_raw.data); free_listing(&tree); free_listing(&index);
    private_fence(ctx->reader);
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
    int writer=memfd_create("void-e2-private-parent-proof-v1",MFD_CLOEXEC|MFD_ALLOW_SEALING);
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
    private_end(ctx);
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
        strcmp(APPLY_CONFIRM,"INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V5_CREATE_ONLY")) return 1;
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
    revalidate_inputs(&ctx); verify_checkout(&ctx); revalidate_inputs(&ctx); private_end(&ctx);
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
