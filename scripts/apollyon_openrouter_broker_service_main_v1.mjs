import { constants as FS } from 'node:fs';
import { mkdir, open, readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import { startActivatedBrokerServiceV1 } from './apollyon_openrouter_broker_service_v1.mjs';

function fail(message) {
  throw new Error(`VOID_APOLLYON_OPENROUTER_BROKER_SERVICE_MAIN_V1: ${message}`);
}

async function main() {
  if (process.platform !== 'linux') fail('Linux is required');
  if (process.env.LISTEN_FDS !== '1') fail('exactly one systemd activation fd is required');
  if (String(process.env.LISTEN_PID ?? '') !== String(process.pid)) fail('LISTEN_PID does not match broker process');

  const credentialsDirectory = String(process.env.CREDENTIALS_DIRECTORY ?? '');
  const stateDirectory = String(process.env.STATE_DIRECTORY ?? '');
  if (!isAbsolute(credentialsDirectory) || !isAbsolute(stateDirectory)) fail('systemd credential/state directories are required');

  const stateHandle = await open(
    stateDirectory,
    FS.O_RDONLY | FS.O_DIRECTORY | FS.O_NOFOLLOW,
  );
  let stateStat;
  try {
    stateStat = await stateHandle.stat({ bigint: true });
  } finally {
    await stateHandle.close();
  }
  if (!stateStat.isDirectory() || (Number(stateStat.mode) & 0o777) !== 0o700) fail('STATE_DIRECTORY must be mode 0700');
  if (typeof process.getuid === 'function' && Number(stateStat.uid) !== process.getuid()) fail('STATE_DIRECTORY uid mismatch');

  const credentialBytes = await readFile(join(credentialsDirectory, 'openrouter_api_key'));
  if (credentialBytes.byteLength < 8 || credentialBytes.byteLength > 513) fail('credential byte length is invalid');
  const apiKey = new TextDecoder('utf-8', { fatal: true }).decode(credentialBytes).trim();
  if (apiKey.length < 8 || apiKey.length > 512 || /\s/.test(apiKey)) fail('credential content is malformed');

  const ledgerPath = join(stateDirectory, 'ledger-v1');
  try {
    await mkdir(ledgerPath, { mode: 0o700 });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }
  const ledgerRoot = await open(ledgerPath, FS.O_RDONLY | FS.O_DIRECTORY | FS.O_NOFOLLOW);

  try {
    const server = await startActivatedBrokerServiceV1(3, ledgerRoot, apiKey);
    process.stdout.write('VOID_APOLLYON_OPENROUTER_BROKER_SERVICE_READY_V1\n');
    await new Promise((resolve, reject) => {
      server.once('close', resolve);
      server.once('error', reject);
    });
  } finally {
    await ledgerRoot.close().catch(() => {});
  }
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
