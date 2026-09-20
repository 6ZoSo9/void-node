#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.js";

const root = process.cwd();
const file = path.join(
  root,
  "ops/systemd/void-node-live.service.d/92-buy-void-dispatcher-postgres-credentials-v1.conf.example",
);
const text = fs.readFileSync(file, "utf8");

const lines = text.split(/\r?\n/);
const loads = lines.filter((line) => line.startsWith("LoadCredential="));

assert.equal(loads.length, 2);
assert.equal(
  loads[0],
  "LoadCredential=" +
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1 +
    ":/ABSOLUTE/OPERATOR/PRIVATE/PATH/" +
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
);
assert.equal(
  loads[1],
  "LoadCredential=" +
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1 +
    ":/ABSOLUTE/OPERATOR/PRIVATE/PATH/" +
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1 +
    ".pem",
);

const active = lines
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("#"));
assert.deepEqual(active, [
  "[Service]",
  loads[0],
  loads[1],
]);

for (const forbidden of [
  "SetCredential=",
  "ImportCredential=",
  "Environment=PGPASSWORD",
  "Environment=DATABASE_URL",
  "Environment=PGHOST",
  "Environment=PGSSLMODE",
  "CREDENTIALS_DIRECTORY=",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=1",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=1",
  "ExecStart=",
  "ExecStartPre=",
  "ExecStartPost=",
]) {
  assert.equal(text.includes(forbidden), false, forbidden);
}

assert.equal(text.includes("/ABSOLUTE/OPERATOR/PRIVATE/PATH/"), true);
assert.equal(/postgres(?:ql)?:\/\//i.test(text), false);
assert.equal(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text), false);

console.log("VOID_BUY_VOID_DISPATCHER_POSTGRES_CREDENTIAL_BINDING_V1_PROOF_GREEN");
console.log("loadcredential_bindings=2");
console.log("password_credential_id_fixed=true");
console.log("ca_credential_id_fixed=true");
console.log("credential_contents_in_repo=false");
console.log("database_url_env=false");
console.log("pgpassword_env=false");
console.log("credentials_directory_env=false");
console.log("runtime_activation=false");
console.log("service_execution_override=false");
console.log("active_systemd_directives_closed=true");
console.log("active_systemd_directive_count=3");
