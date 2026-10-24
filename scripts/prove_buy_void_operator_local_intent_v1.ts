import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_OPERATOR_CAPABILITY_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1,
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1,
  VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1,
  VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1,
  authorizeBuyVoidOperatorLocalReadV1,
  authorizeBuyVoidOperatorLocalShellV1,
  authorizeBuyVoidOperatorMutationV1,
} from "../src/economic/buy_void_operator_local_intent_v1.js";

type Result = {
  status: number;
  body: any;
  headers: Record<string, string>;
};

function response(): {
  result: Result;
  res: any;
} {
  const result: Result = {
    status: 200,
    body: null,
    headers: {},
  };
  return {
    result,
    res: {
      setHeader(name: string, value: string) {
        result.headers[name.toLowerCase()] = String(value);
      },
      status(code: number) {
        result.status = code;
        return this;
      },
      json(body: unknown) {
        result.body = body;
        return this;
      },
    },
  };
}

const capability = "voidbvo1." + "A".repeat(43);

function request(overrides: Record<string, any> = {}): any {
  const base = {
    method: "POST",
    headers: {
      host: "127.0.0.1:4100",
      authorization: "Bearer " + capability,
      [VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1]:
        VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1,
      origin: "http://127.0.0.1:4100",
      "sec-fetch-site": "same-origin",
    },
    socket: {
      remoteAddress: "127.0.0.1",
    },
    query: {},
    cookies: {},
    route: { path: "/__void/buy-void/operator/mark.json" },
  };
  return {
    ...base,
    ...overrides,
    headers: {
      ...base.headers,
      ...(overrides.headers || {}),
    },
    socket: {
      ...base.socket,
      ...(overrides.socket || {}),
    },
  };
}

assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1,
  "VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1",
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1
    .host_or_peer_authority_forbidden,
  true,
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1
    .operator_bearer_capability_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1
    .capability_query_parameter_forbidden,
  true,
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1
    .capability_cookie_forbidden,
  true,
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1
    .credentials_directory_descriptor_retained,
  true,
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1
    .descriptor_relative_credential_open,
  true,
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1
    .credentials_directory_identity_rechecked_after_read,
  true,
);

const savedCredentialsDirectory = process.env.CREDENTIALS_DIRECTORY;
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-operator-capability-v1-"),
);
const credentialPath = path.join(
  temp,
  VOID_BUY_VOID_OPERATOR_CAPABILITY_CREDENTIAL_ID_V1,
);

try {
  fs.chmodSync(temp, 0o700);
  fs.writeFileSync(credentialPath, capability + "\n", {
    encoding: "utf8",
    mode: 0o400,
  });
  fs.chmodSync(credentialPath, 0o400);
  process.env.CREDENTIALS_DIRECTORY = temp;

  for (const [host, remote] of [
    ["127.0.0.1:4100", "127.0.0.1"],
    ["localhost:4100", "::1"],
    ["[::1]:4100", "::ffff:127.0.0.1"],
  ] as const) {
    const { result, res } = response();
    assert.equal(
      authorizeBuyVoidOperatorLocalShellV1(
        request({
          headers: { host },
          socket: { remoteAddress: remote },
        }),
        res,
      ),
      true,
    );
    assert.equal(result.body, null);
  }

  {
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorLocalReadV1(request(), res), true);
    assert.equal(result.body, null);
  }

  // The real credential path is first lstat'd as a regular file. Replace
  // that leaf with a FIFO only in the production reader's openSync boundary:
  // without O_NONBLOCK, O_RDONLY|O_NOFOLLOW could wait for a FIFO writer
  // before the type/identity checks run. The injected guard prevents an
  // accidental blocking open if a future refactor removes that flag.
  {
    const savedCredential = credentialPath + ".fifo-original";
    const actualOpenSync = fs.openSync;
    let fifoSubstituted = false;
    let credentialOpenNonblocking = false;
    let credentialOpenNoFollow = false;
    try {
      (fs as any).openSync = (...args: any[]) => {
        const pathname = String(args[0] ?? "");
        if (
          !fifoSubstituted &&
          pathname.startsWith("/proc/self/fd/") &&
          pathname.endsWith(
            "/" + VOID_BUY_VOID_OPERATOR_CAPABILITY_CREDENTIAL_ID_V1,
          )
        ) {
          const flags = Number(args[1] ?? 0);
          credentialOpenNonblocking =
            (flags & fs.constants.O_NONBLOCK) !== 0;
          credentialOpenNoFollow =
            (flags & fs.constants.O_NOFOLLOW) !== 0;
          // A regression must fail without opening a potentially blocking
          // FIFO. This exception is swallowed by the production HOLD path,
          // but the external proof assertions below still detect the fault.
          if (!credentialOpenNonblocking || !credentialOpenNoFollow) {
            throw new Error("synthetic_fifo_open_flags_missing");
          }
          fs.renameSync(credentialPath, savedCredential);
          execFileSync("/usr/bin/mkfifo", [credentialPath], {
            timeout: 5000,
            stdio: "ignore",
          });
          fs.chmodSync(credentialPath, 0o400);
          fifoSubstituted = true;
        }
        return (actualOpenSync as any)(...args);
      };
      const { result, res } = response();
      assert.equal(authorizeBuyVoidOperatorLocalReadV1(request(), res), false);
      assert.equal(credentialOpenNonblocking, true,
        "credential regular-file open must be FIFO-nonblocking");
      assert.equal(credentialOpenNoFollow, true,
        "credential regular-file open must remain no-follow");
      assert.equal(fifoSubstituted, true,
        "test must substitute the actual credential leaf after lstat");
      assert.equal(result.status, 503);
      assert.equal(result.body?.error, "operator_capability_unavailable");
      assert.equal(JSON.stringify(result.body).includes(capability), false,
        "FIFO HOLD may not disclose bearer bytes");
    } finally {
      (fs as any).openSync = actualOpenSync;
      if (fifoSubstituted) {
        fs.rmSync(credentialPath, { force: true });
        fs.renameSync(savedCredential, credentialPath);
      }
    }
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorLocalReadV1(request(), res), true,
      "valid credential must remain usable after FIFO adversary cleanup");
    assert.equal(result.body, null);
  }

  // Credential and directory close uncertainty must both deny access;
  // every retained descriptor is attempted even when the first close fails.
  for (const faultAt of ["credential", "directory"] as const) {
    const realClose = fs.closeSync;
    let closeCount = 0;
    let directoryCloseCount = 0;
    let injected = 0;
    try {
      (fs as any).closeSync = (fd: number): void => {
        const isDirectory = fs.fstatSync(fd).isDirectory();
        closeCount += 1;
        if (isDirectory) directoryCloseCount += 1;
        // Close the actual disposable descriptor first, then model uncertain
        // success/error reporting; no FD or private token is retained.
        realClose(fd);
        if (!injected &&
            (faultAt === "directory") === isDirectory) {
          injected += 1;
          throw new Error("synthetic_operator_descriptor_close_uncertain");
        }
      };
      const { result, res } = response();
      assert.equal(authorizeBuyVoidOperatorLocalReadV1(request(), res), false);
      assert.equal(result.status, 503);
      assert.equal(result.body?.error, "operator_capability_unavailable");
      assert.equal(JSON.stringify(result.body).includes(capability), false);
      assert.equal(closeCount, 2, "both descriptor closes must be attempted");
      assert.equal(directoryCloseCount, 1, "directory descriptor must close");
      assert.equal(injected, 1, "adversary must exercise the failure");
    } finally {
      (fs as any).closeSync = realClose;
    }
  }
  {
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorLocalReadV1(request(), res), true);
    assert.equal(result.body, null);
  }

  for (const req of [
    request({
      headers: {
        host: "127.0.0.1:4100",
        authorization: undefined,
        origin: undefined,
        "sec-fetch-site": undefined,
        [VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1]:
          VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1,
      },
      socket: { remoteAddress: "127.0.0.1" },
    }),
    request({
      headers: {
        authorization: "Bearer " + "voidbvo1." + "B".repeat(43),
      },
    }),
    request({
      headers: { authorization: undefined },
      query: { capability_token: capability },
      cookies: { capability_token: capability },
    }),
  ]) {
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorLocalReadV1(req, res), false);
    assert.equal(result.status, 401);
    assert.equal(result.body?.error, "operator_capability_required");
    assert.match(result.headers["www-authenticate"], /^Bearer /);
  }

  {
    const prior = process.env.CREDENTIALS_DIRECTORY;
    delete process.env.CREDENTIALS_DIRECTORY;
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorLocalReadV1(request(), res), false);
    assert.equal(result.status, 503);
    assert.equal(result.body?.error, "operator_capability_unavailable");
    process.env.CREDENTIALS_DIRECTORY = prior;
  }

  {
    fs.chmodSync(credentialPath, 0o444);
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorLocalReadV1(request(), res), false);
    assert.equal(result.status, 503);
    assert.equal(result.body?.error, "operator_capability_unavailable");
    fs.chmodSync(credentialPath, 0o400);
  }

  {
    fs.chmodSync(temp, 0o722);
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorLocalReadV1(request(), res), false);
    assert.equal(result.status, 503);
    assert.equal(result.body?.error, "operator_capability_unavailable");
    fs.chmodSync(temp, 0o700);
  }

  {
    const substituteCapability = "voidbvo1." + "C".repeat(43);
    const admittedDirectory = temp + ".admitted";
    const originalLstatSync = fs.lstatSync;
    let swapped = false;
    try {
      (fs as any).lstatSync = (...args: any[]) => {
        const pathname = String(args[0] ?? "");
        if (
          !swapped &&
          pathname.startsWith("/proc/self/fd/") &&
          pathname.endsWith(
            "/" + VOID_BUY_VOID_OPERATOR_CAPABILITY_CREDENTIAL_ID_V1,
          )
        ) {
          swapped = true;
          fs.renameSync(temp, admittedDirectory);
          fs.mkdirSync(temp, { mode: 0o700 });
          fs.chmodSync(temp, 0o700);
          fs.writeFileSync(
            path.join(
              temp,
              VOID_BUY_VOID_OPERATOR_CAPABILITY_CREDENTIAL_ID_V1,
            ),
            substituteCapability + "\n",
            { encoding: "utf8", mode: 0o400 },
          );
          fs.chmodSync(
            path.join(
              temp,
              VOID_BUY_VOID_OPERATOR_CAPABILITY_CREDENTIAL_ID_V1,
            ),
            0o400,
          );
        }
        return (originalLstatSync as any)(...args);
      };

      const { result, res } = response();
      const substitutedRequest = request({
        headers: {
          authorization: "Bearer " + substituteCapability,
        },
      });
      assert.equal(
        authorizeBuyVoidOperatorLocalReadV1(substitutedRequest, res),
        false,
      );
      assert.equal(swapped, true);
      assert.equal(result.status, 503);
      assert.equal(result.body?.error, "operator_capability_unavailable");
    } finally {
      (fs as any).lstatSync = originalLstatSync;
      if (fs.existsSync(temp)) {
        fs.rmSync(temp, { recursive: true, force: true });
      }
      if (fs.existsSync(admittedDirectory)) {
        fs.renameSync(admittedDirectory, temp);
      }
    }

    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorLocalReadV1(request(), res), true);
    assert.equal(result.body, null);
  }

  for (const req of [
    request({
      headers: { host: "127.0.0.1:4100" },
      socket: { remoteAddress: "203.0.113.9" },
    }),
    request({
      headers: { host: "public.example.invalid" },
      socket: { remoteAddress: "127.0.0.1" },
    }),
    request({
      headers: { host: "localhost.evil.invalid:4100" },
      socket: { remoteAddress: "127.0.0.1" },
    }),
    request({
      headers: { host: "127.0.0.1:99999" },
      socket: { remoteAddress: "127.0.0.1" },
    }),
  ]) {
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorLocalReadV1(req, res), false);
    assert.equal(result.status, 403);
    assert.equal(result.body?.error, "operator_queue_local_only");
  }

  {
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorMutationV1(request(), res), true);
    assert.equal(result.body, null);
  }

  {
    const { result, res } = response();
    const cli = request({
      headers: {
        host: "localhost:4100",
        origin: undefined,
        "sec-fetch-site": undefined,
      },
      socket: { remoteAddress: "::1" },
    });
    assert.equal(authorizeBuyVoidOperatorMutationV1(cli, res), true);
    assert.equal(result.body, null);
  }

  // Exact backend tuple of a trust-terminating loopback relay, but without
  // operator bearer authority: must remain unauthenticated.
  {
    const { result, res } = response();
    const relayed = request({
      headers: {
        host: "127.0.0.1:4100",
        authorization: undefined,
        origin: undefined,
        "sec-fetch-site": undefined,
        [VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1]:
          VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1,
      },
      socket: { remoteAddress: "127.0.0.1" },
    });
    assert.equal(authorizeBuyVoidOperatorMutationV1(relayed, res), false);
    assert.equal(result.status, 401);
    assert.equal(result.body?.error, "operator_capability_required");
  }

  for (const [req, status, error] of [
    [
      request({ method: "GET" }),
      405,
      "operator_mutation_method_not_allowed",
    ],
    [
      request({
        headers: {
          [VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1]: undefined,
        },
      }),
      403,
      "operator_mutation_intent_required",
    ],
    [
      request({
        headers: {
          [VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1]:
            "VOID_BUY_VOID_OPERATOR_MUTATION_V0",
        },
      }),
      403,
      "operator_mutation_intent_required",
    ],
    [
      request({ headers: { "sec-fetch-site": "cross-site" } }),
      403,
      "operator_mutation_cross_site_forbidden",
    ],
    [
      request({ headers: { origin: "https://evil.example.invalid" } }),
      403,
      "operator_mutation_origin_forbidden",
    ],
    [
      request({ headers: { origin: "http://localhost:9999" } }),
      403,
      "operator_mutation_origin_forbidden",
    ],
  ] as const) {
    const { result, res } = response();
    assert.equal(authorizeBuyVoidOperatorMutationV1(req, res), false);
    assert.equal(result.status, status);
    assert.equal(result.body?.error, error);
    if (status === 405) {
      assert.equal(result.headers.allow, "POST");
    }
  }

  // The mounted payment verifier is authenticated but intentionally HOLDs
  // until an allocation-backed cross-UID service replaces the payment-only
  // writer. Match against the trusted Express registration, not req.path.
  const allowedMutationPaths = [
    "/__void/buy-void/operator/mark.json",
    "/__void/buy-void/operator/request/tx-hash.json",
  ];
  for (const registeredPath of allowedMutationPaths) {
    const { result, res } = response();
    assert.equal(
      authorizeBuyVoidOperatorMutationV1(
        request({ route: { path: registeredPath } }),
        res,
      ),
      true,
    );
    assert.equal(result.status, 200);
    assert.equal(result.body, null);
  }
  for (const spoofedClientPath of [
    "/__void/buy-void/operator/verify-payment.json",
    "/__VOID/BUY-VOID/OPERATOR/VERIFY-PAYMENT.JSON",
    "/__void/buy-void/operator/verify-payment.json/",
    "/__void/buy-void/operator/verify-payment.json?id=synthetic",
  ]) {
    const { result, res } = response();
    assert.equal(
      authorizeBuyVoidOperatorMutationV1(
        request({
          route: {
            path: "/__void/buy-void/operator/verify-payment.json",
          },
          path: spoofedClientPath,
        }),
        res,
      ),
      false,
    );
    assert.equal(result.status, 503);
    assert.equal(
      result.body?.error,
      "buy_void_allocation_handoff_unmounted",
    );
  }
  for (const registeredRoute of [
    undefined,
    null,
    {},
    { path: "/__void/buy-void/operator/unreviewed.json" },
    { path: "/__VOID/BUY-VOID/OPERATOR/MARK.JSON" },
    { path: ["__void/buy-void/operator/mark.json"] },
  ]) {
    const { result, res } = response();
    assert.equal(
      authorizeBuyVoidOperatorMutationV1(
        request({ route: registeredRoute }),
        res,
      ),
      false,
    );
    assert.equal(result.status, 403);
    assert.equal(
      result.body?.error,
      "operator_mutation_route_identity_unqualified",
    );
  }
  assert.equal(
    VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1
      .mounted_payment_only_verification_forbidden,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1
      .registered_mutation_route_identity_required,
    true,
  );

  const runtimeSource = fs.readFileSync("src/index.ts", "utf8");
  const txHashBindingSource = fs.readFileSync(
    "src/economic/buy_void_request_tx_hash_binding_v1.ts",
    "utf8",
  );

  const maliciousRequestId =
    "buyvoid_fixture_aaaaaaaa');globalThis.__synthetic_flag=true;//";
  const pageEsc = (value: unknown): string =>
    String(value == null ? "" : value).replace(
      /[&<>"']/gu,
      (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] || character,
    );
  const escapedRequestId = pageEsc(maliciousRequestId);
  const rendered =
    '<button data-id="' + escapedRequestId +
      '" onclick="verifyPayment(this.dataset.id)">Verify payment</button>' +
    '<button class="review" data-id="' + escapedRequestId +
      '" onclick="markReq(this.dataset.id,\'reviewed\')">Mark reviewed</button>' +
    '<button class="fulfill" data-id="' + escapedRequestId +
      '" onclick="markReq(this.dataset.id,\'fulfilled\')">Mark fulfilled</button>' +
    '<button class="reject" data-id="' + escapedRequestId +
      '" onclick="markReq(this.dataset.id,\'rejected\')">Reject</button>';

  for (const safeSource of [
    String.raw`data-id="'+id+'" onclick="verifyPayment(this.dataset.id)"`,
    String.raw`class="review" data-id="'+id+'" onclick="markReq(this.dataset.id,\\'reviewed\\')"`,
    String.raw`class="fulfill" data-id="'+id+'" onclick="markReq(this.dataset.id,\\'fulfilled\\')"`,
    String.raw`class="reject" data-id="'+id+'" onclick="markReq(this.dataset.id,\\'rejected\\')"`,
  ]) {
    assert.equal(
      runtimeSource.includes(safeSource),
      true,
      "exact operator button source must keep request ID in data only",
    );
  }

  const onclickValues = [
    ...rendered.matchAll(/onclick="([^"]*)"/gu),
  ].map((match) => match[1]);
  assert.deepEqual(onclickValues, [
    "verifyPayment(this.dataset.id)",
    "markReq(this.dataset.id,'reviewed')",
    "markReq(this.dataset.id,'fulfilled')",
    "markReq(this.dataset.id,'rejected')",
  ]);
  for (const value of onclickValues) {
    assert.equal(value.includes("globalThis"), false);
    assert.equal(value.includes("buyvoid_fixture_aaaaaaaa"), false);
  }
  const dataIds = [
    ...rendered.matchAll(/data-id="([^"]*)"/gu),
  ].map((match) => match[1]);
  assert.equal(dataIds.length, 4);
  assert.equal(
    dataIds.every((value) =>
      value.includes("buyvoid_fixture_aaaaaaaa&#39;") &&
      value.includes("globalThis.__synthetic_flag=true")
    ),
    true,
  );
  assert.equal(
    runtimeSource.includes(
      `onclick="verifyPayment(\\\\''+id+'\\\\')"`,
    ),
    false,
  );
  assert.equal(
    runtimeSource.includes(
      `onclick="markReq(\\\\''+id+`,
    ),
    false,
  );

  for (const route of [
    "/__void/buy-void/operator/verify-payment.json",
    "/__void/buy-void/operator/mark.json",
  ]) {
    assert.equal(
      runtimeSource.includes(`app.post("${route}"`),
      true,
      `operator mutation route must be POST: ${route}`,
    );
    assert.equal(
      runtimeSource.includes(`app.get("${route}"`),
      false,
      `operator mutation route must not remain GET: ${route}`,
    );
  }
  assert.match(
    runtimeSource,
    /__voidBuyVoidOperatorShellLocalOnlyV1=__boi\.authorizeBuyVoidOperatorLocalShellV1/u,
  );
  assert.match(
    runtimeSource,
    /__voidBuyVoidOperatorLocalOnlyV1=__boi\.authorizeBuyVoidOperatorLocalReadV1/u,
  );
  assert.match(
    runtimeSource,
    /__voidBuyVoidOperatorMutationIntentV1=__boi\.authorizeBuyVoidOperatorMutationV1/u,
  );
  assert.match(
    runtimeSource,
    /if \(!__voidBuyVoidOperatorMutationIntentV1\(req,res\)\) return;/u,
  );
  assert.match(
    runtimeSource,
    /authorization:"Bearer "\+ot/u,
  );
  assert.match(
    runtimeSource,
    /method:"POST",headers:\{authorization:"Bearer "\+ot,"x-void-operator-intent":"VOID_BUY_VOID_OPERATOR_MUTATION_V1"\}/u,
  );
  assert.match(
    runtimeSource,
    /mutationIntent:__voidBuyVoidOperatorMutationIntentV1/u,
  );
  assert.match(
    txHashBindingSource,
    /if \(!mutationIntent\(req, res\)\) return;/u,
  );

  console.log("VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1_PROOF_GREEN");
  console.log("loopback_host_and_socket_peer_required=true");
  console.log("operator_bearer_capability_required=true");
  console.log("operator_capability_private_file_mode_required=true");
  console.log("operator_credentials_directory_not_group_world_writable=true");
  console.log("operator_credentials_directory_descriptor_retained=true");
  console.log("operator_credential_descriptor_relative_open=true");
  console.log("operator_credential_fifo_swap_nonblocking_rejected=true");
  console.log("credential_and_directory_close_uncertainty_holds=true");
  console.log("retained_directory_close_attempted_after_credential_failure=true");
  console.log("operator_credentials_directory_substitution_holds=true");
  console.log("relayed_loopback_without_capability_rejected=true");
  console.log("forged_local_host_remote_peer_rejected=true");
  console.log("public_host_loopback_proxy_rejected=true");
  console.log("operator_mutation_post_required=true");
  console.log("operator_mutation_intent_header_required=true");
  console.log("cross_site_browser_mutation_rejected=true");
  console.log("capability_query_or_cookie_authority=false");
  console.log("mounted_operator_mutation_routes_post_only=true");
  console.log("operator_request_id_not_javascript_source=true");
  console.log("tx_hash_binding_mutation_intent_wired=true");
  console.log("runtime_mutation=false");
  console.log("funds_movement=false");
} finally {
  if (savedCredentialsDirectory === undefined) {
    delete process.env.CREDENTIALS_DIRECTORY;
  } else {
    process.env.CREDENTIALS_DIRECTORY = savedCredentialsDirectory;
  }
  fs.rmSync(temp, { recursive: true, force: true });
}
