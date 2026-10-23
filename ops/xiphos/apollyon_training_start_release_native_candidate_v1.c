#define _GNU_SOURCE
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <linux/audit.h>
#include <linux/filter.h>
#include <linux/magic.h>
#include <linux/seccomp.h>
#include <poll.h>
#include <signal.h>
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/vfs.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define MARKER "VOID_APOLLYON_TRAINING_START_RELEASE_NATIVE_CANDIDATE_V1"
#define PARENT_RELEASE_BINDING_BLOB_SHA1 "b83b9e72a2c0e139bf677e6d045a0b31100d733a"
#define RELEASE_BINDING_PREFIX "apollyon_training_start_release_binding_v1:"
#define RELEASE_DOMAIN_HEX "c201c621cc904c2e9c0c2527322debc326736b7f5e2c731a1032d2f1d3cb2b16"
#define RELEASE_FD 3
#define RELEASE_FRAME_BYTES 64U
#define RUN_TIMEOUT_MS 1000
#define SELFTEST_TIMEOUT_MS 60
#define MAX_STATUS_BYTES 65536U
#define MAX_GROUPS 64U
#ifndef VOID_APOLLYON_PROC_ROOT
#define VOID_APOLLYON_PROC_ROOT "/proc"
#endif

#if defined(__x86_64__)
#define EXPECTED_AUDIT_ARCH AUDIT_ARCH_X86_64
#define X32_SYSCALL_BIT_V1 0x40000000U
#elif defined(__aarch64__)
#define EXPECTED_AUDIT_ARCH AUDIT_ARCH_AARCH64
#else
#error "unsupported architecture for reviewed no-exec seccomp filter"
#endif

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

typedef struct {
    uid_t uid[4];
    gid_t gid[4];
    gid_t groups[MAX_GROUPS];
    size_t group_count;
    uint64_t cap_inh;
    uint64_t cap_prm;
    uint64_t cap_eff;
    uint64_t cap_bnd;
    uint64_t cap_amb;
    int no_new_privs;
} process_security_v1;

typedef struct {
    int proc_fd;
    int self_fd;
    int fd_dir_fd;
    struct stat proc_stat;
    struct stat self_stat;
    struct stat fd_dir_stat;
} proc_context_v1;

typedef enum {
    FRAME_OK = 0,
    FRAME_SHORT = 1,
    FRAME_EXTRA = 2,
    FRAME_TIMEOUT = 3,
    FRAME_IO = 4,
    FRAME_MISMATCH = 5,
} frame_result_v1;

static void hold(const char *reason) {
    fprintf(stderr, "%s_HOLD\n", MARKER);
    fprintf(stderr, "reason=%s\n", reason);
    fprintf(stderr, "release_frame_verified=false\n");
    fprintf(stderr, "private_release_channel_origin_proven=false\n");
    fprintf(stderr, "release_writer_exclusivity_proven=false\n");
    fprintf(stderr, "trainer_releaser_lineage_proven=false\n");
    fprintf(stderr, "trainer_release_authorized=false\n");
    fprintf(stderr, "trainer_release_performed=false\n");
    fprintf(stderr, "training_execution_authorized=false\n");
    fprintf(stderr, "training_execution_performed=false\n");
    fprintf(stderr, "candidate_weight_mutation_performed=false\n");
    fprintf(stderr, "automatic_retry_authorized=false\n");
    fprintf(stderr, "service_action=false\n");
    fprintf(stderr, "socket_action=false\n");
    fprintf(stderr, "operator_private_key_access=false\n");
    fprintf(stderr, "production_signing=false\n");
    fprintf(stderr, "wallet_access=false\n");
    fprintf(stderr, "transaction_signing=false\n");
    fprintf(stderr, "transaction_broadcast=false\n");
    fprintf(stderr, "funds_movement=false\n");
    exit(2);
}

static uint32_t rotr32(uint32_t x, uint32_t n) {
    return (x >> n) | (x << (32U - n));
}

static void sha256_transform(sha256_ctx *c, const unsigned char d[64]) {
    uint32_t m[64];
    for (size_t i = 0; i < 16; i++) {
        size_t j = i * 4U;
        m[i] = ((uint32_t)d[j] << 24) |
               ((uint32_t)d[j + 1] << 16) |
               ((uint32_t)d[j + 2] << 8) |
               (uint32_t)d[j + 3];
    }
    for (size_t i = 16; i < 64; i++) {
        uint32_t s0 = rotr32(m[i - 15], 7) ^
                      rotr32(m[i - 15], 18) ^
                      (m[i - 15] >> 3);
        uint32_t s1 = rotr32(m[i - 2], 17) ^
                      rotr32(m[i - 2], 19) ^
                      (m[i - 2] >> 10);
        m[i] = m[i - 16] + s0 + m[i - 7] + s1;
    }
    uint32_t a=c->state[0], b=c->state[1], cc=c->state[2], d0=c->state[3];
    uint32_t e=c->state[4], f=c->state[5], g=c->state[6], h=c->state[7];
    for (size_t i = 0; i < 64; i++) {
        uint32_t s1 = rotr32(e,6) ^ rotr32(e,11) ^ rotr32(e,25);
        uint32_t ch = (e & f) ^ ((~e) & g);
        uint32_t t1 = h + s1 + ch + SHA256_K[i] + m[i];
        uint32_t s0 = rotr32(a,2) ^ rotr32(a,13) ^ rotr32(a,22);
        uint32_t maj = (a & b) ^ (a & cc) ^ (b & cc);
        uint32_t t2 = s0 + maj;
        h=g; g=f; f=e; e=d0+t1; d0=cc; cc=b; b=a; a=t1+t2;
    }
    c->state[0]+=a; c->state[1]+=b; c->state[2]+=cc; c->state[3]+=d0;
    c->state[4]+=e; c->state[5]+=f; c->state[6]+=g; c->state[7]+=h;
}

static void sha256_init(sha256_ctx *c) {
    c->datalen=0; c->bitlen=0;
    c->state[0]=0x6a09e667U; c->state[1]=0xbb67ae85U;
    c->state[2]=0x3c6ef372U; c->state[3]=0xa54ff53aU;
    c->state[4]=0x510e527fU; c->state[5]=0x9b05688cU;
    c->state[6]=0x1f83d9abU; c->state[7]=0x5be0cd19U;
}

static void sha256_update(sha256_ctx *c, const unsigned char *d, size_t n) {
    for (size_t i = 0; i < n; i++) {
        c->data[c->datalen++] = d[i];
        if (c->datalen == 64U) {
            sha256_transform(c, c->data);
            c->bitlen += 512U;
            c->datalen = 0;
        }
    }
}

static void sha256_final(sha256_ctx *c, unsigned char out[32]) {
    uint32_t i = c->datalen;
    c->data[i++] = 0x80U;
    if (i > 56U) {
        while (i < 64U) c->data[i++] = 0;
        sha256_transform(c, c->data);
        i = 0;
    }
    while (i < 56U) c->data[i++] = 0;
    c->bitlen += (uint64_t)c->datalen * 8U;
    for (size_t j = 0; j < 8; j++) {
        c->data[63U - j] = (unsigned char)(c->bitlen >> (j * 8U));
    }
    sha256_transform(c, c->data);
    for (size_t j = 0; j < 8; j++) {
        out[j*4U]     = (unsigned char)(c->state[j] >> 24);
        out[j*4U + 1] = (unsigned char)(c->state[j] >> 16);
        out[j*4U + 2] = (unsigned char)(c->state[j] >> 8);
        out[j*4U + 3] = (unsigned char)c->state[j];
    }
}

static int lower_hex_value(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return 10 + (c - 'a');
    return -1;
}

static bool lower_hex_exact(const char *s, size_t n) {
    if (s == NULL || strlen(s) != n) return false;
    for (size_t i = 0; i < n; ++i) {
        if (lower_hex_value(s[i]) < 0) return false;
    }
    return true;
}

static bool release_binding_id_valid(const char *value) {
    size_t prefix = strlen(RELEASE_BINDING_PREFIX);
    return value != NULL &&
           strlen(value) == prefix + 64U &&
           strncmp(value, RELEASE_BINDING_PREFIX, prefix) == 0 &&
           lower_hex_exact(value + prefix, 64U);
}

static bool decimal_id(const char *s, unsigned long *out) {
    if (s == NULL || *s == '\0') return false;
    errno = 0;
    char *end = NULL;
    unsigned long value = strtoul(s, &end, 10);
    if (errno != 0 || end == s || *end != '\0' || value == 0 || value > 65533UL) {
        return false;
    }
    *out = value;
    return true;
}

static bool domain_bytes(unsigned char out[32]) {
    if (strlen(RELEASE_DOMAIN_HEX) != 64U) return false;
    for (size_t i = 0; i < 32U; ++i) {
        int hi = lower_hex_value(RELEASE_DOMAIN_HEX[i*2U]);
        int lo = lower_hex_value(RELEASE_DOMAIN_HEX[i*2U+1U]);
        if (hi < 0 || lo < 0) return false;
        out[i] = (unsigned char)((hi << 4) | lo);
    }
    return true;
}

static bool expected_frame(const char *binding_id, unsigned char out[64]) {
    if (!release_binding_id_valid(binding_id)) return false;
    if (!domain_bytes(out)) return false;
    sha256_ctx c;
    sha256_init(&c);
    sha256_update(&c, (const unsigned char *)binding_id, strlen(binding_id));
    sha256_final(&c, out + 32U);
    return true;
}

static long long monotonic_ms(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0) return -1;
    return (long long)ts.tv_sec * 1000LL + ts.tv_nsec / 1000000LL;
}

static int remaining_ms(long long deadline) {
    long long now = monotonic_ms();
    if (now < 0) return -1;
    if (now >= deadline) return 0;
    long long remain = deadline - now;
    return remain > INT_MAX ? INT_MAX : (int)remain;
}

static frame_result_v1 read_frame_then_eof(
    int fd,
    const unsigned char expected[64],
    int timeout_ms
) {
    long long start = monotonic_ms();
    if (start < 0 || timeout_ms <= 0) return FRAME_IO;
    long long deadline = start + timeout_ms;
    unsigned char observed[64];
    size_t offset = 0;

    while (offset < sizeof(observed)) {
        int wait = remaining_ms(deadline);
        if (wait <= 0) return FRAME_TIMEOUT;
        struct pollfd pfd = {.fd=fd,.events=POLLIN|POLLHUP,.revents=0};
        int prc;
        do {
            prc = poll(&pfd, 1, wait);
        } while (prc < 0 && errno == EINTR);
        if (prc == 0) return FRAME_TIMEOUT;
        if (prc < 0 || (pfd.revents & (POLLERR|POLLNVAL)) != 0) return FRAME_IO;

        ssize_t got;
        do {
            got = read(fd, observed + offset, sizeof(observed) - offset);
        } while (got < 0 && errno == EINTR);
        if (got < 0) return FRAME_IO;
        if (got == 0) return FRAME_SHORT;
        offset += (size_t)got;
    }
    if (memcmp(observed, expected, sizeof(observed)) != 0) return FRAME_MISMATCH;

    for (;;) {
        int wait = remaining_ms(deadline);
        if (wait <= 0) return FRAME_TIMEOUT;
        struct pollfd pfd = {.fd=fd,.events=POLLIN|POLLHUP,.revents=0};
        int prc;
        do {
            prc = poll(&pfd, 1, wait);
        } while (prc < 0 && errno == EINTR);
        if (prc == 0) return FRAME_TIMEOUT;
        if (prc < 0 || (pfd.revents & (POLLERR|POLLNVAL)) != 0) return FRAME_IO;
        unsigned char extra;
        ssize_t got;
        do {
            got = read(fd, &extra, 1U);
        } while (got < 0 && errno == EINTR);
        if (got < 0) return FRAME_IO;
        if (got == 0) return FRAME_OK;
        return FRAME_EXTRA;
    }
}

static bool read_bounded_at(
    int dirfd,
    const char *name,
    unsigned char *buf,
    size_t cap,
    size_t *out_len
) {
    int fd = openat(dirfd, name, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) return false;
    struct statfs fs;
    if (fstatfs(fd, &fs) != 0 || (unsigned long)fs.f_type != (unsigned long)PROC_SUPER_MAGIC) {
        close(fd);
        return false;
    }
    size_t offset = 0;
    for (;;) {
        if (offset == cap) {
            close(fd);
            return false;
        }
        ssize_t got = read(fd, buf + offset, cap - offset);
        if (got < 0) {
            if (errno == EINTR) continue;
            close(fd);
            return false;
        }
        if (got == 0) break;
        offset += (size_t)got;
    }
    if (close(fd) != 0) return false;
    *out_len = offset;
    return true;
}

static bool same_proc_generation(const struct stat *a, const struct stat *b) {
    return a->st_dev == b->st_dev &&
           a->st_ino == b->st_ino &&
           a->st_mode == b->st_mode &&
           a->st_uid == b->st_uid &&
           a->st_gid == b->st_gid;
}

static bool proc_fd_is_procfs(int fd) {
    struct statfs fs;
    return fstatfs(fd, &fs) == 0 &&
           (unsigned long)fs.f_type == (unsigned long)PROC_SUPER_MAGIC;
}

static bool proc_self_link_matches_pid(int proc_fd) {
    char link[64];
    ssize_t n = readlinkat(proc_fd, "self", link, sizeof(link) - 1U);
    if (n <= 0 || (size_t)n >= sizeof(link) - 1U) return false;
    link[n] = '\0';
    errno = 0;
    char *end = NULL;
    long observed = strtol(link, &end, 10);
    return errno == 0 && end != link && *end == '\0' &&
           observed > 1 && observed == (long)getpid();
}

static void proc_context_init(proc_context_v1 *ctx) {
    memset(ctx, 0, sizeof(*ctx));
    ctx->proc_fd = -1;
    ctx->self_fd = -1;
    ctx->fd_dir_fd = -1;
}

static bool close_proc_context(proc_context_v1 *ctx) {
    bool ok = true;
    if (ctx->fd_dir_fd >= 0 && close(ctx->fd_dir_fd) != 0) ok = false;
    if (ctx->self_fd >= 0 && close(ctx->self_fd) != 0) ok = false;
    if (ctx->proc_fd >= 0 && close(ctx->proc_fd) != 0) ok = false;
    proc_context_init(ctx);
    return ok;
}

static bool open_proc_context_root(const char *root, proc_context_v1 *ctx) {
    proc_context_init(ctx);
    ctx->proc_fd = open(root, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
    if (ctx->proc_fd < 0 || !proc_fd_is_procfs(ctx->proc_fd) ||
        fstat(ctx->proc_fd, &ctx->proc_stat) != 0 ||
        !S_ISDIR(ctx->proc_stat.st_mode) ||
        !proc_self_link_matches_pid(ctx->proc_fd)) {
        close_proc_context(ctx);
        return false;
    }

    ctx->self_fd = openat(
        ctx->proc_fd,
        "self",
        O_RDONLY | O_DIRECTORY | O_CLOEXEC
    );
    if (ctx->self_fd < 0 || !proc_fd_is_procfs(ctx->self_fd) ||
        fstat(ctx->self_fd, &ctx->self_stat) != 0 ||
        !S_ISDIR(ctx->self_stat.st_mode)) {
        close_proc_context(ctx);
        return false;
    }

    ctx->fd_dir_fd = openat(
        ctx->self_fd,
        "fd",
        O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW
    );
    if (ctx->fd_dir_fd < 0 || !proc_fd_is_procfs(ctx->fd_dir_fd) ||
        fstat(ctx->fd_dir_fd, &ctx->fd_dir_stat) != 0 ||
        !S_ISDIR(ctx->fd_dir_stat.st_mode)) {
        close_proc_context(ctx);
        return false;
    }
    return true;
}

static bool open_proc_context(proc_context_v1 *ctx) {
    return open_proc_context_root(VOID_APOLLYON_PROC_ROOT, ctx);
}

static bool revalidate_proc_context(const proc_context_v1 *ctx) {
    struct stat proc_now, self_now, fd_now;
    return ctx->proc_fd >= 0 && ctx->self_fd >= 0 && ctx->fd_dir_fd >= 0 &&
           proc_fd_is_procfs(ctx->proc_fd) &&
           proc_fd_is_procfs(ctx->self_fd) &&
           proc_fd_is_procfs(ctx->fd_dir_fd) &&
           proc_self_link_matches_pid(ctx->proc_fd) &&
           fstat(ctx->proc_fd, &proc_now) == 0 &&
           fstat(ctx->self_fd, &self_now) == 0 &&
           fstat(ctx->fd_dir_fd, &fd_now) == 0 &&
           same_proc_generation(&ctx->proc_stat, &proc_now) &&
           same_proc_generation(&ctx->self_stat, &self_now) &&
           same_proc_generation(&ctx->fd_dir_stat, &fd_now);
}

static bool parse_four_ids(
    const char *line,
    const char *label,
    unsigned long out[4]
) {
    size_t prefix = strlen(label);
    if (strncmp(line, label, prefix) != 0) return false;
    const char *p = line + prefix;
    for (size_t i = 0; i < 4U; ++i) {
        while (*p == ' ' || *p == '\t') ++p;
        if (*p < '0' || *p > '9') return false;
        errno = 0;
        char *end = NULL;
        unsigned long value = strtoul(p, &end, 10);
        if (errno != 0 || end == p || value > 65533UL) return false;
        out[i] = value;
        p = end;
    }
    while (*p == ' ' || *p == '\t') ++p;
    return *p == '\0';
}

static bool parse_groups(
    const char *line,
    gid_t groups[MAX_GROUPS],
    size_t *out_count
) {
    const char *label = "Groups:";
    size_t prefix = strlen(label);
    if (strncmp(line, label, prefix) != 0) return false;
    const char *p = line + prefix;
    size_t count = 0;
    for (;;) {
        while (*p == ' ' || *p == '\t') ++p;
        if (*p == '\0') break;
        if (*p < '0' || *p > '9' || count >= MAX_GROUPS) return false;
        errno = 0;
        char *end = NULL;
        unsigned long value = strtoul(p, &end, 10);
        if (errno != 0 || end == p || value > 65533UL) return false;
        groups[count++] = (gid_t)value;
        p = end;
    }
    *out_count = count;
    return true;
}

static bool parse_hex64_line(const char *line, const char *label, uint64_t *out) {
    size_t prefix = strlen(label);
    if (strncmp(line, label, prefix) != 0) return false;
    const char *p = line + prefix;
    while (*p == ' ' || *p == '\t') ++p;
    if (*p == '\0') return false;
    uint64_t value = 0;
    size_t digits = 0;
    for (; *p != '\0'; ++p) {
        int digit = lower_hex_value(*p);
        if (digit < 0 || digits >= 16U) return false;
        value = (value << 4) | (uint64_t)digit;
        ++digits;
    }
    if (digits == 0) return false;
    *out = value;
    return true;
}

static bool parse_flag_line(const char *line, const char *label, int *out) {
    size_t prefix = strlen(label);
    if (strncmp(line, label, prefix) != 0) return false;
    const char *p = line + prefix;
    while (*p == ' ' || *p == '\t') ++p;
    if ((p[0] != '0' && p[0] != '1') || p[1] != '\0') return false;
    *out = p[0] - '0';
    return true;
}

static bool parse_status_text(char *text, process_security_v1 *out) {
    memset(out, 0, sizeof(*out));
    bool have_uid=false,have_gid=false,have_groups=false,have_inh=false;
    bool have_prm=false,have_eff=false,have_bnd=false,have_amb=false,have_nnp=false;

    char *save = NULL;
    for (char *line = strtok_r(text, "\n", &save);
         line != NULL;
         line = strtok_r(NULL, "\n", &save)) {
        unsigned long ids[4];
        if (strncmp(line, "Uid:", 4U) == 0) {
            if (have_uid || !parse_four_ids(line, "Uid:", ids)) return false;
            for (size_t i=0;i<4U;++i) out->uid[i]=(uid_t)ids[i];
            have_uid=true;
        } else if (strncmp(line, "Gid:", 4U) == 0) {
            if (have_gid || !parse_four_ids(line, "Gid:", ids)) return false;
            for (size_t i=0;i<4U;++i) out->gid[i]=(gid_t)ids[i];
            have_gid=true;
        } else if (strncmp(line, "Groups:", 7U) == 0) {
            if (have_groups || !parse_groups(line,out->groups,&out->group_count)) return false;
            have_groups=true;
        } else if (strncmp(line, "CapInh:", 7U) == 0) {
            if (have_inh || !parse_hex64_line(line,"CapInh:",&out->cap_inh)) return false;
            have_inh=true;
        } else if (strncmp(line, "CapPrm:", 7U) == 0) {
            if (have_prm || !parse_hex64_line(line,"CapPrm:",&out->cap_prm)) return false;
            have_prm=true;
        } else if (strncmp(line, "CapEff:", 7U) == 0) {
            if (have_eff || !parse_hex64_line(line,"CapEff:",&out->cap_eff)) return false;
            have_eff=true;
        } else if (strncmp(line, "CapBnd:", 7U) == 0) {
            if (have_bnd || !parse_hex64_line(line,"CapBnd:",&out->cap_bnd)) return false;
            have_bnd=true;
        } else if (strncmp(line, "CapAmb:", 7U) == 0) {
            if (have_amb || !parse_hex64_line(line,"CapAmb:",&out->cap_amb)) return false;
            have_amb=true;
        } else if (strncmp(line, "NoNewPrivs:", 11U) == 0) {
            if (have_nnp || !parse_flag_line(line,"NoNewPrivs:",&out->no_new_privs)) return false;
            have_nnp=true;
        }
    }
    return have_uid&&have_gid&&have_groups&&have_inh&&have_prm&&have_eff&&
           have_bnd&&have_amb&&have_nnp;
}

static bool exact_security_policy(
    const process_security_v1 *s,
    uid_t expected_uid,
    gid_t expected_gid
) {
    if (expected_uid == 0 || expected_gid == 0) return false;
    for (size_t i=0;i<4U;++i) {
        if (s->uid[i] != expected_uid || s->gid[i] != expected_gid) return false;
    }
    if (s->group_count != 0U) return false;
    if (s->cap_inh != 0 || s->cap_prm != 0 || s->cap_eff != 0 ||
        s->cap_bnd != 0 || s->cap_amb != 0) return false;
    return s->no_new_privs == 1;
}

static bool observe_security(
    const proc_context_v1 *proc,
    uid_t expected_uid,
    gid_t expected_gid,
    process_security_v1 *out
) {
    unsigned char raw[MAX_STATUS_BYTES];
    size_t len=0;
    if (!read_bounded_at(proc->self_fd,"status",raw,sizeof(raw)-1U,&len)) return false;
    raw[len]='\0';
    if (!parse_status_text((char *)raw,out)) return false;
    if (!exact_security_policy(out,expected_uid,expected_gid)) return false;

    uid_t ruid=0,euid=0,suid=0;
    gid_t rgid=0,egid=0,sgid=0;
    if (getresuid(&ruid,&euid,&suid)!=0 ||
        getresgid(&rgid,&egid,&sgid)!=0) return false;
    if (out->uid[0]!=ruid || out->uid[1]!=euid || out->uid[2]!=suid ||
        out->gid[0]!=rgid || out->gid[1]!=egid || out->gid[2]!=sgid) {
        return false;
    }
    if (getgroups(0,NULL) != 0) return false;
    if (prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0) != 1) return false;
    return true;
}

static bool read_start_ticks(
    const proc_context_v1 *proc,
    unsigned long long *out
) {
    unsigned char raw[4096];
    size_t len=0;
    if (!read_bounded_at(proc->self_fd,"stat",raw,sizeof(raw)-1U,&len)) return false;
    raw[len]='\0';

    errno=0;
    char *pid_end=NULL;
    long observed_pid=strtol((char *)raw,&pid_end,10);
    char *left=strchr((char *)raw,'(');
    if (
        errno!=0 || pid_end==(char *)raw || left==NULL ||
        *pid_end!=' ' || pid_end+1!=left ||
        observed_pid<=1 || observed_pid!=(long)getpid()
    ) return false;

    char *right=strrchr((char *)raw,')');
    if (right==NULL || right[1]!=' ') return false;
    char *cursor=right+2;
    char *save=NULL;
    unsigned field=3U;
    for(char *token=strtok_r(cursor," ",&save);
        token!=NULL;
        token=strtok_r(NULL," ",&save),++field) {
        if(field!=22U) continue;
        errno=0;
        char *end=NULL;
        unsigned long long value=strtoull(token,&end,10);
        if(errno!=0||end==token||*end!='\0'||value==0ULL) return false;
        *out=value;
        return true;
    }
    return false;
}

static int open_self_pidfd(void) {
#ifdef SYS_pidfd_open
    return (int)syscall(SYS_pidfd_open,getpid(),0U);
#else
    errno=ENOSYS;
    return -1;
#endif
}

static bool pidfd_still_live(int fd) {
    struct pollfd pfd={.fd=fd,.events=POLLIN,.revents=0};
    int rc;
    do {
        rc=poll(&pfd,1,0);
    } while(rc<0&&errno==EINTR);
    return rc==0;
}

static bool environment_clean(void) {
    static const char *const forbidden[] = {
        "LD_PRELOAD","LD_LIBRARY_PATH","LD_AUDIT","LD_DEBUG","LD_PROFILE",
        "LD_ORIGIN_PATH","LD_ASSUME_KERNEL","LD_BIND_NOW","LD_DYNAMIC_WEAK",
        "LD_HWCAP_MASK","LD_POINTER_GUARD","LD_SHOW_AUXV","LD_USE_LOAD_BIAS",
        "GLIBC_TUNABLES","PYTHONPATH","PYTHONHOME","PYTHONSTARTUP",
        "PYTHONINSPECT","PYTHONWARNINGS","PYTHONBREAKPOINT","NODE_OPTIONS",
        "NODE_PATH",NULL
    };
    for(size_t i=0;forbidden[i]!=NULL;++i) {
        if(getenv(forbidden[i])!=NULL) return false;
    }
    return true;
}

static bool required_inherited_fds_present(void) {
    return fcntl(0,F_GETFD)>=0 &&
           fcntl(1,F_GETFD)>=0 &&
           fcntl(2,F_GETFD)>=0 &&
           fcntl(RELEASE_FD,F_GETFD)>=0;
}

static bool inherited_fd_set_exact(const proc_context_v1 *proc) {
    if (!required_inherited_fds_present()) return false;
    int census_fd=fcntl(proc->fd_dir_fd,F_DUPFD_CLOEXEC,4);
    if(census_fd<0) return false;
    DIR *dir=fdopendir(census_fd);
    if(dir==NULL) {
        close(census_fd);
        return false;
    }
    bool ok=true;
    errno=0;
    for(;;) {
        struct dirent *entry=readdir(dir);
        if(entry==NULL) break;
        char *end=NULL;
        long fd=strtol(entry->d_name,&end,10);
        if(end==entry->d_name || *end!='\0') continue;
        if(
            fd==0 || fd==1 || fd==2 || fd==RELEASE_FD ||
            fd==proc->proc_fd || fd==proc->self_fd ||
            fd==proc->fd_dir_fd || fd==census_fd
        ) continue;
        ok=false;
        break;
    }
    if(errno!=0) ok=false;
    if(closedir(dir)!=0) ok=false;
    return ok;
}

static bool release_fd_snapshot(
    const proc_context_v1 *proc,
    struct stat *out
) {
    int flags=fcntl(RELEASE_FD,F_GETFL);
    if(flags<0 || (flags&O_ACCMODE)!=O_RDONLY) return false;
    if(fstat(RELEASE_FD,out)!=0 || !S_ISFIFO(out->st_mode)) return false;

    char link[128];
    ssize_t n=readlinkat(proc->fd_dir_fd,"3",link,sizeof(link)-1U);
    if(n<=0 || (size_t)n>=sizeof(link)-1U) return false;
    link[n]='\0';
    const char *prefix="pipe:[";
    size_t prefix_len=strlen(prefix);
    if(strncmp(link,prefix,prefix_len)!=0 || link[n-1]!=']') return false;
    link[n-1]='\0';
    const char *digits=link+prefix_len;
    if(*digits=='\0') return false;
    errno=0;
    char *end=NULL;
    unsigned long long ino=strtoull(digits,&end,10);
    if(errno!=0 || end==digits || *end!='\0' || ino==0ULL) return false;
    if((uintmax_t)ino!=(uintmax_t)out->st_ino) return false;
    return true;
}

static bool same_pipe_generation(const struct stat *a,const struct stat *b) {
    return S_ISFIFO(a->st_mode)&&S_ISFIFO(b->st_mode)&&
           a->st_dev==b->st_dev&&a->st_ino==b->st_ino&&
           a->st_mode==b->st_mode;
}

static bool same_file_generation(const struct stat *a,const struct stat *b) {
    return a->st_dev==b->st_dev&&a->st_ino==b->st_ino&&
           a->st_mode==b->st_mode&&a->st_uid==b->st_uid&&
           a->st_gid==b->st_gid&&a->st_nlink==b->st_nlink&&
           a->st_size==b->st_size&&
           a->st_mtim.tv_sec==b->st_mtim.tv_sec&&
           a->st_mtim.tv_nsec==b->st_mtim.tv_nsec&&
           a->st_ctim.tv_sec==b->st_ctim.tv_sec&&
           a->st_ctim.tv_nsec==b->st_ctim.tv_nsec;
}

static int install_noexec_seccomp(void) {
    struct sock_filter filter[] = {
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,(uint32_t)offsetof(struct seccomp_data,arch)),
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,EXPECTED_AUDIT_ARCH,1,0),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_KILL_PROCESS),
        BPF_STMT(BPF_LD|BPF_W|BPF_ABS,(uint32_t)offsetof(struct seccomp_data,nr)),
#if defined(__x86_64__)
        /*
         * AUDIT_ARCH_X86_64 also covers the x32 ABI. Fail closed on the
         * namespace bit before ordinary syscall-number dispatch so x32
         * execve/execveat cannot bypass the post-first-entry no-exec barrier.
         */
        BPF_JUMP(BPF_JMP|BPF_JSET|BPF_K,X32_SYSCALL_BIT_V1,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_KILL_PROCESS),
#endif
#ifdef __NR_execve
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_execve,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
#ifdef __NR_execveat
        BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_execveat,0,1),
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|(EPERM&SECCOMP_RET_DATA)),
#endif
        BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ALLOW),
    };
    struct sock_fprog prog={
        .len=(unsigned short)(sizeof(filter)/sizeof(filter[0])),
        .filter=filter,
    };
    if(prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0)!=1) return -1;
    return prctl(PR_SET_SECCOMP,SECCOMP_MODE_FILTER,&prog);
}

static int selftest_security_parser(void) {
    char good[] =
        "Uid:\t1000\t1000\t1000\t1000\n"
        "Gid:\t1000\t1000\t1000\t1000\n"
        "Groups:\t\n"
        "CapInh:\t0000000000000000\n"
        "CapPrm:\t0000000000000000\n"
        "CapEff:\t0000000000000000\n"
        "CapBnd:\t0000000000000000\n"
        "CapAmb:\t0000000000000000\n"
        "NoNewPrivs:\t1\n";
    process_security_v1 s;
    if(!parse_status_text(good,&s)||!exact_security_policy(&s,1000,1000)) return 1;

    char nnp0[] =
        "Uid:\t1000\t1000\t1000\t1000\nGid:\t1000\t1000\t1000\t1000\nGroups:\t\n"
        "CapInh:\t0\nCapPrm:\t0\nCapEff:\t0\nCapBnd:\t0\nCapAmb:\t0\nNoNewPrivs:\t0\n";
    if(!parse_status_text(nnp0,&s)||exact_security_policy(&s,1000,1000)) return 2;

    char cap[] =
        "Uid:\t1000\t1000\t1000\t1000\nGid:\t1000\t1000\t1000\t1000\nGroups:\t\n"
        "CapInh:\t0\nCapPrm:\t0\nCapEff:\t1\nCapBnd:\t0\nCapAmb:\t0\nNoNewPrivs:\t1\n";
    if(!parse_status_text(cap,&s)||exact_security_policy(&s,1000,1000)) return 3;

    char groups[] =
        "Uid:\t1000\t1000\t1000\t1000\nGid:\t1000\t1000\t1000\t1000\nGroups:\t7\n"
        "CapInh:\t0\nCapPrm:\t0\nCapEff:\t0\nCapBnd:\t0\nCapAmb:\t0\nNoNewPrivs:\t1\n";
    if(!parse_status_text(groups,&s)||exact_security_policy(&s,1000,1000)) return 4;
    return 0;
}

static int selftest_frames(void) {
    const char *binding=
        "apollyon_training_start_release_binding_v1:"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    unsigned char frame[64];
    if(!expected_frame(binding,frame)) return 10;
    static const unsigned char expected_binding_sha256[32] = {
        0x01,0xe5,0xd5,0xce,0xea,0x22,0xcc,0x51,
        0x74,0x07,0xe4,0xf3,0x03,0x81,0x6b,0x6d,
        0xd4,0x0d,0xca,0xf7,0x02,0x85,0xa9,0xaa,
        0x90,0x74,0x2d,0xc6,0x81,0xe4,0x13,0x55
    };
    if(memcmp(frame+32U,expected_binding_sha256,32U)!=0) return 33;

    int p[2];
    if(pipe2(p,O_CLOEXEC)!=0) return 11;
    if(write(p[1],frame,64)!=64 || close(p[1])!=0) {close(p[0]);return 12;}
    if(read_frame_then_eof(p[0],frame,SELFTEST_TIMEOUT_MS)!=FRAME_OK){close(p[0]);return 13;}
    close(p[0]);

    if(pipe2(p,O_CLOEXEC)!=0) return 14;
    if(write(p[1],frame,63)!=63 || close(p[1])!=0){close(p[0]);return 15;}
    if(read_frame_then_eof(p[0],frame,SELFTEST_TIMEOUT_MS)!=FRAME_SHORT){close(p[0]);return 16;}
    close(p[0]);

    if(pipe2(p,O_CLOEXEC)!=0) return 17;
    unsigned char extra[65];
    memcpy(extra,frame,64);extra[64]=0x5a;
    if(write(p[1],extra,65)!=65 || close(p[1])!=0){close(p[0]);return 18;}
    if(read_frame_then_eof(p[0],frame,SELFTEST_TIMEOUT_MS)!=FRAME_EXTRA){close(p[0]);return 19;}
    close(p[0]);

    if(pipe2(p,O_CLOEXEC)!=0) return 20;
    if(write(p[1],frame,64)!=64){close(p[0]);close(p[1]);return 21;}
    if(read_frame_then_eof(p[0],frame,20)!=FRAME_TIMEOUT){close(p[0]);close(p[1]);return 22;}
    close(p[1]);close(p[0]);

    if(pipe2(p,O_CLOEXEC)!=0) return 23;
    if(write(p[1],frame,64)!=64){close(p[0]);close(p[1]);return 24;}
    pid_t delayed=fork();
    if(delayed<0){close(p[0]);close(p[1]);return 25;}
    if(delayed==0){
        close(p[0]);
        struct timespec ts={.tv_sec=0,.tv_nsec=20*1000*1000};
        nanosleep(&ts,NULL);
        unsigned char x=0x01;
        ssize_t wrote;
        do {
            wrote=write(p[1],&x,1);
        } while(wrote<0&&errno==EINTR);
        if(wrote!=1){
            close(p[1]);
            _exit(1);
        }
        close(p[1]);
        _exit(0);
    }
    close(p[1]);
    frame_result_v1 delayed_result=read_frame_then_eof(p[0],frame,200);
    close(p[0]);
    int status=0;
    if(waitpid(delayed,&status,0)!=delayed||!WIFEXITED(status)||WEXITSTATUS(status)!=0) return 26;
    if(delayed_result!=FRAME_EXTRA) return 27;

    if(pipe2(p,O_CLOEXEC)!=0) return 28;
    if(write(p[1],frame,64)!=64){close(p[0]);close(p[1]);return 29;}
    pid_t holder=fork();
    if(holder<0){close(p[0]);close(p[1]);return 30;}
    if(holder==0){
        close(p[0]);
        struct timespec ts={.tv_sec=0,.tv_nsec=150*1000*1000};
        nanosleep(&ts,NULL);
        close(p[1]);
        _exit(0);
    }
    close(p[1]);
    frame_result_v1 held_result=read_frame_then_eof(p[0],frame,30);
    close(p[0]);
    status=0;
    if(waitpid(holder,&status,0)!=holder||!WIFEXITED(status)||WEXITSTATUS(status)!=0) return 31;
    if(held_result!=FRAME_TIMEOUT) return 32;
    return 0;
}

static int selftest_noexec(void) {
    pid_t child=fork();
    if(child<0) return 40;
    if(child==0){
        if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0)!=0) _exit(41);
        if(install_noexec_seccomp()!=0) _exit(42);
        execl("/bin/true","true",(char *)NULL);
        _exit(errno==EPERM?0:43);
    }
    int status=0;
    if(waitpid(child,&status,0)!=child||!WIFEXITED(status)||WEXITSTATUS(status)!=0) return 44;
    return 0;
}

static int selftest_x32_namespace(void) {
#if defined(__x86_64__)
    pid_t child=fork();
    if(child<0) return 45;
    if(child==0){
        if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0)!=0) _exit(46);
        if(install_noexec_seccomp()!=0) _exit(47);
        (void)syscall((long)(X32_SYSCALL_BIT_V1 | (uint32_t)__NR_getpid));
        _exit(48);
    }
    int status=0;
    if(waitpid(child,&status,0)!=child) return 49;
    if(!WIFSIGNALED(status)||WTERMSIG(status)!=SIGSYS) return 50;
#endif
    return 0;
}

static int selftest_environment(void) {
    if(setenv("LD_PRELOAD","/tmp/forbidden.so",1)!=0) return 50;
    if(environment_clean()) return 51;
    if(unsetenv("LD_PRELOAD")!=0) return 52;
    return 0;
}

static int self_test(void) {
    if(strcmp(PARENT_RELEASE_BINDING_BLOB_SHA1,
              "b83b9e72a2c0e139bf677e6d045a0b31100d733a")!=0) return 60;
    if(!lower_hex_exact(PARENT_RELEASE_BINDING_BLOB_SHA1,40U)) return 61;
    if(selftest_security_parser()!=0) return 62;
    int frame_rc=selftest_frames();
    if(frame_rc!=0) {
        fprintf(stderr,"apollyon_release_native_selftest_frames_rc=%d\n",frame_rc);
        return 63;
    }
    if(selftest_noexec()!=0) return 64;
    if(selftest_x32_namespace()!=0) return 73;
    if(selftest_environment()!=0) return 65;
    int self_pidfd=open_self_pidfd();
    if(self_pidfd<0) return 66;
    if(!pidfd_still_live(self_pidfd)) {
        close(self_pidfd);
        return 67;
    }
    if(close(self_pidfd)!=0) return 68;

    proc_context_v1 proc;
    if(!open_proc_context(&proc)) return 69;
    if(!revalidate_proc_context(&proc)) {
        close_proc_context(&proc);
        return 70;
    }
    if(!close_proc_context(&proc)) return 71;

    proc_context_v1 fake_proc;
    if(open_proc_context_root("/",&fake_proc)) {
        close_proc_context(&fake_proc);
        return 72;
    }

    puts(MARKER "_SELF_TEST_GREEN");
    puts("parent_release_binding_blob_bound=true");
    puts("fixed_release_fd=3");
    puts("release_fd_read_only_pipe_required=true");
    puts("release_fd_anonymous_pipe_identity_required=true");
    puts("exact_64_byte_frame_then_eof_required=true");
    puts("release_binding_sha256_known_vector=true");
    puts("short_frame_rejected=true");
    puts("extra_frame_rejected=true");
    puts("missing_eof_rejected=true");
    puts("delayed_extra_rejected=true");
    puts("held_duplicate_writer_timeout_rejected=true");
    puts("exact_uid_gid_slots_required=true");
    puts("supplementary_groups_empty_required=true");
    puts("no_new_privileges_required=true");
    puts("retained_self_pidfd_required=true");
    puts("retained_self_pidfd_liveness_revalidated=true");
    puts("procfs_super_magic_required=true");
    puts("procfs_self_pid_bound_to_getpid=true");
    puts("procfs_self_generation_retained=true");
    puts("fake_proc_root_rejected=true");
    puts("all_capability_sets_zero_required=true");
    puts("hostile_nnp_zero_rejected=true");
    puts("hostile_nonzero_capability_rejected=true");
    puts("hostile_supplementary_group_rejected=true");
    puts("post_first_entry_exec_forbidden=true");
    puts("x32_syscall_namespace_rejected=true");
    puts("hostile_loader_runtime_environment_rejected=true");
    puts("private_release_channel_origin_proven=false");
    puts("release_writer_exclusivity_proven=false");
    puts("trainer_releaser_lineage_proven=false");
    puts("trainer_release_authorized=false");
    puts("trainer_release_performed=false");
    puts("training_execution_authorized=false");
    puts("training_execution_performed=false");
    puts("candidate_weight_mutation_performed=false");
    puts("automatic_retry_authorized=false");
    puts("filesystem_write=false");
    puts("service_action=false");
    puts("socket_action=false");
    puts("production_signing=false");
    puts("transaction_broadcast=false");
    puts("funds_movement=false");
    return 0;
}

static void run_gate(
    const char *binding_id,
    uid_t expected_uid,
    gid_t expected_gid
) {
    if(getuid()==0 || geteuid()==0) hold("release_native_root_forbidden");
    if(!environment_clean()) hold("release_native_environment_not_clean");
    if(!required_inherited_fds_present()) {
        hold("release_native_inherited_fd_set_invalid");
    }

    proc_context_v1 proc;
    if(!open_proc_context(&proc)) {
        hold("release_native_procfs_context_invalid");
    }
    if(!inherited_fd_set_exact(&proc)) {
        hold("release_native_inherited_fd_set_invalid");
    }

    struct stat pipe_before;
    if(!release_fd_snapshot(&proc,&pipe_before)) {
        hold("release_native_fd3_not_read_only_pipe");
    }

    process_security_v1 sec_before;
    if(!observe_security(&proc,expected_uid,expected_gid,&sec_before)) {
        hold("release_native_security_policy_invalid");
    }

    unsigned long long start_before=0;
    if(!read_start_ticks(&proc,&start_before)) {
        hold("release_native_start_ticks_unavailable");
    }

    int pidfd=open_self_pidfd();
    if(pidfd<0) hold("release_native_pidfd_open_failed");
    if(!pidfd_still_live(pidfd)) {
        close(pidfd);
        hold("release_native_pidfd_not_live_before_frame");
    }

    int self_fd=openat(proc.self_fd,"exe",O_RDONLY|O_CLOEXEC);
    if(self_fd<0) {
        close(pidfd);
        hold("release_native_self_exe_open_failed");
    }
    struct stat self_before;
    if(fstat(self_fd,&self_before)!=0 || !S_ISREG(self_before.st_mode)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_self_exe_invalid");
    }

    if(!revalidate_proc_context(&proc)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_procfs_generation_changed_before_frame");
    }

    if(install_noexec_seccomp()!=0) {
        close(self_fd);
        close(pidfd);
        hold("release_native_noexec_barrier_failed");
    }

    if(!revalidate_proc_context(&proc)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_procfs_generation_changed_after_seccomp");
    }

    process_security_v1 sec_pre_frame;
    if(!observe_security(&proc,expected_uid,expected_gid,&sec_pre_frame)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_security_revalidation_failed");
    }

    unsigned char expected[64];
    if(!expected_frame(binding_id,expected)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_binding_id_invalid");
    }
    frame_result_v1 fr=read_frame_then_eof(RELEASE_FD,expected,RUN_TIMEOUT_MS);
    if(fr!=FRAME_OK) {
        close(self_fd);
        close(pidfd);
        if(fr==FRAME_SHORT) hold("release_native_frame_short");
        if(fr==FRAME_EXTRA) hold("release_native_frame_extra");
        if(fr==FRAME_TIMEOUT) hold("release_native_frame_or_eof_timeout");
        if(fr==FRAME_MISMATCH) hold("release_native_frame_digest_mismatch");
        hold("release_native_frame_io_failed");
    }

    if(!revalidate_proc_context(&proc)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_procfs_generation_changed_after_frame");
    }

    process_security_v1 sec_after;
    if(!observe_security(&proc,expected_uid,expected_gid,&sec_after)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_security_post_frame_revalidation_failed");
    }
    if(memcmp(&sec_before,&sec_pre_frame,sizeof(sec_before))!=0 ||
       memcmp(&sec_before,&sec_after,sizeof(sec_before))!=0) {
        close(self_fd);
        close(pidfd);
        hold("release_native_security_generation_changed");
    }

    unsigned long long start_after=0;
    if(!read_start_ticks(&proc,&start_after) || start_after!=start_before) {
        close(self_fd);
        close(pidfd);
        hold("release_native_process_generation_changed");
    }
    if(!pidfd_still_live(pidfd)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_pidfd_not_live_after_frame");
    }

    struct stat pipe_after;
    if(!release_fd_snapshot(&proc,&pipe_after) ||
       !same_pipe_generation(&pipe_before,&pipe_after)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_pipe_generation_changed");
    }

    struct stat self_after;
    if(fstat(self_fd,&self_after)!=0 ||
       !same_file_generation(&self_before,&self_after)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_self_generation_changed");
    }

    if(!revalidate_proc_context(&proc)) {
        close(self_fd);
        close(pidfd);
        hold("release_native_procfs_generation_changed_at_completion");
    }

    if(close(self_fd)!=0) {
        close(pidfd);
        hold("release_native_self_exe_close_failed");
    }
    if(close(pidfd)!=0) hold("release_native_pidfd_close_failed");
    if(!close_proc_context(&proc)) {
        hold("release_native_procfs_close_failed");
    }

    printf("%s\n",MARKER);
    printf("mode=run\n");
    printf("release_gate_shape_verified=true\n");
    printf("release_frame_verified=true\n");
    printf("release_frame_bytes=64\n");
    printf("release_eof_verified=true\n");
    printf("release_pipe_dev=%ju\n",(uintmax_t)pipe_after.st_dev);
    printf("release_pipe_ino=%ju\n",(uintmax_t)pipe_after.st_ino);
    printf("release_pipe_generation_stable=true\n");
    printf("release_pipe_anonymous_identity_verified=true\n");
    printf("trainer_process_start_ticks=%llu\n",start_after);
    printf("trainer_process_generation_stable=true\n");
    printf("trainer_pidfd_retained=true\n");
    printf("trainer_pidfd_liveness_revalidated=true\n");
    printf("trainer_security_policy_revalidated=true\n");
    printf("procfs_provenance_verified=true\n");
    printf("procfs_self_pid_bound_to_getpid=true\n");
    printf("procfs_generation_revalidated=true\n");
    printf("post_first_entry_exec_forbidden=true\n");
    printf("x32_syscall_namespace_rejected=true\n");
    printf("private_release_channel_origin_proven=false\n");
    printf("release_writer_exclusivity_proven=false\n");
    printf("trainer_releaser_lineage_proven=false\n");
    printf("trainer_release_authorized=false\n");
    printf("trainer_release_performed=false\n");
    printf("training_execution_authorized=false\n");
    printf("training_execution_performed=false\n");
    printf("candidate_weight_mutation_performed=false\n");
    printf("automatic_retry_authorized=false\n");
    printf("filesystem_write=false\n");
    printf("service_action=false\n");
    printf("socket_action=false\n");
    printf("operator_private_key_access=false\n");
    printf("production_signing=false\n");
    printf("wallet_access=false\n");
    printf("transaction_signing=false\n");
    printf("transaction_broadcast=false\n");
    printf("funds_movement=false\n");
    printf("next_gate=apollyon_training_start_release_releaser_integration_v1\n");
}

int main(int argc,char **argv) {
    if(argc==2 && strcmp(argv[1],"--self-test")==0) return self_test();
    if(argc!=8 ||
       strcmp(argv[1],"--run")!=0 ||
       strcmp(argv[2],"--release-binding-id")!=0 ||
       strcmp(argv[4],"--expected-uid")!=0 ||
       strcmp(argv[6],"--expected-gid")!=0) {
        hold("release_native_arguments_invalid");
    }
    unsigned long uid_raw=0,gid_raw=0;
    if(!decimal_id(argv[5],&uid_raw)||!decimal_id(argv[7],&gid_raw)) {
        hold("release_native_expected_identity_invalid");
    }
    run_gate(argv[3],(uid_t)uid_raw,(gid_t)gid_raw);
    return 0;
}
