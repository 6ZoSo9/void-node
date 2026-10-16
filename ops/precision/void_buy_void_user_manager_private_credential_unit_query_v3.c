#define main void_buy_void_private_peer_guard_embedded_main
#include "void_buy_void_user_manager_private_peer_guard_v1.c"
#undef main
#undef MARKER

#include <dlfcn.h>
#include <limits.h>
#include <stddef.h>

#define MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3"
#define NODE_EXE "/usr/bin/node"
#define LIBSYSTEMD_SONAME "/usr/lib/x86_64-linux-gnu/libsystemd.so.0"
#define SANITIZED_ENV_MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1"
#define E2_CREDENTIAL_ID "buy-void-epoch2-fulfiller-v1"
#define E2_DROPIN_BASENAME "97-buy-void-epoch2-fulfiller-credential-v1.conf"
#define MAX_DROPIN_PATHS 64
#define MAX_DROPIN_TOTAL_BYTES (64 * 1024)
#define MAX_LOAD_CREDENTIALS 32
#define MAX_LOAD_CREDENTIAL_TOTAL_BYTES (64 * 1024)
#define MAX_CREDENTIAL_ID_BYTES 256

typedef struct sd_bus sd_bus;
typedef struct sd_bus_message sd_bus_message;

struct sd_api {
  void *handle;
  int library_fd;
  char library_path[PATH_MAX];
  int (*bus_new)(sd_bus **);
  int (*bus_set_fd)(sd_bus *, int, int);
  int (*bus_set_bus_client)(sd_bus *, int);
  int (*bus_set_method_call_timeout)(sd_bus *, uint64_t);
  int (*bus_start)(sd_bus *);
  int (*bus_get_fd)(sd_bus *);
  int (*bus_call_method)(
      sd_bus *, const char *, const char *, const char *, const char *,
      void *, sd_bus_message **, const char *, ...);
  int (*message_read)(sd_bus_message *, const char *, ...);
  int (*get_property_string)(
      sd_bus *, const char *, const char *, const char *, const char *,
      void *, char **);
  int (*get_property_trivial)(
      sd_bus *, const char *, const char *, const char *, const char *,
      void *, char, void *);
  sd_bus_message *(*message_unref)(sd_bus_message *);
  sd_bus *(*bus_unref)(sd_bus *);
};

struct credential_sd_api {
  int (*get_property)(
      sd_bus *, const char *, const char *, const char *, const char *,
      void *, sd_bus_message **, const char *);
  int (*message_enter_container)(sd_bus_message *, char, const char *);
  int (*message_exit_container)(sd_bus_message *);
};

struct unit_observation {
  char load_state[32];
  char active_state[32];
  char sub_state[32];
  char control_group[512];
  uint32_t main_pid;
};

struct dropin_set_observation {
  size_t count;
  size_t credential_match_count;
  size_t canonical_bytes;
  char credential_dropin_path[PATH_MAX];
  char canonical_paths[MAX_DROPIN_TOTAL_BYTES + 1];
};

struct credential_observation {
  int need_daemon_reload;
  size_t load_credential_count;
  size_t load_credential_match_count;
  size_t load_credential_canonical_bytes;
  char fragment_path[PATH_MAX];
  struct dropin_set_observation dropins;
  char credential_source[PATH_MAX];
  char canonical_load_credentials[MAX_LOAD_CREDENTIAL_TOTAL_BYTES + 1];
};

typedef struct {
  unsigned char data[64];
  uint32_t datalen;
  uint64_t bitlen;
  uint32_t state[8];
} credential_sha256_ctx;

static const uint32_t CREDENTIAL_SHA256_K[64] = {
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

static uint32_t credential_rotr32(uint32_t x, uint32_t n) {
  return (x >> n) | (x << (32U - n));
}

static void credential_sha256_transform(
    credential_sha256_ctx *c,
    const unsigned char d[64]) {
  uint32_t m[64];
  for (size_t i = 0; i < 16; ++i) {
    size_t j = i * 4U;
    m[i] = ((uint32_t)d[j] << 24) |
        ((uint32_t)d[j + 1] << 16) |
        ((uint32_t)d[j + 2] << 8) |
        (uint32_t)d[j + 3];
  }
  for (size_t i = 16; i < 64; ++i) {
    uint32_t s0 =
        credential_rotr32(m[i - 15], 7) ^
        credential_rotr32(m[i - 15], 18) ^
        (m[i - 15] >> 3);
    uint32_t s1 =
        credential_rotr32(m[i - 2], 17) ^
        credential_rotr32(m[i - 2], 19) ^
        (m[i - 2] >> 10);
    m[i] = m[i - 16] + s0 + m[i - 7] + s1;
  }
  uint32_t a=c->state[0], b=c->state[1], cc=c->state[2], d0=c->state[3];
  uint32_t e=c->state[4], f=c->state[5], g=c->state[6], h=c->state[7];
  for (size_t i = 0; i < 64; ++i) {
    uint32_t s1 =
        credential_rotr32(e, 6) ^
        credential_rotr32(e, 11) ^
        credential_rotr32(e, 25);
    uint32_t ch = (e & f) ^ ((~e) & g);
    uint32_t t1 = h + s1 + ch + CREDENTIAL_SHA256_K[i] + m[i];
    uint32_t s0 =
        credential_rotr32(a, 2) ^
        credential_rotr32(a, 13) ^
        credential_rotr32(a, 22);
    uint32_t maj = (a & b) ^ (a & cc) ^ (b & cc);
    uint32_t t2 = s0 + maj;
    h=g; g=f; f=e; e=d0+t1; d0=cc; cc=b; b=a; a=t1+t2;
  }
  c->state[0]+=a; c->state[1]+=b; c->state[2]+=cc; c->state[3]+=d0;
  c->state[4]+=e; c->state[5]+=f; c->state[6]+=g; c->state[7]+=h;
}

static void credential_sha256_init(credential_sha256_ctx *c) {
  c->datalen=0; c->bitlen=0;
  c->state[0]=0x6a09e667U; c->state[1]=0xbb67ae85U;
  c->state[2]=0x3c6ef372U; c->state[3]=0xa54ff53aU;
  c->state[4]=0x510e527fU; c->state[5]=0x9b05688cU;
  c->state[6]=0x1f83d9abU; c->state[7]=0x5be0cd19U;
}

static void credential_sha256_update(
    credential_sha256_ctx *c,
    const unsigned char *d,
    size_t n) {
  for (size_t i = 0; i < n; ++i) {
    c->data[c->datalen++] = d[i];
    if (c->datalen == 64U) {
      credential_sha256_transform(c, c->data);
      c->bitlen += 512U;
      c->datalen = 0;
    }
  }
}

static void credential_sha256_final(
    credential_sha256_ctx *c,
    unsigned char out[32]) {
  uint32_t i = c->datalen;
  c->data[i++] = 0x80U;
  if (i > 56U) {
    while (i < 64U) c->data[i++] = 0;
    credential_sha256_transform(c, c->data);
    i = 0;
  }
  while (i < 56U) c->data[i++] = 0;
  c->bitlen += (uint64_t)c->datalen * 8U;
  for (size_t j = 0; j < 8; ++j)
    c->data[63U - j] = (unsigned char)(c->bitlen >> (j * 8U));
  credential_sha256_transform(c, c->data);
  for (size_t j = 0; j < 8; ++j) {
    out[j * 4U] = (unsigned char)(c->state[j] >> 24);
    out[j * 4U + 1] = (unsigned char)(c->state[j] >> 16);
    out[j * 4U + 2] = (unsigned char)(c->state[j] >> 8);
    out[j * 4U + 3] = (unsigned char)c->state[j];
  }
}

static void credential_sha256_hex(
    const unsigned char *data,
    size_t length,
    char out[65]) {
  static const char hex[] = "0123456789abcdef";
  unsigned char digest[32];
  credential_sha256_ctx ctx;
  credential_sha256_init(&ctx);
  credential_sha256_update(&ctx, data, length);
  credential_sha256_final(&ctx, digest);
  for (size_t i = 0; i < 32; ++i) {
    out[i * 2] = hex[digest[i] >> 4];
    out[i * 2 + 1] = hex[digest[i] & 0x0fU];
  }
  out[64] = '\0';
  memset(digest, 0, sizeof(digest));
  memset(&ctx, 0, sizeof(ctx));
}

static void credential_die(const char *code) {
  fprintf(stderr, "%s_HOLD\nreason=%s\n", MARKER, code);
  exit(2);
}

static int clean_loader_environment(void) {
  const char *marker = getenv(SANITIZED_ENV_MARKER);
  if (!marker || strcmp(marker, "1") != 0) return -1;
  const char *forbidden[] = {
    "LD_PRELOAD", "LD_LIBRARY_PATH", "LD_AUDIT", "LD_DEBUG",
    "LD_PROFILE", "LD_ORIGIN_PATH", "LD_ASSUME_KERNEL", "LD_BIND_NOW",
    "LD_DYNAMIC_WEAK", "LD_HWCAP_MASK", "LD_POINTER_GUARD",
    "LD_SHOW_AUXV", "LD_USE_LOAD_BIAS", "GLIBC_TUNABLES", NULL
  };
  for (size_t i = 0; forbidden[i] != NULL; ++i) {
    if (getenv(forbidden[i]) != NULL) return -1;
  }
  return 0;
}

static int trusted_directory(const char *p) {
  struct stat st;
  if (lstat(p, &st) != 0 || !S_ISDIR(st.st_mode) || S_ISLNK(st.st_mode) ||
      st.st_uid != 0 || (st.st_mode & 0022) != 0) return -1;
  return 0;
}

static int open_verified_libsystemd(
    int *out_fd,
    char *resolved,
    size_t cap) {
  if (!out_fd || !resolved || cap < 2) return -1;
  if (trusted_directory("/") != 0 ||
      trusted_directory("/usr") != 0 ||
      trusted_directory("/usr/lib") != 0 ||
      trusted_directory("/usr/lib/x86_64-linux-gnu") != 0) return -1;

  struct stat link_st;
  if (lstat(LIBSYSTEMD_SONAME, &link_st) != 0 || link_st.st_uid != 0 ||
      link_st.st_nlink != 1) return -1;
  if (!S_ISLNK(link_st.st_mode) && !S_ISREG(link_st.st_mode)) return -1;
  if (S_ISREG(link_st.st_mode) && (link_st.st_mode & 0022) != 0) return -1;

  char target[PATH_MAX];
  if (!realpath(LIBSYSTEMD_SONAME, target)) return -1;
  const char *prefix = "/usr/lib/x86_64-linux-gnu/libsystemd.so.0";
  if (strncmp(target, prefix, strlen(prefix)) != 0 ||
      target[strlen(prefix)] == '/') return -1;
  size_t n = strlen(target);
  if (n + 1 > cap) return -1;

  struct stat visible;
  if (lstat(target, &visible) != 0 || !S_ISREG(visible.st_mode) ||
      S_ISLNK(visible.st_mode) || visible.st_uid != 0 ||
      (visible.st_mode & 0022) != 0 || visible.st_nlink != 1 ||
      visible.st_size <= 0) return -1;

  int fd = open(target, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (fd < 0) return -1;
  struct stat held;
  if (fstat(fd, &held) != 0 || held.st_dev != visible.st_dev ||
      held.st_ino != visible.st_ino || held.st_uid != visible.st_uid ||
      held.st_gid != visible.st_gid || held.st_mode != visible.st_mode ||
      held.st_nlink != visible.st_nlink || held.st_size != visible.st_size) {
    close(fd);
    return -1;
  }
  memcpy(resolved, target, n + 1);
  *out_fd = fd;
  return 0;
}

static int load_symbol(
    void *handle,
    const char *name,
    const char *expected_path,
    void *target) {
  void *value = dlsym(handle, name);
  if (!value) return -1;
  Dl_info info;
  memset(&info, 0, sizeof(info));
  if (dladdr(value, &info) == 0 || !info.dli_fname) return -1;
  char loaded[PATH_MAX];
  if (!realpath(info.dli_fname, loaded) ||
      strcmp(loaded, expected_path) != 0) return -1;
  memcpy(target, &value, sizeof(value));
  return 0;
}

static int load_sd_api(struct sd_api *api) {
  memset(api, 0, sizeof(*api));
  api->library_fd = -1;
  if (clean_loader_environment() != 0) return -1;
  if (open_verified_libsystemd(
          &api->library_fd, api->library_path,
          sizeof(api->library_path)) != 0) return -1;

  char procfd[64];
  if (snprintf(
          procfd, sizeof(procfd), "/proc/self/fd/%d",
          api->library_fd) >= (int)sizeof(procfd)) goto fail;
  api->handle = dlopen(procfd, RTLD_NOW | RTLD_LOCAL);
  if (!api->handle) goto fail;

#define LOAD(field, symbol) do { \
  if (load_symbol( \
          api->handle, symbol, api->library_path, &api->field) != 0) \
    goto fail; \
} while (0)
  LOAD(bus_new, "sd_bus_new");
  LOAD(bus_set_fd, "sd_bus_set_fd");
  LOAD(bus_set_bus_client, "sd_bus_set_bus_client");
  LOAD(bus_set_method_call_timeout, "sd_bus_set_method_call_timeout");
  LOAD(bus_start, "sd_bus_start");
  LOAD(bus_get_fd, "sd_bus_get_fd");
  LOAD(bus_call_method, "sd_bus_call_method");
  LOAD(message_read, "sd_bus_message_read");
  LOAD(get_property_string, "sd_bus_get_property_string");
  LOAD(get_property_trivial, "sd_bus_get_property_trivial");
  LOAD(message_unref, "sd_bus_message_unref");
  LOAD(bus_unref, "sd_bus_unref");
#undef LOAD

  struct stat held, visible;
  if (fstat(api->library_fd, &held) != 0 ||
      lstat(api->library_path, &visible) != 0 ||
      !S_ISREG(visible.st_mode) || S_ISLNK(visible.st_mode) ||
      held.st_dev != visible.st_dev || held.st_ino != visible.st_ino ||
      held.st_uid != visible.st_uid || held.st_gid != visible.st_gid ||
      held.st_mode != visible.st_mode || held.st_nlink != visible.st_nlink ||
      held.st_size != visible.st_size) goto fail;
  return 0;

fail:
  if (api->handle) dlclose(api->handle);
  if (api->library_fd >= 0) close(api->library_fd);
  memset(api, 0, sizeof(*api));
  api->library_fd = -1;
  return -1;
}

static void unload_sd_api(struct sd_api *api) {
  if (api->handle) dlclose(api->handle);
  if (api->library_fd >= 0) close(api->library_fd);
  memset(api, 0, sizeof(*api));
  api->library_fd = -1;
}

static int load_credential_sd_api(
    const struct sd_api *base,
    struct credential_sd_api *extra) {
  if (!base || !base->handle || !extra) return -1;
  memset(extra, 0, sizeof(*extra));
#define LOAD_EXTRA(field, symbol) do { \
  if (load_symbol( \
          base->handle, symbol, base->library_path, &extra->field) != 0) \
    return -1; \
} while (0)
  LOAD_EXTRA(get_property, "sd_bus_get_property");
  LOAD_EXTRA(message_enter_container, "sd_bus_message_enter_container");
  LOAD_EXTRA(message_exit_container, "sd_bus_message_exit_container");
#undef LOAD_EXTRA
  return 0;
}

static int copy_string(char *dst, size_t cap, const char *src) {
  if (!dst || cap < 2 || !src) return -1;
  size_t n = strlen(src);
  if (n >= cap || memchr(src, '\n', n) || memchr(src, '\r', n)) return -1;
  memcpy(dst, src, n + 1);
  return 0;
}

static int canonical_absolute_path(const char *value) {
  if (!value || value[0] != '/') return -1;
  size_t n = strlen(value);
  if (n < 2 || n >= PATH_MAX ||
      memchr(value, '\n', n) || memchr(value, '\r', n) ||
      strstr(value, "//") != NULL) return -1;
  const char *p = value + 1;
  while (*p) {
    const char *slash = strchr(p, '/');
    size_t len = slash ? (size_t)(slash - p) : strlen(p);
    if (len == 0 ||
        (len == 1 && p[0] == '.') ||
        (len == 2 && p[0] == '.' && p[1] == '.')) return -1;
    if (!slash) break;
    p = slash + 1;
  }
  return 0;
}

static const char *path_basename_const(const char *value) {
  const char *slash = strrchr(value, '/');
  return slash ? slash + 1 : value;
}

static int add_dropin_path(
    struct dropin_set_observation *out,
    const char *value) {
  if (!out || canonical_absolute_path(value) != 0 ||
      out->count >= MAX_DROPIN_PATHS) return -1;
  size_t n = strlen(value);
  if (n + 1 > MAX_DROPIN_TOTAL_BYTES - out->canonical_bytes) return -1;

  memcpy(out->canonical_paths + out->canonical_bytes, value, n);
  out->canonical_bytes += n;
  out->canonical_paths[out->canonical_bytes++] = '\n';
  out->canonical_paths[out->canonical_bytes] = '\0';
  ++out->count;

  if (strcmp(path_basename_const(value), E2_DROPIN_BASENAME) == 0) {
    ++out->credential_match_count;
    if (out->credential_match_count != 1 ||
        copy_string(
            out->credential_dropin_path,
            sizeof(out->credential_dropin_path),
            value) != 0) return -1;
  }
  return 0;
}

static int dropin_set_complete(
    const struct dropin_set_observation *out) {
  return out && out->count > 0 && out->credential_match_count == 1 ? 0 : -1;
}

static int exact_service_cgroup(pid_t pid, uid_t uid, const char *unit) {
  char proc_path[128];
  if (snprintf(
          proc_path, sizeof(proc_path), "/proc/%ld/cgroup",
          (long)pid) >= (int)sizeof(proc_path)) return -1;
  unsigned char raw[4096];
  size_t len = 0;
  if (read_bounded(proc_path, raw, sizeof(raw) - 1, &len) != 0) return -1;
  raw[len] = '\0';

  char expected[512];
  int n = snprintf(
      expected, sizeof(expected),
      "0::/user.slice/user-%lu.slice/user@%lu.service/app.slice/%s\n",
      (unsigned long)uid, (unsigned long)uid, unit);
  if (n <= 0 || n >= (int)sizeof(expected)) return -1;
  return len == (size_t)n && memcmp(raw, expected, len) == 0 ? 0 : -1;
}

static int exact_executable_path(pid_t pid, const char *expected_path) {
  char proc_path[128];
  if (snprintf(
          proc_path, sizeof(proc_path), "/proc/%ld/exe",
          (long)pid) >= (int)sizeof(proc_path)) return -1;
  char link[4096];
  ssize_t n = readlink(proc_path, link, sizeof(link) - 1);
  if (n < 0 || (size_t)n >= sizeof(link) - 1) return -1;
  link[n] = '\0';
  if (strcmp(link, expected_path) != 0) return -1;

  struct stat expected, observed;
  if (lstat(expected_path, &expected) != 0 || !S_ISREG(expected.st_mode) ||
      expected.st_uid != 0 || (expected.st_mode & 0022) != 0 ||
      (expected.st_mode & 0111) == 0) return -1;
  if (stat(proc_path, &observed) != 0) return -1;
  return expected.st_dev == observed.st_dev &&
      expected.st_ino == observed.st_ino ? 0 : -1;
}

static int get_string_prop(
    struct sd_api *api,
    sd_bus *bus,
    const char *object,
    const char *interface,
    const char *property,
    char *dst,
    size_t cap) {
  char *value = NULL;
  int r = api->get_property_string(
      bus, NULL, object, interface, property, NULL, &value);
  if (r < 0 || !value) {
    free(value);
    return -1;
  }
  int out = copy_string(dst, cap, value);
  free(value);
  return out;
}

static int get_unit_object(
    struct sd_api *api,
    sd_bus *bus,
    const char *unit,
    char *dst,
    size_t cap) {
  sd_bus_message *reply = NULL;
  int r = api->bus_call_method(
      bus, NULL, "/org/freedesktop/systemd1",
      "org.freedesktop.systemd1.Manager", "GetUnit",
      NULL, &reply, "s", unit);
  if (r < 0 || !reply) return -1;
  const char *object = NULL;
  r = api->message_read(reply, "o", &object);
  if (r < 0 || !object ||
      strncmp(
          object, "/org/freedesktop/systemd1/unit/",
          strlen("/org/freedesktop/systemd1/unit/")) != 0 ||
      copy_string(dst, cap, object) != 0) {
    api->message_unref(reply);
    return -1;
  }
  api->message_unref(reply);
  return 0;
}

static int query_unit(
    struct sd_api *api,
    sd_bus *bus,
    const char *object,
    struct unit_observation *out) {
  memset(out, 0, sizeof(*out));
  if (get_string_prop(
          api, bus, object, "org.freedesktop.systemd1.Unit",
          "LoadState", out->load_state, sizeof(out->load_state)) != 0 ||
      get_string_prop(
          api, bus, object, "org.freedesktop.systemd1.Unit",
          "ActiveState", out->active_state, sizeof(out->active_state)) != 0 ||
      get_string_prop(
          api, bus, object, "org.freedesktop.systemd1.Unit",
          "SubState", out->sub_state, sizeof(out->sub_state)) != 0 ||
      get_string_prop(
          api, bus, object, "org.freedesktop.systemd1.Service",
          "ControlGroup", out->control_group, sizeof(out->control_group)) != 0 ||
      api->get_property_trivial(
          bus, NULL, object, "org.freedesktop.systemd1.Service",
          "MainPID", NULL, 'u', &out->main_pid) < 0) return -1;
  return 0;
}

static int validate_unit(
    uid_t uid,
    const char *unit,
    const struct proc_identity *manager,
    const struct unit_observation *obs,
    struct proc_identity *service) {
  if (strcmp(obs->load_state, "loaded") != 0 ||
      strcmp(obs->active_state, "active") != 0 ||
      strcmp(obs->sub_state, "running") != 0 ||
      obs->main_pid <= 1) return -1;

  char expected_cgroup[512];
  int n = snprintf(
      expected_cgroup, sizeof(expected_cgroup),
      "/user.slice/user-%lu.slice/user@%lu.service/app.slice/%s",
      (unsigned long)uid, (unsigned long)uid, unit);
  if (n <= 0 || n >= (int)sizeof(expected_cgroup) ||
      strcmp(obs->control_group, expected_cgroup) != 0) return -1;

  pid_t ppid = 0;
  unsigned long long start = 0;
  if (proc_stat_identity(
          (pid_t)obs->main_pid, &ppid, &start) != 0 ||
      ppid != manager->pid) return -1;
  uid_t observed_uid = 0;
  gid_t observed_gid = 0;
  if (parse_status_ids(
          (pid_t)obs->main_pid, uid,
          &observed_uid, &observed_gid) != 0 ||
      observed_gid != manager->gid ||
      exact_service_cgroup(
          (pid_t)obs->main_pid, uid, unit) != 0 ||
      exact_executable_path(
          (pid_t)obs->main_pid, NODE_EXE) != 0) return -1;

  service->pid = (pid_t)obs->main_pid;
  service->ppid = ppid;
  service->uid = observed_uid;
  service->gid = observed_gid;
  service->start_ticks = start;
  return 0;
}

static int get_bounded_dropins(
    struct sd_api *api,
    const struct credential_sd_api *extra,
    sd_bus *bus,
    const char *object,
    struct dropin_set_observation *out) {
  if (!out) return -1;
  memset(out, 0, sizeof(*out));

  sd_bus_message *reply = NULL;
  int r = extra->get_property(
      bus, NULL, object, "org.freedesktop.systemd1.Unit", "DropInPaths",
      NULL, &reply, "as");
  if (r < 0 || !reply) return -1;
  if (extra->message_enter_container(reply, 'a', "s") < 0) {
    api->message_unref(reply);
    return -1;
  }

  const char *value = NULL;
  while ((r = api->message_read(reply, "s", &value)) > 0) {
    if (add_dropin_path(out, value) != 0) {
      api->message_unref(reply);
      return -1;
    }
  }
  if (r < 0 || extra->message_exit_container(reply) < 0) {
    api->message_unref(reply);
    return -1;
  }
  api->message_unref(reply);
  return dropin_set_complete(out);
}

static int valid_credential_id(const char *id) {
  if (!id || !*id) return -1;
  size_t n = strlen(id);
  if (n >= MAX_CREDENTIAL_ID_BYTES) return -1;
  for (size_t i = 0; i < n; ++i) {
    unsigned char ch = (unsigned char)id[i];
    if (!((ch >= 'A' && ch <= 'Z') ||
          (ch >= 'a' && ch <= 'z') ||
          (ch >= '0' && ch <= '9') ||
          ch == '_' || ch == '.' || ch == '-')) return -1;
  }
  return 0;
}

static int credential_id_already_present(
    const struct credential_observation *out,
    const char *id) {
  if (!out || !id) return -1;
  size_t id_len = strlen(id);
  const char *p = out->canonical_load_credentials;
  while (*p) {
    const char *line_end = strchr(p, '\n');
    if (!line_end) return -1;
    const char *eq = memchr(p, '=', (size_t)(line_end - p));
    if (!eq) return -1;
    if ((size_t)(eq - p) == id_len && memcmp(p, id, id_len) == 0) return 1;
    p = line_end + 1;
  }
  return 0;
}

static int add_load_credential(
    struct credential_observation *out,
    const char *id,
    const char *path) {
  if (!out || valid_credential_id(id) != 0 ||
      canonical_absolute_path(path) != 0 ||
      out->load_credential_count >= MAX_LOAD_CREDENTIALS) return -1;

  int duplicate = credential_id_already_present(out, id);
  if (duplicate != 0) return -1;

  size_t id_len = strlen(id);
  size_t path_len = strlen(path);
  size_t needed = id_len + 1 + path_len + 1;
  if (needed > MAX_LOAD_CREDENTIAL_TOTAL_BYTES -
      out->load_credential_canonical_bytes) return -1;

  char *dst = out->canonical_load_credentials +
      out->load_credential_canonical_bytes;
  memcpy(dst, id, id_len);
  dst += id_len;
  *dst++ = '=';
  memcpy(dst, path, path_len);
  dst += path_len;
  *dst++ = '\n';
  *dst = '\0';
  out->load_credential_canonical_bytes += needed;
  out->load_credential_count += 1;

  if (strcmp(id, E2_CREDENTIAL_ID) == 0) {
    out->load_credential_match_count += 1;
    if (out->load_credential_match_count != 1 ||
        copy_string(
            out->credential_source,
            sizeof(out->credential_source),
            path) != 0) return -1;
  }
  return 0;
}

static int load_credential_set_complete(
    const struct credential_observation *out) {
  return out &&
      out->load_credential_count > 0 &&
      out->load_credential_count <= MAX_LOAD_CREDENTIALS &&
      out->load_credential_match_count == 1 &&
      out->load_credential_canonical_bytes > 0 &&
      out->load_credential_canonical_bytes <=
          MAX_LOAD_CREDENTIAL_TOTAL_BYTES ? 0 : -1;
}

static int get_bounded_load_credentials(
    struct sd_api *api,
    const struct credential_sd_api *extra,
    sd_bus *bus,
    const char *object,
    struct credential_observation *out) {
  sd_bus_message *reply = NULL;
  int r = extra->get_property(
      bus, NULL, object, "org.freedesktop.systemd1.Service", "LoadCredential",
      NULL, &reply, "a(ss)");
  if (r < 0 || !reply) return -1;
  if (extra->message_enter_container(reply, 'a', "(ss)") < 0) {
    api->message_unref(reply);
    return -1;
  }

  const char *id = NULL;
  const char *path = NULL;
  while ((r = api->message_read(reply, "(ss)", &id, &path)) > 0) {
    if (add_load_credential(out, id, path) != 0) {
      api->message_unref(reply);
      return -1;
    }
  }
  if (r < 0 || extra->message_exit_container(reply) < 0) {
    api->message_unref(reply);
    return -1;
  }
  api->message_unref(reply);
  return load_credential_set_complete(out);
}

static int query_credential_observation(
    struct sd_api *api,
    const struct credential_sd_api *extra,
    sd_bus *bus,
    const char *object,
    struct credential_observation *out) {
  memset(out, 0, sizeof(*out));
  if (api->get_property_trivial(
          bus, NULL, object, "org.freedesktop.systemd1.Unit",
          "NeedDaemonReload", NULL, 'b', &out->need_daemon_reload) < 0 ||
      get_string_prop(
          api, bus, object, "org.freedesktop.systemd1.Unit",
          "FragmentPath", out->fragment_path, sizeof(out->fragment_path)) != 0 ||
      get_bounded_dropins(
          api, extra, bus, object,
          &out->dropins) != 0 ||
      get_bounded_load_credentials(
          api, extra, bus, object, out) != 0) return -1;

  if (out->need_daemon_reload != 0 ||
      canonical_absolute_path(out->fragment_path) != 0 ||
      canonical_absolute_path(out->dropins.credential_dropin_path) != 0 ||
      canonical_absolute_path(out->credential_source) != 0 ||
      out->dropins.credential_match_count != 1 ||
      strcmp(
          path_basename_const(out->dropins.credential_dropin_path),
          E2_DROPIN_BASENAME) != 0 ||
      strcmp(
          out->fragment_path,
          out->dropins.credential_dropin_path) == 0) return -1;
  return 0;
}

static int same_unit_observation(
    const struct unit_observation *a,
    const struct unit_observation *b) {
  return strcmp(a->load_state, b->load_state) == 0 &&
      strcmp(a->active_state, b->active_state) == 0 &&
      strcmp(a->sub_state, b->sub_state) == 0 &&
      strcmp(a->control_group, b->control_group) == 0 &&
      a->main_pid == b->main_pid;
}

static int same_credential_observation(
    const struct credential_observation *a,
    const struct credential_observation *b) {
  return a->need_daemon_reload == b->need_daemon_reload &&
      a->load_credential_count == b->load_credential_count &&
      a->load_credential_match_count == b->load_credential_match_count &&
      a->load_credential_canonical_bytes ==
          b->load_credential_canonical_bytes &&
      a->dropins.count == b->dropins.count &&
      a->dropins.credential_match_count == b->dropins.credential_match_count &&
      a->dropins.canonical_bytes == b->dropins.canonical_bytes &&
      strcmp(a->fragment_path, b->fragment_path) == 0 &&
      strcmp(
          a->dropins.credential_dropin_path,
          b->dropins.credential_dropin_path) == 0 &&
      strcmp(
          a->dropins.canonical_paths,
          b->dropins.canonical_paths) == 0 &&
      strcmp(a->credential_source, b->credential_source) == 0 &&
      strcmp(
          a->canonical_load_credentials,
          b->canonical_load_credentials) == 0;
}

static int same_process_identity(
    const struct proc_identity *a,
    const struct proc_identity *b) {
  return a->pid == b->pid &&
      a->ppid == b->ppid &&
      a->uid == b->uid &&
      a->gid == b->gid &&
      a->start_ticks == b->start_ticks;
}

static int emit_credential_transcript(
    FILE *out,
    uid_t uid,
    const char *unit,
    const struct proc_identity *manager,
    const struct unit_observation *unit_observed,
    const struct proc_identity *service,
    const struct credential_observation *credential) {
  if (!out || !unit || !manager || !unit_observed || !service || !credential)
    return -1;

  char dropin_set_sha256[65];
  char load_credential_set_sha256[65];
  credential_sha256_hex(
      (const unsigned char *)credential->dropins.canonical_paths,
      credential->dropins.canonical_bytes,
      dropin_set_sha256);
  credential_sha256_hex(
      (const unsigned char *)credential->canonical_load_credentials,
      credential->load_credential_canonical_bytes,
      load_credential_set_sha256);

  if (fprintf(out, "%s_GREEN\n", MARKER) < 0 ||
      fprintf(out, "runtime_uid=%lu\n", (unsigned long)uid) < 0 ||
      fprintf(out, "unit=%s\n", unit) < 0 ||
      fprintf(out, "manager_pid=%ld\n", (long)manager->pid) < 0 ||
      fprintf(
          out, "manager_start_ticks=%llu\n",
          manager->start_ticks) < 0 ||
      fprintf(out, "private_socket_peer_authenticated=true\n") < 0 ||
      fprintf(out, "same_retained_private_connection=true\n") < 0 ||
      fprintf(out, "public_user_bus_used=false\n") < 0 ||
      fprintf(out, "LoadState=%s\n", unit_observed->load_state) < 0 ||
      fprintf(out, "ActiveState=%s\n", unit_observed->active_state) < 0 ||
      fprintf(out, "SubState=%s\n", unit_observed->sub_state) < 0 ||
      fprintf(out, "MainPID=%u\n", unit_observed->main_pid) < 0 ||
      fprintf(
          out, "service_start_ticks=%llu\n",
          service->start_ticks) < 0 ||
      fprintf(out, "NeedDaemonReload=no\n") < 0 ||
      fprintf(out, "FragmentPath=%s\n", credential->fragment_path) < 0 ||
      fprintf(out, "DropInPathCount=%zu\n", credential->dropins.count) < 0 ||
      fprintf(
          out, "CredentialDropInMatchCount=%zu\n",
          credential->dropins.credential_match_count) < 0 ||
      fprintf(
          out, "DropInPathsCanonicalBytes=%zu\n",
          credential->dropins.canonical_bytes) < 0 ||
      fprintf(out, "DropInPathsSetSha256=%s\n", dropin_set_sha256) < 0 ||
      fprintf(
          out, "DropInPath=%s\n",
          credential->dropins.credential_dropin_path) < 0 ||
      fprintf(
          out, "LoadCredentialCount=%zu\n",
          credential->load_credential_count) < 0 ||
      fprintf(
          out, "LoadCredentialTargetMatchCount=%zu\n",
          credential->load_credential_match_count) < 0 ||
      fprintf(
          out, "LoadCredentialCanonicalBytes=%zu\n",
          credential->load_credential_canonical_bytes) < 0 ||
      fprintf(
          out, "LoadCredentialSetSha256=%s\n",
          load_credential_set_sha256) < 0 ||
      fprintf(out, "LoadCredentialId=%s\n", E2_CREDENTIAL_ID) < 0 ||
      fprintf(
          out, "LoadCredentialSource=%s\n",
          credential->credential_source) < 0 ||
      fprintf(out, "credential_contents_read=false\n") < 0 ||
      fprintf(out, "service_pidfd_retained=true\n") < 0 ||
      fprintf(out, "manager_pidfd_retained=true\n") < 0 ||
      fprintf(out, "manager_generation_reverified=true\n") < 0 ||
      fprintf(out, "service_generation_reverified=true\n") < 0 ||
      fprintf(
          out, "credential_properties_requeried_same_connection=true\n") < 0 ||
      fprintf(out, "host_mutation=false\n") < 0 ||
      fprintf(out, "service_mutation=false\n") < 0 ||
      fprintf(out, "payment_acceptance=false\n") < 0 ||
      fprintf(out, "public_presale_activation=false\n") < 0 ||
      fprintf(out, "funds_movement=false\n") < 0)
    return -1;

  memset(dropin_set_sha256, 0, sizeof(dropin_set_sha256));
  memset(load_credential_set_sha256, 0, sizeof(load_credential_set_sha256));
  return 0;
}

static int live_credential_query(uid_t uid, const char *unit) {
  if (geteuid() != 0) credential_die("root_required");
  if (!unit || strcmp(unit, "void-node-live.service") != 0)
    credential_die("unit_not_exact_void_node_live");

  struct proc_identity manager_before;
  if (find_manager(uid, &manager_before) != 0)
    credential_die("manager_candidate_not_exactly_one");
  int manager_pidfd = pidfd_open_checked(manager_before.pid);
  if (manager_pidfd < 0 || pidfd_alive(manager_pidfd) != 0)
    credential_die("manager_pidfd_unavailable");

  struct stat socket_before, socket_after;
  int busfd = connect_private(uid, &socket_before, &socket_after);
  if (busfd < 0) {
    close(manager_pidfd);
    credential_die("manager_private_socket_connect_failed");
  }
  struct ucred peer_before;
  if (peercred(busfd, &peer_before) != 0 ||
      peer_before.pid != manager_before.pid ||
      peer_before.uid != manager_before.uid ||
      peer_before.gid != manager_before.gid) {
    close(busfd);
    close(manager_pidfd);
    credential_die("manager_private_socket_peer_mismatch");
  }

  struct sd_api api;
  if (load_sd_api(&api) != 0) {
    close(busfd);
    close(manager_pidfd);
    credential_die("libsystemd_api_unavailable");
  }
  struct credential_sd_api extra;
  if (load_credential_sd_api(&api, &extra) != 0) {
    close(busfd);
    unload_sd_api(&api);
    close(manager_pidfd);
    credential_die("libsystemd_credential_api_unavailable");
  }

  sd_bus *bus = NULL;
  if (api.bus_new(&bus) < 0 || !bus ||
      api.bus_set_fd(bus, busfd, busfd) < 0 ||
      api.bus_set_bus_client(bus, 0) < 0 ||
      api.bus_set_method_call_timeout(
          bus, 5ULL * 1000ULL * 1000ULL) < 0) {
    if (bus) api.bus_unref(bus); else close(busfd);
    unload_sd_api(&api);
    close(manager_pidfd);
    credential_die("sd_bus_configuration_failed");
  }
  busfd = -1;
  if (api.bus_start(bus) < 0) {
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    credential_die("sd_bus_start_failed");
  }

  int retained_fd = api.bus_get_fd(bus);
  struct ucred retained_before;
  if (retained_fd < 0 ||
      peercred(retained_fd, &retained_before) != 0 ||
      retained_before.pid != manager_before.pid ||
      retained_before.uid != manager_before.uid ||
      retained_before.gid != manager_before.gid) {
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    credential_die("sd_bus_retained_peer_mismatch");
  }

  char object_before[512];
  struct unit_observation unit_before;
  struct proc_identity service_before;
  if (get_unit_object(
          &api, bus, unit,
          object_before, sizeof(object_before)) != 0 ||
      query_unit(
          &api, bus, object_before, &unit_before) != 0 ||
      validate_unit(
          uid, unit, &manager_before,
          &unit_before, &service_before) != 0) {
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    credential_die("unit_property_kernel_binding_failed");
  }

  int service_pidfd = pidfd_open_checked(service_before.pid);
  if (service_pidfd < 0 || pidfd_alive(service_pidfd) != 0) {
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    credential_die("service_pidfd_unavailable");
  }

  struct credential_observation credential_before;
  struct credential_observation credential_after;
  if (query_credential_observation(
          &api, &extra, bus, object_before,
          &credential_before) != 0 ||
      query_credential_observation(
          &api, &extra, bus, object_before,
          &credential_after) != 0 ||
      !same_credential_observation(
          &credential_before, &credential_after)) {
    close(service_pidfd);
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    credential_die("credential_property_generation_changed");
  }

  char object_after[512];
  struct unit_observation unit_after;
  struct proc_identity service_after;
  struct proc_identity manager_after;
  struct ucred retained_after;
  if (get_unit_object(
          &api, bus, unit,
          object_after, sizeof(object_after)) != 0 ||
      strcmp(object_before, object_after) != 0 ||
      query_unit(&api, bus, object_after, &unit_after) != 0 ||
      validate_unit(
          uid, unit, &manager_before,
          &unit_after, &service_after) != 0 ||
      !same_unit_observation(&unit_before, &unit_after) ||
      !same_process_identity(&service_before, &service_after) ||
      candidate(manager_before.pid, uid, &manager_after) != 0 ||
      !same_process_identity(&manager_before, &manager_after) ||
      peercred(retained_fd, &retained_after) != 0 ||
      retained_after.pid != manager_before.pid ||
      retained_after.uid != manager_before.uid ||
      retained_after.gid != manager_before.gid ||
      pidfd_alive(manager_pidfd) != 0 ||
      pidfd_alive(service_pidfd) != 0) {
    close(service_pidfd);
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    credential_die("authenticated_generation_revalidation_failed");
  }

  if (emit_credential_transcript(
          stdout,
          uid,
          unit,
          &manager_before,
          &unit_before,
          &service_before,
          &credential_before) != 0) {
    close(service_pidfd);
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    credential_die("transcript_write_failed");
  }

  close(service_pidfd);
  api.bus_unref(bus);
  unload_sd_api(&api);
  close(manager_pidfd);
  return 0;
}

static int self_test_credential_query(void) {
  char abc_sha256[65];
  credential_sha256_hex(
      (const unsigned char *)"abc", 3, abc_sha256);
  if (strcmp(
          abc_sha256,
          "ba7816bf8f01cfea414140de5dae2223"
          "b00361a396177a9cb410ff61f20015ad") != 0) return 1;

  char same_len_a[65];
  char same_len_b[65];
  credential_sha256_hex(
      (const unsigned char *)"id=/a\n", 6, same_len_a);
  credential_sha256_hex(
      (const unsigned char *)"id=/b\n", 6, same_len_b);
  if (strcmp(same_len_a, same_len_b) == 0) return 1;

  if (canonical_absolute_path(
          "/etc/systemd/user/void-node-live.service") != 0 ||
      canonical_absolute_path(
          "/etc/systemd/user/../bad.service") == 0 ||
      canonical_absolute_path("relative/path") == 0 ||
      canonical_absolute_path("/etc//bad") == 0 ||
      strcmp(
          path_basename_const(
              "/home/zoso/.config/systemd/user/void-node-live.service.d/"
              E2_DROPIN_BASENAME),
          E2_DROPIN_BASENAME) != 0) return 1;

  struct sd_api api;
  if (load_sd_api(&api) != 0) return 1;
  struct credential_sd_api extra;
  if (load_credential_sd_api(&api, &extra) != 0) {
    unload_sd_api(&api);
    return 1;
  }
  unload_sd_api(&api);

  struct dropin_set_observation zero_match;
  memset(&zero_match, 0, sizeof(zero_match));
  if (add_dropin_path(
          &zero_match,
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          "98-buy-void-allocation-custody-runtime-hardening-v2.conf") != 0 ||
      dropin_set_complete(&zero_match) == 0) return 1;

  struct dropin_set_observation duplicate_match;
  memset(&duplicate_match, 0, sizeof(duplicate_match));
  if (add_dropin_path(
          &duplicate_match,
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          E2_DROPIN_BASENAME) != 0 ||
      add_dropin_path(
          &duplicate_match,
          "/etc/systemd/user/void-node-live.service.d/"
          E2_DROPIN_BASENAME) == 0) return 1;

  struct dropin_set_observation malformed;
  memset(&malformed, 0, sizeof(malformed));
  if (add_dropin_path(&malformed, "relative/dropin.conf") == 0 ||
      add_dropin_path(
          &malformed,
          "/home/zoso/.config/systemd/user/../bad.conf") == 0) return 1;

  struct credential_observation a;
  struct credential_observation b;
  memset(&a, 0, sizeof(a));
  memset(&b, 0, sizeof(b));
  if (add_dropin_path(
          &a.dropins,
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          E2_DROPIN_BASENAME) != 0 ||
      add_dropin_path(
          &a.dropins,
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          "98-buy-void-allocation-custody-runtime-hardening-v2.conf") != 0 ||
      add_dropin_path(
          &b.dropins,
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          E2_DROPIN_BASENAME) != 0 ||
      add_dropin_path(
          &b.dropins,
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          "98-buy-void-allocation-custody-runtime-hardening-v2.conf") != 0 ||
      dropin_set_complete(&a.dropins) != 0 ||
      dropin_set_complete(&b.dropins) != 0 ||
      copy_string(
          a.fragment_path, sizeof(a.fragment_path),
          "/usr/lib/systemd/user/void-node-live.service") != 0 ||
      copy_string(
          b.fragment_path, sizeof(b.fragment_path),
          "/usr/lib/systemd/user/void-node-live.service") != 0 ||
      add_load_credential(
          &a,
          "buy-void-native-fulfillment-wallet-v1",
          "/home/zoso/.local/share/void-native/credential") != 0 ||
      add_load_credential(
          &a,
          "buy-void-dispatcher-postgres-password-v1",
          "/home/zoso/.local/share/void-postgres/password") != 0 ||
      add_load_credential(
          &a,
          "buy-void-dispatcher-postgres-ca-v1",
          "/home/zoso/.local/share/void-postgres/ca.pem") != 0 ||
      add_load_credential(
          &a,
          E2_CREDENTIAL_ID,
          "/home/zoso/.local/share/void-epoch2/credential") != 0 ||
      add_load_credential(
          &b,
          "buy-void-native-fulfillment-wallet-v1",
          "/home/zoso/.local/share/void-native/credential") != 0 ||
      add_load_credential(
          &b,
          "buy-void-dispatcher-postgres-password-v1",
          "/home/zoso/.local/share/void-postgres/password") != 0 ||
      add_load_credential(
          &b,
          "buy-void-dispatcher-postgres-ca-v1",
          "/home/zoso/.local/share/void-postgres/ca.pem") != 0 ||
      add_load_credential(
          &b,
          E2_CREDENTIAL_ID,
          "/home/zoso/.local/share/void-epoch2/credential") != 0 ||
      load_credential_set_complete(&a) != 0 ||
      load_credential_set_complete(&b) != 0 ||
      !same_credential_observation(&a, &b)) return 1;

  struct credential_observation duplicate_credential = a;
  if (add_load_credential(
          &duplicate_credential,
          E2_CREDENTIAL_ID,
          "/home/zoso/.local/share/void-epoch2/duplicate") == 0) return 1;

  struct credential_observation missing_target;
  memset(&missing_target, 0, sizeof(missing_target));
  if (add_load_credential(
          &missing_target,
          "buy-void-native-fulfillment-wallet-v1",
          "/home/zoso/.local/share/void-native/credential") != 0 ||
      load_credential_set_complete(&missing_target) == 0) return 1;

  struct credential_observation changed = b;
  memset(&changed.dropins, 0, sizeof(changed.dropins));
  if (add_dropin_path(
          &changed.dropins,
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          "98-buy-void-allocation-custody-runtime-hardening-v2.conf") != 0 ||
      add_dropin_path(
          &changed.dropins,
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          E2_DROPIN_BASENAME) != 0 ||
      same_credential_observation(&a, &changed)) return 1;

  struct unit_observation transcript_unit;
  struct proc_identity transcript_manager;
  struct proc_identity transcript_service;
  memset(&transcript_unit, 0, sizeof(transcript_unit));
  memset(&transcript_manager, 0, sizeof(transcript_manager));
  memset(&transcript_service, 0, sizeof(transcript_service));
  if (copy_string(
          transcript_unit.load_state,
          sizeof(transcript_unit.load_state),
          "loaded") != 0 ||
      copy_string(
          transcript_unit.active_state,
          sizeof(transcript_unit.active_state),
          "active") != 0 ||
      copy_string(
          transcript_unit.sub_state,
          sizeof(transcript_unit.sub_state),
          "running") != 0) return 1;
  transcript_unit.main_pid = 4053759U;
  transcript_manager.pid = 2693;
  transcript_manager.start_ticks = 1409ULL;
  transcript_service.start_ticks = 20191741ULL;

  char *captured = NULL;
  size_t captured_bytes = 0;
  FILE *mem = open_memstream(&captured, &captured_bytes);
  if (!mem) return 1;
  if (emit_credential_transcript(
          mem,
          (uid_t)1000,
          "void-node-live.service",
          &transcript_manager,
          &transcript_unit,
          &transcript_service,
          &a) != 0 ||
      fflush(mem) != 0 ||
      fclose(mem) != 0) {
    if (mem) fclose(mem);
    free(captured);
    return 1;
  }

  const char *unrelated_dropin =
      "/home/zoso/.config/systemd/user/void-node-live.service.d/"
      "98-buy-void-allocation-custody-runtime-hardening-v2.conf";
  const char *unrelated_credential_source =
      "/home/zoso/.local/share/void-native/credential";
  char expected_dropin_hash[65];
  char expected_load_hash[65];
  char expected_line[256];
  credential_sha256_hex(
      (const unsigned char *)a.dropins.canonical_paths,
      a.dropins.canonical_bytes,
      expected_dropin_hash);
  credential_sha256_hex(
      (const unsigned char *)a.canonical_load_credentials,
      a.load_credential_canonical_bytes,
      expected_load_hash);

  int expected_dropin_line = snprintf(
      expected_line,
      sizeof(expected_line),
      "DropInPathsSetSha256=%s\n",
      expected_dropin_hash);
  if (expected_dropin_line <= 0 ||
      (size_t)expected_dropin_line >= sizeof(expected_line) ||
      !captured ||
      captured_bytes == 0 ||
      strstr(captured, expected_line) == NULL ||
      strstr(captured, unrelated_dropin) != NULL ||
      strstr(captured, unrelated_credential_source) != NULL ||
      strstr(captured, a.dropins.canonical_paths) != NULL ||
      strstr(captured, a.canonical_load_credentials) != NULL ||
      strstr(captured, "DropInPath=/home/zoso/.config/systemd/user/"
              "void-node-live.service.d/" E2_DROPIN_BASENAME "\n") == NULL ||
      strstr(captured, "LoadCredentialSource=/home/zoso/.local/share/"
              "void-epoch2/credential\n") == NULL) {
    memset(expected_dropin_hash, 0, sizeof(expected_dropin_hash));
    memset(expected_load_hash, 0, sizeof(expected_load_hash));
    memset(expected_line, 0, sizeof(expected_line));
    free(captured);
    return 1;
  }

  int expected_load_line = snprintf(
      expected_line,
      sizeof(expected_line),
      "LoadCredentialSetSha256=%s\n",
      expected_load_hash);
  if (expected_load_line <= 0 ||
      (size_t)expected_load_line >= sizeof(expected_line) ||
      strstr(captured, expected_line) == NULL) {
    memset(expected_dropin_hash, 0, sizeof(expected_dropin_hash));
    memset(expected_load_hash, 0, sizeof(expected_load_hash));
    memset(expected_line, 0, sizeof(expected_line));
    free(captured);
    return 1;
  }
  memset(expected_dropin_hash, 0, sizeof(expected_dropin_hash));
  memset(expected_load_hash, 0, sizeof(expected_load_hash));
  memset(expected_line, 0, sizeof(expected_line));
  memset(captured, 0, captured_bytes);
  free(captured);

  b.need_daemon_reload = 1;
  if (same_credential_observation(&a, &b)) return 1;

  printf("%s_SELF_TEST_GREEN\n", MARKER);
  printf("accepted_v4_peer_guard_embedded=true\n");
  printf("accepted_v6_unit_query_pinned_as_integration_peer=true\n");
  printf("systemd_private_socket_required=true\n");
  printf("public_user_bus_used=false\n");
  printf("need_daemon_reload_queried_same_connection=true\n");
  printf("fragment_path_queried_same_connection=true\n");
  printf("dropin_paths_queried_same_connection=true\n");
  printf("load_credential_queried_same_connection=true\n");
  printf("main_pid_kernel_bound=true\n");
  printf("bounded_dropin_set_observed=true\n");
  printf("dropin_limit_64=true\n");
  printf("exactly_one_credential_dropin_match_required=true\n");
  printf("unrelated_hardening_dropin_allowed=true\n");
  printf("dropin_set_generation_stability_required=true\n");
  printf("bounded_loadcredential_set_observed=true\n");
  printf("loadcredential_limit_32=true\n");
  printf("exactly_one_target_credential_match_required=true\n");
  printf("unrelated_credentials_allowed=true\n");
  printf("duplicate_credential_ids_rejected=true\n");
  printf("credential_set_generation_stability_required=true\n");
  printf("complete_dropin_set_fingerprint=true\n");
  printf("complete_loadcredential_set_fingerprint=true\n");
  printf("same_length_set_substitution_changes_fingerprint=true\n");
  printf("unrelated_credential_paths_emitted=false\n");
  printf("transcript_non_disclosure_executable=true\n");
  printf("security_transcript_composed=false\n");
  printf("credential_query_preexec_execution_path_proven=false\n");
  printf("credential_contents_read=false\n");
  printf("binary_acceptance=false\n");
  printf("live_query_authorized=false\n");
  printf("host_mutation=false\n");
  printf("payment_acceptance=false\n");
  printf("public_presale_activation=false\n");
  printf("funds_movement=false\n");
  return 0;
}

int main(int argc, char **argv) {
  if (clean_loader_environment() != 0)
    credential_die("sanitized_loader_environment_required");
  if (argc == 2 && strcmp(argv[1], "--self-test") == 0)
    return self_test_credential_query();
  if (argc == 5 && strcmp(argv[1], "--uid") == 0 &&
      strcmp(argv[3], "--unit") == 0) {
    unsigned long long raw = 0;
    if (parse_uint(argv[2], &raw) != 0 || raw == 0 || raw > 0x7fffffffULL)
      credential_die("uid_invalid");
    return live_credential_query((uid_t)raw, argv[4]);
  }
  fprintf(
      stderr,
      "usage: %s --self-test | --uid <positive-uid> --unit <service>\n",
      argv[0]);
  return 2;
}
