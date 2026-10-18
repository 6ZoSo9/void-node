#define _GNU_SOURCE
#define main void_cloudflare_private_peer_guard_embedded_main
#include "../precision/void_buy_void_user_manager_private_peer_guard_v1.c"
#undef main
#undef MARKER

#include <dlfcn.h>
#include <limits.h>

#define MARKER "VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_QUERY_V1"
#define HISTORICAL_UNIT "void-public-seed-named-tunnel-v1.service"
#define LIBSYSTEMD_SONAME "/usr/lib/x86_64-linux-gnu/libsystemd.so.0"
#define SANITIZED_ENV_MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1"

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

struct retirement_unit_observation {
  char load_state[32];
  char active_state[32];
  char sub_state[32];
  char control_group[512];
  uint32_t main_pid;
};

static void retirement_die(const char *code) {
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
    int *out_fd, char *resolved, size_t cap) {
  if (!out_fd || !resolved || cap < 2) return -1;
  if (trusted_directory("/") != 0 ||
      trusted_directory("/usr") != 0 ||
      trusted_directory("/usr/lib") != 0 ||
      trusted_directory("/usr/lib/x86_64-linux-gnu") != 0) return -1;

  struct stat link_st;
  if (lstat(LIBSYSTEMD_SONAME, &link_st) != 0 ||
      link_st.st_uid != 0 || link_st.st_nlink != 1) return -1;
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
  if (fstat(fd, &held) != 0 ||
      held.st_dev != visible.st_dev || held.st_ino != visible.st_ino ||
      held.st_uid != visible.st_uid || held.st_gid != visible.st_gid ||
      held.st_mode != visible.st_mode || held.st_nlink != visible.st_nlink ||
      held.st_size != visible.st_size) {
    close(fd);
    return -1;
  }
  memcpy(resolved, target, n + 1);
  *out_fd = fd;
  return 0;
}

static int load_symbol(
    void *handle, const char *name,
    const char *expected_path, void *target) {
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
  if (snprintf(procfd, sizeof(procfd), "/proc/self/fd/%d", api->library_fd) >=
      (int)sizeof(procfd)) goto fail;
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
      held.st_mode != visible.st_mode ||
      held.st_nlink != visible.st_nlink ||
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

static int copy_string(
    char *dst, size_t cap, const char *src) {
  if (!dst || cap < 2 || !src) return -1;
  size_t n = strlen(src);
  if (n >= cap || memchr(src, '\n', n) || memchr(src, '\r', n)) return -1;
  memcpy(dst, src, n + 1);
  return 0;
}

static int get_string_prop(
    struct sd_api *api, sd_bus *bus, const char *object,
    const char *interface, const char *property,
    char *dst, size_t cap) {
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
    struct sd_api *api, sd_bus *bus,
    const char *unit, char *dst, size_t cap) {
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
    struct sd_api *api, sd_bus *bus,
    const char *unit, struct retirement_unit_observation *out) {
  char object[512];
  if (get_unit_object(api, bus, unit, object, sizeof(object)) != 0) return -1;
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

static int manager_get_unit_file_state(
    struct sd_api *api, sd_bus *bus,
    const char *unit, char *dst, size_t cap) {
  sd_bus_message *reply = NULL;
  int r = api->bus_call_method(
      bus, NULL, "/org/freedesktop/systemd1",
      "org.freedesktop.systemd1.Manager", "GetUnitFileState",
      NULL, &reply, "s", unit);
  if (r < 0 || !reply) return -1;
  const char *state = NULL;
  r = api->message_read(reply, "s", &state);
  if (r < 0 || !state || copy_string(dst, cap, state) != 0) {
    api->message_unref(reply);
    return -1;
  }
  api->message_unref(reply);
  return 0;
}

static int retirement_unit_file_state_ok(const char *state) {
  return state &&
    (strcmp(state, "disabled") == 0 || strcmp(state, "masked") == 0)
      ? 0 : -1;
}

static int same_retirement_unit_observation(
    const struct retirement_unit_observation *a,
    const struct retirement_unit_observation *b) {
  return a && b &&
    strcmp(a->load_state, b->load_state) == 0 &&
    strcmp(a->active_state, b->active_state) == 0 &&
    strcmp(a->sub_state, b->sub_state) == 0 &&
    strcmp(a->control_group, b->control_group) == 0 &&
    a->main_pid == b->main_pid;
}

static int retirement_shape_ok(
    const struct retirement_unit_observation *obs,
    const char *unit_file_state) {
  if (!obs || retirement_unit_file_state_ok(unit_file_state) != 0) return -1;
  if (strcmp(obs->load_state, "loaded") != 0 &&
      strcmp(obs->load_state, "masked") != 0) return -1;
  if (strcmp(obs->active_state, "inactive") != 0 ||
      strcmp(obs->sub_state, "dead") != 0) return -1;
  if (obs->main_pid != 0 || obs->control_group[0] != '\0') return -1;
  return 0;
}

static int retirement_snapshot(uid_t uid) {
  if (geteuid() != 0) retirement_die("root_required");

  struct proc_identity manager;
  if (find_manager(uid, &manager) != 0)
    retirement_die("manager_candidate_not_exactly_one");
  int manager_pidfd = pidfd_open_checked(manager.pid);
  if (manager_pidfd < 0 || pidfd_alive(manager_pidfd) != 0)
    retirement_die("manager_pidfd_unavailable");

  struct stat socket_before, socket_after;
  int busfd = connect_private(uid, &socket_before, &socket_after);
  if (busfd < 0) {
    close(manager_pidfd);
    retirement_die("manager_private_socket_connect_failed");
  }
  struct ucred cred;
  if (peercred(busfd, &cred) != 0 ||
      cred.pid != manager.pid || cred.uid != manager.uid ||
      cred.gid != manager.gid) {
    close(busfd);
    close(manager_pidfd);
    retirement_die("manager_private_socket_peer_mismatch");
  }

  struct sd_api api;
  if (load_sd_api(&api) != 0) {
    close(busfd);
    close(manager_pidfd);
    retirement_die("libsystemd_api_unavailable");
  }

  sd_bus *bus = NULL;
  if (api.bus_new(&bus) < 0 || !bus ||
      api.bus_set_fd(bus, busfd, busfd) < 0 ||
      api.bus_set_bus_client(bus, 0) < 0 ||
      api.bus_set_method_call_timeout(bus, 5ULL * 1000ULL * 1000ULL) < 0) {
    if (bus) api.bus_unref(bus); else close(busfd);
    unload_sd_api(&api);
    close(manager_pidfd);
    retirement_die("sd_bus_configuration_failed");
  }
  busfd = -1;
  if (api.bus_start(bus) < 0) {
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    retirement_die("sd_bus_start_failed");
  }

  int retained_fd = api.bus_get_fd(bus);
  struct ucred retained_cred;
  if (retained_fd < 0 ||
      peercred(retained_fd, &retained_cred) != 0 ||
      retained_cred.pid != manager.pid ||
      retained_cred.uid != manager.uid ||
      retained_cred.gid != manager.gid) {
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    retirement_die("sd_bus_retained_peer_mismatch");
  }

  char state_first[64], state_second[64];
  struct retirement_unit_observation first, second;
  if (manager_get_unit_file_state(
          &api, bus, HISTORICAL_UNIT,
          state_first, sizeof(state_first)) != 0 ||
      query_unit(&api, bus, HISTORICAL_UNIT, &first) != 0 ||
      query_unit(&api, bus, HISTORICAL_UNIT, &second) != 0 ||
      manager_get_unit_file_state(
          &api, bus, HISTORICAL_UNIT,
          state_second, sizeof(state_second)) != 0) {
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    retirement_die("historical_unit_query_failed");
  }

  if (strcmp(state_first, state_second) != 0 ||
      !same_retirement_unit_observation(&first, &second))
    retirement_die("historical_unit_observation_changed");
  if (retirement_shape_ok(&first, state_first) != 0)
    retirement_die("historical_unit_not_retired_snapshot");

  struct proc_identity manager_after;
  struct ucred final_cred;
  if (candidate(manager.pid, uid, &manager_after) != 0 ||
      manager_after.start_ticks != manager.start_ticks ||
      manager_after.gid != manager.gid ||
      pidfd_alive(manager_pidfd) != 0 ||
      peercred(retained_fd, &final_cred) != 0 ||
      final_cred.pid != manager.pid ||
      final_cred.uid != manager.uid ||
      final_cred.gid != manager.gid) {
    api.bus_unref(bus);
    unload_sd_api(&api);
    close(manager_pidfd);
    retirement_die("manager_generation_changed");
  }

  printf("%s_GREEN\n", MARKER);
  printf("historical_unit=%s\n", HISTORICAL_UNIT);
  printf("runtime_uid=%lu\n", (unsigned long)uid);
  printf("manager_pid=%ld\n", (long)manager.pid);
  printf("manager_start_ticks=%llu\n", manager.start_ticks);
  printf("manager_peer_authenticated=true\n");
  printf("same_private_fd_used_for_query=true\n");
  printf("double_authenticated_query_stable=true\n");
  printf("LoadState=%s\n", first.load_state);
  printf("ActiveState=%s\n", first.active_state);
  printf("SubState=%s\n", first.sub_state);
  printf("MainPID=%u\n", first.main_pid);
  printf("ControlGroup=%s\n", first.control_group);
  printf("UnitFileState=%s\n", state_first);
  printf("authenticated_retirement_snapshot=true\n");
  printf("future_restart_prevented=false\n");
  printf("historical_user_tunnel_retirement_verified=false\n");
  printf("host_installation=false\n");
  printf("service_mutation=false\n");
  printf("systemd_mutation=false\n");
  printf("tunnel_mutation=false\n");
  printf("network_mutation=false\n");
  printf("credential_access=false\n");
  printf("payment_acceptance=false\n");
  printf("public_presale_activation=false\n");
  printf("funds_movement=false\n");

  api.bus_unref(bus);
  unload_sd_api(&api);
  close(manager_pidfd);
  return 0;
}

static int retirement_self_test(void) {
  struct sd_api api;
  if (load_sd_api(&api) != 0) return 1;
  unload_sd_api(&api);

  struct retirement_unit_observation obs;
  memset(&obs, 0, sizeof(obs));
  strcpy(obs.load_state, "loaded");
  strcpy(obs.active_state, "inactive");
  strcpy(obs.sub_state, "dead");
  obs.main_pid = 0;
  obs.control_group[0] = '\0';

  if (retirement_shape_ok(&obs, "disabled") != 0) return 1;
  strcpy(obs.load_state, "masked");
  if (retirement_shape_ok(&obs, "masked") != 0) return 1;
  strcpy(obs.load_state, "loaded");

  struct retirement_unit_observation same = obs;
  if (!same_retirement_unit_observation(&obs, &same)) return 1;
  strcpy(same.active_state, "active");
  if (same_retirement_unit_observation(&obs, &same)) return 1;
  same = obs;
  same.main_pid = 123;
  if (retirement_shape_ok(&same, "disabled") == 0) return 1;
  same = obs;
  strcpy(same.control_group, "/user.slice/live");
  if (retirement_shape_ok(&same, "disabled") == 0) return 1;
  if (retirement_shape_ok(&obs, "enabled") == 0) return 1;
  if (retirement_shape_ok(&obs, "static") == 0) return 1;

  printf("%s_SELF_TEST_GREEN\n", MARKER);
  printf("historical_unit_fixed=true\n");
  printf("private_manager_peer_source_reused=true\n");
  printf("inactive_dead_required=true\n");
  printf("main_pid_zero_required=true\n");
  printf("control_group_empty_required=true\n");
  printf("unit_file_state_disabled_or_masked_required=true\n");
  printf("future_restart_prevented=false\n");
  printf("historical_user_tunnel_retirement_verified=false\n");
  return 0;
}

static int retirement_parse_uid(const char *raw, uid_t *out) {
  unsigned long long value = 0;
  if (!out || parse_uint(raw, &value) != 0 ||
      value == 0 || value > 0x7fffffffULL) return -1;
  *out = (uid_t)value;
  return 0;
}

static int retirement_query_v1_main(int argc, char **argv) {
  if (clean_loader_environment() != 0)
    retirement_die("sanitized_loader_environment_required");

  if (argc == 2 && strcmp(argv[1], "--self-test") == 0)
    return retirement_self_test();

  if (argc == 3 && strcmp(argv[1], "--uid") == 0) {
    uid_t uid = 0;
    if (retirement_parse_uid(argv[2], &uid) != 0)
      retirement_die("uid_invalid");
    return retirement_snapshot(uid);
  }

  fprintf(stderr, "usage: %s --self-test | --uid <positive-uid>\n", argv[0]);
  return 2;
}


#define PROVENANCE_MARKER "VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_QUERY_PROVENANCE_V1"
#define PROVENANCE_ROOT "/opt/void-cloudflare-user-tunnel-retirement-query-v2"
#define PROVENANCE_PREEXEC_PATH PROVENANCE_ROOT "/void_cloudflare_historical_user_tunnel_retirement_preexec_v2"
#define PROVENANCE_QUERY_PATH PROVENANCE_ROOT "/void_cloudflare_historical_user_tunnel_retirement_query_v2"
#define PROOF_FD_ENV "VOID_CLOUDFLARE_RETIREMENT_PREEXEC_PROOF_FD"
#define PROOF_MAGIC "VOID_CLOUDFLARE_RETIREMENT_PREEXEC_PROOF_V1"

struct provenance_record_v1 {
  long parent_pid;
  long child_pid;
  unsigned long long preexec_dev;
  unsigned long long preexec_ino;
  unsigned long long query_dev;
  unsigned long long query_ino;
};

static void provenance_die(const char *reason) {
  fprintf(stderr, "%s_HOLD\nreason=%s\n", PROVENANCE_MARKER, reason);
  exit(2);
}

static int provenance_trusted_dir(const char *path) {
  struct stat st;
  if (lstat(path, &st) != 0 || !S_ISDIR(st.st_mode) || S_ISLNK(st.st_mode) ||
      st.st_uid != 0 || (st.st_mode & 0022) != 0) return -1;
  return 0;
}

static int provenance_trusted_file(const char *path, struct stat *out) {
  struct stat st;
  if (lstat(path, &st) != 0 || !S_ISREG(st.st_mode) || S_ISLNK(st.st_mode) ||
      st.st_uid != 0 || (st.st_mode & 0022) != 0 || (st.st_mode & 0111) == 0 ||
      st.st_nlink != 1 || st.st_size <= 0) return -1;
  if (out) *out = st;
  return 0;
}

static int provenance_parse_fd(const char *raw) {
  if (!raw || !*raw) return -1;
  errno = 0;
  char *end = NULL;
  long value = strtol(raw, &end, 10);
  if (errno != 0 || !end || *end != '\0' || value < 3 || value > 1048576)
    return -1;
  return (int)value;
}

static int provenance_read_record(
    int fd, struct provenance_record_v1 *out) {
  if (!out) return -1;
  struct stat st;
  if (fstat(fd, &st) != 0 || !S_ISFIFO(st.st_mode)) return -1;

  char buf[512];
  size_t used = 0;
  for (;;) {
    if (used >= sizeof(buf) - 1) return -1;
    ssize_t n = read(fd, buf + used, sizeof(buf) - 1 - used);
    if (n > 0) {
      used += (size_t)n;
      continue;
    }
    if (n == 0) break;
    if (errno == EINTR) continue;
    return -1;
  }
  buf[used] = '\0';

  int consumed = -1;
  struct provenance_record_v1 record;
  memset(&record, 0, sizeof(record));
  int matched = sscanf(
    buf,
    PROOF_MAGIC "\n"
    "parent_pid=%ld\n"
    "child_pid=%ld\n"
    "preexec_dev=%llu\n"
    "preexec_ino=%llu\n"
    "query_dev=%llu\n"
    "query_ino=%llu\n%n",
    &record.parent_pid, &record.child_pid,
    &record.preexec_dev, &record.preexec_ino,
    &record.query_dev, &record.query_ino, &consumed);
  if (matched != 6 || consumed < 0 || (size_t)consumed != used) return -1;
  *out = record;
  return 0;
}

static int provenance_readlink_exact(
    const char *proc_path, const char *expected) {
  char value[PATH_MAX];
  ssize_t n = readlink(proc_path, value, sizeof(value) - 1);
  if (n <= 0 || (size_t)n >= sizeof(value) - 1) return -1;
  value[n] = '\0';
  return strcmp(value, expected) == 0 ? 0 : -1;
}

static int protected_preexec_provenance(void) {
  if (geteuid() != 0) return -1;
  if (provenance_trusted_dir("/") != 0 ||
      provenance_trusted_dir("/opt") != 0 ||
      provenance_trusted_dir(PROVENANCE_ROOT) != 0) return -1;

  int proof_fd = provenance_parse_fd(getenv(PROOF_FD_ENV));
  if (proof_fd < 0) return -1;
  struct provenance_record_v1 record;
  int record_ok = provenance_read_record(proof_fd, &record);
  close(proof_fd);
  (void)unsetenv(PROOF_FD_ENV);
  if (record_ok != 0) return -1;

  pid_t parent = getppid();
  pid_t self = getpid();
  if (parent <= 1 || record.parent_pid != (long)parent ||
      record.child_pid != (long)self) return -1;

  char parent_proc[64];
  if (snprintf(
        parent_proc, sizeof(parent_proc), "/proc/%ld/exe",
        (long)parent) >= (int)sizeof(parent_proc)) return -1;
  if (provenance_readlink_exact(
        parent_proc, PROVENANCE_PREEXEC_PATH) != 0 ||
      provenance_readlink_exact(
        "/proc/self/exe", PROVENANCE_QUERY_PATH) != 0) return -1;

  struct stat preexec_visible, preexec_running;
  struct stat query_visible, query_running;
  if (provenance_trusted_file(
        PROVENANCE_PREEXEC_PATH, &preexec_visible) != 0 ||
      stat(parent_proc, &preexec_running) != 0 ||
      provenance_trusted_file(
        PROVENANCE_QUERY_PATH, &query_visible) != 0 ||
      stat("/proc/self/exe", &query_running) != 0) return -1;

  if ((unsigned long long)preexec_visible.st_dev != record.preexec_dev ||
      (unsigned long long)preexec_visible.st_ino != record.preexec_ino ||
      preexec_running.st_dev != preexec_visible.st_dev ||
      preexec_running.st_ino != preexec_visible.st_ino ||
      (unsigned long long)query_visible.st_dev != record.query_dev ||
      (unsigned long long)query_visible.st_ino != record.query_ino ||
      query_running.st_dev != query_visible.st_dev ||
      query_running.st_ino != query_visible.st_ino) return -1;

  return 0;
}

int main(int argc, char **argv) {
  if (protected_preexec_provenance() != 0)
    provenance_die("protected_preexec_provenance_required");
  return retirement_query_v1_main(argc, argv);
}
