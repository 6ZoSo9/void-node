#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <stdbool.h>
#include <stdint.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V2"
#define POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1"
#define PARENT_PROOF_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_PARENT_PROOF_V1"

#ifndef VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT
#define VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT "/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1"
#endif
#ifndef VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_SOURCE_ROOT
#define VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_SOURCE_ROOT VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT "/source"
#endif
#ifndef VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INPUT_ROOT
#define VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INPUT_ROOT VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT "/input"
#endif
#ifndef VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_PYTHON
#define VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_PYTHON "/usr/bin/python3"
#endif

#define FIXED_SELF VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT "/bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1"
#define FIXED_POLICY VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT "/policy-v1.conf"
#define FIXED_INSTALLER VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_SOURCE_ROOT "/ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"

#define FIXED_NATIVE_INPUT VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INPUT_ROOT "/void_buy_void_epoch2_dormant_binder_native_candidate_v2"

#define FIXED_PYTHON VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_PYTHON
#define FIXED_DEVNULL "/dev/null"

#ifndef VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_SHA256
#error "exact dormant-binder installer SHA-256 must be supplied at build time"
#endif
#ifndef VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_BYTES
#error "exact dormant-binder installer byte count must be supplied at build time"
#endif
#ifndef VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_SHA256
#error "exact dormant-binder native candidate SHA-256 must be supplied at build time"
#endif
#ifndef VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_BYTES
#error "exact dormant-binder native candidate byte count must be supplied at build time"
#endif
#ifndef VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_APPLY_CONFIRM
#error "exact installer confirmation token must be supplied at build time"
#endif

#define APPLY_CONFIRM VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_APPLY_CONFIRM
#define MAX_POLICY_BYTES 1024U
#define MAX_PYTHON_BYTES (512U * 1024U * 1024U)
#define MAX_SOURCE_BYTES (2U * 1024U * 1024U)
#define PLAN_PREFIX "voidbuye2dormantbinderinstall2_"

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
    0x650a7354U,0x766a0abbU,0x81c2c92e,0x92722c85U,
    0xa2bfe8a1U,0xa81a664bU,0xc24b8b70U,0xc76c51a3U,
    0xd192e819U,0xd6990624U,0xf40e3585U,0x106aa070U,
    0x19a4c116U,0x1e376c08U,0x2748774cU,0x34b0bcb5U,
    0x391c0cb3U,0x4ed8aa4aU,0x5b9cca4fU,0x682e6ff3U,
    0x748f82eeU,0x78a5636fU,0x84c87814U,0x8cc70208U,
    0x90befffaU,0xa4506cebU,0xbef9a3f7U,0xc67178f2U
};

typedef enum {
    OP_NONE = 0,
    OP_INSTALLER_PLAN = 1,
    OP_INSTALLER_APPLY = 2,
} operation_v1;

typedef struct {
    operation_v1 operation;
    char expected_head[41];
    const char *expected_plan_id;
} request_v1;

typedef struct {
    char python_sha256[65];
    size_t python_bytes;
} policy_v1;

typedef struct {
    int fd;
    struct stat opened;
    char path[PATH_MAX];
} retained_file_v1;

typedef struct {
    int fd;
    struct stat requested;
    struct stat opened;
    char canonical[PATH_MAX];
} retained_python_v1;

static operation_v1 receipt_operation = OP_NONE;
static bool receipt_child_created = false;

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

static void hold(const char *reason) {
    fprintf(stderr, "%s_HOLD reason=%s\n", MARKER, reason);
    fprintf(
        stderr,
        "child_process_created=%s\n",
        receipt_child_created ? "true" : "false"
    );
    if (receipt_child_created && receipt_operation == OP_INSTALLER_APPLY) {
        fprintf(stderr, "installer_apply_state=unknown_or_partial_if_child_created\n");
    } else {
        fprintf(stderr, "installer_apply_performed=false\n");
    }
    fprintf(stderr, "privileged_first_entry_authenticated=false\n");
    fprintf(stderr, "credential_content_access=false\n");
    fprintf(stderr, "private_key_access=false\n");
    fprintf(stderr, "signing=false\n");
    fprintf(stderr, "transaction=false\n");
    fprintf(stderr, "payment_acceptance=false\n");
    fprintf(stderr, "public_presale_activation=false\n");
    fprintf(stderr, "wc_void_market_activation=false\n");
    fprintf(stderr, "funds_movement=false\n");
    exit(2);
}

static bool lower_hex_exact(const char *s, size_t n) {
    if (s == NULL || strlen(s) != n) return false;
    for (size_t i = 0; i < n; i++) {
        if (!((s[i] >= '0' && s[i] <= '9') ||
              (s[i] >= 'a' && s[i] <= 'f'))) return false;
    }
    return true;
}

static bool valid_plan_id(const char *s) {
    const size_t prefix_len = sizeof(PLAN_PREFIX) - 1U;
    if (s == NULL || strlen(s) != prefix_len + 64U) return false;
    if (strncmp(s, PLAN_PREFIX, prefix_len) != 0) return false;
    return lower_hex_exact(s + prefix_len, 64U);
}

static bool decimal_size(const char *s, size_t maximum, size_t *out) {
    if (s == NULL || *s == '\0') return false;
    size_t value = 0;
    for (const char *p = s; *p != '\0'; p++) {
        if (*p < '0' || *p > '9') return false;
        size_t digit = (size_t)(*p - '0');
        if (value > (maximum - digit) / 10U) return false;
        value = value * 10U + digit;
    }
    if (value == 0 || value > maximum) return false;
    *out = value;
    return true;
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

static bool same_generation_times(const struct stat *a, const struct stat *b) {
    return a->st_mtim.tv_sec == b->st_mtim.tv_sec &&
           a->st_mtim.tv_nsec == b->st_mtim.tv_nsec &&
           a->st_ctim.tv_sec == b->st_ctim.tv_sec &&
           a->st_ctim.tv_nsec == b->st_ctim.tv_nsec;
}

static void require_devnull_stdin(void) {
    struct stat stdin_st, null_st;
    if (
        fstat(STDIN_FILENO, &stdin_st) != 0 ||
        lstat(FIXED_DEVNULL, &null_st) != 0 ||
        !S_ISCHR(stdin_st.st_mode) ||
        !S_ISCHR(null_st.st_mode) ||
        stdin_st.st_dev != null_st.st_dev ||
        stdin_st.st_ino != null_st.st_ino ||
        stdin_st.st_rdev != null_st.st_rdev
    ) {
        hold("dormant_binder_installer_first_entry_stdin_python_source_forbidden");
    }
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
    if (length == 0 || length >= sizeof(buffer) || pathname[0] != '/') hold(reason);
    memcpy(buffer, pathname, length + 1U);
    require_safe_directory("/", reason);
    for (size_t i = 1; i < length; i++) {
        if (buffer[i] != '/') continue;
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

static retained_file_v1 open_retained_regular(
    const char *pathname,
    bool executable,
    const char *reason
) {
    retained_file_v1 result;
    memset(&result, 0, sizeof(result));
    result.fd = -1;
    if (strlen(pathname) >= sizeof(result.path)) hold(reason);
    memcpy(result.path, pathname, strlen(pathname) + 1U);
    require_safe_ancestors(pathname, reason);

    struct stat before;
    if (lstat(pathname, &before) != 0 ||
        S_ISLNK(before.st_mode) ||
        !safe_regular_metadata(&before, executable)) hold(reason);

    int fd = open(pathname, O_RDONLY | O_NOFOLLOW);
    if (fd < 0) hold(reason);
    struct stat opened, visible;
    if (fstat(fd, &opened) != 0 ||
        lstat(pathname, &visible) != 0 ||
        !same_identity(&before, &opened) ||
        !same_identity(&opened, &visible) ||
        !safe_regular_metadata(&opened, executable)) {
        close(fd);
        hold(reason);
    }
    result.fd = fd;
    result.opened = opened;
    return result;
}

static void revalidate_retained_regular(
    const retained_file_v1 *file,
    bool executable,
    const char *reason
) {
    struct stat opened, visible;
    if (fstat(file->fd, &opened) != 0 ||
        lstat(file->path, &visible) != 0 ||
        !same_identity(&file->opened, &opened) ||
        !same_generation_times(&file->opened, &opened) ||
        !same_identity(&opened, &visible) ||
        !same_generation_times(&opened, &visible) ||
        !safe_regular_metadata(&opened, executable)) hold(reason);
}

static retained_python_v1 open_retained_python(const char *reason) {
    retained_python_v1 result;
    memset(&result, 0, sizeof(result));
    result.fd = -1;

    require_safe_ancestors(FIXED_PYTHON, reason);
    if (lstat(FIXED_PYTHON, &result.requested) != 0 ||
        !(S_ISREG(result.requested.st_mode) || S_ISLNK(result.requested.st_mode)) ||
        result.requested.st_uid != 0 ||
        result.requested.st_nlink != 1) hold(reason);

    if (realpath(FIXED_PYTHON, result.canonical) == NULL ||
        result.canonical[0] != '/') hold(reason);
    require_safe_ancestors(result.canonical, reason);

    struct stat before;
    if (lstat(result.canonical, &before) != 0 ||
        S_ISLNK(before.st_mode) ||
        !safe_regular_metadata(&before, true)) hold(reason);

    int fd = open(result.canonical, O_RDONLY | O_NOFOLLOW);
    if (fd < 0) hold(reason);
    struct stat opened, visible;
    if (fstat(fd, &opened) != 0 ||
        lstat(result.canonical, &visible) != 0 ||
        !same_identity(&before, &opened) ||
        !same_identity(&opened, &visible)) {
        close(fd);
        hold(reason);
    }
    result.fd = fd;
    result.opened = opened;
    return result;
}

static void revalidate_retained_python(
    const retained_python_v1 *python,
    const char *reason
) {
    struct stat requested, opened, visible;
    char canonical[PATH_MAX];
    if (lstat(FIXED_PYTHON, &requested) != 0 ||
        !same_identity(&python->requested, &requested) ||
        realpath(FIXED_PYTHON, canonical) == NULL ||
        strcmp(canonical, python->canonical) != 0 ||
        fstat(python->fd, &opened) != 0 ||
        lstat(python->canonical, &visible) != 0 ||
        !same_identity(&python->opened, &opened) ||
        !same_generation_times(&python->opened, &opened) ||
        !same_identity(&opened, &visible) ||
        !same_generation_times(&opened, &visible)) hold(reason);
}

static void sha256_fd_hex(int fd, char out[65]) {
    if (lseek(fd, 0, SEEK_SET) < 0) hold("dormant_binder_installer_first_entry_digest_seek_failed");
    sha256_ctx c;
    sha256_init(&c);
    unsigned char buffer[8192];
    for (;;) {
        ssize_t n = read(fd, buffer, sizeof(buffer));
        if (n < 0) {
            if (errno == EINTR) continue;
            hold("dormant_binder_installer_first_entry_digest_read_failed");
        }
        if (n == 0) break;
        sha256_update(&c, buffer, (size_t)n);
    }
    unsigned char digest[32];
    sha256_final(&c, digest);
    static const char hex[] = "0123456789abcdef";
    for (size_t i = 0; i < 32; i++) {
        out[i*2U] = hex[digest[i] >> 4];
        out[i*2U+1U] = hex[digest[i] & 0x0fU];
    }
    out[64] = '\0';
    if (lseek(fd, 0, SEEK_SET) < 0) hold("dormant_binder_installer_first_entry_digest_rewind_failed");
}

static void require_digest_size(
    int fd,
    const char *sha256,
    size_t bytes,
    const char *reason
) {
    struct stat st;
    if (fstat(fd, &st) != 0 ||
        st.st_size < 0 ||
        (uintmax_t)st.st_size != (uintmax_t)bytes) hold(reason);
    char observed[65];
    sha256_fd_hex(fd, observed);
    if (strcmp(observed, sha256) != 0) hold(reason);
}

static policy_v1 read_policy(retained_file_v1 *retained) {
    *retained = open_retained_regular(
        FIXED_POLICY, false, "dormant_binder_installer_first_entry_policy_custody_invalid"
    );
    if (retained->opened.st_size <= 0 ||
        (uintmax_t)retained->opened.st_size > MAX_POLICY_BYTES) {
        hold("dormant_binder_installer_first_entry_policy_size_invalid");
    }
    size_t n = (size_t)retained->opened.st_size;
    char *buffer = calloc(n + 1U, 1U);
    if (buffer == NULL) hold("dormant_binder_installer_first_entry_policy_allocation_failed");
    size_t offset = 0;
    while (offset < n) {
        ssize_t got = read(retained->fd, buffer + offset, n - offset);
        if (got < 0) {
            if (errno == EINTR) continue;
            free(buffer);
            hold("dormant_binder_installer_first_entry_policy_read_failed");
        }
        if (got == 0) {
            free(buffer);
            hold("dormant_binder_installer_first_entry_policy_short_read");
        }
        offset += (size_t)got;
    }
    if (buffer[n - 1U] != '\n') {
        free(buffer);
        hold("dormant_binder_installer_first_entry_policy_final_newline_required");
    }
    revalidate_retained_regular(retained, false, "dormant_binder_installer_first_entry_policy_changed");

    char *save = NULL;
    char *lines[3];
    size_t count = 0;
    for (char *line = strtok_r(buffer, "\n", &save);
         line != NULL;
         line = strtok_r(NULL, "\n", &save)) {
        if (count >= 3U) {
            free(buffer);
            hold("dormant_binder_installer_first_entry_policy_line_count_invalid");
        }
        lines[count++] = line;
    }
    if (count != 3U ||
        strcmp(lines[0], "schema=" POLICY_SCHEMA) != 0 ||
        strncmp(lines[1], "python_sha256=", 14U) != 0 ||
        strncmp(lines[2], "python_bytes=", 13U) != 0) {
        free(buffer);
        hold("dormant_binder_installer_first_entry_policy_schema_invalid");
    }

    const char *python_sha = lines[1] + 14U;
    const char *python_bytes = lines[2] + 13U;
    policy_v1 policy;
    memset(&policy, 0, sizeof(policy));
    if (!lower_hex_exact(python_sha, 64U) ||
        !decimal_size(python_bytes, MAX_PYTHON_BYTES, &policy.python_bytes)) {
        free(buffer);
        hold("dormant_binder_installer_first_entry_policy_value_invalid");
    }
    memcpy(policy.python_sha256, python_sha, 65U);
    free(buffer);
    return policy;
}

static request_v1 parse_request(int argc, char **argv) {
    request_v1 request;
    memset(&request, 0, sizeof(request));

    if (
        argc == 4 &&
        strcmp(argv[1], "--installer-plan") == 0 &&
        strcmp(argv[2], "--expected-head") == 0 &&
        lower_hex_exact(argv[3], 40U)
    ) {
        request.operation = OP_INSTALLER_PLAN;
        snprintf(request.expected_head, sizeof(request.expected_head), "%s", argv[3]);
        return request;
    }
    if (
        argc == 8 &&
        strcmp(argv[1], "--installer-apply") == 0 &&
        strcmp(argv[2], "--expected-head") == 0 &&
        lower_hex_exact(argv[3], 40U) &&
        strcmp(argv[4], "--expected-plan-id") == 0 &&
        valid_plan_id(argv[5]) &&
        strcmp(argv[6], "--confirm") == 0 &&
        strcmp(argv[7], APPLY_CONFIRM) == 0
    ) {
        request.operation = OP_INSTALLER_APPLY;
        snprintf(request.expected_head, sizeof(request.expected_head), "%s", argv[3]);
        request.expected_plan_id = argv[5];
        return request;
    }

    hold("dormant_binder_installer_first_entry_arguments_invalid");
    return request;
}

static const char *operation_name(operation_v1 operation) {
    if (operation == OP_INSTALLER_PLAN) return "installer_plan";
    if (operation == OP_INSTALLER_APPLY) return "installer_apply";
    return "unknown";
}

static void clear_cloexec_or_exit(int fd) {
    int flags = fcntl(fd, F_GETFD);
    if (flags < 0 || fcntl(fd, F_SETFD, flags & ~FD_CLOEXEC) != 0) _exit(126);
}

static bool write_all(int fd, const unsigned char *data, size_t length) {
    size_t offset = 0;
    while (offset < length) {
        ssize_t wrote = write(fd, data + offset, length - offset);
        if (wrote < 0) {
            if (errno == EINTR) continue;
            return false;
        }
        if (wrote == 0) return false;
        offset += (size_t)wrote;
    }
    return true;
}

static bool read_process_start_ticks(pid_t pid, unsigned long long *out) {
    char pathname[64];
    int printed = snprintf(pathname, sizeof(pathname), "/proc/%ld/stat", (long)pid);
    if (printed <= 0 || (size_t)printed >= sizeof(pathname)) return false;
    int fd = open(pathname, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) return false;
    char buffer[4096];
    ssize_t count;
    do {
        count = read(fd, buffer, sizeof(buffer) - 1U);
    } while (count < 0 && errno == EINTR);
    close(fd);
    if (count <= 0 || (size_t)count >= sizeof(buffer)) return false;
    buffer[count] = '\0';
    char *right = strrchr(buffer, ')');
    if (right == NULL || right[1] != ' ') return false;
    char *cursor = right + 2;
    char *save = NULL;
    unsigned field = 3U;
    for (char *token = strtok_r(cursor, " ", &save);
         token != NULL;
         token = strtok_r(NULL, " ", &save), field++) {
        if (field != 22U) continue;
        errno = 0;
        char *end = NULL;
        unsigned long long value = strtoull(token, &end, 10);
        if (errno != 0 || end == token || *end != '\0' || value == 0ULL) {
            return false;
        }
        *out = value;
        return true;
    }
    return false;
}

static int self_test(void) {
    static const unsigned char expected[32] = {
        0xba,0x78,0x16,0xbf,0x8f,0x01,0xcf,0xea,
        0x41,0x41,0x40,0xde,0x5d,0xae,0x22,0x23,
        0xb0,0x03,0x61,0xa3,0x96,0x17,0x7a,0x9c,
        0xb4,0x10,0xff,0x61,0xf2,0x00,0x15,0xad
    };
    sha256_ctx ctx;
    sha256_init(&ctx);
    sha256_update(&ctx, (const unsigned char *)"abc", 3U);
    unsigned char digest[32];
    sha256_final(&ctx, digest);
    if (memcmp(digest, expected, sizeof(digest)) != 0) return 1;
    if (!lower_hex_exact("0123456789abcdef0123456789abcdef01234567", 40U)) return 1;
    if (lower_hex_exact("0123456789ABCDEF0123456789ABCDEF01234567", 40U)) return 1;
    if (!lower_hex_exact(
        VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_SHA256, 64U
    )) return 1;
    if (!lower_hex_exact(
        VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_SHA256, 64U
    )) return 1;
    puts(MARKER "_SELF_TEST_GREEN");
    puts("source_only=true");
    puts("static_native_first_instruction_required=true");
    puts("fixed_plan_apply_operation_allowlist=true");
    puts("caller_stdin_never_python_source=true");
    puts("caller_stdin_must_be_devnull=true");
    puts("installer_generation_compile_bound=true");
    puts("native_candidate_generation_compile_bound=true");
    puts("expected_head_compile_bound=false");
    puts("runtime_expected_head_strict_lowercase_hex=true");
    puts("runtime_expected_head_forwarded_unchanged=true");
    puts("apply_confirmation_compile_bound=true");
    puts("python_generation_root_policy_bound=true");
    puts("installer_descriptor_retained=true");
    puts("native_candidate_descriptor_retained=true");
    puts("native_candidate_descriptor_passed_to_installer=true");
    puts("private_parent_proof_fd_passed_to_installer=true");
    puts("parent_pid_start_executable_generation_bound=true");
    puts("running_python_generation_bound=true");
    puts("expected_plan_id_forwarded_for_apply=true");
    puts("python_descriptor_fexecve=true");
    puts("child_environment_closed=true");
    puts("post_child_generation_revalidation=true");
    puts("stale_candidate_lock_promoted=false");
    puts("protected_install_authorized=false");
    puts("installer_apply_performed=false");
    puts("credential_content_access=false");
    puts("signing=false");
    puts("transaction=false");
    puts("payment_acceptance=false");
    puts("public_presale_activation=false");
    puts("wc_void_market_activation=false");
    puts("funds_movement=false");
    return 0;
}

int main(int argc, char **argv) {
    if (argc == 2 && strcmp(argv[1], "--self-test") == 0) return self_test();
    if (geteuid() != 0) hold("dormant_binder_installer_first_entry_root_required");
    require_devnull_stdin();

    request_v1 request = parse_request(argc, argv);
    receipt_operation = request.operation;

    retained_file_v1 self = open_retained_regular(
        FIXED_SELF, true, "dormant_binder_installer_first_entry_self_custody_invalid"
    );
    char self_real[PATH_MAX];
    ssize_t self_count = readlink("/proc/self/exe", self_real, sizeof(self_real)-1U);
    if (self_count <= 0 || (size_t)self_count >= sizeof(self_real)) {
        hold("dormant_binder_installer_first_entry_self_identity_unreadable");
    }
    self_real[self_count] = '\0';
    if (strcmp(self_real, FIXED_SELF) != 0) {
        hold("dormant_binder_installer_first_entry_fixed_self_path_required");
    }

    retained_file_v1 policy_file;
    policy_v1 policy = read_policy(&policy_file);

    retained_file_v1 installer = open_retained_regular(
        FIXED_INSTALLER, false,
        "dormant_binder_installer_first_entry_installer_custody_invalid"
    );
    require_digest_size(
        installer.fd,
        VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_SHA256,
        VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_BYTES,
        "dormant_binder_installer_first_entry_installer_identity_mismatch"
    );

    retained_file_v1 native_input = open_retained_regular(
        FIXED_NATIVE_INPUT, false,
        "dormant_binder_installer_first_entry_native_input_custody_invalid"
    );
    require_digest_size(
        native_input.fd,
        VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_SHA256,
        VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_BYTES,
        "dormant_binder_installer_first_entry_native_input_identity_mismatch"
    );

    retained_python_v1 python = open_retained_python(
        "dormant_binder_installer_first_entry_python_custody_invalid"
    );
    require_digest_size(
        python.fd,
        policy.python_sha256,
        policy.python_bytes,
        "dormant_binder_installer_first_entry_python_identity_mismatch"
    );

    int devnull = open(FIXED_DEVNULL, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (devnull < 0) hold("dormant_binder_installer_first_entry_devnull_open_failed");

    int proof_pipe[2];
    if (pipe2(proof_pipe, O_CLOEXEC) != 0) {
        hold("dormant_binder_installer_first_entry_parent_proof_pipe_failed");
    }
    unsigned long long parent_start_ticks = 0;
    if (!read_process_start_ticks(getpid(), &parent_start_ticks)) {
        close(proof_pipe[0]);
        close(proof_pipe[1]);
        hold("dormant_binder_installer_first_entry_parent_start_ticks_failed");
    }
    char parent_proof[2048];
    int proof_n = snprintf(
        parent_proof,
        sizeof(parent_proof),
        "schema=%s\n"
        "parent_pid=%ld\n"
        "parent_start_ticks=%llu\n"
        "launcher_dev=%ju\n"
        "launcher_ino=%ju\n"
        "installer_dev=%ju\n"
        "installer_ino=%ju\n"
        "native_dev=%ju\n"
        "native_ino=%ju\n"
        "python_dev=%ju\n"
        "python_ino=%ju\n"
        "installer_fd=%d\n"
        "native_fd=%d\n"
        "operation=%s\n"
        "expected_head=%s\n",
        PARENT_PROOF_SCHEMA,
        (long)getpid(),
        parent_start_ticks,
        (uintmax_t)self.opened.st_dev,
        (uintmax_t)self.opened.st_ino,
        (uintmax_t)installer.opened.st_dev,
        (uintmax_t)installer.opened.st_ino,
        (uintmax_t)native_input.opened.st_dev,
        (uintmax_t)native_input.opened.st_ino,
        (uintmax_t)python.opened.st_dev,
        (uintmax_t)python.opened.st_ino,
        installer.fd,
        native_input.fd,
        operation_name(request.operation),
        request.expected_head
    );
    if (
        proof_n <= 0 || (size_t)proof_n >= sizeof(parent_proof) ||
        !write_all(
            proof_pipe[1],
            (const unsigned char *)parent_proof,
            (size_t)proof_n
        ) ||
        close(proof_pipe[1]) != 0
    ) {
        close(proof_pipe[0]);
        hold("dormant_binder_installer_first_entry_parent_proof_write_failed");
    }

    pid_t child = fork();
    if (child < 0) hold("dormant_binder_installer_first_entry_fork_failed");
    receipt_child_created = true;
    if (child == 0) {
        if (dup2(devnull, STDIN_FILENO) < 0) _exit(126);
        close(devnull);
        close(self.fd);
        close(policy_file.fd);
        clear_cloexec_or_exit(installer.fd);
        clear_cloexec_or_exit(native_input.fd);
        clear_cloexec_or_exit(proof_pipe[0]);

        char source_fd_path[64];
        int path_n = snprintf(
            source_fd_path,
            sizeof(source_fd_path),
            "/proc/self/fd/%d",
            installer.fd
        );
        if (path_n <= 0 || (size_t)path_n >= sizeof(source_fd_path)) _exit(126);

        char native_fd_path[64];
        path_n = snprintf(
            native_fd_path,
            sizeof(native_fd_path),
            "/proc/self/fd/%d",
            native_input.fd
        );
        if (path_n <= 0 || (size_t)path_n >= sizeof(native_fd_path)) _exit(126);

        char installer_fd_env[128];
        path_n = snprintf(
            installer_fd_env,
            sizeof(installer_fd_env),
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_INSTALLER_FD=%d",
            installer.fd
        );
        if (path_n <= 0 || (size_t)path_n >= sizeof(installer_fd_env)) _exit(126);

        char native_fd_env[128];
        path_n = snprintf(
            native_fd_env,
            sizeof(native_fd_env),
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_NATIVE_FD=%d",
            native_input.fd
        );
        if (path_n <= 0 || (size_t)path_n >= sizeof(native_fd_env)) _exit(126);

        char proof_fd_env[128];
        path_n = snprintf(
            proof_fd_env,
            sizeof(proof_fd_env),
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROOF_FD=%d",
            proof_pipe[0]
        );
        if (path_n <= 0 || (size_t)path_n >= sizeof(proof_fd_env)) _exit(126);

        char *argv_plan[] = {
            (char *)FIXED_PYTHON, (char *)"-I", (char *)"-B", source_fd_path,
            (char *)"--plan",
            (char *)"--native", native_fd_path,
            (char *)"--expected-head", request.expected_head,
            NULL
        };
        char *argv_apply[] = {
            (char *)FIXED_PYTHON, (char *)"-I", (char *)"-B", source_fd_path,
            (char *)"--apply",
            (char *)"--native", native_fd_path,
            (char *)"--expected-head", request.expected_head,
            (char *)"--expected-plan-id", (char *)request.expected_plan_id,
            (char *)"--confirm", (char *)APPLY_CONFIRM,
            NULL
        };
        char *const envp[] = {
            (char *)"PATH=/usr/bin:/bin",
            (char *)"HOME=/root",
            (char *)"LANG=C",
            (char *)"LC_ALL=C",
            (char *)"TZ=UTC",
            (char *)"VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY=VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1",
            installer_fd_env,
            native_fd_env,
            proof_fd_env,
            NULL
        };
        char **next_argv =
            request.operation == OP_INSTALLER_PLAN ? argv_plan : argv_apply;
        fexecve(python.fd, next_argv, envp);
        _exit(126);
    }

    close(devnull);
    close(proof_pipe[0]);

    int status = 0;
    pid_t waited;
    do {
        waited = waitpid(child, &status, 0);
    } while (waited < 0 && errno == EINTR);
    if (waited != child) hold("dormant_binder_installer_first_entry_child_wait_failed");

    revalidate_retained_regular(
        &self, true, "dormant_binder_installer_first_entry_self_generation_changed"
    );
    revalidate_retained_regular(
        &policy_file, false,
        "dormant_binder_installer_first_entry_policy_generation_changed"
    );
    revalidate_retained_regular(
        &installer, false,
        "dormant_binder_installer_first_entry_installer_generation_changed"
    );
    revalidate_retained_regular(
        &native_input, false,
        "dormant_binder_installer_first_entry_native_input_generation_changed"
    );
    revalidate_retained_python(
        &python, "dormant_binder_installer_first_entry_python_generation_changed"
    );

    close(python.fd);
    close(native_input.fd);
    close(installer.fd);
    close(policy_file.fd);
    close(self.fd);

    if (!WIFEXITED(status)) {
        hold("dormant_binder_installer_first_entry_child_not_cleanly_exited");
    }
    int code = WEXITSTATUS(status);
    if (code != 0) return code;

    printf("%s_GREEN\n", MARKER);
    printf("operation=%s\n", operation_name(request.operation));
    printf("privileged_first_entry_authenticated=true\n");
    printf("python_generation_authenticated=true\n");
    printf("installer_generation_authenticated=true\n");
    printf("native_candidate_generation_authenticated=true\n");
    printf("native_candidate_descriptor_consumed_by_installer=true\n");
    printf("private_parent_proof_fd_consumed_by_installer=true\n");
    printf("parent_pid_start_executable_generation_bound=true\n");
    printf("running_python_generation_bound=true\n");
    printf("expected_plan_id_forwarded=%s\n", request.operation == OP_INSTALLER_APPLY ? "true" : "not_applicable");
    printf("expected_head_authenticated=true\n");
    printf("runtime_expected_head_forwarded_unchanged=true\n");
    printf("loader_python_environment_sanitized=true\n");
    printf("child_exit_success=true\n");
    printf("child_process_created=true\n");
    if (request.operation == OP_INSTALLER_PLAN) {
        printf("installer_apply_performed=false\n");
    } else {
        printf("installer_apply_child_exit_success=true\n");
    }
    printf("credential_content_access=false\n");
    printf("private_key_access=false\n");
    printf("signing=false\n");
    printf("transaction=false\n");
    printf("payment_acceptance=false\n");
    printf("public_presale_activation=false\n");
    printf("wc_void_market_activation=false\n");
    printf("funds_movement=false\n");
    return 0;
}
