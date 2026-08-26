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
import {
  validateBrokerAdmissionCapabilityV1,
  validateBrokerReplayCapabilityV1,
} from './apollyon_openrouter_broker_admission_capability_v1.mjs';
import { readAcceptedResultCapsuleV1 } from './apollyon_accepted_result_capsule_v1.mjs';
import { runOpenRouterBrokerAttemptV1 } from './apollyon_openrouter_broker_transport_v1.mjs';
import { recoverBrokerProviderAcceptedResultV1 } from './apollyon_execution_provider_boundary_v1.mjs';
import {
  runOpenRouterCatalogPreflightV1,
  transportContestantFromCatalogContestantV1,
  validateBrokerCatalogContestantV1,
} from './apollyon_openrouter_broker_catalog_preflight_v1.mjs';

const MAX_WIRE_BYTES = 4 * 1024 * 1024;
const METADATA_TIMEOUT_MS = 15_000;
const PREDECODE_IDLE_TIMEOUT_MS = 2_000;
const PREDECODE_TOTAL_TIMEOUT_MS = 5_000;
const MAX_INCOMPLETE_CONNECTIONS = 8;
const MAX_INCOMPLETE_RETAINED_BYTES = 8 * 1024 * 1024;

function fail(message) {
  throw new Error(`VOID_APOLLYON_OPENROUTER_BROKER_SERVICE_V1: ${message}`);
}

// OpenRouter's reviewed request surface currently exposes routing identities
// (concrete model slug, provider endpoint/tag, quantization) but no immutable
// provider/model revision token that the chat request can carry and the broker
// can verify as execution authority. Those routing identities are useful
// evidence, but they do not make an earlier catalog generation immutable.
//
// Keep this fail-closed broker-side and deliberately non-configurable. There is
// no environment variable, registry Boolean, or IPC field that can widen fresh
// provider-send authority. A future live path must replace this function with a
// separately reviewed request-enforceable immutable execution-identity primitive.
function hasRequestEnforceableImmutableExecutionIdentityV1() {
  return false;
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

async function processRequest(rootDirectoryHandle, acceptedResultRoot, admissionMacKey, registryAuthority, apiKey, request) {
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

    let brokerReplay = null;
    if (namespace !== null) {
      try {
        brokerReplay = validateBrokerReplayCapabilityV1(
          request.replay_capability,
          { binding, model: brokerContestant.model, canonicalSlug: brokerContestant.canonical_slug },
          admissionMacKey,
        );
      } catch {
        return holdResponse(request.request_id, binding.operationId, 'ADMISSION_HOLD');
      }
      try {
        const recovered = await readAcceptedResultCapsuleV1(acceptedResultRoot,namespace.directoryHandle,binding);
        if (recovered !== null) {
          if (recovered.value?.broker_replay_capability_id !== brokerReplay.capabilityId) {
            return holdResponse(request.request_id, binding.operationId, 'UNCERTAIN_OR_TERMINAL');
          }
          return acceptedResponse(request.request_id,binding.operationId,recovered.resultDigest,recovered.value);
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
      brokerAdmission = validateBrokerAdmissionCapabilityV1(
        request.admission_capability,
        {
          binding,
          model: brokerContestant.model,
          canonicalSlug: brokerContestant.canonical_slug,
        },
        admissionMacKey,
      );
    } catch {
      return holdResponse(request.request_id, binding.operationId, 'ADMISSION_HOLD');
    }

    if (brokerReplay === null) {
      try {
        brokerReplay = validateBrokerReplayCapabilityV1(
          request.replay_capability,
          { binding, model: brokerContestant.model, canonicalSlug: brokerContestant.canonical_slug },
          admissionMacKey,
        );
      } catch {
        return holdResponse(request.request_id, binding.operationId, 'ADMISSION_HOLD');
      }
    }

    for (const field of [
      'trialId',
      'admissionId',
      'admissionReceiptSha256',
      'promptSha256',
    ]) {
      if (brokerAdmission[field] !== brokerReplay[field]) {
        return holdResponse(request.request_id, binding.operationId, 'ADMISSION_HOLD');
      }
    }

    if (namespace !== null) {
      try {
        const reconciled = await recoverBrokerProviderAcceptedResultV1(
          namespace.directoryHandle,acceptedResultRoot,binding,
        );
        if (reconciled !== null) {
          if (reconciled.value?.broker_replay_capability_id !== brokerReplay.capabilityId) {
            return holdResponse(request.request_id, binding.operationId, 'UNCERTAIN_OR_TERMINAL');
          }
          return acceptedResponse(request.request_id,binding.operationId,reconciled.resultDigest,reconciled.value);
        }
      } catch {
        return holdResponse(request.request_id, binding.operationId, 'UNCERTAIN_OR_TERMINAL');
      }
    }

    if (!hasRequestEnforceableImmutableExecutionIdentityV1()) {
      return holdResponse(request.request_id, binding.operationId, 'EXECUTION_IDENTITY_HOLD');
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
        replayCapabilityId: brokerReplay.capabilityId,
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

export async function startActivatedBrokerServiceV1(listenerFd, rootDirectoryHandle, acceptedResultRoot, admissionMacKey, registryAuthority, apiKey) {
  if (process.platform !== 'linux') fail('Linux is required');
  if (!Number.isSafeInteger(listenerFd) || listenerFd < 3) fail('listener fd is invalid');
  if (!rootDirectoryHandle || !Number.isSafeInteger(rootDirectoryHandle.fd)) fail('ledger root handle is invalid');
  if (!acceptedResultRoot || !acceptedResultRoot.handle
      || !Number.isSafeInteger(acceptedResultRoot.handle.fd)) {
    fail('accepted result root handle is invalid');
  }
  if(!Buffer.isBuffer(admissionMacKey)||admissionMacKey.length!==32) fail('broker admission MAC credential is invalid');
  if(!registryAuthority||!/^[0-9a-f]{64}$/.test(String(registryAuthority.sha256??''))||!registryAuthority.registry) fail('reviewed registry authority is invalid');
  if (typeof apiKey !== 'string' || apiKey.length < 8 || apiKey.length > 512 || /\s/.test(apiKey)) {
    fail('broker credential is malformed');
  }

  let incompleteConnections = 0;
  let incompleteRetainedBytes = 0;
  const server = createServer((socket) => {
    if (incompleteConnections >= MAX_INCOMPLETE_CONNECTIONS) {
      socket.destroy();
      return;
    }
    let chunks=[],total=0,finished=false,predecodeOwned=true;
    incompleteConnections += 1;
    let idleTimer=null,totalTimer=null;
    const releasePredecode=()=>{
      if(!predecodeOwned)return;
      predecodeOwned=false;incompleteConnections-=1;incompleteRetainedBytes-=total;
      incompleteConnections=Math.max(0,incompleteConnections);
      incompleteRetainedBytes=Math.max(0,incompleteRetainedBytes);
      if(idleTimer)clearTimeout(idleTimer);if(totalTimer)clearTimeout(totalTimer);
      idleTimer=null;totalTimer=null;
    };
    const abortPredecode=()=>{
      if(finished)return;
      finished=true;chunks=[];releasePredecode();socket.destroy();
    };
    const armIdle=()=>{
      if(idleTimer)clearTimeout(idleTimer);
      idleTimer=setTimeout(abortPredecode,PREDECODE_IDLE_TIMEOUT_MS);idleTimer.unref?.();
    };
    totalTimer=setTimeout(abortPredecode,PREDECODE_TOTAL_TIMEOUT_MS);totalTimer.unref?.();armIdle();
    socket.once('close',releasePredecode);
    socket.once('error',()=>{if(!finished)abortPredecode()});
    socket.on('data',async(chunk)=>{
      if(finished)return;armIdle();
      if(!(chunk instanceof Uint8Array)){abortPredecode();return}
      if(chunk.byteLength>MAX_WIRE_BYTES-total
          ||chunk.byteLength>MAX_INCOMPLETE_RETAINED_BYTES-incompleteRetainedBytes){abortPredecode();return}
      chunks.push(Buffer.from(chunk));total+=chunk.byteLength;incompleteRetainedBytes+=chunk.byteLength;
      const combined=Buffer.concat(chunks,total),firstLf=combined.indexOf(0x0a);
      if(firstLf<0)return;
      finished=true;chunks=[];releasePredecode();
      if(firstLf!==combined.length-1){socket.destroy();return}
      let request;
      try{request=decodeBrokerRequestV1(combined)}catch{socket.destroy();return}
      let response;
      try{response=await processRequest(rootDirectoryHandle,acceptedResultRoot,admissionMacKey,registryAuthority,apiKey,request)}
      catch{response=holdResponse(request.request_id,null,'INTERNAL_HOLD')}
      try{socket.end(encodeBrokerResponseV1(response))}catch{socket.destroy()}
    });
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
