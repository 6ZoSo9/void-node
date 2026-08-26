import { createServer } from 'node:net';

import {
  decodeBrokerRequestV1,
  encodeBrokerResponseV1,
} from './apollyon_openrouter_broker_ipc_protocol_v1.mjs';
import { buildOpenRouterBrokerBindingV1 } from './apollyon_openrouter_broker_binding_v1.mjs';
import {
  openExistingOperationLedgerNamespaceV1,
  openOperationLedgerNamespaceV1,
} from './apollyon_execution_ledger_namespace_v1.mjs';
import { prepareBrokerOperationV1 } from './apollyon_execution_broker_prepare_v1.mjs';
import { readBrokerAdmissionCapabilityV1 } from './apollyon_openrouter_broker_admission_capability_v1.mjs';
import { readAcceptedResultCapsuleV1 } from './apollyon_accepted_result_capsule_v1.mjs';
import { runOpenRouterBrokerAttemptV1 } from './apollyon_openrouter_broker_transport_v1.mjs';
import {
  runOpenRouterCatalogPreflightV1,
  transportContestantFromCatalogContestantV1,
  validateBrokerCatalogContestantV1,
} from './apollyon_openrouter_broker_catalog_preflight_v1.mjs';

const MAX_WIRE_BYTES = 4 * 1024 * 1024;
const METADATA_TIMEOUT_MS = 15_000;

function fail(message) {
  throw new Error(`VOID_APOLLYON_OPENROUTER_BROKER_SERVICE_V1: ${message}`);
}

function holdResponse(requestId, operationId, holdCode) {
  return {
    marker: 'VOID_APOLLYON_OPENROUTER_BROKER_RESPONSE_V1',
    version: 1,
    request_id: requestId,
    status: 'HOLD',
    operation_id: operationId,
    result_digest: null,
    result: null,
    hold_code: holdCode,
  };
}

function acceptedResponse(requestId, operationId, resultDigest, result) {
  return {
    marker: 'VOID_APOLLYON_OPENROUTER_BROKER_RESPONSE_V1',
    version: 1,
    request_id: requestId,
    status: 'ACCEPTED',
    operation_id: operationId,
    result_digest: resultDigest,
    result,
    hold_code: null,
  };
}

function classifyPrepareError(error) {
  const text = String(error?.message ?? error);
  if (text.includes('BUSY/HOLD') || text.includes('already held')) return 'BUSY';
  if (text.includes('durable phase is ')
      || text.includes('does not match requested operation/intent/work binding')) {
    return 'UNCERTAIN_OR_TERMINAL';
  }
  return 'INTERNAL_HOLD';
}

async function processRequest(rootDirectoryHandle, acceptedResultRoot, admissionRoot, registryAuthority, apiKey, request) {
  let brokerContestant;
  let transportContestant;
  let binding;
  try {
    brokerContestant = validateBrokerCatalogContestantV1(request.contestant);
    transportContestant = transportContestantFromCatalogContestantV1(brokerContestant);
    binding = buildOpenRouterBrokerBindingV1({
      logicalOperationIntentDigest: request.logical_operation_intent_digest,
      registrySha256: request.registry_sha256,
      requestBody: request.request_body,
      contestant: brokerContestant,
    });
  } catch {
    return holdResponse(request.request_id, null, 'INTERNAL_HOLD');
  }

  let namespace = null;
  try {
    try {
      namespace = await openExistingOperationLedgerNamespaceV1(
        rootDirectoryHandle,
        binding.operationId,
      );
    } catch {
      return holdResponse(request.request_id, binding.operationId, 'INTERNAL_HOLD');
    }

    if (namespace !== null) {
      try {
        const recovered = await readAcceptedResultCapsuleV1(
          acceptedResultRoot,
          namespace.directoryHandle,
          binding,
        );
        if (recovered !== null) {
          return acceptedResponse(
            request.request_id,
            binding.operationId,
            recovered.resultDigest,
            recovered.value,
          );
        }
      } catch {
        return holdResponse(request.request_id, binding.operationId, 'UNCERTAIN_OR_TERMINAL');
      }
    }

    try {
      if (!registryAuthority
          || request.registry_sha256 !== registryAuthority.sha256
          || !Array.isArray(registryAuthority.registry?.contestants)) {
        return holdResponse(request.request_id, binding.operationId, 'ADMISSION_HOLD');
      }
      const reviewedRaw = registryAuthority.registry.contestants.find(
        (entry) => entry?.model === brokerContestant.model,
      );
      if (!reviewedRaw) {
        return holdResponse(request.request_id, binding.operationId, 'ADMISSION_HOLD');
      }
      const reviewed = validateBrokerCatalogContestantV1(reviewedRaw);
      const canonical = (value) => {
        if (value === null || typeof value === 'boolean' || typeof value === 'number'
            || typeof value === 'string') return JSON.stringify(value);
        if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
        return `{${Object.keys(value).sort().map(
          (key) => `${JSON.stringify(key)}:${canonical(value[key])}`,
        ).join(',')}}`;
      };
      if (canonical(reviewed) !== canonical(brokerContestant)) {
        return holdResponse(request.request_id, binding.operationId, 'ADMISSION_HOLD');
      }
    } catch {
      return holdResponse(request.request_id, binding.operationId, 'ADMISSION_HOLD');
    }

    let brokerAdmission;
    try {
      brokerAdmission = await readBrokerAdmissionCapabilityV1(
        admissionRoot,
        {
          binding,
          model: brokerContestant.model,
          canonicalSlug: brokerContestant.canonical_slug,
        },
      );
    } catch {
      return holdResponse(request.request_id, binding.operationId, 'ADMISSION_HOLD');
    }

    if (namespace === null) {
      try {
        namespace = await openOperationLedgerNamespaceV1(
          rootDirectoryHandle,
          binding.operationId,
        );
      } catch {
        return holdResponse(request.request_id, binding.operationId, 'INTERNAL_HOLD');
      }
    }

    try {
      await prepareBrokerOperationV1(namespace.directoryHandle, binding);
    } catch (error) {
      return holdResponse(request.request_id, binding.operationId, classifyPrepareError(error));
    }

    let catalogPreflight;
    try {
      catalogPreflight = await runOpenRouterCatalogPreflightV1({
        apiKey,
        contestant: brokerContestant,
        timeoutMs: METADATA_TIMEOUT_MS,
      });
    } catch {
      return holdResponse(request.request_id, binding.operationId, 'PROVIDER_HOLD');
    }

    let transport;
    try {
      transport = await runOpenRouterBrokerAttemptV1(namespace.directoryHandle, acceptedResultRoot, {
        apiKey,
        requestBody: request.request_body,
        timeoutMs: request.timeout_ms,
        contestant: transportContestant,
        binding,
        catalogPreflight,
        admissionCapabilityId: brokerAdmission.capabilityId,
      });
    } catch {
      return holdResponse(request.request_id, binding.operationId, 'PROVIDER_HOLD');
    }

    return acceptedResponse(
      request.request_id,
      binding.operationId,
      transport.resultDigest,
      transport.value,
    );
  } finally {
    if (namespace !== null) {
      await namespace.directoryHandle.handle.close().catch(() => {});
    }
  }
}

export async function startActivatedBrokerServiceV1(listenerFd, rootDirectoryHandle, acceptedResultRoot, admissionRoot, registryAuthority, apiKey) {
  if (process.platform !== 'linux') fail('Linux is required');
  if (!Number.isSafeInteger(listenerFd) || listenerFd < 3) fail('listener fd is invalid');
  if (!rootDirectoryHandle || !Number.isSafeInteger(rootDirectoryHandle.fd)) fail('ledger root handle is invalid');
  if (!acceptedResultRoot || !acceptedResultRoot.handle
      || !Number.isSafeInteger(acceptedResultRoot.handle.fd)) {
    fail('accepted result root handle is invalid');
  }
  if(!admissionRoot?.handle||!Number.isSafeInteger(admissionRoot.handle.fd)) fail('broker admission root handle is invalid');
  if(!registryAuthority||!/^[0-9a-f]{64}$/.test(String(registryAuthority.sha256??''))||!registryAuthority.registry) fail('reviewed registry authority is invalid');
  if (typeof apiKey !== 'string' || apiKey.length < 8 || apiKey.length > 512 || /\s/.test(apiKey)) {
    fail('broker credential is malformed');
  }

  const server = createServer((socket) => {
    let chunks = [];
    let total = 0;
    let finished = false;

    const close = () => {
      chunks = [];
      socket.end();
    };

    socket.on('data', async (chunk) => {
      if (finished) return;
      if (!(chunk instanceof Uint8Array)) {
        finished = true;
        close();
        return;
      }
      if (chunk.byteLength > MAX_WIRE_BYTES - total) {
        finished = true;
        close();
        return;
      }
      chunks.push(Buffer.from(chunk));
      total += chunk.byteLength;
      const combined = Buffer.concat(chunks, total);
      const firstLf = combined.indexOf(0x0a);
      if (firstLf < 0) return;
      finished = true;
      if (firstLf !== combined.length - 1) {
        close();
        return;
      }

      let request;
      try {
        request = decodeBrokerRequestV1(combined);
      } catch {
        close();
        return;
      }

      let response;
      try {
        response = await processRequest(rootDirectoryHandle, acceptedResultRoot, admissionRoot, registryAuthority, apiKey, request);
      } catch {
        response = holdResponse(request.request_id, null, 'INTERNAL_HOLD');
      }

      try {
        socket.end(encodeBrokerResponseV1(response));
      } catch {
        close();
      }
    });

    socket.on('error', () => {});
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen({ fd: listenerFd });
  });

  return server;
}
