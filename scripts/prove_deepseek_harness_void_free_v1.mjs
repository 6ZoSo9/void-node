import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integration = path.join(
  root,
  'integrations/agents/deepseek-harness-void-free-v1',
);
const read = (name) => fs.readFileSync(path.join(integration, name), 'utf8');
const readme = read('README.md');
const overlay = read('void-free-readonly.cordis.yml');
const launcher = read('run-free-readonly.sh');

for (const [name, source] of [
  ['README', readme],
  ['overlay', overlay],
  ['launcher', launcher],
]) {
  assert.ok(source.length > 0, `${name} must not be empty`);
}

for (const marker of [
  'VOID_DEEPSEEK_HARNESS_VOID_FREE_V1',
  '@deepseek-ai/dsh@0.1.1-rc.2',
  'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e',
  'MIT',
  'free-only',
  'VOID_MCP_ALLOW_SUBMIT=0',
]) {
  assert.ok(readme.includes(marker), `README missing marker: ${marker}`);
}

const blockFor = (id) => {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(?:^|\\n)- id: ${escaped}\\n([\\s\\S]*?)(?=\\n- id: |\\n- insert:|$)`,
  );
  const match = overlay.match(re);
  assert.ok(match, `overlay row missing: ${id}`);
  return match[0];
};

for (const id of [
  'llm-deepseek',
  'web-search-deepseek',
  'tool-web',
  'session-telemetry-otel',
  'tool-bash',
  'tool-pwsh',
  'tool-jobs',
  'tool-fs',
  'tool-fs-search',
  'tool-str-replace-editor',
  'tool-subagent',
  'tool-subagent-fork',
  'tool-workflow',
  'tool-ralph',
]) {
  assert.match(blockFor(id), /\bdisabled:\s*true\b/, `${id} must be disabled`);
}

const defaultModel = blockFor('agent-default-model');
assert.match(defaultModel, /provider:\s*void-local/);
assert.match(defaultModel, /VOID_DSH_LOCAL_MODEL_ID/);

const localLlm = blockFor('llm-pi-ai');
assert.match(localLlm, /providers:\s*\n\s+void-local:/);
assert.match(localLlm, /api:\s*openai-completions/);
assert.match(localLlm, /baseURL:\s*!!js process\.env\.VOID_DSH_LOCAL_MODEL_BASE_URL/);
assert.match(localLlm, /supportsDeveloperRole:\s*false/);
assert.match(localLlm, /maxTokensField:\s*max_tokens/);
assert.doesNotMatch(localLlm, /apiKeyEnv/);
assert.doesNotMatch(localLlm, /https?:\/\/(?:api\.)?(?:deepseek|openai|anthropic|google|x\.ai)/i);

assert.match(overlay, /id:\s*void-network-mcp/);
assert.match(overlay, /name:\s*'@deepseek-ai\/dsh-mcp-client'/);
assert.match(overlay, /transport:\s*stdio/);
assert.match(overlay, /VOID_MCP_ALLOW_SUBMIT:\s*'0'/);
assert.doesNotMatch(overlay, /VOID_MCP_TOKEN_FILE/);

for (const marker of [
  'DSH_VERSION="0.1.1-rc.2"',
  'http://127.0.0.1:11434/v1',
  'deepseek-r1:7b',
  'DSH_HOME_TMP="$(mktemp -d',
  'export DSH_TELEMETRY_DISABLED=1',
  'export DSH_PERMISSION_MODE=read-only',
  'VOID_DSH_LOCAL_MODEL_BASE_URL',
  'VOID_DSH_LOCAL_MODEL_ID',
  'VOID_DSH_MCP_ENTRYPOINT',
  'VOID_DSH_VOID_REPO_ROOT',
  'VOID_DSH_VOID_BASE_URL',
  'VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1',
  'npx --yes "@deepseek-ai/dsh@${DSH_VERSION}"',
]) {
  assert.ok(launcher.includes(marker), `launcher missing marker: ${marker}`);
}

for (const credential of [
  'DEEPSEEK_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'GEMINI_API_KEY',
  'XAI_API_KEY',
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY',
  'MISTRAL_API_KEY',
  'COHERE_API_KEY',
  'AZURE_OPENAI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
]) {
  assert.ok(launcher.includes(credential), `launcher must scrub ${credential}`);
}

for (const forbidden of [
  'VOID_MCP_ALLOW_SUBMIT=1',
  'VOID_MCP_TOKEN_FILE=',
  'api.deepseek.com',
  'platform.deepseek.com',
  'api.openai.com',
  'api.anthropic.com',
  'DSH_TELEMETRY_MODE=FULL',
  'DSH_PERMISSION_MODE=danger-full-access',
]) {
  assert.equal(
    launcher.includes(forbidden),
    false,
    `launcher contains forbidden paid/mutation marker: ${forbidden}`,
  );
}

// The launcher must force the model endpoint to a loopback host before dsh.
for (const marker of [
  "host === '127.0.0.1'",
  "host === 'localhost'",
  "host === '::1'",
  "if (!loopback) process.exit(21)",
  "if (url.pathname !== '/v1' && url.pathname !== '/v1/')",
]) {
  assert.ok(launcher.includes(marker), `loopback guard missing: ${marker}`);
}

// Existing VOID MCP bridge remains the protocol owner. This lane must not
// contain its own network submission implementation.
for (const forbidden of [
  'fetch("/__void/agents/paid-work/submissions/v1"',
  "fetch('/__void/agents/paid-work/submissions/v1'",
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'personal_sign',
  '/wallet/send',
  '/validator/submit',
  '/p2p/connect',
]) {
  assert.equal(
    overlay.includes(forbidden) || launcher.includes(forbidden),
    false,
    `integration reintroduced protocol/mutation authority: ${forbidden}`,
  );
}

console.log('VOID_DEEPSEEK_HARNESS_VOID_FREE_V1_PROOF_GREEN');
console.log('upstream_harness_pin=0.1.1-rc.2');
console.log('upstream_harness_commit=b150a551b8d465e31e418e1b2eaf5e79bbb7d28e');
console.log('upstream_harness_license=MIT');
console.log('model_endpoint_scope=loopback_only');
console.log('model_api_credential_required=0');
console.log('deepseek_cloud_provider_enabled=0');
console.log('deepseek_search_enabled=0');
console.log('telemetry_enabled=0');
console.log('isolated_dsh_home=1');
console.log('void_mcp_transport=stdio');
console.log('void_mcp_submit_enabled=0');
console.log('wallet_authority=0');
console.log('validator_mutation=0');
console.log('transaction_authority=0');
console.log('fund_movement=0');
