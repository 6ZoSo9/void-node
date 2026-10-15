#define main void_buy_void_private_peer_guard_embedded_main
#include "void_buy_void_user_manager_private_peer_guard_v1.c"
#undef main
#undef MARKER

#include <dlfcn.h>
#include <limits.h>
#include <stddef.h>

#define MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V1"
#define NODE_EXE "/usr/bin/node"
#define LIBSYSTEMD_SONAME "/usr/lib/x86_64-linux-gnu/libsystemd.so.0"
#define SANITIZED_ENV_MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1"
#define E2_CREDENTIAL_ID "buy-void-epoch2-fulfiller-v1"
#define E2_DROPIN_BASENAME "97-buy-void-epoch2-fulfiller-credential-v1.conf"

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

struct credential_observation {
  int need_daemon_reload;
  size_t dropin_count;
  size_t load_credential_count;
  char fragment_path[PATH_MAX];
  char dropin_path[PATH_MAX];
  char credential_source[PATH_MAX];
};

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

static int get_exact_single_dropin(
    struct sd_api *api,
    const struct credential_sd_api *extra,
    sd_bus *bus,
    const char *object,
    char *dst,
    size_t cap,
    size_t *out_count) {
  sd_bus_message *reply = NULL;
  int r = extra->get_property(
      bus, NULL, object, "org.freedesktop.systemd1.Unit", "DropInPaths",
      NULL, &reply, "as");
  if (r < 0 || !reply) return -1;
  if (extra->message_enter_container(reply, 'a', "s") < 0) {
    api->message_unref(reply);
    return -1;
  }

  size_t count = 0;
  const char *value = NULL;
  while ((r = api->message_read(reply, "s", &value)) > 0) {
    ++count;
    if (count == 1 && copy_string(dst, cap, value) != 0) {
      api->message_unref(reply);
      return -1;
    }
  }
  if (r < 0 || extra->message_exit_container(reply) < 0) {
    api->message_unref(reply);
    return -1;
  }
  api->message_unref(reply);
  *out_count = count;
  return count == 1 ? 0 : -1;
}

static int get_exact_single_load_credential(
    struct sd_api *api,
    const struct credential_sd_api *extra,
    sd_bus *bus,
    const char *object,
    char *source,
    size_t source_cap,
    size_t *out_count) {
  sd_bus_message *reply = NULL;
  int r = extra->get_property(
      bus, NULL, object, "org.freedesktop.systemd1.Service", "LoadCredential",
      NULL, &reply, "a(ss)");
  if (r < 0 || !reply) return -1;
  if (extra->message_enter_container(reply, 'a', "(ss)") < 0) {
    api->message_unref(reply);
    return -1;
  }

  size_t count = 0;
  const char *id = NULL;
  const char *path = NULL;
  while ((r = api->message_read(reply, "(ss)", &id, &path)) > 0) {
    ++count;
    if (count == 1) {
      if (!id || strcmp(id, E2_CREDENTIAL_ID) != 0 ||
          copy_string(source, source_cap, path) != 0) {
        api->message_unref(reply);
        return -1;
      }
    }
  }
  if (r < 0 || extra->message_exit_container(reply) < 0) {
    api->message_unref(reply);
    return -1;
  }
  api->message_unref(reply);
  *out_count = count;
  return count == 1 ? 0 : -1;
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
      get_exact_single_dropin(
          api, extra, bus, object,
          out->dropin_path, sizeof(out->dropin_path),
          &out->dropin_count) != 0 ||
      get_exact_single_load_credential(
          api, extra, bus, object,
          out->credential_source, sizeof(out->credential_source),
          &out->load_credential_count) != 0) return -1;

  if (out->need_daemon_reload != 0 ||
      canonical_absolute_path(out->fragment_path) != 0 ||
      canonical_absolute_path(out->dropin_path) != 0 ||
      canonical_absolute_path(out->credential_source) != 0 ||
      strcmp(
          path_basename_const(out->dropin_path),
          E2_DROPIN_BASENAME) != 0 ||
      strcmp(out->fragment_path, out->dropin_path) == 0) return -1;
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
      a->dropin_count == b->dropin_count &&
      a->load_credential_count == b->load_credential_count &&
      strcmp(a->fragment_path, b->fragment_path) == 0 &&
      strcmp(a->dropin_path, b->dropin_path) == 0 &&
      strcmp(a->credential_source, b->credential_source) == 0;
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

  printf("%s_GREEN\n", MARKER);
  printf("runtime_uid=%lu\n", (unsigned long)uid);
  printf("unit=%s\n", unit);
  printf("manager_pid=%ld\n", (long)manager_before.pid);
  printf("manager_start_ticks=%llu\n", manager_before.start_ticks);
  printf("private_socket_peer_authenticated=true\n");
  printf("same_retained_private_connection=true\n");
  printf("public_user_bus_used=false\n");
  printf("LoadState=%s\n", unit_before.load_state);
  printf("ActiveState=%s\n", unit_before.active_state);
  printf("SubState=%s\n", unit_before.sub_state);
  printf("MainPID=%u\n", unit_before.main_pid);
  printf("service_start_ticks=%llu\n", service_before.start_ticks);
  printf("NeedDaemonReload=no\n");
  printf("FragmentPath=%s\n", credential_before.fragment_path);
  printf("DropInPathCount=%zu\n", credential_before.dropin_count);
  printf("DropInPath=%s\n", credential_before.dropin_path);
  printf("LoadCredentialCount=%zu\n", credential_before.load_credential_count);
  printf("LoadCredentialId=%s\n", E2_CREDENTIAL_ID);
  printf("LoadCredentialSource=%s\n", credential_before.credential_source);
  printf("credential_contents_read=false\n");
  printf("service_pidfd_retained=true\n");
  printf("manager_pidfd_retained=true\n");
  printf("manager_generation_reverified=true\n");
  printf("service_generation_reverified=true\n");
  printf("credential_properties_requeried_same_connection=true\n");
  printf("host_mutation=false\n");
  printf("service_mutation=false\n");
  printf("payment_acceptance=false\n");
  printf("public_presale_activation=false\n");
  printf("funds_movement=false\n");

  close(service_pidfd);
  api.bus_unref(bus);
  unload_sd_api(&api);
  close(manager_pidfd);
  return 0;
}

static int self_test_credential_query(void) {
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

  struct credential_observation a;
  struct credential_observation b;
  memset(&a, 0, sizeof(a));
  memset(&b, 0, sizeof(b));
  a.dropin_count = b.dropin_count = 1;
  a.load_credential_count = b.load_credential_count = 1;
  if (copy_string(
          a.fragment_path, sizeof(a.fragment_path),
          "/usr/lib/systemd/user/void-node-live.service") != 0 ||
      copy_string(
          b.fragment_path, sizeof(b.fragment_path),
          "/usr/lib/systemd/user/void-node-live.service") != 0 ||
      copy_string(
          a.dropin_path, sizeof(a.dropin_path),
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          E2_DROPIN_BASENAME) != 0 ||
      copy_string(
          b.dropin_path, sizeof(b.dropin_path),
          "/home/zoso/.config/systemd/user/void-node-live.service.d/"
          E2_DROPIN_BASENAME) != 0 ||
      copy_string(
          a.credential_source, sizeof(a.credential_source),
          "/home/zoso/.local/share/void-epoch2/credential") != 0 ||
      copy_string(
          b.credential_source, sizeof(b.credential_source),
          "/home/zoso/.local/share/void-epoch2/credential") != 0 ||
      !same_credential_observation(&a, &b)) return 1;
  b.need_daemon_reload = 1;
  if (same_credential_observation(&a, &b)) return 1;

  printf("%s_SELF_TEST_GREEN\n", MARKER);
  printf("accepted_v4_peer_guard_embedded=true\n");
  printf("accepted_v4_unit_query_pinned_as_integration_peer=true\n");
  printf("systemd_private_socket_required=true\n");
  printf("public_user_bus_used=false\n");
  printf("need_daemon_reload_queried_same_connection=true\n");
  printf("fragment_path_queried_same_connection=true\n");
  printf("dropin_paths_queried_same_connection=true\n");
  printf("load_credential_queried_same_connection=true\n");
  printf("main_pid_kernel_bound=true\n");
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
