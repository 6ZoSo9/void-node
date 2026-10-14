#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1"
#define FIXED_SELF "/opt/void-buy-void-v7-preentry-v1/void_buy_void_source_finality_v7_native_preentry_v1"
#define FIXED_BASH "/usr/bin/bash"
#define FIXED_LAUNCHER "/opt/void-buy-void-v7-reviewed-v1/ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash"
#define PREENTRY_ENV "VOID_BUY_VOID_V7_NATIVE_PREENTRY=VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1"
#define FIXED_LAUNCHER_BYTES 11436U
static const unsigned char FIXED_LAUNCHER_SHA256[32]={0x60,0x3b,0x39,0xee,0x8e,0xc1,0x24,0x5f,0xc4,0xff,0xab,0x06,0x47,0xef,0x1a,0x8d,0xa4,0x59,0x4a,0x49,0xb5,0xa9,0xef,0xef,0xa6,0xfb,0x8f,0x5a,0x97,0xcd,0x33,0x59};
typedef struct{unsigned char data[64];uint32_t datalen;uint64_t bitlen;uint32_t state[8];} sha256_ctx;
static const uint32_t SHA256_K[64]={0x428a2f98U,0x71374491U,0xb5c0fbcfU,0xe9b5dba5U,0x3956c25bU,0x59f111f1U,0x923f82a4U,0xab1c5ed5U,0xd807aa98U,0x12835b01U,0x243185beU,0x550c7dc3U,0x72be5d74U,0x80deb1feU,0x9bdc06a7U,0xc19bf174U,0xe49b69c1U,0xefbe4786U,0x0fc19dc6U,0x240ca1ccU,0x2de92c6fU,0x4a7484aaU,0x5cb0a9dcU,0x76f988daU,0x983e5152U,0xa831c66dU,0xb00327c8U,0xbf597fc7U,0xc6e00bf3U,0xd5a79147U,0x06ca6351U,0x14292967U,0x27b70a85U,0x2e1b2138U,0x4d2c6dfcU,0x53380d13U,0x650a7354U,0x766a0abbU,0x81c2c92eU,0x92722c85U,0xa2bfe8a1U,0xa81a664bU,0xc24b8b70U,0xc76c51a3U,0xd192e819U,0xd6990624U,0xf40e3585U,0x106aa070U,0x19a4c116U,0x1e376c08U,0x2748774cU,0x34b0bcb5U,0x391c0cb3U,0x4ed8aa4aU,0x5b9cca4fU,0x682e6ff3U,0x748f82eeU,0x78a5636fU,0x84c87814U,0x8cc70208U,0x90befffaU,0xa4506cebU,0xbef9a3f7U,0xc67178f2U};
static uint32_t rotr32(uint32_t x,uint32_t n){return(x>>n)|(x<<(32U-n));}
static void sha256_transform(sha256_ctx*c,const unsigned char d[64]){uint32_t m[64];for(size_t i=0;i<16;i++){size_t j=i*4;m[i]=((uint32_t)d[j]<<24)|((uint32_t)d[j+1]<<16)|((uint32_t)d[j+2]<<8)|(uint32_t)d[j+3];}for(size_t i=16;i<64;i++){uint32_t s0=rotr32(m[i-15],7)^rotr32(m[i-15],18)^(m[i-15]>>3),s1=rotr32(m[i-2],17)^rotr32(m[i-2],19)^(m[i-2]>>10);m[i]=m[i-16]+s0+m[i-7]+s1;}uint32_t a=c->state[0],b=c->state[1],cc=c->state[2],dd=c->state[3],e=c->state[4],f=c->state[5],g=c->state[6],h=c->state[7];for(size_t i=0;i<64;i++){uint32_t s1=rotr32(e,6)^rotr32(e,11)^rotr32(e,25),ch=(e&f)^((~e)&g),t1=h+s1+ch+SHA256_K[i]+m[i],s0=rotr32(a,2)^rotr32(a,13)^rotr32(a,22),maj=(a&b)^(a&cc)^(b&cc),t2=s0+maj;h=g;g=f;f=e;e=dd+t1;dd=cc;cc=b;b=a;a=t1+t2;}c->state[0]+=a;c->state[1]+=b;c->state[2]+=cc;c->state[3]+=dd;c->state[4]+=e;c->state[5]+=f;c->state[6]+=g;c->state[7]+=h;}
static void sha256_init(sha256_ctx*c){c->datalen=0;c->bitlen=0;c->state[0]=0x6a09e667U;c->state[1]=0xbb67ae85U;c->state[2]=0x3c6ef372U;c->state[3]=0xa54ff53aU;c->state[4]=0x510e527fU;c->state[5]=0x9b05688cU;c->state[6]=0x1f83d9abU;c->state[7]=0x5be0cd19U;}
static void sha256_update(sha256_ctx*c,const unsigned char*d,size_t n){for(size_t i=0;i<n;i++){c->data[c->datalen++]=d[i];if(c->datalen==64U){sha256_transform(c,c->data);c->bitlen+=512U;c->datalen=0;}}}
static void sha256_final(sha256_ctx*c,unsigned char h[32]){uint32_t i=c->datalen;c->data[i++]=0x80U;if(i>56U){while(i<64U)c->data[i++]=0;sha256_transform(c,c->data);i=0;}while(i<56U)c->data[i++]=0;c->bitlen+=(uint64_t)c->datalen*8U;for(size_t j=0;j<8;j++)c->data[63U-j]=(unsigned char)(c->bitlen>>(j*8U));sha256_transform(c,c->data);for(size_t j=0;j<8;j++){h[j*4]=(unsigned char)(c->state[j]>>24);h[j*4+1]=(unsigned char)(c->state[j]>>16);h[j*4+2]=(unsigned char)(c->state[j]>>8);h[j*4+3]=(unsigned char)c->state[j];}}
static void sha256_buffer(const unsigned char*d,size_t n,unsigned char h[32]){sha256_ctx c;sha256_init(&c);sha256_update(&c,d,n);sha256_final(&c,h);}
static bool sha256_fd_matches(int fd){if(lseek(fd,0,SEEK_SET)<0)return false;sha256_ctx c;sha256_init(&c);unsigned char b[8192];for(;;){ssize_t n=read(fd,b,sizeof(b));if(n<0){if(errno==EINTR)continue;return false;}if(n==0)break;sha256_update(&c,b,(size_t)n);}unsigned char h[32];sha256_final(&c,h);if(lseek(fd,0,SEEK_SET)<0)return false;return memcmp(h,FIXED_LAUNCHER_SHA256,sizeof(h))==0;}

static void hold(const char *reason) {
    fprintf(stderr, "%s_HOLD reason=%s\n", MARKER, reason);
    fprintf(stderr, "native_preentry=true\n");
    fprintf(stderr, "root_required=true\n");
    fprintf(stderr, "privileged_receipt_execution_authorized=false\n");
    fprintf(stderr, "public_presale_activation=false\n");
    fprintf(stderr, "funds_movement=false\n");
    exit(2);
}

static bool same_identity(const struct stat *a, const struct stat *b) {
    return a->st_dev == b->st_dev &&
           a->st_ino == b->st_ino &&
           a->st_uid == b->st_uid &&
           a->st_gid == b->st_gid &&
           a->st_mode == b->st_mode &&
           a->st_nlink == b->st_nlink &&
           a->st_size == b->st_size;
}

static void require_safe_directory(const char *pathname, const char *reason) {
    struct stat st;
    if (lstat(pathname, &st) != 0 ||
        !S_ISDIR(st.st_mode) ||
        S_ISLNK(st.st_mode) ||
        st.st_uid != 0 ||
        (st.st_mode & 0022) != 0) {
        hold(reason);
    }
}

static void require_safe_ancestors(const char *pathname, const char *reason) {
    char buffer[PATH_MAX];
    size_t length = strlen(pathname);
    if (length == 0 || length >= sizeof(buffer) || pathname[0] != '/') {
        hold(reason);
    }
    memcpy(buffer, pathname, length + 1);
    require_safe_directory("/", reason);
    for (size_t i = 1; i < length; i++) {
        if (buffer[i] != '/') {
            continue;
        }
        char saved = buffer[i];
        buffer[i] = '\0';
        require_safe_directory(buffer, reason);
        buffer[i] = saved;
    }
}

static bool safe_regular_metadata(const struct stat *st, bool executable) {
    return S_ISREG(st->st_mode) &&
           st->st_uid == 0 &&
           st->st_nlink == 1 &&
           (st->st_mode & 0022) == 0 &&
           (st->st_mode & (S_ISUID | S_ISGID)) == 0 &&
           (!executable || (st->st_mode & 0111) != 0);
}

static bool safe_launcher_metadata(const struct stat *st) {
    return safe_regular_metadata(st, false) && (st->st_mode & 0111) == 0;
}

static void require_self_identity(void) {
    char observed[PATH_MAX];
    ssize_t count = readlink("/proc/self/exe", observed, sizeof(observed) - 1);
    if (count <= 0 || (size_t)count >= sizeof(observed)) {
        hold("native_preentry_self_identity_unreadable");
    }
    observed[count] = '\0';
    if (strcmp(observed, FIXED_SELF) != 0) {
        hold("native_preentry_fixed_path_required");
    }
    require_safe_ancestors(FIXED_SELF, "native_preentry_self_ancestor_untrusted");
    struct stat st;
    if (lstat(FIXED_SELF, &st) != 0 ||
        S_ISLNK(st.st_mode) ||
        !safe_regular_metadata(&st, true)) {
        hold("native_preentry_self_custody_invalid");
    }
}

static int open_trusted_regular(
    const char *pathname,
    bool executable,
    bool launcher,
    const char *reason
) {
    require_safe_ancestors(pathname, reason);
    struct stat before;
    if (lstat(pathname, &before) != 0 || S_ISLNK(before.st_mode)) {
        hold(reason);
    }
    if (launcher) {
        if (!safe_launcher_metadata(&before)) {
            hold(reason);
        }
    } else if (!safe_regular_metadata(&before, executable)) {
        hold(reason);
    }

    int fd = open(pathname, O_RDONLY | O_NOFOLLOW);
    if (fd < 0) {
        hold(reason);
    }
    struct stat opened;
    struct stat visible;
    if (fstat(fd, &opened) != 0 ||
        lstat(pathname, &visible) != 0 ||
        !same_identity(&before, &opened) ||
        !same_identity(&opened, &visible)) {
        close(fd);
        hold(reason);
    }
    if (launcher) {
        if (!safe_launcher_metadata(&opened)) {
            close(fd);
            hold(reason);
        }
    } else if (!safe_regular_metadata(&opened, executable)) {
        close(fd);
        hold(reason);
    }
    return fd;
}

static int self_test(void) {
    if (FIXED_SELF[0] != '/' || FIXED_BASH[0] != '/' || FIXED_LAUNCHER[0] != '/') {
        return 1;
    }
    struct stat synthetic;
    memset(&synthetic, 0, sizeof(synthetic));
    synthetic.st_mode = S_IFREG | 0755;
    synthetic.st_uid = 0;
    synthetic.st_nlink = 1;
    if (!safe_regular_metadata(&synthetic, true)) {
        return 1;
    }
    synthetic.st_mode |= S_ISUID;
    if (safe_regular_metadata(&synthetic, true)) {
        return 1;
    }
    synthetic.st_mode = S_IFREG | 0644;
    synthetic.st_uid = 0;
    synthetic.st_nlink = 1;
    if (!safe_launcher_metadata(&synthetic)) {
        return 1;
    }
    synthetic.st_mode |= 0111;
    if (safe_launcher_metadata(&synthetic)) {
        return 1;
    }
    puts(MARKER "_SELF_TEST=GREEN");
    puts("native_preentry_source_only=true");
    puts("bash_path_fixed=true");
    puts("bash_descriptor_execution=true");
    puts("launcher_path_fixed=true");
    puts("launcher_descriptor_retained=true");
    static const unsigned char abc_expected[32]={0xba,0x78,0x16,0xbf,0x8f,0x01,0xcf,0xea,0x41,0x41,0x40,0xde,0x5d,0xae,0x22,0x23,0xb0,0x03,0x61,0xa3,0x96,0x17,0x7a,0x9c,0xb4,0x10,0xff,0x61,0xf2,0x00,0x15,0xad};unsigned char abc_digest[32];sha256_buffer((const unsigned char*)"abc",3U,abc_digest);if(memcmp(abc_digest,abc_expected,sizeof(abc_digest))!=0)return 1;
    puts("launcher_direct_exec_mode=false");
    puts("launcher_exact_sha256_bound=true");
    puts("setuid_setgid_rejected=true");
    puts("privileged_receipt_execution_authorized=false");
    puts("public_presale_activation=false");
    puts("funds_movement=false");
    return 0;
}

int main(int argc, char **argv) {
    if (argc == 2 && strcmp(argv[1], "--self-test") == 0) {
        return self_test();
    }
    if (geteuid() != 0) {
        hold("native_preentry_root_required");
    }
    require_self_identity();

    int launcher_fd = open_trusted_regular(
        FIXED_LAUNCHER,
        false,
        true,
        "native_preentry_launcher_custody_invalid"
    );
    int bash_fd = open_trusted_regular(
        FIXED_BASH,
        true,
        false,
        "native_preentry_bash_custody_invalid"
    );

    struct stat launcher_stat;if(fstat(launcher_fd,&launcher_stat)!=0||launcher_stat.st_size<0||(size_t)launcher_stat.st_size!=FIXED_LAUNCHER_BYTES){close(bash_fd);close(launcher_fd);hold("native_preentry_launcher_size_mismatch");}
    if(!sha256_fd_matches(launcher_fd)){close(bash_fd);close(launcher_fd);hold("native_preentry_launcher_digest_mismatch");}
    int descriptor_flags = fcntl(launcher_fd, F_GETFD);
    if (descriptor_flags < 0 ||
        fcntl(launcher_fd, F_SETFD, descriptor_flags & ~FD_CLOEXEC) != 0) {
        close(bash_fd);
        close(launcher_fd);
        hold("native_preentry_launcher_descriptor_inheritance_failed");
    }

    char launcher_fd_path[64];
    int printed = snprintf(
        launcher_fd_path,
        sizeof(launcher_fd_path),
        "/proc/self/fd/%d",
        launcher_fd
    );
    if (printed <= 0 || (size_t)printed >= sizeof(launcher_fd_path)) {
        close(bash_fd);
        close(launcher_fd);
        hold("native_preentry_launcher_descriptor_path_invalid");
    }

    size_t forwarded = (size_t)(argc > 1 ? argc - 1 : 0);
    if (forwarded > 128) {
        close(bash_fd);
        close(launcher_fd);
        hold("native_preentry_argument_count_invalid");
    }
    size_t total = forwarded + 5;
    char **next_argv = calloc(total, sizeof(char *));
    if (next_argv == NULL) {
        close(bash_fd);
        close(launcher_fd);
        hold("native_preentry_allocation_failed");
    }
    next_argv[0] = (char *)FIXED_BASH;
    next_argv[1] = (char *)"--noprofile";
    next_argv[2] = (char *)"--norc";
    next_argv[3] = launcher_fd_path;
    for (size_t i = 0; i < forwarded; i++) {
        next_argv[4 + i] = argv[1 + i];
    }
    next_argv[4 + forwarded] = NULL;

    char *const envp[] = {
        (char *)"PATH=/usr/sbin:/usr/bin:/sbin:/bin",
        (char *)"HOME=/root",
        (char *)"LANG=C",
        (char *)"LC_ALL=C",
        (char *)"TZ=UTC",
        (char *)PREENTRY_ENV,
        NULL,
    };

    fexecve(bash_fd, next_argv, envp);
    int saved = errno;
    free(next_argv);
    close(bash_fd);
    close(launcher_fd);
    errno = saved;
    hold("native_preentry_bash_fexecve_failed");
}
