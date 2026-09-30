#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildVoidPublicOriginBindingExternalAcceptanceV1,
  writeVoidPublicOriginBindingExternalAcceptanceV1,
} from "../tools/void-public-origin-binding-external-acceptance-v1.mjs";

const ORIGIN = "https://seed.nullfeed.org";
const NODE_ID = "9d89483769e469e0473b489dc50dba96";
const FINGERPRINT =
  "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b";
const TRUST_REGISTRY_SHA256 =
  "49f285908fa70c72ce036b44d9ead41e11fc1bd40092384636a2c0cc3a0d3790";
const work = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-origin-binding-external-acceptance-v1-",
  ),
);

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function responseFor(
  url,
  bytes,
) {
  return {
    status: 200,
    redirected: false,
    url,
    headers: new Headers({
      "content-length":
        String(bytes.length),
    }),
    body: new Response(bytes).body,
  };
}

function fixtureSet({
  handoffReady = true,
  secondAliasBytes = null,
  participantReady = true,
  htmlPlaceholder = false,
} = {}) {
  const bindingBytes = Buffer.from(
    JSON.stringify({
      marker: "fixture-binding",
      version: 1,
    }) + "\n",
    "utf8",
  );
  const bindingSha = sha256(
    bindingBytes,
  );

  const directory = {
    marker:
      "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1",
    status: "green",
    directory_state: "available",
    summary: {
      total: 1,
      available: 1,
      hold: 0,
      unavailable: 0,
      invalid_result: 0,
      observed_fixed_awards_wc: [3],
      award_policy_consistent: true,
    },
    results: [
      {
        base: ORIGIN,
        state: "available",
        trusted: true,
      },
    ],
    safety: {
      read_only: true,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
    },
  };

  const handoff = {
    marker:
      "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1",
    status: "green",
    handoff_state: "ready",
    selected: {
      base: ORIGIN,
    },
    coordinator_identity: {
      node_id: NODE_ID,
      trust_mode:
        "signed_public_origin_binding",
      public_copy_ready:
        handoffReady,
      trust_registry_sha256:
        TRUST_REGISTRY_SHA256,
      trusted_public_key_fingerprint_sha256:
        FINGERPRINT,
      binding: {
        path:
          "/.well-known/void-node-public-origin-binding-v1.json",
        http_status: 200,
        binding_sha256:
          bindingSha,
        issued_at:
          "2026-09-30T15:00:00.000Z",
        expires_at:
          "2026-10-30T15:00:00.000Z",
        public_key_fingerprint_sha256:
          FINGERPRINT,
      },
    },
    commands: {
      status: {
        argv: [
          "node",
          "/repo/tools/void_public_earn_no_node_client_v1.mjs",
          "status",
        ],
      },
      run: {
        argv: [
          "node",
          "/repo/tools/void_public_earn_no_node_client_v1.mjs",
          "run",
        ],
      },
    },
    safety: {
      read_only: true,
      cryptographic_public_origin_binding_verified:
        true,
      public_copy_ready:
        handoffReady,
      client_executed: false,
      identity_created: false,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
    },
  };

  const participantStatus = {
    marker:
      "VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1",
    available: true,
    public_copy_ready:
      participantReady,
    status:
      participantReady
        ? "copy_ready"
        : "identity_hold",
    coordinator_base:
      participantReady
        ? ORIGIN
        : null,
    coordinator_node_id:
      NODE_ID,
    coordinator_node_id_trusted:
      participantReady,
    identity_trust: {
      trust_mode:
        participantReady
          ? "signed_public_origin_binding"
          : "hold",
      cryptographic_public_origin_binding_verified:
        participantReady,
      trusted_public_key_fingerprint_sha256:
        participantReady
          ? FINGERPRINT
          : null,
      binding: {
        path:
          "/.well-known/void-node-public-origin-binding-v1.json",
        binding_sha256:
          participantReady
            ? bindingSha
            : null,
      },
    },
    commands:
      participantReady
        ? {
            status: {
              argv: [
                "node",
                "void-public-earn-no-node-client-v1.mjs",
                "status",
                "--account",
                "YOUR_ACCOUNT",
                "--coordinator-base",
                ORIGIN,
                "--coordinator-node-id",
                NODE_ID,
              ],
            },
            run: {
              argv: [
                "node",
                "void-public-earn-no-node-client-v1.mjs",
                "run",
                "--account",
                "YOUR_ACCOUNT",
                "--coordinator-base",
                ORIGIN,
                "--coordinator-node-id",
                NODE_ID,
              ],
            },
          }
        : null,
    boundaries: {
      manual_coordinator_substitution:
        false,
    },
  };

  const html = Buffer.from(
    [
      "<!doctype html>",
      '<html data-public-copy-ready="ready">',
      "<body>",
      "<p>Signed public-origin identity verified</p>",
      `<pre>${ORIGIN} ${NODE_ID}</pre>`,
      htmlPlaceholder
        ? "<span>PUBLIC_HTTPS_BASE</span>"
        : "",
      "</body>",
      "</html>",
    ].join(""),
    "utf8",
  );

  const directoryText =
    JSON.stringify(directory, null, 2)
    + "\n";
  const handoffText =
    JSON.stringify(handoff, null, 2)
    + "\n";
  const participantStatusBytes =
    Buffer.from(
      JSON.stringify(
        participantStatus,
        null,
        2,
      ) + "\n",
      "utf8",
    );

  const childCalls = [];
  const childRunner = ({
    tool,
    args,
  }) => {
    childCalls.push({
      tool: path.basename(tool),
      args: [...args],
    });
    if (
      path.basename(tool)
        === "wc-public-opportunity-directory-v1.mjs"
    ) {
      return {
        status: 0,
        stdout: directoryText,
        stderr: "",
        error: null,
      };
    }
    if (
      path.basename(tool)
        === "wc-public-opportunity-handoff-v1.mjs"
    ) {
      return {
        status: 0,
        stdout: handoffText,
        stderr: "",
        error: null,
      };
    }
    return {
      status: 1,
      stdout: "",
      stderr: "unexpected child tool",
      error: null,
    };
  };

  const fetchCalls = [];
  const fetchImpl = async (
    url,
    init,
  ) => {
    fetchCalls.push({
      url,
      method: init?.method,
      redirect:
        init?.redirect,
    });
    if (
      url
        === ORIGIN
          + "/.well-known/void-node-public-origin-binding-v1.json"
    ) {
      return responseFor(
        url,
        bindingBytes,
      );
    }
    if (
      url
        === ORIGIN
          + "/public-node/identity/public-origin-binding-v1.json"
    ) {
      return responseFor(
        url,
        secondAliasBytes
          ?? bindingBytes,
      );
    }
    if (
      url
        === ORIGIN
          + "/__void/public-participant/status.json"
    ) {
      return responseFor(
        url,
        participantStatusBytes,
      );
    }
    if (
      url
        === ORIGIN
          + "/participant"
    ) {
      return responseFor(
        url,
        html,
      );
    }
    throw new Error(
      `unexpected fetch URL ${url}`,
    );
  };

  return {
    bindingBytes,
    bindingSha,
    directory,
    handoff,
    participantStatus,
    html,
    childRunner,
    fetchImpl,
    childCalls,
    fetchCalls,
  };
}

try {
  const good = fixtureSet();
  const nowMs =
    Date.parse(
      "2026-09-30T16:00:00.000Z",
    );

  const receipt =
    await buildVoidPublicOriginBindingExternalAcceptanceV1({
      nowMs,
      childRunner:
        good.childRunner,
      fetchImpl:
        good.fetchImpl,
    });

  assert.equal(
    receipt.marker,
    "VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1",
  );
  assert.equal(
    receipt.status,
    "external_acceptance_green",
  );
  assert.equal(
    receipt.origin,
    ORIGIN,
  );
  assert.equal(
    receipt.coordinator_identity.node_id,
    NODE_ID,
  );
  assert.equal(
    receipt.coordinator_identity
      .public_key_fingerprint_sha256,
    FINGERPRINT,
  );
  assert.equal(
    receipt.coordinator_identity
      .trust_registry_sha256,
    TRUST_REGISTRY_SHA256,
  );
  assert.equal(
    receipt.coordinator_identity
      .binding_sha256,
    good.bindingSha,
  );
  assert.equal(
    receipt.directory.state,
    "available",
  );
  assert.equal(
    receipt.handoff.state,
    "ready",
  );
  assert.equal(
    receipt.handoff
      .public_copy_ready,
    true,
  );
  assert.equal(
    receipt.handoff
      .client_executed,
    false,
  );
  assert.equal(
    receipt.binding_aliases.length,
    2,
  );
  assert.equal(
    receipt.binding_aliases[0].sha256,
    receipt.binding_aliases[1].sha256,
  );
  assert.equal(
    receipt.participant
      .public_copy_ready,
    true,
  );
  assert.equal(
    receipt.participant
      .coordinator_node_id_trusted,
    true,
  );
  assert.equal(
    receipt.safety.read_only,
    true,
  );
  assert.equal(
    receipt.safety
      .ticket_issuance_attempted,
    false,
  );
  assert.equal(
    receipt.safety
      .wc_award_attempted,
    false,
  );
  assert.equal(
    receipt.safety
      .service_mutation_attempted,
    false,
  );
  assert.equal(
    receipt.safety
      .funds_movement_attempted,
    false,
  );

  assert.equal(
    good.childCalls.length,
    2,
  );
  assert.equal(
    good.childCalls[0].tool,
    "wc-public-opportunity-directory-v1.mjs",
  );
  assert.equal(
    good.childCalls[1].tool,
    "wc-public-opportunity-handoff-v1.mjs",
  );
  assert.equal(
    good.childCalls[0].args.includes(
      "--require-available",
    ),
    true,
  );
  assert.equal(
    good.childCalls[1].args.includes(
      "--account",
    ),
    true,
  );
  assert.equal(
    good.childCalls[1].args.includes(
      "void-origin-binding-acceptance-v1",
    ),
    true,
  );
  assert.equal(
    good.fetchCalls.length,
    4,
  );
  assert.equal(
    good.fetchCalls.every(
      (entry) =>
        entry.method === "GET"
        && entry.redirect === "manual",
    ),
    true,
  );

  const output = path.join(
    work,
    "external-acceptance.json",
  );
  const written =
    await writeVoidPublicOriginBindingExternalAcceptanceV1({
      outputFile: output,
      nowMs,
      childRunner:
        fixtureSet().childRunner,
      fetchImpl:
        fixtureSet().fetchImpl,
    });
  assert.equal(
    written.receipt.status,
    "external_acceptance_green",
  );
  assert.equal(
    fs.statSync(output).mode & 0o777,
    0o600,
  );
  assert.throws(
    () =>
      fs.openSync(
        output,
        fs.constants.O_WRONLY
          | fs.constants.O_CREAT
          | fs.constants.O_EXCL,
      ),
    /EEXIST/u,
  );

  const badHandoff =
    fixtureSet({
      handoffReady: false,
    });
  await assert.rejects(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        nowMs,
        childRunner:
          badHandoff.childRunner,
        fetchImpl:
          badHandoff.fetchImpl,
      }),
    /handoff is not cryptographically copy-ready/u,
  );
  assert.equal(
    badHandoff.fetchCalls.length,
    0,
    "bad handoff must fail before external surface fetches",
  );

  const aliasDrift =
    fixtureSet({
      secondAliasBytes:
        Buffer.from(
          "different\n",
          "utf8",
        ),
    });
  await assert.rejects(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        nowMs,
        childRunner:
          aliasDrift.childRunner,
        fetchImpl:
          aliasDrift.fetchImpl,
      }),
    /external binding alias SHA does not match handoff binding SHA|external binding aliases are not byte-identical/u,
  );

  const participantHold =
    fixtureSet({
      participantReady: false,
    });
  await assert.rejects(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        nowMs,
        childRunner:
          participantHold.childRunner,
        fetchImpl:
          participantHold.fetchImpl,
      }),
    /participant status is not cryptographically copy-ready/u,
  );

  const placeholderHtml =
    fixtureSet({
      htmlPlaceholder: true,
    });
  await assert.rejects(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        nowMs,
        childRunner:
          placeholderHtml.childRunner,
        fetchImpl:
          placeholderHtml.fetchImpl,
      }),
    /participant HTML contains forbidden hold\/placeholder token/u,
  );

  const source =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "tools/void-public-origin-binding-external-acceptance-v1.mjs",
      ),
      "utf8",
    );
  assert.equal(
    source.includes(
      "--origin",
    ),
    false,
    "CLI must not accept an origin override",
  );
  assert.equal(
    source.includes(
      "--account",
    ),
    true,
    "fixed handoff child must receive the probe account internally",
  );
  assert.equal(
    source.includes(
      "--directory-tool",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "--handoff-tool",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "claim-ticket",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "submit-result",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "systemctl",
    ),
    false,
  );

  console.log(
    "VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1_PROOF_GREEN",
  );
  console.log(
    "canonical_origin_fixed=true",
  );
  console.log(
    "canonical_node_id_fixed=true",
  );
  console.log(
    "directory_available_trusted=true",
  );
  console.log(
    "handoff_signed_origin_verified=true",
  );
  console.log(
    "binding_alias_count=2",
  );
  console.log(
    "binding_aliases_byte_identical=true",
  );
  console.log(
    "participant_status_copy_ready=true",
  );
  console.log(
    "participant_html_copy_ready=true",
  );
  console.log(
    "client_executed=false",
  );
  console.log(
    "ticket_issuance_attempted=false",
  );
  console.log(
    "receipt_submission_attempted=false",
  );
  console.log(
    "wc_award_attempted=false",
  );
  console.log(
    "service_mutation_attempted=false",
  );
  console.log(
    "funds_movement_attempted=false",
  );
} finally {
  fs.rmSync(
    work,
    {
      recursive: true,
      force: true,
    },
  );
}
