#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createVoidPublicParticipantReadSessionV1,
} from "../ops/public/void-public-participant-read-session-v1.mjs";
import {
  createVoidPublicParticipantSessionHttpV1,
} from "../ops/public/void-public-participant-session-http-v1.mjs";
import {
  VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1,
  VOID_PUBLIC_PARTICIPANT_SESSION_STATE_STORE_V1,
  createVoidPublicParticipantSessionStateFileV1,
} from "../ops/public/void-public-participant-session-state-file-v1.mjs";

const MARKER =
  "VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-participant-session-state-proof-"),
);
fs.chmodSync(temp, 0o700);

const registryDir = path.join(temp, "registry");
const registryFile = path.join(
  registryDir,
  "participant-login-bindings-v1.json",
);
const stateDir = path.join(temp, "state");
const stateFile = path.join(
  stateDir,
  "participant-session-state-v1.json",
);
const raceStateFile = path.join(
  stateDir,
  "participant-session-race-state-v1.json",
);
const faultStateFile = path.join(
  stateDir,
  "participant-session-fault-state-v1.json",
);
const installedRaceStateFile = path.join(
  stateDir,
  "participant-session-installed-race-state-v1.json",
);
const installedRaceBackupFile =
  installedRaceStateFile + ".fsynced-original";
const malformedRoleStateFile = path.join(
  stateDir,
  "participant-session-malformed-role-state-v1.json",
);
const pathnameRaceDir = path.join(temp, "pathname-race-state");
const pathnameRaceStateFile = path.join(
  pathnameRaceDir,
  "participant-session-state-v1.json",
);
const pathnameRaceBackupFile =
  pathnameRaceStateFile + ".opened-original";
const parentSwapDir = path.join(temp, "parent-swap-state");
const parentSwapBackupDir =
  path.join(temp, "parent-swap-state-original");
const parentSwapStateFile = path.join(
  parentSwapDir,
  "participant-session-state-v1.json",
);

const account = "participant-a";
const identity = "participant.a";
let clock = 1_800_000_000_000;
let randomCounter = 0;

function deterministicBytes(size) {
  randomCounter += 1;
  const chunks = [];
  let index = 0;
  while (Buffer.concat(chunks).length < size) {
    index += 1;
    chunks.push(
      crypto.createHash("sha256")
        .update(
          "void-participant-session-state-proof:" +
            randomCounter + ":" + index,
        )
        .digest(),
    );
  }
  return Buffer.concat(chunks).subarray(0, size);
}

function fingerprint(publicKey) {
  return crypto.createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
}

function signChallenge(challenge, privateKey) {
  return crypto.sign(
    null,
    Buffer.from(challenge.signing_payload_base64url, "base64url"),
    privateKey,
  ).toString("base64url");
}

function writeRegistry(publicKey) {
  const registry = {
    marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
    version: 1,
    bindings: [{
      account,
      status: "active",
      key_type: "ed25519",
      public_key_pem: String(
        publicKey.export({ type: "spki", format: "pem" }),
      ),
      public_key_fingerprint_sha256: fingerprint(publicKey),
      capabilities: ["participant.account.read.v1"],
    }],
  };
  fs.writeFileSync(
    registryFile,
    JSON.stringify(registry, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(registryFile, 0o600);
}

function memorylessSession(file) {
  const store = createVoidPublicParticipantSessionStateFileV1({
    stateFile: file,
  });
  const session = createVoidPublicParticipantReadSessionV1({
    bindingRegistryFile: registryFile,
    stateStore: store,
    now: () => clock,
    randomBytes: deterministicBytes,
  });
  assert.equal(store.durable, true);
  assert.equal(session.state_store_durable, true);
  return { store, session };
}

function admissionFor(subject) {
  return {
    schema: "void.participant-role-authority-admission.v1",
    chain_id: 2050,
    identity_id: subject.identity_id,
    account_id: subject.account_id,
    role: "AGENT",
    subject_binding_sha256: "11".repeat(32),
    authority_policy_sha256: "22".repeat(32),
    role_authority_generation: "0",
    role_record_sha256: "33".repeat(32),
    role_registry_binding_descriptor_sha256: "44".repeat(32),
  };
}

try {
  fs.mkdirSync(registryDir, { mode: 0o700 });
  fs.chmodSync(registryDir, 0o700);
  fs.mkdirSync(stateDir, { mode: 0o700 });
  fs.chmodSync(stateDir, 0o700);
  fs.mkdirSync(pathnameRaceDir, { mode: 0o700 });
  fs.chmodSync(pathnameRaceDir, 0o700);
  fs.mkdirSync(parentSwapDir, { mode: 0o700 });
  fs.chmodSync(parentSwapDir, 0o700);

  const login = crypto.generateKeyPairSync("ed25519");
  const wrongLogin = crypto.generateKeyPairSync("ed25519");
  writeRegistry(login.publicKey);

  for (const [key, expected] of Object.entries({
    durable: true,
    bearer_token_persisted: false,
    wallet_private_key_access: false,
    signing_authority: false,
    transaction_authority: false,
    work_credit_mutation_authority: false,
    validator_mutation_authority: false,
    chain2050_write_authority: false,
    money_movement_authority: false,
  })) {
    assert.equal(
      VOID_PUBLIC_PARTICIPANT_SESSION_STATE_STORE_V1[key],
      expected,
      key,
    );
  }

  assert.equal(
    VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.atomic_same_directory_replace,
    true,
  );
  assert.equal(
    VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.file_fsync_before_replace,
    true,
  );
  assert.equal(
    VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.directory_fsync_before_ack,
    true,
  );
  assert.equal(
    VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.descriptor_bound_startup_read,
    true,
  );
  assert.equal(
    VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.state_file_nofollow_required,
    true,
  );
  assert.equal(
    VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.parent_dev_inode_custody_retained,
    true,
  );
  assert.equal(
    VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.parent_descriptor_fsync,
    true,
  );
  assert.equal(
    VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1
      .installed_inode_bound_to_fsynced_descriptor,
    true,
  );
  assert.equal(
    VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1
      .installed_content_revalidated_after_parent_fsync,
    true,
  );

  // A failed authentication burns its one-use challenge durably.
  {
    const { session } = memorylessSession(stateFile);
    const challenge = session.challenge(account);
    const wrongSignature = signChallenge(
      challenge,
      wrongLogin.privateKey,
    );
    assert.throws(
      () => session.login({
        challenge_id: challenge.challenge_id,
        nonce: challenge.nonce,
        account,
        signature_base64url: wrongSignature,
      }),
      /account_authentication_failed/,
    );

    const restarted = memorylessSession(stateFile).session;
    assert.throws(
      () => restarted.login({
        challenge_id: challenge.challenge_id,
        nonce: challenge.nonce,
        account,
        signature_base64url: signChallenge(
          challenge,
          login.privateKey,
        ),
      }),
      /challenge_unavailable/,
      "consumed challenge returned after restart",
    );
  }

  let authorization;
  let issuedToken;

  // An issued bearer session survives process restart, but only its SHA-256
  // is persisted.
  {
    const { session } = memorylessSession(stateFile);
    const challenge = session.challenge(account);
    const loginResult = session.login({
      challenge_id: challenge.challenge_id,
      nonce: challenge.nonce,
      account,
      signature_base64url: signChallenge(
        challenge,
        login.privateKey,
      ),
    });
    issuedToken = loginResult.session_token;
    authorization = "Bearer " + issuedToken;

    const persisted = fs.readFileSync(stateFile, "utf8");
    assert.equal(persisted.includes(issuedToken), false);
    assert.equal(persisted.includes("session_token"), false);
    const digest = crypto.createHash("sha256")
      .update(issuedToken, "utf8")
      .digest("hex");
    assert.equal(persisted.includes(digest), true);

    const restarted = memorylessSession(stateFile).session;
    const authorized = restarted.authorize(authorization, account);
    assert.equal(authorized.account, account);
    assert.equal(authorized.read_only, true);
    assert.equal(authorized.signing_authority, false);
    assert.equal(authorized.money_movement_authority, false);
  }

  // Logout is committed before success and remains revoked after restart.
  {
    const { session } = memorylessSession(stateFile);
    assert.equal(session.logout(authorization), true);
    const restarted = memorylessSession(stateFile).session;
    assert.throws(
      () => restarted.authorize(authorization, account),
      /session_unavailable/,
      "logged-out durable session returned after restart",
    );
    assert.equal(restarted.logout(authorization), false);
  }

  // The HTTP layer surfaces the durability fact without mounting a route.
  {
    const stateStore =
      createVoidPublicParticipantSessionStateFileV1({ stateFile });
    const roleAuthority = Object.freeze({
      marker: "VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1",
      chain_id: 2050,
      required_role: "AGENT",
      wallet_private_key_access: false,
      signing_authority: false,
      work_credit_mutation_authority: false,
      validator_mutation_authority: false,
      chain2050_write_authority: false,
      money_movement_authority: false,
      admit(subject) {
        return { ok: true, admission: admissionFor(subject) };
      },
      revalidate(admission) {
        return {
          ok: true,
          context: {
            identity_id: admission.identity_id,
            account_id: admission.account_id,
            role: "AGENT",
            subject_binding_sha256:
              admission.subject_binding_sha256,
            role_authority_generation:
              admission.role_authority_generation,
            role_record_sha256: admission.role_record_sha256,
          },
        };
      },
    });
    const http = createVoidPublicParticipantSessionHttpV1({
      bindingRegistryFile: registryFile,
      roleAuthority,
      stateStore,
      now: () => clock,
      randomBytes: deterministicBytes,
    });
    assert.equal(http.state_store_durable, true);
    const status = await http.handle({
      url: "/__void/participant/session/v1/status.json",
      method: "GET",
      headers: {},
      body: null,
    });
    assert.equal(status.status, 200);
    assert.equal(status.body.durable_state_store, true);
    assert.equal(
      status.body.durable_state_store_required_for_production,
      true,
    );
    assert.equal(status.body.production_route_mounted, false);
  }

  // If logout happens while role revalidation is awaiting I/O, the final
  // authorization commit point must re-read durable session state.
  {
    let resolveRevalidation = null;
    const stateStore =
      createVoidPublicParticipantSessionStateFileV1({
        stateFile: raceStateFile,
      });
    const roleAuthority = Object.freeze({
      marker: "VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1",
      chain_id: 2050,
      required_role: "AGENT",
      wallet_private_key_access: false,
      signing_authority: false,
      work_credit_mutation_authority: false,
      validator_mutation_authority: false,
      chain2050_write_authority: false,
      money_movement_authority: false,
      admit(subject) {
        return { ok: true, admission: admissionFor(subject) };
      },
      revalidate(admission) {
        return new Promise((resolve) => {
          resolveRevalidation = () => resolve({
            ok: true,
            context: {
              identity_id: admission.identity_id,
              account_id: admission.account_id,
              role: "AGENT",
              subject_binding_sha256:
                admission.subject_binding_sha256,
              role_authority_generation:
                admission.role_authority_generation,
              role_record_sha256: admission.role_record_sha256,
            },
          });
        });
      },
    });

    const session = createVoidPublicParticipantReadSessionV1({
      bindingRegistryFile: registryFile,
      roleAuthority,
      stateStore,
      now: () => clock,
      randomBytes: deterministicBytes,
    });
    const challenge = session.challenge({ identity_id: identity, account });
    const loginResult = await session.login({
      challenge_id: challenge.challenge_id,
      nonce: challenge.nonce,
      identity_id: identity,
      account,
      signature_base64url: signChallenge(
        challenge,
        login.privateKey,
      ),
    });
    const auth = "Bearer " + loginResult.session_token;
    const pending = session.authorize(auth, account);
    assert.equal(typeof pending?.then, "function");
    assert.equal(typeof resolveRevalidation, "function");
    assert.equal(session.logout(auth), true);
    resolveRevalidation();
    await assert.rejects(
      pending,
      /session_unavailable/,
      "logout raced through an in-flight role revalidation",
    );

    const restarted = createVoidPublicParticipantReadSessionV1({
      bindingRegistryFile: registryFile,
      roleAuthority,
      stateStore:
        createVoidPublicParticipantSessionStateFileV1({
          stateFile: raceStateFile,
        }),
      now: () => clock,
      randomBytes: deterministicBytes,
    });
    assert.throws(
      () => restarted.authorize(auth, account),
      /session_unavailable/,
    );
  }

  // Startup parsing is descriptor-bound. Replacing the pathname after the
  // admitted file descriptor is open must fail even when the replacement has
  // identical bytes, owner and mode.
  {
    const initialized =
      createVoidPublicParticipantSessionStateFileV1({
        stateFile: pathnameRaceStateFile,
      });
    assert.equal(initialized.challengeCount(), 0);
    const originalBytes =
      fs.readFileSync(pathnameRaceStateFile);

    const originalReadSync = fs.readSync;
    let replacedPath = false;
    try {
      fs.readSync = function injectedReadSync(...args) {
        if (!replacedPath) {
          replacedPath = true;
          fs.renameSync(
            pathnameRaceStateFile,
            pathnameRaceBackupFile,
          );
          fs.writeFileSync(
            pathnameRaceStateFile,
            originalBytes,
            { mode: 0o600 },
          );
          fs.chmodSync(pathnameRaceStateFile, 0o600);
        }
        return originalReadSync.apply(fs, args);
      };

      assert.throws(
        () => createVoidPublicParticipantSessionStateFileV1({
          stateFile: pathnameRaceStateFile,
        }),
        /session_state_file_(?:changed_during_read|path_identity_changed)/,
        "pathname replacement escaped descriptor-bound startup read",
      );
    } finally {
      fs.readSync = originalReadSync;
    }
    assert.equal(replacedPath, true);
    assert.equal(
      fs.readFileSync(pathnameRaceStateFile).equals(originalBytes),
      true,
      "replacement fixture bytes drifted",
    );
  }

  // Parent-directory custody is retained by dev/inode generation. A same-UID
  // directory swap after the pre-write check must poison the live store and
  // must not publish the candidate state into the replacement parent.
  {
    const store =
      createVoidPublicParticipantSessionStateFileV1({
        stateFile: parentSwapStateFile,
      });
    assert.equal(store.challengeCount(), 0);

    const originalOpenSync = fs.openSync;
    let swappedParent = false;
    try {
      fs.openSync = function injectedOpenSync(
        target,
        flags,
        mode,
      ) {
        if (
          !swappedParent &&
          typeof target === "string" &&
          target.startsWith(parentSwapDir + path.sep + ".") &&
          target.includes(".tmp-")
        ) {
          swappedParent = true;
          fs.renameSync(parentSwapDir, parentSwapBackupDir);
          fs.mkdirSync(parentSwapDir, { mode: 0o700 });
          fs.chmodSync(parentSwapDir, 0o700);
        }
        return originalOpenSync.call(fs, target, flags, mode);
      };

      assert.throws(
        () => store.putChallenge({
          id: "de".repeat(16),
          nonce: Buffer.alloc(32, 9).toString("base64url"),
          identity_id: null,
          account,
          issued_at_ms: clock,
          expires_at_ms: clock + 60_000,
        }),
        /session_state_parent_identity_changed/,
        "parent-directory swap escaped retained custody generation",
      );
    } finally {
      fs.openSync = originalOpenSync;
    }

    assert.equal(swappedParent, true);
    assert.throws(
      () => store.challengeCount(),
      /session_state_store_poisoned/,
      "parent custody loss did not poison live auth state",
    );
    assert.equal(
      fs.existsSync(
        path.join(
          parentSwapBackupDir,
          path.basename(parentSwapStateFile),
        ),
      ),
      true,
      "original admitted state disappeared during parent swap",
    );
    assert.equal(
      fs.existsSync(parentSwapStateFile),
      false,
      "candidate state was published into replacement parent",
    );
  }

  // The fsynced temp descriptor stays open across rename. Replacing the
  // installed canonical pathname during the parent fsync must fail the final
  // descriptor/path identity check and poison the live store.
  {
    const store =
      createVoidPublicParticipantSessionStateFileV1({
        stateFile: installedRaceStateFile,
      });
    const originalFsyncSync = fs.fsyncSync;
    let fsyncCalls = 0;
    let replacedInstalledPath = false;
    try {
      fs.fsyncSync = function injectedInstalledRaceFsync(fd) {
        fsyncCalls += 1;
        if (fsyncCalls === 2) {
          const bytes = fs.readFileSync(installedRaceStateFile);
          fs.renameSync(
            installedRaceStateFile,
            installedRaceBackupFile,
          );
          fs.writeFileSync(
            installedRaceStateFile,
            bytes,
            { mode: 0o600 },
          );
          fs.chmodSync(installedRaceStateFile, 0o600);
          replacedInstalledPath = true;
        }
        return originalFsyncSync.call(fs, fd);
      };

      assert.throws(
        () => store.putChallenge({
          id: "ef".repeat(16),
          nonce: Buffer.alloc(32, 10).toString("base64url"),
          identity_id: null,
          account,
          issued_at_ms: clock,
          expires_at_ms: clock + 60_000,
        }),
        /session_state_(?:installed_descriptor_changed|installed_content_changed|file_path_identity_changed)/,
        "installed pathname replacement escaped open-descriptor binding",
      );
    } finally {
      fs.fsyncSync = originalFsyncSync;
    }
    assert.equal(fsyncCalls, 2);
    assert.equal(replacedInstalledPath, true);
    assert.throws(
      () => store.sessionCount(),
      /session_state_store_poisoned/,
      "installed pathname replacement did not poison live state",
    );
  }

  // A failure after the atomic replace is an ambiguous durability terminal:
  // the live store is poisoned rather than rolling authentication state back.
  {
    const store =
      createVoidPublicParticipantSessionStateFileV1({
        stateFile: faultStateFile,
      });
    const originalFsyncSync = fs.fsyncSync;
    let fsyncCalls = 0;
    try {
      fs.fsyncSync = function injectedFsyncSync(fd) {
        fsyncCalls += 1;
        if (fsyncCalls === 2) {
          throw new Error("injected_directory_fsync_failure");
        }
        return originalFsyncSync.call(fs, fd);
      };
      assert.throws(
        () => store.putChallenge({
          id: "ab".repeat(16),
          nonce: Buffer.alloc(32, 7).toString("base64url"),
          identity_id: null,
          account,
          issued_at_ms: clock,
          expires_at_ms: clock + 60_000,
        }),
        /injected_directory_fsync_failure/,
      );
    } finally {
      fs.fsyncSync = originalFsyncSync;
    }
    assert.equal(fsyncCalls, 2);
    assert.throws(
      () => store.challengeCount(),
      /session_state_store_poisoned/,
      "ambiguous post-replace failure did not poison live state",
    );

    const recovered =
      createVoidPublicParticipantSessionStateFileV1({
        stateFile: faultStateFile,
      });
    assert.equal(
      recovered.challengeCount(),
      1,
      "visible post-replace state was rolled back after restart",
    );
  }

  // Stored role admission is a closed public metadata schema, not an
  // arbitrary JSON carrier.
  {
    const invalidAdmission = {
      ...admissionFor({
        identity_id: identity,
        account_id: account,
      }),
      extra: "not-allowed",
    };
    const invalidSnapshot = {
      marker:
        VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE_V1.marker,
      version: 1,
      generation: "1",
      challenges: [],
      sessions: [{
        id: "cd".repeat(16),
        token_sha256: "55".repeat(32),
        identity_id: identity,
        account,
        public_key_fingerprint_sha256:
          fingerprint(login.publicKey),
        capability: "participant.account.read.v1",
        role_admission: invalidAdmission,
        issued_at_ms: clock,
        expires_at_ms: clock + 60_000,
      }],
    };
    fs.writeFileSync(
      malformedRoleStateFile,
      JSON.stringify(invalidSnapshot) + "\n",
      { mode: 0o600 },
    );
    fs.chmodSync(malformedRoleStateFile, 0o600);
    assert.throws(
      () => createVoidPublicParticipantSessionStateFileV1({
        stateFile: malformedRoleStateFile,
      }),
      /session_state_role_admission_shape_invalid/,
    );
  }

  // File authority is fail-closed.
  {
    assert.equal(fs.statSync(stateFile).mode & 0o777, 0o600);
    fs.chmodSync(stateFile, 0o644);
    assert.throws(
      () => createVoidPublicParticipantSessionStateFileV1({ stateFile }),
      /session_state_file_mode_invalid/,
    );
    fs.chmodSync(stateFile, 0o600);

    const malformed = path.join(stateDir, "malformed.json");
    fs.writeFileSync(malformed, Buffer.from([0xff, 0xfe]), {
      mode: 0o600,
    });
    fs.chmodSync(malformed, 0o600);
    assert.throws(
      () => createVoidPublicParticipantSessionStateFileV1({
        stateFile: malformed,
      }),
      /session_state_file_utf8_invalid/,
    );

    const link = path.join(stateDir, "state-link.json");
    fs.symlinkSync(stateFile, link);
    assert.throws(
      () => createVoidPublicParticipantSessionStateFileV1({
        stateFile: link,
      }),
      /session_state_file_type_invalid/,
    );

    assert.equal(
      fs.readdirSync(stateDir)
        .some((name) => name.includes(".tmp-")),
      false,
      "state temp file leaked",
    );
  }

  clock += 20 * 60_000;

  console.log(MARKER);
  console.log("challenge_consume_restart_durable=true");
  console.log("issued_session_restart_durable=true");
  console.log("logout_restart_durable=true");
  console.log("bearer_token_persisted=false");
  console.log("session_token_sha256_persisted=true");
  console.log("atomic_same_directory_replace=true");
  console.log("file_fsync_before_replace=true");
  console.log("directory_fsync_before_ack=true");
  console.log("startup_read_descriptor_bound=true");
  console.log("pathname_replacement_rejected=true");
  console.log("parent_dev_inode_custody_retained=true");
  console.log("parent_swap_poisoned=true");
  console.log("installed_inode_bound_to_fsynced_descriptor=true");
  console.log("installed_content_revalidated_after_parent_fsync=true");
  console.log("installed_path_replacement_poisoned=true");
  console.log("post_replace_failure_poisoned=true");
  console.log("ambiguous_commit_cannot_reuse_auth_state=true");
  console.log("role_admission_closed_schema=true");
  console.log("strict_owner_mode_boundary=true");
  console.log("symlink_state_rejected=true");
  console.log("fatal_utf8_state_parse=true");
  console.log("async_logout_authorization_race_closed=true");
  console.log("durable_state_store_required_for_production=true");
  console.log("production_route_mounted=false");
  console.log("wallet_private_key_access=false");
  console.log("signing_authority=false");
  console.log("transaction_authority=false");
  console.log("work_credit_mutation=false");
  console.log("validator_mutation=false");
  console.log("chain2050_write_authority=false");
  console.log("money_movement_authority=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
