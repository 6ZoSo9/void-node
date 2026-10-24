#define _GNU_SOURCE 1

#include "void_buy_allocation_custody_runtime_v3_installer_first_entry_bindings_v2.h"

#include <elf.h>
#include <errno.h>
#include <fcntl.h>
#include <grp.h>
#include <limits.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <unistd.h>

#ifndef VOID_CUSTODY_FIRST_ENTRY_BINDINGS_VERSION
#error "VOID_CUSTODY_FIRST_ENTRY_BINDINGS_VERSION is required"
#endif
#if VOID_CUSTODY_FIRST_ENTRY_BINDINGS_VERSION != 2
#error "unsupported VOID custody first-entry bindings version"
#endif

#ifndef VOID_FIRST_ENTRY_BIN
#error "VOID_FIRST_ENTRY_BIN is required"
#endif
#ifndef VOID_FIRST_ENTRY_POLICY
#error "VOID_FIRST_ENTRY_POLICY is required"
#endif
#ifndef VOID_POLICY_MODE
#error "VOID_POLICY_MODE is required"
#endif
#ifndef VOID_POLICY_BYTES
#error "VOID_POLICY_BYTES is required"
#endif
#ifndef VOID_POLICY_SHA256_HEX
#error "VOID_POLICY_SHA256_HEX is required"
#endif

#ifndef VOID_INSTALLER_PATH
#error "VOID_INSTALLER_PATH is required"
#endif
#ifndef VOID_INSTALLER_MODE
#error "VOID_INSTALLER_MODE is required"
#endif
#ifndef VOID_INSTALLER_BYTES
#error "VOID_INSTALLER_BYTES is required"
#endif
#ifndef VOID_INSTALLER_SHA256_HEX
#error "VOID_INSTALLER_SHA256_HEX is required"
#endif

#ifndef VOID_INSTALL_PLAN_PATH
#error "VOID_INSTALL_PLAN_PATH is required"
#endif
#ifndef VOID_INSTALL_PLAN_MODE
#error "VOID_INSTALL_PLAN_MODE is required"
#endif
#ifndef VOID_INSTALL_PLAN_BYTES
#error "VOID_INSTALL_PLAN_BYTES is required"
#endif
#ifndef VOID_INSTALL_PLAN_SHA256_HEX
#error "VOID_INSTALL_PLAN_SHA256_HEX is required"
#endif

#ifndef VOID_SOURCE_LOCK_PATH
#error "VOID_SOURCE_LOCK_PATH is required"
#endif
#ifndef VOID_SOURCE_LOCK_MODE
#error "VOID_SOURCE_LOCK_MODE is required"
#endif
#ifndef VOID_SOURCE_LOCK_BYTES
#error "VOID_SOURCE_LOCK_BYTES is required"
#endif
#ifndef VOID_SOURCE_LOCK_SHA256_HEX
#error "VOID_SOURCE_LOCK_SHA256_HEX is required"
#endif

#ifndef VOID_PROTECTED_CENSUS_PATH
#error "VOID_PROTECTED_CENSUS_PATH is required"
#endif
#ifndef VOID_PROTECTED_CENSUS_MODE
#error "VOID_PROTECTED_CENSUS_MODE is required"
#endif
#ifndef VOID_PROTECTED_CENSUS_BYTES
#error "VOID_PROTECTED_CENSUS_BYTES is required"
#endif
#ifndef VOID_PROTECTED_CENSUS_SHA256_HEX
#error "VOID_PROTECTED_CENSUS_SHA256_HEX is required"
#endif

#ifndef VOID_PYTHON_PATH
#error "VOID_PYTHON_PATH is required"
#endif
#ifndef VOID_PYTHON_MODE
#error "VOID_PYTHON_MODE is required"
#endif
#ifndef VOID_PYTHON_BYTES
#error "VOID_PYTHON_BYTES is required"
#endif
#ifndef VOID_PYTHON_SHA256_HEX
#error "VOID_PYTHON_SHA256_HEX is required"
#endif
#ifndef VOID_PYTHON_STDLIB_PATH
#error "VOID_PYTHON_STDLIB_PATH is required"
#endif
#ifndef VOID_PYTHON_STDLIB_MODE
#error "VOID_PYTHON_STDLIB_MODE is required"
#endif
#ifndef VOID_PYTHON_STDLIB_BYTES
#error "VOID_PYTHON_STDLIB_BYTES is required"
#endif
#ifndef VOID_PYTHON_STDLIB_SHA256_HEX
#error "VOID_PYTHON_STDLIB_SHA256_HEX is required"
#endif

#ifndef VOID_INSTALLER_FD
#error "VOID_INSTALLER_FD is required"
#endif
#ifndef VOID_PYTHON_FD
#error "VOID_PYTHON_FD is required"
#endif
#if VOID_INSTALLER_FD < 3
#error "installer retained fd must be >= 3"
#endif
#if VOID_PYTHON_FD <= VOID_INSTALLER_FD
#error "python retained fd must be greater than installer retained fd"
#endif

#ifndef SYS_close_range
#error "Linux close_range syscall is required"
#endif

#define VOID_OPERATION "--install-accepted-protected-census-source"
#define VOID_CONFIRM_FLAG "--confirm"
#define VOID_CONFIRM_TOKEN \
  "INSTALL_ACCEPTED_VOID_CUSTODY_PROTECTED_PROCREF_SOURCE_V2_CREATE_ONLY"

#define VOID_STRINGIFY_INNER(x) #x
#define VOID_STRINGIFY(x) VOID_STRINGIFY_INNER(x)

static const char VOID_PYTHON_BOOTSTRAP[] =
  "s=__import__('sys');"
  "s.path[:]=['" VOID_PYTHON_STDLIB_PATH "'];"
  "b=open('/proc/self/fd/" VOID_STRINGIFY(VOID_INSTALLER_FD) "','rb').read();"
  "n={'__name__':'void_custody_installer','__file__':'" VOID_INSTALLER_PATH "'};"
  "exec(compile(b,n['__file__'],'exec'),n,n);"
  "n['install_accepted_source_create_only_after_protected_first_entry']()";

struct void_sha256_ctx {
  uint32_t state[8];
  uint64_t bitlen;
  unsigned char block[64];
  size_t used;
};

static uint32_t rotr32(uint32_t v, unsigned int n) {
  return (v >> n) | (v << (32U - n));
}

static uint32_t choose32(uint32_t x, uint32_t y, uint32_t z) {
  return (x & y) ^ (~x & z);
}

static uint32_t majority32(uint32_t x, uint32_t y, uint32_t z) {
  return (x & y) ^ (x & z) ^ (y & z);
}

static uint32_t big0(uint32_t x) {
  return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
}

static uint32_t big1(uint32_t x) {
  return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
}

static uint32_t small0(uint32_t x) {
  return rotr32(x, 7) ^ rotr32(x, 18) ^ (x >> 3);
}

static uint32_t small1(uint32_t x) {
  return rotr32(x, 17) ^ rotr32(x, 19) ^ (x >> 10);
}

static const uint32_t VOID_SHA256_K[64] = {
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

static void sha256_transform(
  struct void_sha256_ctx *ctx,
  const unsigned char block[64]
) {
  uint32_t w[64];
  uint32_t a,b,c,d,e,f,g,h,t1,t2;
  size_t i;

  for (i = 0; i < 16; ++i) {
    size_t j = i * 4;
    w[i] =
      ((uint32_t)block[j] << 24) |
      ((uint32_t)block[j + 1] << 16) |
      ((uint32_t)block[j + 2] << 8) |
      (uint32_t)block[j + 3];
  }
  for (i = 16; i < 64; ++i) {
    w[i] = small1(w[i - 2]) + w[i - 7] + small0(w[i - 15]) + w[i - 16];
  }

  a=ctx->state[0]; b=ctx->state[1]; c=ctx->state[2]; d=ctx->state[3];
  e=ctx->state[4]; f=ctx->state[5]; g=ctx->state[6]; h=ctx->state[7];

  for (i = 0; i < 64; ++i) {
    t1 = h + big1(e) + choose32(e,f,g) + VOID_SHA256_K[i] + w[i];
    t2 = big0(a) + majority32(a,b,c);
    h=g; g=f; f=e; e=d+t1; d=c; c=b; b=a; a=t1+t2;
  }

  ctx->state[0]+=a; ctx->state[1]+=b; ctx->state[2]+=c; ctx->state[3]+=d;
  ctx->state[4]+=e; ctx->state[5]+=f; ctx->state[6]+=g; ctx->state[7]+=h;
}

static void sha256_init(struct void_sha256_ctx *ctx) {
  ctx->state[0]=0x6a09e667U; ctx->state[1]=0xbb67ae85U;
  ctx->state[2]=0x3c6ef372U; ctx->state[3]=0xa54ff53aU;
  ctx->state[4]=0x510e527fU; ctx->state[5]=0x9b05688cU;
  ctx->state[6]=0x1f83d9abU; ctx->state[7]=0x5be0cd19U;
  ctx->bitlen=0; ctx->used=0;
}

static void sha256_update(
  struct void_sha256_ctx *ctx,
  const unsigned char *data,
  size_t length
) {
  size_t i;
  for (i = 0; i < length; ++i) {
    ctx->block[ctx->used++] = data[i];
    if (ctx->used == 64) {
      sha256_transform(ctx, ctx->block);
      ctx->bitlen += 512;
      ctx->used = 0;
    }
  }
}

static void sha256_final(
  struct void_sha256_ctx *ctx,
  unsigned char digest[32]
) {
  size_t i = ctx->used;
  uint64_t bits;

  ctx->block[i++] = 0x80U;
  if (i > 56) {
    while (i < 64) ctx->block[i++] = 0;
    sha256_transform(ctx, ctx->block);
    i = 0;
  }
  while (i < 56) ctx->block[i++] = 0;

  bits = ctx->bitlen + ((uint64_t)ctx->used * 8U);
  ctx->block[63]=(unsigned char)bits; bits >>= 8;
  ctx->block[62]=(unsigned char)bits; bits >>= 8;
  ctx->block[61]=(unsigned char)bits; bits >>= 8;
  ctx->block[60]=(unsigned char)bits; bits >>= 8;
  ctx->block[59]=(unsigned char)bits; bits >>= 8;
  ctx->block[58]=(unsigned char)bits; bits >>= 8;
  ctx->block[57]=(unsigned char)bits; bits >>= 8;
  ctx->block[56]=(unsigned char)bits;
  sha256_transform(ctx, ctx->block);

  for (i = 0; i < 8; ++i) {
    digest[i*4]=(unsigned char)(ctx->state[i] >> 24);
    digest[i*4+1]=(unsigned char)(ctx->state[i] >> 16);
    digest[i*4+2]=(unsigned char)(ctx->state[i] >> 8);
    digest[i*4+3]=(unsigned char)ctx->state[i];
  }
}

static int hex_nibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  return -1;
}

static int digest_matches_hex(
  const unsigned char digest[32],
  const char *expected
) {
  size_t i;
  if (expected == NULL || strlen(expected) != 64) return 0;
  for (i = 0; i < 32; ++i) {
    int hi = hex_nibble(expected[i*2]);
    int lo = hex_nibble(expected[i*2+1]);
    if (hi < 0 || lo < 0) return 0;
    if (digest[i] != (unsigned char)((hi << 4) | lo)) return 0;
  }
  return 1;
}

static int same_generation(const struct stat *a, const struct stat *b) {
  return
    a->st_dev == b->st_dev &&
    a->st_ino == b->st_ino &&
    a->st_uid == b->st_uid &&
    a->st_gid == b->st_gid &&
    a->st_mode == b->st_mode &&
    a->st_nlink == b->st_nlink &&
    a->st_size == b->st_size &&
    a->st_mtim.tv_sec == b->st_mtim.tv_sec &&
    a->st_mtim.tv_nsec == b->st_mtim.tv_nsec &&
    a->st_ctim.tv_sec == b->st_ctim.tv_sec &&
    a->st_ctim.tv_nsec == b->st_ctim.tv_nsec;
}

static int safe_absolute_path(const char *path) {
  const char *p;
  if (path == NULL || path[0] != '/' || path[1] == '\0') return 0;
  if (strlen(path) >= PATH_MAX) return 0;
  p = path + 1;
  while (*p != '\0') {
    const char *start = p;
    size_t len;
    while (*p != '\0' && *p != '/') ++p;
    len = (size_t)(p - start);
    if (len == 0) return 0;
    if (len == 1 && start[0] == '.') return 0;
    if (len == 2 && start[0] == '.' && start[1] == '.') return 0;
    if (*p == '/') ++p;
    if (*p == '\0' && p[-1] == '/') return 0;
  }
  return 1;
}

static void die(const char *reason) {
  if (reason != NULL) {
    (void)dprintf(STDERR_FILENO, "VOID_CUSTODY_FIRST_ENTRY_HOLD:%s\n", reason);
  }
  _exit(111);
}

static void verify_directory_stat(const struct stat *st) {
  if (!S_ISDIR(st->st_mode)) die("ancestor_not_directory");
  if (st->st_uid != 0 || st->st_gid != 0) die("ancestor_not_root_owned");
  if ((st->st_mode & 0022) != 0) die("ancestor_group_world_writable");
}

static void verify_ancestry(const char *path) {
  char buffer[PATH_MAX];
  char *cursor;
  int fd;
  struct stat st;

  if (!safe_absolute_path(path)) die("path_not_canonical_absolute");
  if (strlen(path) >= sizeof(buffer)) die("path_too_long");
  memcpy(buffer, path, strlen(path) + 1);

  fd = open("/", O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
  if (fd < 0) die("open_filesystem_root_failed");
  if (fstat(fd, &st) != 0) die("stat_filesystem_root_failed");
  verify_directory_stat(&st);

  cursor = buffer + 1;
  for (;;) {
    char *slash = strchr(cursor, '/');
    int next_fd;
    if (slash == NULL) break;
    *slash = '\0';
    if (*cursor == '\0') die("empty_path_component");
    next_fd = openat(
      fd,
      cursor,
      O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC
    );
    if (next_fd < 0) die("open_ancestor_failed");
    if (fstat(next_fd, &st) != 0) die("stat_ancestor_failed");
    verify_directory_stat(&st);
    if (close(fd) != 0) die("close_ancestor_failed");
    fd = next_fd;
    cursor = slash + 1;
  }
  if (close(fd) != 0) die("close_parent_failed");
}

static int open_leaf_nofollow_nonblocking(const char *path) {
  return open(path, O_RDONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC);
}

static int open_verified_regular(
  const char *path,
  mode_t expected_mode,
  off_t expected_bytes,
  const char *expected_sha256
) {
  struct stat before, opened, after, visible;
  struct void_sha256_ctx ctx;
  unsigned char digest[32];
  unsigned char buffer[65536];
  off_t total = 0;
  int fd;

  verify_ancestry(path);
  if (lstat(path, &before) != 0) die("lstat_trusted_file_failed");
  if (
    !S_ISREG(before.st_mode) ||
    S_ISLNK(before.st_mode) ||
    before.st_uid != 0 ||
    before.st_gid != 0 ||
    (before.st_mode & 07777) != expected_mode ||
    before.st_nlink != 1 ||
    before.st_size != expected_bytes
  ) {
    die("trusted_file_metadata_invalid");
  }

  fd = open_leaf_nofollow_nonblocking(path);
  if (fd < 0) die("open_trusted_file_failed");
  if (fstat(fd, &opened) != 0) die("fstat_trusted_file_failed");
  if (!same_generation(&before, &opened)) die("trusted_file_rebound");

  sha256_init(&ctx);
  for (;;) {
    ssize_t n = read(fd, buffer, sizeof(buffer));
    if (n < 0) {
      if (errno == EINTR) continue;
      die("trusted_file_read_failed");
    }
    if (n == 0) break;
    total += (off_t)n;
    if (total > expected_bytes) die("trusted_file_grew");
    sha256_update(&ctx, buffer, (size_t)n);
  }
  if (total != expected_bytes) die("trusted_file_short");
  sha256_final(&ctx, digest);
  if (!digest_matches_hex(digest, expected_sha256)) {
    die("trusted_file_digest_mismatch");
  }

  if (fstat(fd, &after) != 0) die("trusted_file_post_fstat_failed");
  if (lstat(path, &visible) != 0) die("trusted_file_post_lstat_failed");
  if (
    !same_generation(&opened, &after) ||
    !same_generation(&after, &visible)
  ) {
    die("trusted_file_generation_changed");
  }
  if (lseek(fd, 0, SEEK_SET) != 0) die("trusted_file_rewind_failed");
  return fd;
}

static void verify_static_elf64_x86_64_fd(int fd) {
  Elf64_Ehdr eh;
  struct stat st;
  size_t i;
  int have_load = 0;

  if (fstat(fd, &st) != 0) die("fstat_static_python_failed");
  if (!S_ISREG(st.st_mode) || st.st_size < (off_t)sizeof(eh)) {
    die("static_python_file_shape_invalid");
  }
  if (pread(fd, &eh, sizeof(eh), 0) != (ssize_t)sizeof(eh)) {
    die("read_static_python_elf_header_failed");
  }
  if (
    memcmp(eh.e_ident, ELFMAG, SELFMAG) != 0 ||
    eh.e_ident[EI_CLASS] != ELFCLASS64 ||
    eh.e_ident[EI_DATA] != ELFDATA2LSB ||
    eh.e_ident[EI_VERSION] != EV_CURRENT ||
    eh.e_type != ET_EXEC ||
    eh.e_machine != EM_X86_64 ||
    eh.e_version != EV_CURRENT ||
    eh.e_phentsize != sizeof(Elf64_Phdr) ||
    eh.e_phnum < 1 ||
    eh.e_phnum > 128
  ) {
    die("static_python_elf_identity_invalid");
  }
  if (
    eh.e_phoff > (Elf64_Off)st.st_size ||
    (Elf64_Off)eh.e_phnum >
      ((Elf64_Off)st.st_size - eh.e_phoff) / sizeof(Elf64_Phdr)
  ) {
    die("static_python_program_headers_out_of_bounds");
  }

  for (i = 0; i < (size_t)eh.e_phnum; ++i) {
    Elf64_Phdr ph;
    off_t offset = (off_t)(
      eh.e_phoff + ((Elf64_Off)i * sizeof(Elf64_Phdr))
    );
    if (pread(fd, &ph, sizeof(ph), offset) != (ssize_t)sizeof(ph)) {
      die("read_static_python_program_header_failed");
    }
    if (ph.p_type == PT_INTERP) die("static_python_pt_interp_forbidden");
    if (ph.p_type == PT_DYNAMIC) die("static_python_pt_dynamic_forbidden");
    if (ph.p_type == PT_LOAD) have_load = 1;
  }
  if (!have_load) die("static_python_pt_load_required");
}

static void verify_self_generation(void) {
  struct stat exe_st, path_st;
  int exe_fd, path_fd;

  verify_ancestry(VOID_FIRST_ENTRY_BIN);
  exe_fd = open("/proc/self/exe", O_RDONLY|O_CLOEXEC);
  if (exe_fd < 0) die("open_self_exe_failed");
  path_fd = open_leaf_nofollow_nonblocking(VOID_FIRST_ENTRY_BIN);
  if (path_fd < 0) die("open_installed_self_failed");
  if (fstat(exe_fd, &exe_st) != 0 || fstat(path_fd, &path_st) != 0) {
    die("stat_self_generation_failed");
  }
  if (
    exe_st.st_dev != path_st.st_dev ||
    exe_st.st_ino != path_st.st_ino ||
    path_st.st_uid != 0 ||
    path_st.st_gid != 0 ||
    (path_st.st_mode & 07777) != 0555 ||
    path_st.st_nlink != 1
  ) {
    die("self_generation_or_metadata_invalid");
  }
  if (close(exe_fd) != 0 || close(path_fd) != 0) {
    die("close_self_descriptor_failed");
  }
}

static int duplicate_to_fixed_fd(int source_fd, int target_fd, int cloexec) {
  int flags;
  errno = 0;
  if (fcntl(target_fd, F_GETFD) != -1 || errno != EBADF) {
    die("fixed_descriptor_already_open");
  }
  if (dup3(source_fd, target_fd, cloexec ? O_CLOEXEC : 0) < 0) {
    die("dup_fixed_descriptor_failed");
  }
  flags = fcntl(target_fd, F_GETFD);
  if (flags < 0) die("read_fixed_descriptor_flags_failed");
  if (cloexec) {
    if ((flags & FD_CLOEXEC) == 0) die("python_fd_not_cloexec");
  } else {
    if ((flags & FD_CLOEXEC) != 0) die("installer_fd_unexpected_cloexec");
  }
  return target_fd;
}

static void bind_stdin_dev_null(void) {
  struct stat st;
  int fd = open("/dev/null", O_RDONLY|O_CLOEXEC);
  if (fd < 0) die("open_dev_null_failed");
  if (fstat(fd, &st) != 0 || !S_ISCHR(st.st_mode)) {
    die("dev_null_not_character_device");
  }
  if (dup2(fd, STDIN_FILENO) != STDIN_FILENO) {
    die("dup_stdin_dev_null_failed");
  }
  if (fd != STDIN_FILENO && close(fd) != 0) {
    die("close_dev_null_failed");
  }
}

static void close_untrusted_descriptors(void) {
  if (VOID_INSTALLER_FD > 3) {
    if (syscall(SYS_close_range, 3U, (unsigned int)(VOID_INSTALLER_FD - 1), 0U) != 0) {
      die("close_range_before_installer_failed");
    }
  }
  if (VOID_PYTHON_FD > VOID_INSTALLER_FD + 1) {
    if (
      syscall(
        SYS_close_range,
        (unsigned int)(VOID_INSTALLER_FD + 1),
        (unsigned int)(VOID_PYTHON_FD - 1),
        0U
      ) != 0
    ) {
      die("close_range_between_trusted_fds_failed");
    }
  }
  if (
    syscall(
      SYS_close_range,
      (unsigned int)(VOID_PYTHON_FD + 1),
      UINT_MAX,
      0U
    ) != 0
  ) {
    die("close_range_after_python_failed");
  }
}

static void verify_closed_environment(char **envp) {
  if (envp == NULL || envp[0] != NULL) die("nonempty_environment_forbidden");
}

static void verify_exact_argv(int argc, char **argv) {
  if (argc != 4) die("argument_count_invalid");
  if (strcmp(argv[1], VOID_OPERATION) != 0) die("operation_invalid");
  if (strcmp(argv[2], VOID_CONFIRM_FLAG) != 0) die("confirm_flag_invalid");
  if (strcmp(argv[3], VOID_CONFIRM_TOKEN) != 0) die("confirmation_invalid");
}

int main(int argc, char **argv, char **envp) {
  int installer_fd;
  int python_fd;
  char *child_argv[] = {
    (char *)VOID_PYTHON_PATH,
    (char *)"-I",
    (char *)"-B",
    (char *)"-S",
    (char *)"-c",
    (char *)VOID_PYTHON_BOOTSTRAP,
    NULL
  };
  char *child_env[] = { NULL };

  verify_exact_argv(argc, argv);
  verify_closed_environment(envp);

  if (getuid() != 0 || geteuid() != 0 || getgid() != 0 || getegid() != 0) {
    die("root_identity_required");
  }
  if (setgroups(0, NULL) != 0) die("clear_supplementary_groups_failed");
  {
    int groups = getgroups(0, NULL);
    if (groups != 0) die("supplementary_groups_not_empty");
  }

  verify_self_generation();

  {
    int policy_fd = open_verified_regular(
      VOID_FIRST_ENTRY_POLICY,
      VOID_POLICY_MODE,
      VOID_POLICY_BYTES,
      VOID_POLICY_SHA256_HEX
    );
    if (close(policy_fd) != 0) die("close_policy_failed");
  }

  installer_fd = open_verified_regular(
    VOID_INSTALLER_PATH,
    VOID_INSTALLER_MODE,
    VOID_INSTALLER_BYTES,
    VOID_INSTALLER_SHA256_HEX
  );

  {
    int fd = open_verified_regular(
      VOID_INSTALL_PLAN_PATH,
      VOID_INSTALL_PLAN_MODE,
      VOID_INSTALL_PLAN_BYTES,
      VOID_INSTALL_PLAN_SHA256_HEX
    );
    if (close(fd) != 0) die("close_install_plan_failed");
  }
  {
    int fd = open_verified_regular(
      VOID_SOURCE_LOCK_PATH,
      VOID_SOURCE_LOCK_MODE,
      VOID_SOURCE_LOCK_BYTES,
      VOID_SOURCE_LOCK_SHA256_HEX
    );
    if (close(fd) != 0) die("close_source_lock_failed");
  }
  {
    int fd = open_verified_regular(
      VOID_PROTECTED_CENSUS_PATH,
      VOID_PROTECTED_CENSUS_MODE,
      VOID_PROTECTED_CENSUS_BYTES,
      VOID_PROTECTED_CENSUS_SHA256_HEX
    );
    if (close(fd) != 0) die("close_protected_census_failed");
  }

  python_fd = open_verified_regular(
    VOID_PYTHON_PATH,
    VOID_PYTHON_MODE,
    VOID_PYTHON_BYTES,
    VOID_PYTHON_SHA256_HEX
  );
  verify_static_elf64_x86_64_fd(python_fd);

  {
    int stdlib_fd = open_verified_regular(
      VOID_PYTHON_STDLIB_PATH,
      VOID_PYTHON_STDLIB_MODE,
      VOID_PYTHON_STDLIB_BYTES,
      VOID_PYTHON_STDLIB_SHA256_HEX
    );
    if (close(stdlib_fd) != 0) die("close_stdlib_archive_failed");
  }

  (void)duplicate_to_fixed_fd(installer_fd, VOID_INSTALLER_FD, 0);
  (void)duplicate_to_fixed_fd(python_fd, VOID_PYTHON_FD, 1);
  if (close(installer_fd) != 0 || close(python_fd) != 0) {
    die("close_original_trusted_fd_failed");
  }

  bind_stdin_dev_null();
  if (chdir("/") != 0) die("chdir_root_failed");
  if (umask(0077) != 0) {
    /* umask returns the prior mask; any value is valid. */
  }
  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0) {
    die("no_new_privileges_failed");
  }

  close_untrusted_descriptors();

  if (fexecve(VOID_PYTHON_FD, child_argv, child_env) != 0) {
    die("python_fexecve_failed");
  }
  die("python_fexecve_returned");
  return 111;
}
