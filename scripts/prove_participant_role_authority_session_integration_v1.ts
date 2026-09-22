#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
  deriveChain2050RoleAuthorityPairV1,
  type Chain2050RoleAuthorityRecordV1,
} from "../src/security/chain2050_role_authority_record_v1.js";
import {
  appendChain2050RoleAuthorityRecordV1,
  createEmptyChain2050RoleAuthorityRegistryV1,
} from "../src/security/chain2050_role_authority_registry_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
  computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1,
  createChain2050RoleAuthorityRegistryReadSourceBindingV1,
  type Chain2050RoleAuthorityRegistryBindingDescriptorV1,
} from "../src/security/chain2050_role_authority_registry_read_source_binding_v1.js";
import {
  computeParticipantRoleSubjectBindingSha256V1,
} from "../src/security/participant_role_authority_guard_v1.js";
import {
  createParticipantRoleAuthoritySessionAdapterV1,
} from "../src/security/participant_role_authority_session_adapter_v1.js";
import {
  createVoidPublicParticipantSessionHttpV1,
} from "../ops/public/void-public-participant-session-http-v1.mjs";
import {
  createVoidPublicParticipantAccountReadHttpEdgeV1,
} from "../ops/public/void-public-participant-account-read-http-edge-v1.mjs";

const MARKER =
  "VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_INTEGRATION_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-role-session-integration-"),
);
const registryDir = path.join(temp, "registry");
const registryFile = path.join(
  registryDir,
  "participant-login-bindings-v1.json",
);
const identity = "participant.alice";
const account = "participant-a";
let clock = 1_800_000_000_000;
let randomCounter = 0;
let sourceReads = 0;

function deterministicBytes(size: number): Buffer {
  randomCounter += 1;
  const a = crypto.createHash("sha256")
    .update("role-session-a-" + randomCounter)
    .digest();
  const b = crypto.createHash("sha256")
    .update("role-session-b-" + randomCounter)
    .digest();
  return Buffer.concat([a, b]).subarray(0, size);
}

function fingerprint(publicKey: crypto.KeyObject): string {
  return crypto.createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
}

function publicJwk(publicKey: crypto.KeyObject) {
  const jwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
  return {
    kty: "OKP" as const,
    crv: "Ed25519" as const,
    x: String(jwk.x),
  };
}

function jsonRequest(url: string, value: unknown) {
  return {
    url,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  };
}

function signChallenge(
  challenge: Record<string, unknown>,
  privateKey: crypto.KeyObject,
): string {
  return crypto.sign(
    null,
    Buffer.from(
      String(challenge.signing_payload_base64url),
      "base64url",
    ),
    privateKey,
  ).toString("base64url");
}

function successor(
  previous: Chain2050RoleAuthorityRecordV1,
  overrides: Partial<Chain2050RoleAuthorityRecordV1>,
): Chain2050RoleAuthorityRecordV1 {
  return {
    ...previous,
    role_authority_generation:
      (BigInt(previous.role_authority_generation) + 1n).toString(),
    predecessor_role_record_sha256:
      deriveChain2050RoleAuthorityPairV1(previous).role_record_sha256,
    ...overrides,
  };
}

function walletSource(selected: string) {
  return {
    marker: "VOID_UI_WAVE3_WALLET_READONLY_V1",
    read_only: true,
    account: { selected: true, id: selected },
    wallet: {
      source_available: true,
      has_wallet: true,
      address: "0x" + "12".repeat(20),
      native_gas_available: true,
      native_gas_display: "0.5",
    },
    balances: {
      ledger_wc: { available: true, balance: 17, entries: 3 },
      production_wc: { available: true, balance: 5, entries: 1 },
    },
    boundaries: {
      browser_wallet_connection: false,
      wallet_create: false,
      wallet_import: false,
      wallet_unlock: false,
      wallet_export: false,
      wallet_send: false,
      wc_to_void: false,
      ledger_write: false,
      validator_mutation: false,
      operator_mutation: false,
      money_movement: false,
    },
  };
}

async function fakeFetch(input: unknown) {
  sourceReads += 1;
  const url = new URL(String(input));
  const selected = String(url.searchParams.get("account") || "");
  const response = new Response(
    JSON.stringify(walletSource(selected)),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
  Object.defineProperty(response, "url", { value: url.href });
  return response;
}

try {
  fs.mkdirSync(registryDir, { mode: 0o700 });
  fs.chmodSync(registryDir, 0o700);

  const login = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(
    registryFile,
    JSON.stringify({
      marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
      version: 1,
      bindings: [{
        account,
        status: "active",
        key_type: "ed25519",
        public_key_pem: String(
          login.publicKey.export({ type: "spki", format: "pem" }),
        ),
        public_key_fingerprint_sha256:
          fingerprint(login.publicKey),
        capabilities: ["participant.account.read.v1"],
      }],
    }, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(registryFile, 0o600);

  const subject = {
    identity_id: identity,
    account_id: account,
    public_key_jwk: publicJwk(login.publicKey),
  };
  const subjectSha =
    computeParticipantRoleSubjectBindingSha256V1(subject);
  assert.match(subjectSha ?? "", /^[a-f0-9]{64}$/);

  const record: Chain2050RoleAuthorityRecordV1 = {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
    chain_id: 2050,
    identity_id: identity,
    role: "AGENT",
    authority_status: "active",
    role_authority_generation: "0",
    subject_binding_sha256: String(subjectSha),
    authority_policy_sha256: "aa".repeat(32),
    predecessor_role_record_sha256: null,
    transition: "genesis_grant",
  };
  const initial = appendChain2050RoleAuthorityRecordV1(
    createEmptyChain2050RoleAuthorityRegistryV1(),
    record,
  );
  assert.equal(initial.ok, true);
  if (initial.ok === false) throw new Error(initial.reason);

  const descriptor: Chain2050RoleAuthorityRegistryBindingDescriptorV1 = {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
    chain_id: 2050,
    binding_kind: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
    binding_id: "participant-role-session-integration-v1",
    registry_namespace_sha256: "10".repeat(32),
    registry_contract_sha256: "20".repeat(32),
    query_contract_sha256: "30".repeat(32),
    finality_policy_sha256: "40".repeat(32),
  };
  const descriptorSha =
    computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1(
      descriptor,
    );
  assert.match(descriptorSha ?? "", /^[a-f0-9]{64}$/);

  let providerState: unknown = initial.state;
  const provider = {
    descriptor: structuredClone(descriptor),
    async readCanonicalRoleAuthorityRegistryV1(): Promise<unknown> {
      return providerState;
    },
  };
  const bound =
    createChain2050RoleAuthorityRegistryReadSourceBindingV1(
      provider,
      descriptor,
    );
  assert.equal(bound.ok, true);
  if (bound.ok === false) throw new Error(bound.reason);

  const roleAuthority =
    createParticipantRoleAuthoritySessionAdapterV1({
      roleSource: bound.source,
      expectedBindingDescriptorSha256: String(descriptorSha),
    });

  const sessionHttp =
    createVoidPublicParticipantSessionHttpV1({
      bindingRegistryFile: registryFile,
      roleAuthority,
      now: () => clock,
      randomBytes: deterministicBytes,
    });
  assert.equal(sessionHttp.role_authority_required, true);

  const status = await sessionHttp.handle({
    url: sessionHttp.authority.status_path,
    method: "GET",
  });
  assert.equal(status.status, 200);
  assert.equal(status.body.role_authority_required, true);
  assert.equal(status.body.required_role, "AGENT");

  const challenge = await sessionHttp.handle(jsonRequest(
    sessionHttp.authority.challenge_path,
    { identity_id: identity, account },
  ));
  assert.equal(challenge.status, 200);
  assert.equal(challenge.body.identity_id, identity);
  assert.equal(
    challenge.body.signing_domain,
    "VOID_PUBLIC_PARTICIPANT_READ_SESSION_ROLE_LOGIN_V1",
  );

  const signature = signChallenge(challenge.body, login.privateKey);
  const substituted = await sessionHttp.handle(jsonRequest(
    sessionHttp.authority.login_path,
    {
      challenge_id: challenge.body.challenge_id,
      nonce: challenge.body.nonce,
      identity_id: "participant.mallory",
      account,
      signature_base64url: signature,
    },
  ));
  assert.equal(substituted.status, 401);

  const secondChallenge = await sessionHttp.handle(jsonRequest(
    sessionHttp.authority.challenge_path,
    { identity_id: identity, account },
  ));
  const loginResponse = await sessionHttp.handle(jsonRequest(
    sessionHttp.authority.login_path,
    {
      challenge_id: secondChallenge.body.challenge_id,
      nonce: secondChallenge.body.nonce,
      identity_id: identity,
      account,
      signature_base64url:
        signChallenge(secondChallenge.body, login.privateKey),
    },
  ));
  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.identity_id, identity);
  assert.equal(loginResponse.body.role, "AGENT");
  assert.equal(loginResponse.body.role_authority_bound, true);

  const edge = createVoidPublicParticipantAccountReadHttpEdgeV1({
    sessionHttp,
    sourceBase: "http://127.0.0.1:4100",
    fetchImpl: fakeFetch,
  });
  const authorization =
    "Bearer " + String(loginResponse.body.session_token);

  const wallet = await edge.handle({
    url:
      edge.authority.wallet_path +
      "?account=" + encodeURIComponent(account),
    method: "GET",
    headers: { authorization },
  });
  assert.equal(wallet.status, 200);
  assert.equal(wallet.body.account, account);
  assert.equal(sourceReads, 1);

  const revoked = successor(record, {
    authority_status: "revoked",
    transition: "revoke",
  });
  const revokedState = appendChain2050RoleAuthorityRecordV1(
    initial.state,
    revoked,
  );
  assert.equal(revokedState.ok, true);
  if (revokedState.ok === false) {
    throw new Error(revokedState.reason);
  }
  providerState = revokedState.state;

  const afterRevoke = await edge.handle({
    url:
      edge.authority.wallet_path +
      "?account=" + encodeURIComponent(account),
    method: "GET",
    headers: { authorization },
  });
  assert.equal(afterRevoke.status, 401);
  assert.equal(
    afterRevoke.body.error,
    "account_authorization_failed",
  );
  assert.equal(
    sourceReads,
    1,
    "revoked role reached Wallet source before rejection",
  );

  assert.throws(
    () => createVoidPublicParticipantSessionHttpV1({
      bindingRegistryFile: registryFile,
    }),
    /role_authority_adapter_required/,
  );

  console.log(MARKER);
  console.log("identity_id_signed=true");
  console.log("chain2050_agent_admission_required=true");
  console.log("role_authority_pair_captured=true");
  console.log("per_read_role_revalidation=true");
  console.log("revoked_role_blocks_source_fetch=true");
  console.log("account_only_public_session=false");
  console.log("gateway_activation_without_live_role_adapter=false");
  console.log("chain2050_write=false");
  console.log("wallet_or_signer_access=false");
  console.log("work_credit_mutation=false");
  console.log("funds_action=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
