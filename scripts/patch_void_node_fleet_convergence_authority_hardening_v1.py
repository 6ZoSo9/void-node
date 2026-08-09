#!/usr/bin/env python3
from pathlib import Path

TOOL = Path("tools/void-node-fleet-source-convergence-v1.mjs")
PROOF = Path("scripts/prove_void_node_fleet_source_convergence_v1.mjs")
DOC = Path("docs/operations/void-node-fleet-source-convergence-v1.md")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


tool = TOOL.read_text()

tool = replace_once(
    tool,
    'const DEFAULT_MAX_AUDIT_AGE_SECONDS = 300;\n',
    '''const DEFAULT_MAX_AUDIT_AGE_SECONDS = 300;\nconst AUDIT_AUTHORITY_KEYS_V1 = Object.freeze([\n  "git_fetch",\n  "git_pull",\n  "checkout",\n  "reset",\n  "service_restart",\n  "deployment",\n  "credential_read",\n  "wallet_or_signer",\n  "transaction",\n  "funds_moved",\n]);\nconst SAFE_GIT_REMOTE_URL_RE = /^(?:https|ssh):\\/\\/[^\\s]+$/i;\nconst SAFE_GIT_SCP_REMOTE_RE = /^(?:[A-Za-z0-9._-]+@)?[A-Za-z0-9.-]+:[^\\s]+$/;\n''',
    "authority and remote constants",
)

tool = replace_once(
    tool,
    '''function expandHome(value) {\n''',
    '''function assertSafeGitRemoteUrl(value, label) {\n  const remote = assertExactString(value, label);\n  if (remote.includes("::")) fail(`${label} uses forbidden Git remote-helper syntax`);\n  if (remote.startsWith("/")) return remote;\n  if (SAFE_GIT_REMOTE_URL_RE.test(remote)) return remote;\n  if (SAFE_GIT_SCP_REMOTE_RE.test(remote)) return remote;\n  fail(`${label} must use HTTPS, SSH, scp-style SSH, or an absolute local path`);\n}\n\nfunction expandHome(value) {\n''',
    "safe Git remote validator",
)

tool = replace_once(
    tool,
    '''      expected_remote_url: assertExactString(node.expected_remote_url, `${name}.expected_remote_url`),\n''',
    '''      expected_remote_url: assertSafeGitRemoteUrl(node.expected_remote_url, `${name}.expected_remote_url`),\n''',
    "node expected remote validation",
)

tool = replace_once(
    tool,
    '''function normalizedAuditDigestPayload(audit) {\n''',
    '''export function verifyCoordinatorRemoteBindingV1(config) {\n  const expected = assertSafeGitRemoteUrl(\n    config.node.expected_remote_url,\n    `${config.node.name}.expected_remote_url`,\n  );\n  const observedResult = run(\n    "git",\n    ["-C", config.coordinator_repo, "remote", "get-url", config.canonical_remote],\n    { timeoutMs: 10_000 },\n  );\n  if (!observedResult.ok) fail("coordinator canonical remote URL is unavailable");\n  const observed = assertSafeGitRemoteUrl(\n    observedResult.stdout.trim(),\n    "coordinator canonical remote URL",\n  );\n  if (observed !== expected) {\n    fail("node expected_remote_url must exactly match coordinator canonical remote URL");\n  }\n  return true;\n}\n\nfunction normalizedAuditDigestPayload(audit) {\n''',
    "coordinator remote binding",
)

tool = replace_once(
    tool,
    '''  if (!audit.authority || Object.values(audit.authority).some((value) => value !== false)) {\n    fail("audit authority must contain only false values");\n  }\n''',
    '''  if (!audit.authority || typeof audit.authority !== "object" || Array.isArray(audit.authority)) {\n    fail("audit authority must be an exact object");\n  }\n  const authorityKeys = Object.keys(audit.authority).sort();\n  const expectedAuthorityKeys = [...AUDIT_AUTHORITY_KEYS_V1].sort();\n  if (\n    authorityKeys.length !== expectedAuthorityKeys.length ||\n    authorityKeys.some((key, index) => key !== expectedAuthorityKeys[index]) ||\n    expectedAuthorityKeys.some((key) => audit.authority[key] !== false)\n  ) {\n    fail("audit authority must contain the exact all-false authority schema");\n  }\n''',
    "exact audit authority schema",
)

tool = replace_once(
    tool,
    '''export function buildApplyScriptV1(config, plan) {\n  const node = config.node;\n''',
    '''export function buildApplyScriptV1(config, plan) {\n  verifyCoordinatorRemoteBindingV1(config);\n  const node = config.node;\n''',
    "apply builder coordinator remote binding",
)

tool = replace_once(
    tool,
    '''expected_remote_url=${bashLiteral(node.expected_remote_url)}\n''',
    '''expected_remote_url=${bashLiteral(assertSafeGitRemoteUrl(node.expected_remote_url, "node expected_remote_url"))}\n''',
    "apply script remote validation",
)

tool = replace_once(
    tool,
    '''  const config = validateFleetConfigV1(readJson(configPath, "config"), args.node);\n  const validatedAudit = validateFleetAuditV1(readJson(auditPath, "audit"), config, args.node);\n''',
    '''  const config = validateFleetConfigV1(readJson(configPath, "config"), args.node);\n  verifyCoordinatorRemoteBindingV1(config);\n  const validatedAudit = validateFleetAuditV1(readJson(auditPath, "audit"), config, args.node);\n''',
    "main coordinator remote binding",
)

TOOL.write_text(tool)

proof = PROOF.read_text()
proof = replace_once(
    proof,
    '''  validateFleetConfigV1,\n} from "../tools/void-node-fleet-source-convergence-v1.mjs";\n''',
    '''  validateFleetConfigV1,\n  verifyCoordinatorRemoteBindingV1,\n} from "../tools/void-node-fleet-source-convergence-v1.mjs";\n''',
    "proof import remote binding",
)

proof = replace_once(
    proof,
    '''  { label: "authority escalation", mutate: (audit) => { audit.authority.git_fetch = true; } },\n''',
    '''  { label: "authority escalation", mutate: (audit) => { audit.authority.git_fetch = true; } },\n  { label: "authority schema missing", mutate: (audit) => { audit.authority = {}; } },\n  { label: "authority schema extra", mutate: (audit) => { audit.authority.extra = false; } },\n''',
    "proof exact authority schema cases",
)

proof = replace_once(
    proof,
    '''const unsafeHttp = baseConfig("/tmp/x", "/tmp/o");\nunsafeHttp.nodes[0].http_base = "http://example.com:4100";\nassert.throws(() => validateFleetConfigV1(unsafeHttp, "nimo"), /numeric loopback/);\n''',
    '''const unsafeHttp = baseConfig("/tmp/x", "/tmp/o");\nunsafeHttp.nodes[0].http_base = "http://example.com:4100";\nassert.throws(() => validateFleetConfigV1(unsafeHttp, "nimo"), /numeric loopback/);\nconst remoteHelper = baseConfig("/tmp/x", "ext::sh -c touch /tmp/void-owned");\nassert.throws(() => validateFleetConfigV1(remoteHelper, "nimo"), /remote-helper syntax/);\nconst unknownRemoteScheme = baseConfig("/tmp/x", "helper://example.invalid/void-node");\nassert.throws(() => validateFleetConfigV1(unknownRemoteScheme, "nimo"), /must use HTTPS, SSH/);\nconst fileRemoteScheme = baseConfig("/tmp/x", "file:///tmp/void-origin.git");\nassert.throws(() => validateFleetConfigV1(fileRemoteScheme, "nimo"), /must use HTTPS, SSH/);\n''',
    "proof unsafe remote transports",
)

proof = replace_once(
    proof,
    '''  assert.throws(\n    () => verifyCoordinatorRemoteBindingV1(mismatchedRemoteConfig),\n    /must exactly match coordinator canonical remote URL/,\n  );\n  const fixtureAudit = validateFleetAuditV1(buildAudit(fromSha, toSha), fixtureConfig, "nimo");\n''',
    '''  assert.throws(\n    () => verifyCoordinatorRemoteBindingV1(mismatchedRemoteConfig),\n    /must exactly match coordinator canonical remote URL/,\n  );\n  assert.throws(\n    () => buildApplyScriptV1(mismatchedRemoteConfig, fixturePlan),\n    /must exactly match coordinator canonical remote URL/,\n    "exported apply builder must enforce coordinator remote binding",\n  );\n  const fixtureAudit = validateFleetAuditV1(buildAudit(fromSha, toSha), fixtureConfig, "nimo");\n''',
    "proof apply builder remote binding",
)

PROOF.write_text(proof)

doc = DOC.read_text()
doc = replace_once(
    doc,
    '''- proves no prior mutation and no granted mutation authority;\n''',
    '''- proves no prior mutation and carries the exact ten-key all-false audit authority schema;\n''',
    "doc audit authority schema",
)

doc = replace_once(
    doc,
    '''The value must exactly match `git remote get-url origin` on that node. HTTPS is\nalso valid when it is the node's exact configured URL. Do not place tokens,\npasswords, private-key paths, or authorization headers in this file.\n''',
    '''The value must exactly match `git remote get-url origin` on that node **and**\nthe coordinator's own canonical remote URL. Before any fetch, the controller\naccepts only HTTPS, `ssh://`, scp-style SSH (for example `git@github.com:...`),\nor an absolute local path used by deterministic fixtures. Git remote-helper\nsyntax such as `ext::...`, unknown URL schemes, and `file://` URLs fail closed.\nThe exported apply-script builder enforces the same coordinator binding, so\nlibrary callers cannot bypass the CLI guard. Do not place tokens, passwords,\nprivate-key paths, or authorization headers in this file.\n''',
    "doc safe remote and coordinator binding",
)

DOC.write_text(doc)
print("VOID_NODE_FLEET_CONVERGENCE_AUTHORITY_HARDENING_V1_PATCHED")
