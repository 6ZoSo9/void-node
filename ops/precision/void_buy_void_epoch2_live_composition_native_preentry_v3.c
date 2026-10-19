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

#define MARKER "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3"
#define POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3"
#define FIXED_ROOT "/opt/void-buy-void-epoch2-live-composition-v3"
#define FIXED_SELF FIXED_ROOT "/void_buy_void_epoch2_live_composition_native_preentry_v3"
#define FIXED_POLICY FIXED_ROOT "/policy-v3.conf"
#define FIXED_RUNNER FIXED_ROOT "/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
#define FIXED_NODE "/usr/bin/node"
#define FIXED_DEVNULL "/dev/null"
#define CONFIRM "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3"
#define PREENTRY_ENV "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3=" MARKER
#define PROOF_SCHEMA "VOID_BUY_VOID_EPOCH2_NATIVE_PARENT_PROOF_V3"
#define PROOF_FD_ENV_PREFIX "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_PROOF_FD="
#define MAX_POLICY_BYTES 1024U
#define MAX_RUNNER_BYTES (4U * 1024U * 1024U)
#define MAX_NODE_BYTES (512U * 1024U * 1024U)

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
    char expected_head[41];
    char runner_sha256[65];
    size_t runner_bytes;
    char node_sha256[65];
    size_t node_bytes;
} policy_v1;

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

static void sha256_buffer(const unsigned char *d, size_t n, unsigned char out[32]) {
    sha256_ctx c;
    sha256_init(&c);
    sha256_update(&c, d, n);
    sha256_final(&c, out);
}

static bool child_process_created = false;
static bool child_proof_released = false;

static void hold(const char *reason) {
    fprintf(stderr, "%s_HOLD reason=%s\n", MARKER, reason);
    fprintf(
        stderr,
        "child_process_created=%s\n",
        child_process_created ? "true" : "false"
    );
    fprintf(
        stderr,
        "child_proof_released=%s\n",
        child_proof_released ? "true" : "false"
    );
    if (child_process_created) {
        fprintf(
            stderr,
            "root_javascript_started_state="
            "unknown_or_started_if_child_created\n"
        );
    } else {
        fprintf(stderr, "root_javascript_started=false\n");
    }
    if (child_proof_released) {
        fprintf(
            stderr,
            "credential_content_access_state="
            "unknown_or_partial_if_child_released\n"
        );
        fprintf(
            stderr,
            "private_key_access_state="
            "unknown_or_partial_if_child_released\n"
        );
        fprintf(
            stderr,
            "signing_state=unknown_or_partial_if_child_released\n"
        );
    } else {
        fprintf(stderr, "credential_content_access=false\n");
        fprintf(stderr, "private_key_access=false\n");
        fprintf(stderr, "signing=false\n");
    }
    fprintf(stderr, "transaction=false\n");
    fprintf(stderr, "public_presale_activation=false\n");
    fprintf(stderr, "wc_void_market_activation=false\n");
    fprintf(stderr, "funds_movement=false\n");
    exit(2);
}

static bool lower_hex_exact(const char *s, size_t n) {
    if (s == NULL || strlen(s) != n) return false;
    for (size_t i = 0; i < n; i++) {
        if (!((s[i] >= '0' && s[i] <= '9') ||
              (s[i] >= 'a' && s[i] <= 'f'))) {
            return false;
        }
    }
    return true;
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

static int open_trusted_regular(
    const char *pathname,
    bool executable,
    const char *reason
) {
    require_safe_ancestors(pathname, reason);
    struct stat before;
    if (lstat(pathname, &before) != 0 ||
        S_ISLNK(before.st_mode) ||
        !safe_regular_metadata(&before, executable)) {
        hold(reason);
    }
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
    return fd;
}

static void require_self_identity(void) {
    char observed[PATH_MAX];
    ssize_t count = readlink("/proc/self/exe", observed, sizeof(observed) - 1U);
    if (count <= 0 || (size_t)count >= sizeof(observed)) {
        hold("native_preentry_self_identity_unreadable");
    }
    observed[count] = '\0';
    if (strcmp(observed, FIXED_SELF) != 0) {
        hold("native_preentry_fixed_path_required");
    }
    int fd = open_trusted_regular(
        FIXED_SELF, true, "native_preentry_self_custody_invalid"
    );
    close(fd);
}

static void require_devnull_stdin(void) {
    struct stat stdin_st, null_st;
    if (fstat(STDIN_FILENO, &stdin_st) != 0 ||
        lstat(FIXED_DEVNULL, &null_st) != 0 ||
        !S_ISCHR(stdin_st.st_mode) ||
        !S_ISCHR(null_st.st_mode) ||
        stdin_st.st_dev != null_st.st_dev ||
        stdin_st.st_ino != null_st.st_ino ||
        stdin_st.st_rdev != null_st.st_rdev) {
        hold("stdin_javascript_source_forbidden");
    }
}

static bool write_all(int fd, const unsigned char *data, size_t length) {
    size_t offset = 0;
    while (offset < length) {
        ssize_t written = write(fd, data + offset, length - offset);
        if (written < 0) {
            if (errno == EINTR) continue;
            return false;
        }
        if (written == 0) return false;
        offset += (size_t)written;
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

static void emit_parent_proof(
    int fd,
    pid_t child,
    const char expected_head[41],
    const struct stat *self_stat,
    const struct stat *runner_stat,
    const struct stat *node_stat,
    unsigned long long parent_start_ticks,
    unsigned long long child_start_ticks
) {
    char proof[2048];
    int count = snprintf(
        proof,
        sizeof(proof),
        "{\"schema\":\"%s\",\"parent_pid\":%ld,\"parent_start_ticks\":\"%llu\","
        "\"child_pid\":%ld,\"child_start_ticks\":\"%llu\","
        "\"preentry_dev\":\"%ju\",\"preentry_ino\":\"%ju\","
        "\"runner_dev\":\"%ju\",\"runner_ino\":\"%ju\","
        "\"node_dev\":\"%ju\",\"node_ino\":\"%ju\","
        "\"expected_head\":\"%s\"}\n",
        PROOF_SCHEMA,
        (long)getpid(),
        parent_start_ticks,
        (long)child,
        child_start_ticks,
        (uintmax_t)self_stat->st_dev,
        (uintmax_t)self_stat->st_ino,
        (uintmax_t)runner_stat->st_dev,
        (uintmax_t)runner_stat->st_ino,
        (uintmax_t)node_stat->st_dev,
        (uintmax_t)node_stat->st_ino,
        expected_head
    );
    if (count <= 0 || (size_t)count >= sizeof(proof) ||
        !write_all(fd, (const unsigned char *)proof, (size_t)count)) {
        hold("native_preentry_parent_proof_write_failed");
    }
}

static void sha256_fd_hex(int fd, char out[65]) {
    if (lseek(fd, 0, SEEK_SET) < 0) hold("digest_seek_failed");
    sha256_ctx c;
    sha256_init(&c);
    unsigned char buf[8192];
    for (;;) {
        ssize_t n = read(fd, buf, sizeof(buf));
        if (n < 0) {
            if (errno == EINTR) continue;
            hold("digest_read_failed");
        }
        if (n == 0) break;
        sha256_update(&c, buf, (size_t)n);
    }
    unsigned char digest[32];
    sha256_final(&c, digest);
    static const char hex[] = "0123456789abcdef";
    for (size_t i = 0; i < 32; i++) {
        out[i*2U] = hex[digest[i] >> 4];
        out[i*2U + 1U] = hex[digest[i] & 0x0fU];
    }
    out[64] = '\0';
    if (lseek(fd, 0, SEEK_SET) < 0) hold("digest_rewind_failed");
}

static void require_digest_and_size(
    int fd,
    const char *expected_sha256,
    size_t expected_bytes,
    const char *reason
) {
    struct stat st;
    if (fstat(fd, &st) != 0 ||
        st.st_size < 0 ||
        (uintmax_t)st.st_size != (uintmax_t)expected_bytes) {
        hold(reason);
    }
    char observed[65];
    sha256_fd_hex(fd, observed);
    if (strcmp(observed, expected_sha256) != 0) {
        hold(reason);
    }
}

static policy_v1 parse_policy_text(char *text) {
    policy_v1 p;
    memset(&p, 0, sizeof(p));
    char *save = NULL;
    char *lines[6];
    size_t count = 0;
    for (char *line = strtok_r(text, "\n", &save);
         line != NULL;
         line = strtok_r(NULL, "\n", &save)) {
        if (count >= 6U) hold("policy_line_count_invalid");
        lines[count++] = line;
    }
    if (count != 6U) hold("policy_line_count_invalid");

    const char *schema_prefix = "schema=";
    const char *head_prefix = "expected_head=";
    const char *runner_sha_prefix = "runner_sha256=";
    const char *runner_bytes_prefix = "runner_bytes=";
    const char *node_sha_prefix = "node_sha256=";
    const char *node_bytes_prefix = "node_bytes=";

    if (strncmp(lines[0], schema_prefix, strlen(schema_prefix)) != 0 ||
        strcmp(lines[0] + strlen(schema_prefix), POLICY_SCHEMA) != 0 ||
        strncmp(lines[1], head_prefix, strlen(head_prefix)) != 0 ||
        strncmp(lines[2], runner_sha_prefix, strlen(runner_sha_prefix)) != 0 ||
        strncmp(lines[3], runner_bytes_prefix, strlen(runner_bytes_prefix)) != 0 ||
        strncmp(lines[4], node_sha_prefix, strlen(node_sha_prefix)) != 0 ||
        strncmp(lines[5], node_bytes_prefix, strlen(node_bytes_prefix)) != 0) {
        hold("policy_schema_invalid");
    }

    const char *head = lines[1] + strlen(head_prefix);
    const char *runner_sha = lines[2] + strlen(runner_sha_prefix);
    const char *runner_bytes = lines[3] + strlen(runner_bytes_prefix);
    const char *node_sha = lines[4] + strlen(node_sha_prefix);
    const char *node_bytes = lines[5] + strlen(node_bytes_prefix);

    if (!lower_hex_exact(head, 40U) ||
        !lower_hex_exact(runner_sha, 64U) ||
        !lower_hex_exact(node_sha, 64U) ||
        !decimal_size(runner_bytes, MAX_RUNNER_BYTES, &p.runner_bytes) ||
        !decimal_size(node_bytes, MAX_NODE_BYTES, &p.node_bytes)) {
        hold("policy_value_invalid");
    }

    memcpy(p.expected_head, head, 41U);
    memcpy(p.runner_sha256, runner_sha, 65U);
    memcpy(p.node_sha256, node_sha, 65U);
    return p;
}

static policy_v1 read_policy(void) {
    int fd = open_trusted_regular(
        FIXED_POLICY, false, "native_preentry_policy_custody_invalid"
    );
    struct stat st;
    if (fstat(fd, &st) != 0 ||
        st.st_size <= 0 ||
        (uintmax_t)st.st_size > MAX_POLICY_BYTES) {
        close(fd);
        hold("native_preentry_policy_size_invalid");
    }
    size_t n = (size_t)st.st_size;
    char *buf = calloc(n + 1U, 1U);
    if (buf == NULL) {
        close(fd);
        hold("native_preentry_policy_allocation_failed");
    }
    size_t off = 0;
    while (off < n) {
        ssize_t got = read(fd, buf + off, n - off);
        if (got < 0) {
            if (errno == EINTR) continue;
            free(buf);
            close(fd);
            hold("native_preentry_policy_read_failed");
        }
        if (got == 0) {
            free(buf);
            close(fd);
            hold("native_preentry_policy_short_read");
        }
        off += (size_t)got;
    }
    struct stat after, visible;
    if (fstat(fd, &after) != 0 ||
        lstat(FIXED_POLICY, &visible) != 0 ||
        !same_identity(&st, &after) ||
        !same_identity(&after, &visible)) {
        free(buf);
        close(fd);
        hold("native_preentry_policy_generation_changed");
    }
    close(fd);
    if (buf[n - 1U] != '\n') {
        free(buf);
        hold("native_preentry_policy_final_newline_required");
    }
    policy_v1 p = parse_policy_text(buf);
    free(buf);
    return p;
}

static void parse_live_args(int argc, char **argv, char expected_head[41]) {
    if (argc != 6 ||
        strcmp(argv[1], "--run") != 0 ||
        strcmp(argv[2], "--confirm") != 0 ||
        strcmp(argv[3], CONFIRM) != 0 ||
        strcmp(argv[4], "--expected-head") != 0 ||
        !lower_hex_exact(argv[5], 40U)) {
        hold("native_preentry_arguments_invalid");
    }
    memcpy(expected_head, argv[5], 41U);
}

static int self_test(void) {
    static const unsigned char expected[32] = {
        0xba,0x78,0x16,0xbf,0x8f,0x01,0xcf,0xea,
        0x41,0x41,0x40,0xde,0x5d,0xae,0x22,0x23,
        0xb0,0x03,0x61,0xa3,0x96,0x17,0x7a,0x9c,
        0xb4,0x10,0xff,0x61,0xf2,0x00,0x15,0xad
    };
    unsigned char actual[32];
    sha256_buffer((const unsigned char *)"abc", 3U, actual);
    if (memcmp(actual, expected, sizeof(actual)) != 0) return 1;
    if (!lower_hex_exact("0123456789abcdef0123456789abcdef01234567", 40U)) {
        return 1;
    }
    size_t parsed = 0;
    if (!decimal_size("123", 1000U, &parsed) || parsed != 123U) return 1;

    char policy[] =
        "schema=" POLICY_SCHEMA "\n"
        "expected_head=0123456789abcdef0123456789abcdef01234567\n"
        "runner_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
        "runner_bytes=123\n"
        "node_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n"
        "node_bytes=456\n";
    policy_v1 p = parse_policy_text(policy);
    if (strcmp(p.expected_head,
               "0123456789abcdef0123456789abcdef01234567") != 0 ||
        p.runner_bytes != 123U ||
        p.node_bytes != 456U) {
        return 1;
    }

    puts(MARKER "_SELF_TEST_GREEN");
    puts("native_first_instruction=true");
    puts("fixed_self_path=true");
    puts("fixed_runner_path=true");
    puts("fixed_node_path=true");
    puts("root_owned_policy_required=true");
    puts("runner_sha256_policy_bound=true");
    puts("node_sha256_policy_bound=true");
    puts("expected_head_policy_bound=true");
    puts("runner_descriptor_retained=true");
    puts("node_descriptor_fexecve=true");
    puts("native_parent_retained_for_child_lifetime=true");
    puts("parent_child_start_ticks_bound=true");
    puts("installed_preentry_runner_generation_bound=true");
    puts("private_parent_proof_channel=true");
    puts("stdin_javascript_source_forbidden=true");
    puts("loader_environment_sanitized=true");
    puts("credential_content_access=false");
    puts("transaction=false");
    puts("public_presale_activation=false");
    puts("funds_movement=false");
    return 0;
}

int main(int argc, char **argv) {
    if (argc == 2 && strcmp(argv[1], "--self-test") == 0) {
        return self_test();
    }
    if (argc == 2 && strcmp(argv[1], "--self-test-hold-preproof") == 0) {
        child_process_created = false;
        child_proof_released = false;
        hold("self_test_preproof_hold");
    }
    if (argc == 2 && strcmp(argv[1], "--self-test-hold-postfork-preproof") == 0) {
        child_process_created = true;
        child_proof_released = false;
        hold("self_test_postfork_preproof_hold");
    }
    if (argc == 2 && strcmp(argv[1], "--self-test-hold-postproof") == 0) {
        child_process_created = true;
        child_proof_released = true;
        hold("self_test_postproof_hold");
    }
    if (geteuid() != 0) hold("native_preentry_root_required");

    char requested_head[41];
    parse_live_args(argc, argv, requested_head);
    require_self_identity();

    /* Reject caller-streamed JavaScript before opening policy, runner, or Node. */
    require_devnull_stdin();

    policy_v1 policy = read_policy();
    if (strcmp(requested_head, policy.expected_head) != 0) {
        hold("native_preentry_expected_head_policy_mismatch");
    }

    int runner_fd = open_trusted_regular(
        FIXED_RUNNER, false, "native_preentry_runner_custody_invalid"
    );
    int node_fd = open_trusted_regular(
        FIXED_NODE, true, "native_preentry_node_custody_invalid"
    );
    require_digest_and_size(
        runner_fd,
        policy.runner_sha256,
        policy.runner_bytes,
        "native_preentry_runner_digest_mismatch"
    );
    require_digest_and_size(
        node_fd,
        policy.node_sha256,
        policy.node_bytes,
        "native_preentry_node_digest_mismatch"
    );

    struct stat self_stat;
    struct stat runner_stat;
    struct stat node_stat;
    if (lstat(FIXED_SELF, &self_stat) != 0 ||
        fstat(runner_fd, &runner_stat) != 0 ||
        fstat(node_fd, &node_stat) != 0) {
        close(node_fd);
        close(runner_fd);
        hold("native_preentry_generation_snapshot_failed");
    }

    unsigned long long parent_start_ticks = 0ULL;
    if (!read_process_start_ticks(getpid(), &parent_start_ticks)) {
        close(node_fd);
        close(runner_fd);
        hold("native_preentry_parent_generation_unavailable");
    }

    int proof_pipe[2];
    if (pipe2(proof_pipe, O_CLOEXEC) != 0) {
        close(node_fd);
        close(runner_fd);
        hold("native_preentry_parent_proof_pipe_failed");
    }
    if (signal(SIGPIPE, SIG_IGN) == SIG_ERR) {
        close(proof_pipe[0]);
        close(proof_pipe[1]);
        close(node_fd);
        close(runner_fd);
        hold("native_preentry_sigpipe_guard_failed");
    }

    pid_t child = fork();
    if (child < 0) {
        close(proof_pipe[0]);
        close(proof_pipe[1]);
        close(node_fd);
        close(runner_fd);
        hold("native_preentry_fork_failed");
    }

    if (child == 0) {
        close(proof_pipe[1]);

        int runner_flags = fcntl(runner_fd, F_GETFD);
        int proof_flags = fcntl(proof_pipe[0], F_GETFD);
        if (runner_flags < 0 || proof_flags < 0 ||
            fcntl(runner_fd, F_SETFD, runner_flags & ~FD_CLOEXEC) != 0 ||
            fcntl(proof_pipe[0], F_SETFD, proof_flags & ~FD_CLOEXEC) != 0) {
            _exit(126);
        }

        char runner_fd_env[96];
        char proof_fd_env[96];
        int runner_env_n = snprintf(
            runner_fd_env,
            sizeof(runner_fd_env),
            "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_RUNNER_FD=%d",
            runner_fd
        );
        int proof_env_n = snprintf(
            proof_fd_env,
            sizeof(proof_fd_env),
            PROOF_FD_ENV_PREFIX "%d",
            proof_pipe[0]
        );
        if (runner_env_n <= 0 ||
            (size_t)runner_env_n >= sizeof(runner_fd_env) ||
            proof_env_n <= 0 ||
            (size_t)proof_env_n >= sizeof(proof_fd_env)) {
            _exit(126);
        }

        char *const next_argv[] = {
            (char *)FIXED_NODE,
            (char *)FIXED_RUNNER,
            (char *)"--run",
            (char *)"--confirm",
            (char *)CONFIRM,
            (char *)"--expected-head",
            policy.expected_head,
            NULL
        };
        char *const envp[] = {
            (char *)"PATH=/usr/bin:/bin",
            (char *)"HOME=/root",
            (char *)"LANG=C",
            (char *)"LC_ALL=C",
            (char *)"TZ=UTC",
            (char *)PREENTRY_ENV,
            runner_fd_env,
            proof_fd_env,
            NULL
        };

        fexecve(node_fd, next_argv, envp);
        _exit(126);
    }

    child_process_created = true;
    close(proof_pipe[0]);
    close(node_fd);

    unsigned long long child_start_ticks = 0ULL;
    if (!read_process_start_ticks(child, &child_start_ticks)) {
        close(proof_pipe[1]);
        close(runner_fd);
        (void)kill(child, SIGTERM);
        (void)waitpid(child, NULL, 0);
        hold("native_preentry_child_generation_unavailable");
    }

    emit_parent_proof(
        proof_pipe[1],
        child,
        policy.expected_head,
        &self_stat,
        &runner_stat,
        &node_stat,
        parent_start_ticks,
        child_start_ticks
    );
    child_proof_released = true;
    close(proof_pipe[1]);
    close(runner_fd);

    int status = 0;
    pid_t waited;
    do {
        waited = waitpid(child, &status, 0);
    } while (waited < 0 && errno == EINTR);
    if (waited != child) {
        hold("native_preentry_child_wait_failed");
    }
    if (WIFEXITED(status)) {
        return WEXITSTATUS(status);
    }
    hold("native_preentry_child_not_cleanly_exited");
}
