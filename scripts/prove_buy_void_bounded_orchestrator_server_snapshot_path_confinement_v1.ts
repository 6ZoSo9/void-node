import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_AUTHORITY_V1,
  deriveBuyVoidBoundedOrchestratorServerSnapshotV1,
} from "../src/economic/buy_void_bounded_orchestrator_server_snapshot_v1.js";

const MARKER =
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_PATH_CONFINEMENT_V1_PROOF_GREEN";
const REQUEST_ID = "buyvoid-snapshot-path-confinement-v1";

function writeRequest(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(directory, `${REQUEST_ID}.json`),
    `${JSON.stringify({
      request_id: REQUEST_ID,
      status: "payment_verified",
    })}\n`,
    { mode: 0o600 },
  );
}

function derive(input: {
  root: string;
  requestDir: string;
  dependencyCalls: { value: number };
}) {
  const touched = () => {
    input.dependencyCalls.value += 1;
    return [];
  };
  return deriveBuyVoidBoundedOrchestratorServerSnapshotV1({
    root_dir: input.root,
    request_dir: input.requestDir,
    request_id: REQUEST_ID,
    dependencies: {
      list_claims: touched,
      list_attempts: touched,
      list_confirmed: touched,
      read_broadcast: () => {
        input.dependencyCalls.value += 1;
        return null;
      },
    },
  });
}

const base = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-snapshot-path-confinement-"),
);

try {
  const root = path.join(base, "root");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });

  const realRequestDir = path.join(base, "real-requests");
  writeRequest(realRequestDir);

  const directLink = path.join(base, "request-dir-link");
  fs.symlinkSync(realRequestDir, directLink, "dir");
  const directCalls = { value: 0 };
  const direct = derive({
    root,
    requestDir: directLink,
    dependencyCalls: directCalls,
  });
  assert.equal(direct.ok, false);
  assert.equal(
    direct.reason,
    "server_controlled_request_dir_symlink_ancestor_forbidden",
  );
  assert.equal(directCalls.value, 0);

  const realParent = path.join(base, "real-parent");
  const nestedRequests = path.join(realParent, "requests");
  writeRequest(nestedRequests);
  const parentLink = path.join(base, "parent-link");
  fs.symlinkSync(realParent, parentLink, "dir");
  const ancestorCalls = { value: 0 };
  const ancestor = derive({
    root,
    requestDir: path.join(parentLink, "requests"),
    dependencyCalls: ancestorCalls,
  });
  assert.equal(ancestor.ok, false);
  assert.equal(
    ancestor.reason,
    "server_controlled_request_dir_symlink_ancestor_forbidden",
  );
  assert.equal(ancestorCalls.value, 0);

  const realCalls = { value: 0 };
  const real = derive({
    root,
    requestDir: realRequestDir,
    dependencyCalls: realCalls,
  });
  assert.equal(real.ok, true);
  assert.equal(real.status, "derived");
  assert.equal(real.snapshot.request_id, REQUEST_ID);
  assert.equal(real.snapshot.public_status, "payment_verified");
  assert.equal(real.snapshot.claim_status, "missing");
  assert.equal(real.snapshot.attempt_status, "missing");
  assert.equal(real.snapshot.broadcast_status, "none");
  assert.equal(realCalls.value, 3);

  assert.equal(
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_AUTHORITY_V1
      .request_path_symlink_ancestors_forbidden,
    true,
  );

  console.log(`marker=${MARKER}`);
  console.log("direct_request_dir_symlink_rejected=true");
  console.log("request_dir_symlink_ancestor_rejected=true");
  console.log("real_request_path_preserved=true");
  console.log(MARKER);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}
