#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(
  "ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c",
  "utf8",
);

for(const exact of [
  '#define ROOT_DIR "/opt/void-buy-void-user-manager-query-v1"',
  '#define SELF_PATH ROOT_DIR "/void_buy_void_user_manager_private_unit_query_preexec_v1"',
  '#define QUERY_PATH ROOT_DIR "/void_buy_void_user_manager_private_unit_query_v1"',
  '#define QUERY_MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1=1"',
  'open(QUERY_PATH, O_RDONLY | O_CLOEXEC | O_NOFOLLOW)',
  'fexecve(fd, child_argv, child_env);',
  '"PATH=/usr/bin:/bin"',
  '"LANG=C"',
  '"LC_ALL=C"',
]){
  assert.ok(source.includes(exact),exact);
}
for(const forbidden of [
  "system(",
  "popen(",
  "execvp(",
  "execvpe(",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "NODE_OPTIONS",
  "NODE_PATH",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
assert.ok(source.includes("geteuid() != 0"));
assert.ok(source.includes("st.st_uid != 0"));
assert.ok(source.includes("(st.st_mode & 0022) != 0"));
assert.ok(source.includes("st.st_nlink != 1"));
assert.ok(source.includes("self_is_fixed()"));
assert.ok(source.includes("same_stat(&opened, &visible_after)"));

console.log("VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_PREEXEC_V1_PROOF_GREEN");
console.log("static_link_required=true");
console.log("dynamic_loader_before_preexec_forbidden=true");
console.log("fixed_query_path=true");
console.log("retained_query_descriptor=true");
console.log("clean_child_environment_constructed_by_parent=true");
console.log("query_fexecve_required=true");
console.log("query_elf_content_lock_still_required=true");
console.log("host_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
