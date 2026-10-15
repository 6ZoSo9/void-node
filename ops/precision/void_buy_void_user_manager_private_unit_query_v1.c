#define main void_buy_void_private_peer_guard_embedded_main
#include "void_buy_void_user_manager_private_peer_guard_v1.c"
#undef main
#undef MARKER

#include <dlfcn.h>
#include <inttypes.h>

#define MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1"
#define NODE_EXE "/usr/bin/node"

static void query_die(const char *code) { fprintf(stderr, "%s_HOLD\nreason=%s\n", MARKER, code); exit(2); }

typedef struct sd_bus sd_bus;
typedef struct sd_bus_message sd_bus_message;

struct sd_api {
  void *handle;
  int (*bus_new)(sd_bus **);
  int (*bus_set_fd)(sd_bus *, int, int);
  int (*bus_set_bus_client)(sd_bus *, int);
  int (*bus_set_method_call_timeout)(sd_bus *, uint64_t);
  int (*bus_start)(sd_bus *);
  int (*bus_get_fd)(sd_bus *);
  int (*bus_call_method)(sd_bus *, const char *, const char *, const char *, const char *, void *, sd_bus_message **, const char *, ...);
  int (*message_read)(sd_bus_message *, const char *, ...);
  int (*get_property_string)(sd_bus *, const char *, const char *, const char *, const char *, void *, char **);
  int (*get_property_trivial)(sd_bus *, const char *, const char *, const char *, const char *, void *, char, void *);
  sd_bus_message *(*message_unref)(sd_bus_message *);
  sd_bus *(*bus_unref)(sd_bus *);
};

static int load_symbol(void *handle, const char *name, void *target) {
  void *value = dlsym(handle, name);
  if (!value) return -1;
  memcpy(target, &value, sizeof(value));
  return 0;
}

static int load_sd_api(struct sd_api *api) {
  memset(api, 0, sizeof(*api));
  api->handle = dlopen("libsystemd.so.0", RTLD_NOW | RTLD_LOCAL);
  if (!api->handle) return -1;
#define LOAD(field, symbol) do { if (load_symbol(api->handle, symbol, &api->field) != 0) return -1; } while (0)
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
  return 0;
}

static void unload_sd_api(struct sd_api *api) {
  if (api->handle) dlclose(api->handle);
  memset(api, 0, sizeof(*api));
}

static int safe_unit_name(const char *unit) {
  if (!unit) return -1;
  size_t n = strlen(unit);
  if (n < 9 || n > 200 || strcmp(unit + n - 8, ".service") != 0) return -1;
  for (size_t i = 0; i < n; ++i) {
    unsigned char c = (unsigned char)unit[i];
    if (!((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
          (c >= '0' && c <= '9') || c == '_' || c == '.' || c == '@' ||
          c == ':' || c == '-')) return -1;
  }
  return 0;
}

static int exact_service_cgroup(pid_t pid, uid_t uid, const char *unit) {
  char path[128];
  if (snprintf(path, sizeof(path), "/proc/%ld/cgroup", (long)pid) >= (int)sizeof(path)) return -1;
  unsigned char raw[4096];
  size_t len = 0;
  if (read_bounded(path, raw, sizeof(raw) - 1, &len) != 0) return -1;
  raw[len] = '\0';
  char expected[512];
  int n = snprintf(expected, sizeof(expected),
    "0::/user.slice/user-%lu.slice/user@%lu.service/app.slice/%s\n",
    (unsigned long)uid, (unsigned long)uid, unit);
  if (n <= 0 || n >= (int)sizeof(expected)) return -1;
  return len == (size_t)n && memcmp(raw, expected, len) == 0 ? 0 : -1;
}

static int exact_executable_path(pid_t pid, const char *expected_path) {
  char proc_path[128];
  if (snprintf(proc_path, sizeof(proc_path), "/proc/%ld/exe", (long)pid) >= (int)sizeof(proc_path)) return -1;
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
  return expected.st_dev == observed.st_dev && expected.st_ino == observed.st_ino ? 0 : -1;
}

static int copy_string(char *dst, size_t cap, const char *src) {
  if (!dst || cap < 2 || !src) return -1;
  size_t n = strlen(src);
  if (n >= cap || memchr(src, '\n', n) || memchr(src, '\r', n)) return -1;
  memcpy(dst, src, n + 1);
  return 0;
}

struct unit_observation {
  char load_state[32];
  char active_state[32];
  char sub_state[32];
  char user[128];
  char group[128];
  char control_group[512];
  uint32_t main_pid;
  int no_new_privileges;
  uint64_t capability_bounding_set;
  uint64_t ambient_capabilities;
};

static int get_string_prop(struct sd_api *api, sd_bus *bus, const char *object,
                           const char *interface, const char *property,
                           char *dst, size_t cap) {
  char *value = NULL;
  int r = api->get_property_string(bus, NULL, object, interface, property, NULL, &value);
  if (r < 0 || !value) { free(value); return -1; }
  int out = copy_string(dst, cap, value);
  free(value);
  return out;
}

static int query_unit(struct sd_api *api, sd_bus *bus, const char *unit,
                      struct unit_observation *out) {
  sd_bus_message *reply = NULL;
  int r = api->bus_call_method(bus, NULL, "/org/freedesktop/systemd1",
      "org.freedesktop.systemd1.Manager", "GetUnit", NULL, &reply, "s", unit);
  if (r < 0 || !reply) return -1;
  const char *object = NULL;
  r = api->message_read(reply, "o", &object);
  if (r < 0 || !object ||
      strncmp(object, "/org/freedesktop/systemd1/unit/",
        strlen("/org/freedesktop/systemd1/unit/")) != 0) {
    api->message_unref(reply);
    return -1;
  }
  char object_copy[512];
  if (copy_string(object_copy, sizeof(object_copy), object) != 0) {
    api->message_unref(reply);
    return -1;
  }
  api->message_unref(reply);

  memset(out, 0, sizeof(*out));
  if (get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Unit","LoadState",out->load_state,sizeof(out->load_state)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Unit","ActiveState",out->active_state,sizeof(out->active_state)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Unit","SubState",out->sub_state,sizeof(out->sub_state)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Unit","ControlGroup",out->control_group,sizeof(out->control_group)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Service","User",out->user,sizeof(out->user)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Service","Group",out->group,sizeof(out->group)) != 0) return -1;
  if (api->get_property_trivial(bus,NULL,object_copy,"org.freedesktop.systemd1.Service","MainPID",NULL,'u',&out->main_pid) < 0 ||
      api->get_property_trivial(bus,NULL,object_copy,"org.freedesktop.systemd1.Service","NoNewPrivileges",NULL,'b',&out->no_new_privileges) < 0 ||
      api->get_property_trivial(bus,NULL,object_copy,"org.freedesktop.systemd1.Service","CapabilityBoundingSet",NULL,'t',&out->capability_bounding_set) < 0 ||
      api->get_property_trivial(bus,NULL,object_copy,"org.freedesktop.systemd1.Service","AmbientCapabilities",NULL,'t',&out->ambient_capabilities) < 0) return -1;
  return 0;
}

static int validate_unit_observation(uid_t uid, const char *unit,
                                     const struct proc_identity *manager,
                                     const struct unit_observation *obs,
                                     struct proc_identity *service) {
  if (strcmp(obs->load_state,"loaded") || strcmp(obs->active_state,"active") || strcmp(obs->sub_state,"running")) return -1;
  if (obs->user[0] != '\0' || obs->group[0] != '\0') return -1;
  if (obs->main_pid <= 1 || obs->no_new_privileges != 1 ||
      obs->capability_bounding_set != 0 || obs->ambient_capabilities != 0) return -1;
  char expected_cgroup[512];
  int n = snprintf(expected_cgroup,sizeof(expected_cgroup),
    "/user.slice/user-%lu.slice/user@%lu.service/app.slice/%s",
    (unsigned long)uid,(unsigned long)uid,unit);
  if (n <= 0 || n >= (int)sizeof(expected_cgroup) || strcmp(obs->control_group,expected_cgroup)) return -1;

  pid_t ppid = 0;
  unsigned long long start = 0;
  if (proc_stat_identity((pid_t)obs->main_pid,&ppid,&start) != 0 || ppid != manager->pid) return -1;
  uid_t observed_uid = 0;
  gid_t observed_gid = 0;
  if (parse_status_ids((pid_t)obs->main_pid,uid,&observed_uid,&observed_gid) != 0 || observed_gid != manager->gid) return -1;
  if (exact_service_cgroup((pid_t)obs->main_pid,uid,unit) != 0) return -1;
  if (exact_executable_path((pid_t)obs->main_pid,NODE_EXE) != 0) return -1;
  service->pid=(pid_t)obs->main_pid;
  service->ppid=ppid;
  service->uid=observed_uid;
  service->gid=observed_gid;
  service->start_ticks=start;
  return 0;
}

static int live_query(uid_t uid, const char *unit) {
  if (geteuid() != 0) query_die("root_required");
  if (safe_unit_name(unit) != 0) query_die("unit_invalid");

  struct proc_identity manager;
  if (find_manager(uid,&manager) != 0) query_die("manager_candidate_not_exactly_one");
  int manager_pidfd=pidfd_open_checked(manager.pid);
  if (manager_pidfd < 0 || pidfd_alive(manager_pidfd) != 0) query_die("manager_pidfd_unavailable");

  struct stat socket_before,socket_after;
  int busfd=connect_private(uid,&socket_before,&socket_after);
  if (busfd < 0) { close(manager_pidfd); query_die("manager_private_socket_connect_failed"); }
  struct ucred cred;
  if (peercred(busfd,&cred) != 0 || cred.pid != manager.pid || cred.uid != manager.uid || cred.gid != manager.gid) {
    close(busfd); close(manager_pidfd); query_die("manager_private_socket_peer_mismatch");
  }

  struct sd_api api;
  if (load_sd_api(&api) != 0) { close(busfd); close(manager_pidfd); query_die("libsystemd_api_unavailable"); }
  sd_bus *bus=NULL;
  if (api.bus_new(&bus) < 0 || !bus ||
      api.bus_set_fd(bus,busfd,busfd) < 0 ||
      api.bus_set_bus_client(bus,0) < 0 ||
      api.bus_set_method_call_timeout(bus,5ULL*1000ULL*1000ULL) < 0) {
    if (bus) api.bus_unref(bus); else close(busfd);
    unload_sd_api(&api); close(manager_pidfd); query_die("sd_bus_configuration_failed");
  }
  busfd=-1;
  if (api.bus_start(bus) < 0) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("sd_bus_start_failed");
  }
  int retained_fd=api.bus_get_fd(bus);
  struct ucred retained_cred;
  if (retained_fd < 0 || peercred(retained_fd,&retained_cred) != 0 ||
      retained_cred.pid != manager.pid || retained_cred.uid != manager.uid || retained_cred.gid != manager.gid) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("sd_bus_retained_peer_mismatch");
  }

  struct unit_observation obs;
  if (query_unit(&api,bus,unit,&obs) != 0) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("unit_property_query_failed");
  }
  struct proc_identity service;
  if (validate_unit_observation(uid,unit,&manager,&obs,&service) != 0) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("unit_property_kernel_binding_failed");
  }
  int service_pidfd=pidfd_open_checked(service.pid);
  if (service_pidfd < 0 || pidfd_alive(service_pidfd) != 0) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("service_pidfd_unavailable");
  }

  struct proc_identity manager_after,service_after;
  struct ucred final_cred;
  if (candidate(manager.pid,uid,&manager_after) != 0 ||
      manager_after.start_ticks != manager.start_ticks || manager_after.gid != manager.gid ||
      proc_stat_identity(service.pid,&service_after.ppid,&service_after.start_ticks) != 0 ||
      service_after.ppid != manager.pid || service_after.start_ticks != service.start_ticks ||
      exact_service_cgroup(service.pid,uid,unit) != 0 || exact_executable_path(service.pid,NODE_EXE) != 0 ||
      pidfd_alive(manager_pidfd) != 0 || pidfd_alive(service_pidfd) != 0 ||
      peercred(retained_fd,&final_cred) != 0 || final_cred.pid != manager.pid || final_cred.uid != manager.uid || final_cred.gid != manager.gid) {
    close(service_pidfd); api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("post_query_generation_changed");
  }

  printf("%s_GREEN\n",MARKER);
  printf("runtime_uid=%lu\n",(unsigned long)uid);
  printf("manager_pid=%ld\n",(long)manager.pid);
  printf("manager_gid=%lu\n",(unsigned long)manager.gid);
  printf("manager_start_ticks=%llu\n",manager.start_ticks);
  printf("manager_peer_authenticated=true\n");
  printf("same_private_fd_used_for_query=true\n");
  printf("runtime_service_unit=%s\n",unit);
  printf("LoadState=%s\n",obs.load_state);
  printf("ActiveState=%s\n",obs.active_state);
  printf("SubState=%s\n",obs.sub_state);
  printf("User=%s\n",obs.user);
  printf("Group=%s\n",obs.group);
  printf("MainPID=%u\n",obs.main_pid);
  printf("ControlGroup=%s\n",obs.control_group);
  printf("NoNewPrivileges=yes\n");
  printf("CapabilityBoundingSet=\n");
  printf("AmbientCapabilities=\n");
  printf("service_ppid=%ld\n",(long)service.ppid);
  printf("service_start_ticks=%llu\n",service.start_ticks);
  printf("service_pidfd_retained=true\n");
  printf("manager_pidfd_retained=true\n");
  printf("runtime_main_pid_kernel_bound=true\n");
  printf("manager_generation_reverified=true\n");
  printf("service_generation_reverified=true\n");
  printf("host_mutation=false\n");
  printf("payment_acceptance=false\n");
  printf("public_presale_activation=false\n");
  printf("funds_movement=false\n");

  close(service_pidfd);
  api.bus_unref(bus);
  unload_sd_api(&api);
  close(manager_pidfd);
  return 0;
}

static int self_test_query(void) {
  struct sd_api api;
  if (load_sd_api(&api) != 0) return 1;
  unload_sd_api(&api);
  if (safe_unit_name("void-node-live.service") != 0) return 1;
  if (safe_unit_name("../bad.service") == 0) return 1;
  if (safe_unit_name("bad.socket") == 0) return 1;
  printf("%s_SELF_TEST_GREEN\n",MARKER);
  printf("libsystemd_runtime_symbols_available=true\n");
  printf("sd_bus_set_fd_same_connection_required=true\n");
  printf("direct_peer_mode_required=true\n");
  printf("systemd_private_socket_required=true\n");
  printf("public_user_bus_used=false\n");
  printf("unit_properties_queried_live_only=true\n");
  printf("host_mutation=false\n");
  return 0;
}

int main(int argc,char **argv) {
  if (argc==2 && strcmp(argv[1],"--self-test")==0) return self_test_query();
  if (argc==5 && strcmp(argv[1],"--uid")==0 && strcmp(argv[3],"--unit")==0) {
    unsigned long long raw=0;
    if (parse_uint(argv[2],&raw)!=0 || raw==0 || raw>0x7fffffffULL) query_die("uid_invalid");
    return live_query((uid_t)raw,argv[4]);
  }
  fprintf(stderr,"usage: %s --self-test | --uid <positive-uid> --unit <service>\n",argv[0]);
  return 2;
}
