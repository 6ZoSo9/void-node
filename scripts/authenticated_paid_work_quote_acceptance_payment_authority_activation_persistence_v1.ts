import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson } from "./agent_paid_work_order_envelope_v1.js";
import {
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  type AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_v1.js";
import {
  materializePublicAgentServiceRequesterAcceptanceAuthenticationV1,
} from "./public_agent_service_requester_acceptance_authentication_v1.js";
import {
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1,
  type AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";
import {
  acceptanceReplayStateIdV1,
  planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
  type AcceptanceReplayStateV1,
  type PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
} from "./public_agent_service_acceptance_materialization_replay_consumer_v1.js";

export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIG_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_CONFIG_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_COMMAND_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_COMMAND_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RESULT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RESULT_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RECEIPT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RECEIPT_V1" as const;
export const AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_TRANSACTION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_TRANSACTION_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_GENERATION_COMMIT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_GENERATION_COMMIT_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_CURRENT_POINTER_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_CURRENT_POINTER_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_VERSION = 1 as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION =
  "activateAndPersistAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1" as const;

const PAYMENT_STATE_PREFIX = "voidawpars1_";
const TRANSACTION_PREFIX = "voidawapat1_";
const GENERATION_PREFIX = "voidawpag1_";
const POINTER_PREFIX = "voidawpap1_";
const OPERATION_PREFIX = "voidawpao1_";
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const LOCK_FILENAME = "paid-work-activation-persistence-v1.lock";
const CURRENT_FILENAME = "current.json";
const GENERATIONS_DIRECTORY = "generations";
const STAGING_DIRECTORY = ".staging";
const PREPARED_PACKET_FILENAME = "prepared-packet.json";
const REQUESTER_AUTH_FILENAME = "requester-authentication.json";
const ACCEPTANCE_FILENAME = "acceptance.json";
const PAYMENT_INTENT_FILENAME = "payment-intent.json";
const ACCEPTANCE_STATE_FILENAME = "acceptance-replay-state.json";
const PAYMENT_STATE_FILENAME = "payment-authority-replay-state.json";
const TRANSACTION_FILENAME = "transaction.json";
const COMMIT_FILENAME = "commit.json";

const ID = {
  packet: /^voidawqapa1_[0-9a-f]{64}$/,
  requester: /^(?:voidawra1_|voidadra1_)[0-9a-f]{64}$/,
  provider: /^(?:voidawqa1_|voidadpa1_)[0-9a-f]{64}$/,
  acceptance: /^voidawa1_[0-9a-f]{64}$/,
  paymentIntent: /^voidawpi1_[0-9a-f]{64}$/,
  quote: /^voidawq1_[0-9a-f]{64}$/,
  workOrder: /^voidawo1_[0-9a-f]{64}$/,
  acceptanceState: /^voidawrs1_[0-9a-f]{64}$/,
  paymentState: /^voidawpars1_[0-9a-f]{64}$/,
  transaction: /^voidawapat1_[0-9a-f]{64}$/,
  generation: /^voidawpag1_[0-9a-f]{64}$/,
  pointer: /^voidawpap1_[0-9a-f]{64}$/,
} as const;

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type RecordValue = Record<string, unknown>;

export interface PaymentAuthorityReplayStateDraftV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_MARKER;
  version: 1;
  revision: number;
  consumed_prepared_packet_ids: string[];
  consumed_payment_intent_ids: string[];
  active_payment_intent_by_acceptance: Record<string, string>;
}
export interface PaymentAuthorityReplayStateV1 extends PaymentAuthorityReplayStateDraftV1 { state_id: string; }

export interface ActivationPersistenceConfigV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIG_MARKER;
  version: 1;
  enabled: boolean;
  allowed_root: string;
  max_pointer_bytes: number;
  max_generation_file_bytes: number;
  max_generation_count: number;
  recover_exact_orphaned_generation: boolean;
}
export interface ActivationPersistenceCommandV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_COMMAND_MARKER;
  version: 1;
  apply: boolean;
  confirmation: string;
  recorded_at_utc: string;
}
export interface AuthenticatedPaidWorkActivationPersistenceInputV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_MARKER;
  version: 1;
  mode: "example_fixture" | "external_requester_evidence" | "direct_authentication_packet";
  prepared_input: unknown;
  prepared_packet: unknown;
  requester_authentication_input: unknown | null;
  acceptance_replay_state_snapshot: unknown;
  payment_authority_replay_state_snapshot: unknown;
  expected_acceptance_revision: number;
  expected_payment_authority_revision: number;
  persistence_config: ActivationPersistenceConfigV1;
  command: ActivationPersistenceCommandV1;
}

export interface ActivationDependenciesV1 {
  verifyPrepared: (input: unknown, packet: unknown) => AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1;
  authenticateRequester: (input: unknown, catalog: unknown) => unknown;
  authenticateDirect?: (input: unknown) => AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1;
  planAcceptance: (input: unknown, catalog: unknown, workOrder: unknown, quote: unknown) => PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1;
}

export interface ActivationTransactionV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_ACTIVATION_TRANSACTION_MARKER;
  version: 1;
  transaction_id: string;
  prepared_packet_id: string;
  requester_authentication_id: string;
  provider_authentication_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  quote_id: string;
  work_order_id: string;
  before_acceptance_state_id: string;
  after_acceptance_state_id: string;
  before_payment_state_id: string;
  after_payment_state_id: string;
  before_acceptance_revision: number;
  after_acceptance_revision: number;
  before_payment_revision: number;
  after_payment_revision: number;
  atomic_consumption_count: 5;
  requester_authentication_consumed: true;
  provider_authentication_consumed: true;
  acceptance_id_consumed: true;
  prepared_packet_id_consumed: true;
  payment_intent_id_consumed: true;
  single_active_acceptance_per_quote_enforced: true;
  single_active_payment_intent_per_acceptance_enforced: true;
}

interface PlanV1 {
  prepared: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1;
  requesterPacket: RecordValue | null;
  acceptancePacket: PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1 | null;
  acceptance: RecordValue;
  paymentIntent: RecordValue;
  beforeAcceptance: AcceptanceReplayStateV1;
  afterAcceptance: AcceptanceReplayStateV1 | null;
  beforePayment: PaymentAuthorityReplayStateV1;
  afterPayment: PaymentAuthorityReplayStateV1 | null;
  transaction: ActivationTransactionV1 | null;
}

interface GenerationCommitV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_ACTIVATION_GENERATION_COMMIT_MARKER;
  version: 1;
  generation_id: string;
  parent_generation_id: string | null;
  transaction_id: string;
  packet_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  prepared_packet_sha256: string;
  requester_authentication_sha256: string;
  acceptance_sha256: string;
  payment_intent_sha256: string;
  acceptance_state_sha256: string;
  payment_state_sha256: string;
  transaction_sha256: string;
  recorded_at_utc: string;
}
interface CurrentPointerV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_ACTIVATION_CURRENT_POINTER_MARKER;
  version: 1;
  pointer_id: string;
  generation_id: string;
  transaction_id: string;
  packet_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  acceptance_state_id: string;
  payment_state_id: string;
  acceptance_revision: number;
  payment_revision: number;
  generation_commit_sha256: string;
}
interface LoadedGenerationV1 {
  pointer: CurrentPointerV1;
  commit: GenerationCommitV1;
  prepared: RecordValue;
  requester: RecordValue;
  acceptance: RecordValue;
  paymentIntent: RecordValue;
  acceptanceState: AcceptanceReplayStateV1;
  paymentState: PaymentAuthorityReplayStateV1;
  transaction: ActivationTransactionV1;
  directory: string;
}

export interface ActivationPersistenceReceiptV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RECEIPT_MARKER;
  version: 1;
  status: "committed" | "duplicate" | "recovered";
  operation_id: string;
  allowed_root_realpath: string;
  generation_id: string;
  parent_generation_id: string | null;
  pointer_id: string;
  transaction_id: string;
  prepared_packet_id: string;
  requester_authentication_id: string;
  provider_authentication_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  quote_id: string;
  work_order_id: string;
  before_acceptance_state_id: string;
  after_acceptance_state_id: string;
  before_payment_state_id: string;
  after_payment_state_id: string;
  before_acceptance_revision: number;
  after_acceptance_revision: number;
  before_payment_revision: number;
  after_payment_revision: number;
  atomic_consumption_count: 5;
  exact_duplicate: boolean;
  generation_recovered: boolean;
  immutable_generation_published: true;
  current_pointer_published: true;
  files_mode: "0600";
  directories_mode: "0700";
  authority: ReturnType<typeof appliedAuthority>;
}

export interface ActivationPersistenceResultV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RESULT_MARKER;
  version: 1;
  status: "disabled" | "example_only" | "planned" | "committed" | "duplicate" | "recovered";
  mode: "example_fixture" | "external_requester_evidence" | "direct_authentication_packet";
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  prepared_packet_verified: true;
  requester_authentication_verified: boolean;
  provider_authentication_verified: boolean;
  acceptance_transition_planned: boolean;
  payment_authority_transition_planned: boolean;
  persistence_attempted: boolean;
  persistence_receipt: ActivationPersistenceReceiptV1 | null;
  packet_id: string;
  requester_authentication_id: string | null;
  provider_authentication_id: string | null;
  acceptance_id: string;
  payment_intent_id: string;
  transaction_id: string | null;
  before_acceptance_state_id: string;
  after_acceptance_state_id: string | null;
  before_payment_state_id: string;
  after_payment_state_id: string | null;
  authority: ReturnType<typeof noAuthority> | ReturnType<typeof appliedAuthority>;
}

function fail(message: string): never { throw new Error(message); }
function assertCondition(condition: unknown, message: string): asserts condition { if (!condition) fail(message); }
function isRecord(value: unknown): value is RecordValue { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function requireRecord(value: unknown, label: string): RecordValue { assertCondition(isRecord(value), `${label} must be an object`); return value; }
function exactKeys(value: RecordValue, label: string, keys: readonly string[]): void { const actual=Object.keys(value).sort(); const expected=[...keys].sort(); assertCondition(JSON.stringify(actual)===JSON.stringify(expected), `${label} must contain exactly: ${expected.join(", ")}`); }
function reqString(value: unknown, label: string, pattern?: RegExp): string { assertCondition(typeof value === "string" && value===value.trim() && value.length>0, `${label} must be a non-empty trimmed string`); if(pattern) assertCondition(pattern.test(value), `${label} has invalid format`); return value; }
function reqInt(value: unknown, label: string, min=0): number { assertCondition(typeof value === "number" && Number.isSafeInteger(value) && value>=min, `${label} must be a safe integer >= ${min}`); return value; }
function reqBool(value: unknown, label: string): boolean { assertCondition(typeof value === "boolean", `${label} must be boolean`); return value; }
function reqUtc(value: unknown, label: string): string { const text=reqString(value,label,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/); assertCondition(Number.isFinite(Date.parse(text)),`${label} invalid UTC`); return text; }
function sha(value: string | Buffer): string { return crypto.createHash("sha256").update(value).digest("hex"); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function compact(value: unknown): Buffer { return Buffer.from(`${canonicalJson(value)}\n`,"utf8"); }
function sortedUnique(values: string[], label: string): string[] { const sorted=[...values].sort(); assertCondition(JSON.stringify(values)===JSON.stringify(sorted),`${label} must be sorted`); assertCondition(new Set(values).size===values.length,`${label} must be unique`); return values; }
function appendUnique(values: string[], added: string): string[] { assertCondition(!values.includes(added),`replay identifier already consumed: ${added}`); return [...values,added].sort(); }
function compareCanonical(a: unknown,b: unknown,label:string): void { assertCondition(canonicalJson(a)===canonicalJson(b),`${label} mismatch`); }

function noAuthority() { return {
  quote_acceptance:false, acceptance_persistence:false, requester_authentication_replay_write:false,
  provider_authentication_replay_write:false, acceptance_replay_write:false,
  prepared_packet_replay_write:false, payment_intent_replay_write:false,
  payment_authorization:false, payment_execution:false, payment_destination_resolution:false,
  transaction_construction:false, transaction_broadcast:false, payment_receipt_creation:false,
  work_execution_authorization:false, work_dispatch:false, wallet_access:false,
  production_signing:false, work_credit_write:false, void_settlement:false,
  http_submission:false, runtime_mutation:false, service_restart:false,
  deployment:false, money_movement:false,
} as const; }
function appliedAuthority() { return {
  quote_acceptance:true, acceptance_persistence:true, requester_authentication_replay_write:true,
  provider_authentication_replay_write:true, acceptance_replay_write:true,
  prepared_packet_replay_write:true, payment_intent_replay_write:true,
  payment_authorization:true, payment_execution:false, payment_destination_resolution:false,
  transaction_construction:false, transaction_broadcast:false, payment_receipt_creation:false,
  work_execution_authorization:false, work_dispatch:false, wallet_access:false,
  production_signing:false, work_credit_write:false, void_settlement:false,
  http_submission:false, runtime_mutation:false, service_restart:false,
  deployment:false, money_movement:false,
} as const; }

export function paymentAuthorityReplayStateIdV1(draft: PaymentAuthorityReplayStateDraftV1): string { return `${PAYMENT_STATE_PREFIX}${sha(canonicalJson(draft))}`; }
function validateAcceptanceState(value: unknown): AcceptanceReplayStateV1 {
  const r=requireRecord(value,"acceptance_replay_state_snapshot");
  exactKeys(r,"acceptance_replay_state_snapshot",["marker","version","revision","consumed_requester_authentication_ids","consumed_provider_authentication_ids","consumed_acceptance_ids","active_acceptance_by_quote","state_id"]);
  assertCondition(r.marker==="VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1","acceptance state marker mismatch"); assertCondition(r.version===1,"acceptance state version mismatch");
  const revision=reqInt(r.revision,"acceptance state revision");
  const requester=sortedUnique((r.consumed_requester_authentication_ids as unknown[]).map((v,i)=>reqString(v,`requester[${i}]`,ID.requester)),"requester IDs");
  const provider=sortedUnique((r.consumed_provider_authentication_ids as unknown[]).map((v,i)=>reqString(v,`provider[${i}]`,ID.provider)),"provider IDs");
  const acceptance=sortedUnique((r.consumed_acceptance_ids as unknown[]).map((v,i)=>reqString(v,`acceptance[${i}]`,ID.acceptance)),"acceptance IDs");
  const activeRaw=requireRecord(r.active_acceptance_by_quote,"active_acceptance_by_quote"); const active:Record<string,string>={}; for(const k of Object.keys(activeRaw).sort()){ reqString(k,"active quote",ID.quote); active[k]=reqString(activeRaw[k],`active acceptance ${k}`,ID.acceptance); }
  const draft={marker:"VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1" as const,version:1 as const,revision,consumed_requester_authentication_ids:requester,consumed_provider_authentication_ids:provider,consumed_acceptance_ids:acceptance,active_acceptance_by_quote:active};
  const stateId=reqString(r.state_id,"acceptance state_id",ID.acceptanceState); assertCondition(stateId===acceptanceReplayStateIdV1(draft),"acceptance state_id mismatch"); return {...draft,state_id:stateId};
}
function validatePaymentState(value: unknown): PaymentAuthorityReplayStateV1 {
  const r=requireRecord(value,"payment_authority_replay_state_snapshot"); exactKeys(r,"payment_authority_replay_state_snapshot",["marker","version","revision","consumed_prepared_packet_ids","consumed_payment_intent_ids","active_payment_intent_by_acceptance","state_id"]);
  assertCondition(r.marker===AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_MARKER,"payment state marker mismatch"); assertCondition(r.version===1,"payment state version mismatch");
  const revision=reqInt(r.revision,"payment state revision");
  assertCondition(Array.isArray(r.consumed_prepared_packet_ids),"consumed_prepared_packet_ids must be array"); assertCondition(Array.isArray(r.consumed_payment_intent_ids),"consumed_payment_intent_ids must be array");
  const packets=sortedUnique(r.consumed_prepared_packet_ids.map((v,i)=>reqString(v,`packet[${i}]`,ID.packet)),"packet IDs"); const intents=sortedUnique(r.consumed_payment_intent_ids.map((v,i)=>reqString(v,`intent[${i}]`,ID.paymentIntent)),"intent IDs");
  const activeRaw=requireRecord(r.active_payment_intent_by_acceptance,"active_payment_intent_by_acceptance"); const active:Record<string,string>={}; for(const k of Object.keys(activeRaw).sort()){ reqString(k,"active acceptance",ID.acceptance); active[k]=reqString(activeRaw[k],`active intent ${k}`,ID.paymentIntent); }
  const draft:PaymentAuthorityReplayStateDraftV1={marker:AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_MARKER,version:1,revision,consumed_prepared_packet_ids:packets,consumed_payment_intent_ids:intents,active_payment_intent_by_acceptance:active}; const stateId=reqString(r.state_id,"payment state_id",ID.paymentState); assertCondition(stateId===paymentAuthorityReplayStateIdV1(draft),"payment state_id mismatch"); return {...draft,state_id:stateId};
}
function validateConfig(value: unknown): ActivationPersistenceConfigV1 { const r=requireRecord(value,"persistence_config"); exactKeys(r,"persistence_config",["marker","version","enabled","allowed_root","max_pointer_bytes","max_generation_file_bytes","max_generation_count","recover_exact_orphaned_generation"]); assertCondition(r.marker===AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIG_MARKER,"config marker mismatch"); assertCondition(r.version===1,"config version mismatch"); const allowed=reqString(r.allowed_root,"allowed_root"); assertCondition(path.isAbsolute(allowed),"allowed_root must be absolute"); return {marker:AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIG_MARKER,version:1,enabled:reqBool(r.enabled,"enabled"),allowed_root:path.resolve(allowed),max_pointer_bytes:reqInt(r.max_pointer_bytes,"max_pointer_bytes",512),max_generation_file_bytes:reqInt(r.max_generation_file_bytes,"max_generation_file_bytes",1024),max_generation_count:reqInt(r.max_generation_count,"max_generation_count",1),recover_exact_orphaned_generation:reqBool(r.recover_exact_orphaned_generation,"recover_exact_orphaned_generation")}; }
function validateCommand(value: unknown): ActivationPersistenceCommandV1 { const r=requireRecord(value,"command"); exactKeys(r,"command",["marker","version","apply","confirmation","recorded_at_utc"]); assertCondition(r.marker===AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_COMMAND_MARKER,"command marker mismatch"); assertCondition(r.version===1,"command version mismatch"); return {marker:AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_COMMAND_MARKER,version:1,apply:reqBool(r.apply,"apply"),confirmation:typeof r.confirmation==="string"?r.confirmation:"",recorded_at_utc:reqUtc(r.recorded_at_utc,"recorded_at_utc")}; }
function validateInput(value: unknown): AuthenticatedPaidWorkActivationPersistenceInputV1 {
  const r=requireRecord(value,"input");
  exactKeys(r,"input",["marker","version","mode","prepared_input","prepared_packet","requester_authentication_input","acceptance_replay_state_snapshot","payment_authority_replay_state_snapshot","expected_acceptance_revision","expected_payment_authority_revision","persistence_config","command"]);
  assertCondition(r.marker===AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_MARKER,"input marker mismatch");
  assertCondition(r.version===1,"input version mismatch");
  assertCondition(
    r.mode==="example_fixture"||
    r.mode==="external_requester_evidence"||
    r.mode==="direct_authentication_packet",
    "mode mismatch",
  );
  if(r.mode==="example_fixture") {
    assertCondition(r.requester_authentication_input===null,"fixture requester input must be null");
  } else {
    assertCondition(isRecord(r.requester_authentication_input),"authentication input required");
  }
  return {
    marker:AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_MARKER,
    version:1,
    mode:r.mode,
    prepared_input:r.prepared_input,
    prepared_packet:r.prepared_packet,
    requester_authentication_input:r.requester_authentication_input,
    acceptance_replay_state_snapshot:r.acceptance_replay_state_snapshot,
    payment_authority_replay_state_snapshot:r.payment_authority_replay_state_snapshot,
    expected_acceptance_revision:reqInt(r.expected_acceptance_revision,"expected_acceptance_revision"),
    expected_payment_authority_revision:reqInt(r.expected_payment_authority_revision,"expected_payment_authority_revision"),
    persistence_config:validateConfig(r.persistence_config),
    command:validateCommand(r.command),
  };
}

function acceptanceDraftFromPrepared(packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1): RecordValue { const a=clone(packet.prepared_artifacts.acceptance_envelope) as unknown as RecordValue; delete a.acceptance_id; return a; }
function verifyPreparedBoundaries(packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1): void { assertCondition(packet.status==="prepared_requires_authenticated_atomic_activation","prepared status mismatch"); assertCondition(Object.values(packet.authority).every(v=>v===false),"prepared packet grants authority"); assertCondition(packet.acceptance_gate.effective_quote_acceptance===false,"prepared packet already accepted"); assertCondition(packet.payment_authority_gate.effective_payment_authorization===false,"prepared packet already authorized"); assertCondition(packet.payment_authority_gate.payment_execution_authorized===false,"prepared packet already authorizes payment execution"); }

function requesterBindings(packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1, requester: RecordValue): {requesterId:string;providerId:string} {
  assertCondition(requester.marker==="VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_V1","requester packet marker mismatch"); assertCondition(requester.status==="requester_authenticated_for_acceptance","requester not externally authenticated");
  const verification=requireRecord(requester.verification,"requester verification"); assertCondition(verification.provider_authentication_verified===true,"provider authentication not verified"); assertCondition(verification.requester_authentication_verified===true,"requester authentication not verified");
  const gate=requireRecord(requester.acceptance_gate,"requester acceptance_gate"); assertCondition(gate.eligible_for_acceptance_materialization===true,"requester not eligible for materialization");
  const source=requireRecord(requester.source,"requester source"); const requesterId=reqString(requester.requester_authentication_id,"requester_authentication_id",ID.requester); const providerId=reqString(source.provider_authentication_id,"provider_authentication_id",ID.provider);
  const checks:[unknown,unknown,string][]=[[source.quote_id,packet.source.quote_id,"quote_id"],[source.work_order_id,packet.source.work_order_id,"work_order_id"],[source.requester_agent_id,packet.source.requester_agent_id,"requester_agent_id"],[source.provider_id,packet.source.provider_id,"provider_id"],[source.acceptance_nonce,(packet.prepared_artifacts.acceptance_envelope as unknown as RecordValue).nonce,"acceptance_nonce"]]; for(const [a,b,l] of checks) assertCondition(a===b,`requester ${l} binding mismatch`); return {requesterId,providerId};
}
function acceptanceBindings(packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1, plan: PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1, before:AcceptanceReplayStateV1): {acceptance:RecordValue;after:AcceptanceReplayStateV1;requesterId:string;providerId:string} {
  assertCondition(plan.marker==="VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_V1","acceptance plan marker mismatch"); assertCondition(plan.status==="acceptance_materialization_planned","acceptance plan not live-planned"); assertCondition(plan.acceptance.acceptance_id===packet.prepared_artifacts.acceptance_envelope.acceptance_id,"acceptance ID differs from prepared packet"); assertCondition(plan.acceptance.acceptance_envelope!==null,"acceptance envelope missing"); compareCanonical(plan.acceptance.acceptance_envelope,packet.prepared_artifacts.acceptance_envelope,"acceptance envelope"); assertCondition(plan.replay.next_state!==null&&plan.replay.transaction!==null,"acceptance replay transition missing"); compareCanonical(plan.replay.before_state,before,"acceptance before state"); assertCondition(plan.replay.transaction.atomic_consumption_count===3,"acceptance atomic consumption changed"); return {acceptance:plan.acceptance.acceptance_envelope as unknown as RecordValue,after:plan.replay.next_state,requesterId:plan.source.requester_authentication_id,providerId:plan.source.provider_authentication_id};
}


function directAuthenticationBindings(
  packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
  directInputValue: unknown,
  command: ActivationPersistenceCommandV1,
  deps: ActivationDependenciesV1,
): {packet:RecordValue;requesterId:string;providerId:string} {
  assertCondition(
    deps.authenticateDirect!==undefined,
    "direct authentication dependency unavailable",
  );
  const directInput=requireRecord(directInputValue,"direct authentication input");
  compareCanonical(
    directInput.prepared_packet,
    packet,
    "direct embedded prepared packet",
  );
  const direct=deps.authenticateDirect(directInputValue);
  assertCondition(
    direct.marker===
      "VOID_AUTHENTICATED_PAID_WORK_DIRECT_QUOTE_ACTIVATION_AUTHENTICATION_PACKET_V1",
    "direct authentication packet marker mismatch",
  );
  assertCondition(
    direct.status==="direct_lineage_authenticated_for_atomic_activation",
    "direct authentication packet is not live-authenticated",
  );
  assertCondition(
    direct.activation_gate.eligible_for_atomic_activation_persistence===true,
    "direct authentication packet is not eligible for persistence",
  );
  assertCondition(
    direct.activation_gate.public_service_submission_id_required===false&&
    direct.activation_gate.public_service_submission_id_synthesized===false,
    "direct authentication packet substituted public-service lineage",
  );
  assertCondition(
    Object.values(direct.authority).every((value)=>value===false),
    "direct authentication packet grants authority before persistence",
  );
  const checks:[unknown,unknown,string][]=[
    [direct.source.prepared_packet_id,packet.packet_id,"prepared_packet_id"],
    [direct.source.prepared_packet_fingerprint_sha256,sha(canonicalJson(packet)),"prepared_packet_fingerprint_sha256"],
    [direct.source.quote_id,packet.source.quote_id,"quote_id"],
    [direct.source.work_order_id,packet.source.work_order_id,"work_order_id"],
    [direct.source.acceptance_id,packet.prepared_artifacts.acceptance_envelope.acceptance_id,"acceptance_id"],
    [direct.source.payment_intent_id,packet.prepared_artifacts.payment_intent_envelope.payment_intent_id,"payment_intent_id"],
    [direct.source.requester_agent_id,packet.source.requester_agent_id,"requester_agent_id"],
    [direct.source.provider_id,packet.source.provider_id,"provider_id"],
  ];
  for(const [actual,expected,label] of checks) {
    assertCondition(actual===expected,`direct authentication ${label} mismatch`);
  }
  assertCondition(
    direct.provider_authentication.scope===
      "authenticated_paid_work_direct_quote_activate"&&
    direct.provider_authentication.signature_verified===true&&
    direct.provider_authentication.direct_lineage_verified===true,
    "direct provider authentication verification mismatch",
  );
  assertCondition(
    direct.requester_authentication.scope==="agent_paid_work_accept"&&
    direct.requester_authentication.signature_verified===true&&
    direct.requester_authentication.direct_lineage_verified===true&&
    direct.requester_authentication.provider_authentication_id_bound===true,
    "direct requester authentication verification mismatch",
  );
  const requesterId=reqString(
    direct.requester_authentication.authentication_id,
    "direct requester authentication_id",
    ID.requester,
  );
  const providerId=reqString(
    direct.provider_authentication.authentication_id,
    "direct provider authentication_id",
    ID.provider,
  );

  const recordedAt=Date.parse(command.recorded_at_utc);
  const providerBinding=requireRecord(
    directInput.provider_key_binding,
    "direct provider key binding",
  );
  const requesterBinding=requireRecord(
    directInput.requester_key_binding,
    "direct requester key binding",
  );
  const providerEnvelope=requireRecord(
    directInput.provider_authentication_envelope,
    "direct provider authentication envelope",
  );
  const requesterEnvelope=requireRecord(
    directInput.requester_authentication_envelope,
    "direct requester authentication envelope",
  );
  for(const [label,envelope] of [
    ["provider",providerEnvelope],
    ["requester",requesterEnvelope],
  ] as const) {
    const createdAt=Date.parse(reqUtc(envelope.created_at_utc,`${label} authentication created_at_utc`));
    const expiresAt=Date.parse(reqUtc(envelope.expires_at_utc,`${label} authentication expires_at_utc`));
    assertCondition(recordedAt>=createdAt,`${label} authentication is not yet active`);
    assertCondition(recordedAt<expiresAt,`${label} authentication expired before activation`);
  }
  for(const [label,binding] of [
    ["provider",providerBinding],
    ["requester",requesterBinding],
  ] as const) {
    if(binding.revoked_at_utc!==null) {
      const revokedAt=Date.parse(reqUtc(binding.revoked_at_utc,`${label} binding revoked_at_utc`));
      assertCondition(recordedAt<revokedAt,`${label} binding revoked before activation`);
    }
  }
  return {
    packet:direct as unknown as RecordValue,
    requesterId,
    providerId,
  };
}

function directAcceptanceBindings(
  packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
  requesterId: string,
  providerId: string,
  before: AcceptanceReplayStateV1,
): {acceptance:RecordValue;after:AcceptanceReplayStateV1} {
  const acceptance=packet.prepared_artifacts.acceptance_envelope as unknown as RecordValue;
  const acceptanceId=reqString(acceptance.acceptance_id,"acceptance_id",ID.acceptance);
  const quoteId=reqString(acceptance.quote_id,"quote_id",ID.quote);
  assertCondition(
    before.active_acceptance_by_quote[quoteId]===undefined,
    "quote already has active acceptance",
  );
  const draft={
    marker:"VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1" as const,
    version:1 as const,
    revision:before.revision+1,
    consumed_requester_authentication_ids:
      appendUnique(before.consumed_requester_authentication_ids,requesterId),
    consumed_provider_authentication_ids:
      appendUnique(before.consumed_provider_authentication_ids,providerId),
    consumed_acceptance_ids:
      appendUnique(before.consumed_acceptance_ids,acceptanceId),
    active_acceptance_by_quote:{
      ...before.active_acceptance_by_quote,
      [quoteId]:acceptanceId,
    },
  };
  const after:AcceptanceReplayStateV1={
    ...draft,
    state_id:acceptanceReplayStateIdV1(draft),
  };
  return {acceptance,after};
}

function transactionId(value: Omit<ActivationTransactionV1,"transaction_id">): string { return `${TRANSACTION_PREFIX}${sha(canonicalJson(value))}`; }
function buildPlan(input:AuthenticatedPaidWorkActivationPersistenceInputV1,catalog:unknown,deps:ActivationDependenciesV1):PlanV1 {
  const prepared=deps.verifyPrepared(input.prepared_input,input.prepared_packet);
  verifyPreparedBoundaries(prepared);
  const beforeAcceptance=validateAcceptanceState(input.acceptance_replay_state_snapshot);
  const beforePayment=validatePaymentState(input.payment_authority_replay_state_snapshot);
  assertCondition(beforeAcceptance.revision===input.expected_acceptance_revision,"expected acceptance revision mismatch");
  assertCondition(beforePayment.revision===input.expected_payment_authority_revision,"expected payment revision mismatch");
  const acceptance=prepared.prepared_artifacts.acceptance_envelope as unknown as RecordValue;
  const paymentIntent=prepared.prepared_artifacts.payment_intent_envelope as unknown as RecordValue;
  if(input.mode==="example_fixture") {
    return {
      prepared,
      requesterPacket:null,
      acceptancePacket:null,
      acceptance,
      paymentIntent,
      beforeAcceptance,
      afterAcceptance:null,
      beforePayment,
      afterPayment:null,
      transaction:null,
    };
  }

  let requesterPacket:RecordValue;
  let acceptancePacket:PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1|null;
  let afterAcceptance:AcceptanceReplayStateV1;
  let requesterId:string;
  let providerId:string;

  if(input.mode==="direct_authentication_packet") {
    const direct=directAuthenticationBindings(
      prepared,
      input.requester_authentication_input,
      input.command,
      deps,
    );
    const bound=directAcceptanceBindings(
      prepared,
      direct.requesterId,
      direct.providerId,
      beforeAcceptance,
    );
    requesterPacket=direct.packet;
    acceptancePacket=null;
    afterAcceptance=bound.after;
    requesterId=direct.requesterId;
    providerId=direct.providerId;
  } else {
    const requester=requireRecord(
      deps.authenticateRequester(input.requester_authentication_input,catalog),
      "requester authentication packet",
    );
    const auth=requesterBindings(prepared,requester);
    const replayInput={
      marker:"VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_V1",
      version:1,
      mode:"external_requester_evidence",
      requester_authentication_input:input.requester_authentication_input,
      acceptance_draft:acceptanceDraftFromPrepared(prepared),
      replay_state_snapshot:beforeAcceptance,
      expected_state_revision:beforeAcceptance.revision,
    };
    const planned=deps.planAcceptance(
      replayInput,
      catalog,
      (input.prepared_input as RecordValue).work_order,
      (input.prepared_input as RecordValue).quote,
    );
    const bound=acceptanceBindings(prepared,planned,beforeAcceptance);
    assertCondition(
      auth.requesterId===bound.requesterId&&auth.providerId===bound.providerId,
      "authentication and replay plan identities differ",
    );
    requesterPacket=requester;
    acceptancePacket=planned;
    afterAcceptance=bound.after;
    requesterId=auth.requesterId;
    providerId=auth.providerId;
  }

  const acceptanceId=reqString(acceptance.acceptance_id,"acceptance_id",ID.acceptance);
  const paymentIntentId=reqString(paymentIntent.payment_intent_id,"payment_intent_id",ID.paymentIntent);
  const packetId=reqString(prepared.packet_id,"packet_id",ID.packet);
  assertCondition(
    beforePayment.active_payment_intent_by_acceptance[acceptanceId]===undefined,
    "acceptance already has active payment intent",
  );
  const paymentDraft:PaymentAuthorityReplayStateDraftV1={
    marker:AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_MARKER,
    version:1,
    revision:beforePayment.revision+1,
    consumed_prepared_packet_ids:
      appendUnique(beforePayment.consumed_prepared_packet_ids,packetId),
    consumed_payment_intent_ids:
      appendUnique(beforePayment.consumed_payment_intent_ids,paymentIntentId),
    active_payment_intent_by_acceptance:{
      ...beforePayment.active_payment_intent_by_acceptance,
      [acceptanceId]:paymentIntentId,
    },
  };
  const afterPayment:PaymentAuthorityReplayStateV1={
    ...paymentDraft,
    state_id:paymentAuthorityReplayStateIdV1(paymentDraft),
  };
  const txNoId:Omit<ActivationTransactionV1,"transaction_id">={
    marker:AUTHENTICATED_PAID_WORK_ACTIVATION_TRANSACTION_MARKER,
    version:1,
    prepared_packet_id:packetId,
    requester_authentication_id:requesterId,
    provider_authentication_id:providerId,
    acceptance_id:acceptanceId,
    payment_intent_id:paymentIntentId,
    quote_id:reqString(prepared.source.quote_id,"quote_id",ID.quote),
    work_order_id:reqString(prepared.source.work_order_id,"work_order_id",ID.workOrder),
    before_acceptance_state_id:beforeAcceptance.state_id,
    after_acceptance_state_id:afterAcceptance.state_id,
    before_payment_state_id:beforePayment.state_id,
    after_payment_state_id:afterPayment.state_id,
    before_acceptance_revision:beforeAcceptance.revision,
    after_acceptance_revision:afterAcceptance.revision,
    before_payment_revision:beforePayment.revision,
    after_payment_revision:afterPayment.revision,
    atomic_consumption_count:5,
    requester_authentication_consumed:true,
    provider_authentication_consumed:true,
    acceptance_id_consumed:true,
    prepared_packet_id_consumed:true,
    payment_intent_id_consumed:true,
    single_active_acceptance_per_quote_enforced:true,
    single_active_payment_intent_per_acceptance_enforced:true,
  };
  const transaction:ActivationTransactionV1={
    ...txNoId,
    transaction_id:transactionId(txNoId),
  };
  return {
    prepared,
    requesterPacket,
    acceptancePacket,
    acceptance,
    paymentIntent,
    beforeAcceptance,
    afterAcceptance,
    beforePayment,
    afterPayment,
    transaction,
  };
}

function ensureDir(p:string, mode=0o700):void { if(!fs.existsSync(p)) fs.mkdirSync(p,{mode,recursive:false}); const s=fs.lstatSync(p); assertCondition(s.isDirectory()&&!s.isSymbolicLink(),`directory required: ${p}`); assertCondition((s.mode&0o777)===mode,`directory mode mismatch: ${p}`); }
function contained(root:string,name:string):string { const p=path.resolve(root,name); assertCondition(p===root||p.startsWith(`${root}${path.sep}`),"path escapes root"); return p; }
function writeExclusive(p:string,value:unknown,max:number):Buffer { const b=compact(value); assertCondition(b.length<=max,`file exceeds bound: ${path.basename(p)}`); const fd=fs.openSync(p,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600); try{fs.writeFileSync(fd,b);fs.fsyncSync(fd);}finally{fs.closeSync(fd);} return b; }
function readBounded(p:string,max:number):unknown { const s=fs.lstatSync(p); assertCondition(s.isFile()&&!s.isSymbolicLink(),`regular file required: ${p}`); assertCondition((s.mode&0o777)===0o600,`file mode mismatch: ${p}`); assertCondition(s.size<=max,`file too large: ${p}`); return JSON.parse(fs.readFileSync(p,"utf8")) as unknown; }
function fsyncDir(p:string):void { const fd=fs.openSync(p,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY); try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);} }
function lock(root:string,operation:string):string { const p=contained(root,LOCK_FILENAME); const fd=fs.openSync(p,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600); fs.writeFileSync(fd,`${operation}\n`);fs.fsyncSync(fd);fs.closeSync(fd);fsyncDir(root);return p; }
function unlock(root:string,p:string):void { fs.unlinkSync(p);fsyncDir(root); }
function pointerId(draft:Omit<CurrentPointerV1,"pointer_id">):string{return `${POINTER_PREFIX}${sha(canonicalJson(draft))}`;}
type GenerationHashesV1 = Pick<GenerationCommitV1, "prepared_packet_sha256" | "requester_authentication_sha256" | "acceptance_sha256" | "payment_intent_sha256" | "acceptance_state_sha256" | "payment_state_sha256" | "transaction_sha256">;
function generationIdentity(parent:string|null,plan:PlanV1):{id:string;hashes:GenerationHashesV1} { assertCondition(plan.requesterPacket&&plan.afterAcceptance&&plan.afterPayment&&plan.transaction,"live plan required"); const hashes={prepared_packet_sha256:sha(compact(plan.prepared)),requester_authentication_sha256:sha(compact(plan.requesterPacket)),acceptance_sha256:sha(compact(plan.acceptance)),payment_intent_sha256:sha(compact(plan.paymentIntent)),acceptance_state_sha256:sha(compact(plan.afterAcceptance)),payment_state_sha256:sha(compact(plan.afterPayment)),transaction_sha256:sha(compact(plan.transaction))}; const identity={parent_generation_id:parent,transaction_id:plan.transaction.transaction_id,packet_id:plan.prepared.packet_id,acceptance_id:plan.transaction.acceptance_id,payment_intent_id:plan.transaction.payment_intent_id,...hashes}; return {id:`${GENERATION_PREFIX}${sha(canonicalJson(identity))}`,hashes}; }
function operationId(generation:string,recorded:string):string{return `${OPERATION_PREFIX}${sha(canonicalJson({generation_id:generation,recorded_at_utc:recorded}))}`;}

function validatePointer(value:unknown):CurrentPointerV1 { const r=requireRecord(value,"current pointer"); const fields=["marker","version","pointer_id","generation_id","transaction_id","packet_id","acceptance_id","payment_intent_id","acceptance_state_id","payment_state_id","acceptance_revision","payment_revision","generation_commit_sha256"]; exactKeys(r,"current pointer",fields); assertCondition(r.marker===AUTHENTICATED_PAID_WORK_ACTIVATION_CURRENT_POINTER_MARKER&&r.version===1,"pointer marker/version mismatch"); const draft={marker:AUTHENTICATED_PAID_WORK_ACTIVATION_CURRENT_POINTER_MARKER,version:1 as const,generation_id:reqString(r.generation_id,"generation_id",ID.generation),transaction_id:reqString(r.transaction_id,"transaction_id",ID.transaction),packet_id:reqString(r.packet_id,"packet_id",ID.packet),acceptance_id:reqString(r.acceptance_id,"acceptance_id",ID.acceptance),payment_intent_id:reqString(r.payment_intent_id,"payment_intent_id",ID.paymentIntent),acceptance_state_id:reqString(r.acceptance_state_id,"acceptance_state_id",ID.acceptanceState),payment_state_id:reqString(r.payment_state_id,"payment_state_id",ID.paymentState),acceptance_revision:reqInt(r.acceptance_revision,"acceptance_revision"),payment_revision:reqInt(r.payment_revision,"payment_revision"),generation_commit_sha256:reqString(r.generation_commit_sha256,"generation_commit_sha256",/^[0-9a-f]{64}$/)}; const pid=reqString(r.pointer_id,"pointer_id",ID.pointer); assertCondition(pid===pointerId(draft),"pointer_id mismatch"); return {...draft,pointer_id:pid}; }
function loadCurrent(config:ActivationPersistenceConfigV1):LoadedGenerationV1|null { const current=contained(config.allowed_root,CURRENT_FILENAME); if(!fs.existsSync(current)) return null; const pointer=validatePointer(readBounded(current,config.max_pointer_bytes)); const dir=contained(contained(config.allowed_root,GENERATIONS_DIRECTORY),pointer.generation_id); const commit=readBounded(contained(dir,COMMIT_FILENAME),config.max_generation_file_bytes) as GenerationCommitV1; const prepared=requireRecord(readBounded(contained(dir,PREPARED_PACKET_FILENAME),config.max_generation_file_bytes),"stored prepared"); const requester=requireRecord(readBounded(contained(dir,REQUESTER_AUTH_FILENAME),config.max_generation_file_bytes),"stored requester"); const acceptance=requireRecord(readBounded(contained(dir,ACCEPTANCE_FILENAME),config.max_generation_file_bytes),"stored acceptance"); const paymentIntent=requireRecord(readBounded(contained(dir,PAYMENT_INTENT_FILENAME),config.max_generation_file_bytes),"stored payment intent"); const acceptanceState=validateAcceptanceState(readBounded(contained(dir,ACCEPTANCE_STATE_FILENAME),config.max_generation_file_bytes)); const paymentState=validatePaymentState(readBounded(contained(dir,PAYMENT_STATE_FILENAME),config.max_generation_file_bytes)); const transaction=readBounded(contained(dir,TRANSACTION_FILENAME),config.max_generation_file_bytes) as ActivationTransactionV1; assertCondition(commit.generation_id===pointer.generation_id,"commit generation mismatch"); assertCondition(sha(compact(commit))===pointer.generation_commit_sha256,"commit SHA mismatch"); assertCondition(transaction.transaction_id===pointer.transaction_id,"transaction pointer mismatch"); return {pointer,commit,prepared,requester,acceptance,paymentIntent,acceptanceState,paymentState,transaction,directory:dir}; }
function compareLoadedExact(current:LoadedGenerationV1,plan:PlanV1):void { assertCondition(plan.requesterPacket&&plan.afterAcceptance&&plan.afterPayment&&plan.transaction,"live plan required"); compareCanonical(current.prepared,plan.prepared,"duplicate prepared");compareCanonical(current.requester,plan.requesterPacket,"duplicate requester");compareCanonical(current.acceptance,plan.acceptance,"duplicate acceptance");compareCanonical(current.paymentIntent,plan.paymentIntent,"duplicate payment intent");compareCanonical(current.acceptanceState,plan.afterAcceptance,"duplicate acceptance state");compareCanonical(current.paymentState,plan.afterPayment,"duplicate payment state");compareCanonical(current.transaction,plan.transaction,"duplicate transaction"); }
function publishPointer(config:ActivationPersistenceConfigV1,operation:string,draft:Omit<CurrentPointerV1,"pointer_id">):CurrentPointerV1 { const pointer={...draft,pointer_id:pointerId(draft)}; const tmp=contained(config.allowed_root,`.current.${operation}.tmp`); const bytes=writeExclusive(tmp,pointer,config.max_pointer_bytes); assertCondition(bytes.length<=config.max_pointer_bytes,"pointer too large"); fs.renameSync(tmp,contained(config.allowed_root,CURRENT_FILENAME));fsyncDir(config.allowed_root);return pointer; }
function receipt(status:"committed"|"duplicate"|"recovered",operation:string,root:string,parent:string|null,pointer:CurrentPointerV1,plan:PlanV1):ActivationPersistenceReceiptV1 { assertCondition(plan.transaction&&plan.afterAcceptance&&plan.afterPayment,"live plan required"); return {marker:AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RECEIPT_MARKER,version:1,status,operation_id:operation,allowed_root_realpath:root,generation_id:pointer.generation_id,parent_generation_id:parent,pointer_id:pointer.pointer_id,transaction_id:plan.transaction.transaction_id,prepared_packet_id:plan.transaction.prepared_packet_id,requester_authentication_id:plan.transaction.requester_authentication_id,provider_authentication_id:plan.transaction.provider_authentication_id,acceptance_id:plan.transaction.acceptance_id,payment_intent_id:plan.transaction.payment_intent_id,quote_id:plan.transaction.quote_id,work_order_id:plan.transaction.work_order_id,before_acceptance_state_id:plan.transaction.before_acceptance_state_id,after_acceptance_state_id:plan.transaction.after_acceptance_state_id,before_payment_state_id:plan.transaction.before_payment_state_id,after_payment_state_id:plan.transaction.after_payment_state_id,before_acceptance_revision:plan.transaction.before_acceptance_revision,after_acceptance_revision:plan.transaction.after_acceptance_revision,before_payment_revision:plan.transaction.before_payment_revision,after_payment_revision:plan.transaction.after_payment_revision,atomic_consumption_count:5,exact_duplicate:status==="duplicate",generation_recovered:status==="recovered",immutable_generation_published:true,current_pointer_published:true,files_mode:"0600",directories_mode:"0700",authority:appliedAuthority()}; }

function persist(config:ActivationPersistenceConfigV1,command:ActivationPersistenceCommandV1,plan:PlanV1):ActivationPersistenceReceiptV1 { assertCondition(plan.requesterPacket&&plan.afterAcceptance&&plan.afterPayment&&plan.transaction,"live plan required"); const rootStat=fs.lstatSync(config.allowed_root); assertCondition(rootStat.isDirectory()&&!rootStat.isSymbolicLink(),"allowed_root must be real directory"); assertCondition((rootStat.mode&0o777)===0o700,"allowed_root mode must be 0700"); const root=fs.realpathSync(config.allowed_root); assertCondition(root===config.allowed_root,"allowed_root must be canonical"); const gens=contained(root,GENERATIONS_DIRECTORY), staging=contained(root,STAGING_DIRECTORY); ensureDir(gens);ensureDir(staging);assertCondition(fs.readdirSync(staging).length===0,"unresolved staging requires review"); assertCondition(fs.readdirSync(gens).length<=config.max_generation_count,"generation count exceeds bound");
  const initial=loadCurrent(config); const duplicate=initial?.pointer.transaction_id===plan.transaction.transaction_id; const parent=duplicate?(initial?.commit.parent_generation_id??null):(initial?.pointer.generation_id??null); const identity=generationIdentity(parent,plan); if(duplicate) assertCondition(initial?.pointer.generation_id===identity.id,"duplicate generation identity mismatch"); const operation=operationId(identity.id,command.recorded_at_utc); const lockPath=lock(root,operation); let released=false;
  try { const current=loadCurrent(config); if(current?.pointer.transaction_id===plan.transaction.transaction_id){ assertCondition(current.pointer.generation_id===identity.id,"duplicate points to another generation");compareLoadedExact(current,plan);unlock(root,lockPath);released=true;return receipt("duplicate",operation,root,parent,current.pointer,plan); }
    if(current===null){ assertCondition(plan.beforeAcceptance.revision===0&&plan.beforePayment.revision===0,"empty store requires zero revisions"); assertCondition(plan.beforeAcceptance.consumed_acceptance_ids.length===0&&plan.beforePayment.consumed_prepared_packet_ids.length===0,"empty store requires empty replay state"); } else { compareCanonical(current.acceptanceState,plan.beforeAcceptance,"acceptance compare-and-swap before");compareCanonical(current.paymentState,plan.beforePayment,"payment compare-and-swap before"); }
    const actualParent=current?.pointer.generation_id??null; assertCondition(actualParent===parent,"parent changed after lock"); const recalc=generationIdentity(actualParent,plan);assertCondition(recalc.id===identity.id,"generation identity changed"); const finalDir=contained(gens,identity.id); let recovered=false; let commit:GenerationCommitV1; let commitBytes:Buffer;
    if(fs.existsSync(finalDir)){ assertCondition(config.recover_exact_orphaned_generation,"orphan recovery disabled"); const fakePointer:CurrentPointerV1={marker:AUTHENTICATED_PAID_WORK_ACTIVATION_CURRENT_POINTER_MARKER,version:1,pointer_id:"",generation_id:identity.id,transaction_id:plan.transaction.transaction_id,packet_id:plan.transaction.prepared_packet_id,acceptance_id:plan.transaction.acceptance_id,payment_intent_id:plan.transaction.payment_intent_id,acceptance_state_id:plan.afterAcceptance.state_id,payment_state_id:plan.afterPayment.state_id,acceptance_revision:plan.afterAcceptance.revision,payment_revision:plan.afterPayment.revision,generation_commit_sha256:""}; const loadedCommit=readBounded(contained(finalDir,COMMIT_FILENAME),config.max_generation_file_bytes) as GenerationCommitV1; commit=loadedCommit;commitBytes=compact(commit); const loaded={pointer:fakePointer,commit,prepared:requireRecord(readBounded(contained(finalDir,PREPARED_PACKET_FILENAME),config.max_generation_file_bytes),"orphan prepared"),requester:requireRecord(readBounded(contained(finalDir,REQUESTER_AUTH_FILENAME),config.max_generation_file_bytes),"orphan requester"),acceptance:requireRecord(readBounded(contained(finalDir,ACCEPTANCE_FILENAME),config.max_generation_file_bytes),"orphan acceptance"),paymentIntent:requireRecord(readBounded(contained(finalDir,PAYMENT_INTENT_FILENAME),config.max_generation_file_bytes),"orphan intent"),acceptanceState:validateAcceptanceState(readBounded(contained(finalDir,ACCEPTANCE_STATE_FILENAME),config.max_generation_file_bytes)),paymentState:validatePaymentState(readBounded(contained(finalDir,PAYMENT_STATE_FILENAME),config.max_generation_file_bytes)),transaction:readBounded(contained(finalDir,TRANSACTION_FILENAME),config.max_generation_file_bytes) as ActivationTransactionV1,directory:finalDir}; compareLoadedExact(loaded,plan);assertCondition(commit.generation_id===identity.id,"orphan generation mismatch");recovered=true;
    } else { assertCondition(fs.readdirSync(gens).length<config.max_generation_count,"generation count reached bound"); const stage=contained(staging,`${identity.id}.${operation}`);fs.mkdirSync(stage,{mode:0o700}); try { writeExclusive(contained(stage,PREPARED_PACKET_FILENAME),plan.prepared,config.max_generation_file_bytes);writeExclusive(contained(stage,REQUESTER_AUTH_FILENAME),plan.requesterPacket,config.max_generation_file_bytes);writeExclusive(contained(stage,ACCEPTANCE_FILENAME),plan.acceptance,config.max_generation_file_bytes);writeExclusive(contained(stage,PAYMENT_INTENT_FILENAME),plan.paymentIntent,config.max_generation_file_bytes);writeExclusive(contained(stage,ACCEPTANCE_STATE_FILENAME),plan.afterAcceptance,config.max_generation_file_bytes);writeExclusive(contained(stage,PAYMENT_STATE_FILENAME),plan.afterPayment,config.max_generation_file_bytes);writeExclusive(contained(stage,TRANSACTION_FILENAME),plan.transaction,config.max_generation_file_bytes); commit={marker:AUTHENTICATED_PAID_WORK_ACTIVATION_GENERATION_COMMIT_MARKER,version:1,generation_id:identity.id,parent_generation_id:actualParent,transaction_id:plan.transaction.transaction_id,packet_id:plan.transaction.prepared_packet_id,acceptance_id:plan.transaction.acceptance_id,payment_intent_id:plan.transaction.payment_intent_id,...identity.hashes,recorded_at_utc:command.recorded_at_utc};commitBytes=writeExclusive(contained(stage,COMMIT_FILENAME),commit,config.max_generation_file_bytes);fsyncDir(stage);fs.renameSync(stage,finalDir);fsyncDir(gens);}catch(e){if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true,force:true});throw e;} }
    const pointerDraft:Omit<CurrentPointerV1,"pointer_id">={marker:AUTHENTICATED_PAID_WORK_ACTIVATION_CURRENT_POINTER_MARKER,version:1,generation_id:identity.id,transaction_id:plan.transaction.transaction_id,packet_id:plan.transaction.prepared_packet_id,acceptance_id:plan.transaction.acceptance_id,payment_intent_id:plan.transaction.payment_intent_id,acceptance_state_id:plan.afterAcceptance.state_id,payment_state_id:plan.afterPayment.state_id,acceptance_revision:plan.afterAcceptance.revision,payment_revision:plan.afterPayment.revision,generation_commit_sha256:sha(commitBytes)}; const pointer=publishPointer(config,operation,pointerDraft); const final=loadCurrent(config);assertCondition(final!==null&&final.pointer.pointer_id===pointer.pointer_id,"published pointer verification failed");compareLoadedExact(final,plan);unlock(root,lockPath);released=true;return receipt(recovered?"recovered":"committed",operation,root,actualParent,pointer,plan);
  } finally { if(!released&&fs.existsSync(lockPath)) unlock(root,lockPath); }
}

export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_DEFAULT_DEPENDENCIES_V1:ActivationDependenciesV1={
  verifyPrepared:verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  authenticateRequester:materializePublicAgentServiceRequesterAcceptanceAuthenticationV1,
  authenticateDirect:materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1,
  planAcceptance:planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
};
export function activationPersistenceDefaultDependencyIdentityV1(){return {
  prepared_verifier:"verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1",
  requester_authenticator:"materializePublicAgentServiceRequesterAcceptanceAuthenticationV1",
  direct_authenticator:"materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1",
  acceptance_replay_planner:"planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1",
} as const;}

export function executeAuthenticatedPaidWorkActivationPersistenceV1(inputValue:unknown,catalogValue:unknown,deps:ActivationDependenciesV1=AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_DEFAULT_DEPENDENCIES_V1):ActivationPersistenceResultV1 { const input=validateInput(inputValue); const plan=buildPlan(input,catalogValue,deps); const base={marker:AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RESULT_MARKER,version:1 as const,mode:input.mode,enabled:input.persistence_config.enabled,apply:input.command.apply,prepared_packet_verified:true as const,packet_id:plan.prepared.packet_id,acceptance_id:reqString(plan.acceptance.acceptance_id,"acceptance_id",ID.acceptance),payment_intent_id:reqString(plan.paymentIntent.payment_intent_id,"payment_intent_id",ID.paymentIntent),before_acceptance_state_id:plan.beforeAcceptance.state_id,before_payment_state_id:plan.beforePayment.state_id};
  if(input.mode==="example_fixture") return {...base,status:"example_only",confirmation_verified:false,requester_authentication_verified:false,provider_authentication_verified:false,acceptance_transition_planned:false,payment_authority_transition_planned:false,persistence_attempted:false,persistence_receipt:null,requester_authentication_id:null,provider_authentication_id:null,transaction_id:null,after_acceptance_state_id:null,after_payment_state_id:null,authority:noAuthority()};
  assertCondition(plan.requesterPacket&&plan.afterAcceptance&&plan.afterPayment&&plan.transaction,"external plan incomplete"); const requesterId=plan.transaction.requester_authentication_id,providerId=plan.transaction.provider_authentication_id;
  if(!input.persistence_config.enabled) return {...base,status:"disabled",confirmation_verified:false,requester_authentication_verified:true,provider_authentication_verified:true,acceptance_transition_planned:true,payment_authority_transition_planned:true,persistence_attempted:false,persistence_receipt:null,requester_authentication_id:requesterId,provider_authentication_id:providerId,transaction_id:plan.transaction.transaction_id,after_acceptance_state_id:plan.afterAcceptance.state_id,after_payment_state_id:plan.afterPayment.state_id,authority:noAuthority()};
  if(!input.command.apply) return {...base,status:"planned",confirmation_verified:false,requester_authentication_verified:true,provider_authentication_verified:true,acceptance_transition_planned:true,payment_authority_transition_planned:true,persistence_attempted:false,persistence_receipt:null,requester_authentication_id:requesterId,provider_authentication_id:providerId,transaction_id:plan.transaction.transaction_id,after_acceptance_state_id:plan.afterAcceptance.state_id,after_payment_state_id:plan.afterPayment.state_id,authority:noAuthority()};
  assertCondition(input.command.confirmation===AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION,"exact activation confirmation required"); const receiptValue=persist(input.persistence_config,input.command,plan); return {...base,status:receiptValue.status,confirmation_verified:true,requester_authentication_verified:true,provider_authentication_verified:true,acceptance_transition_planned:true,payment_authority_transition_planned:true,persistence_attempted:true,persistence_receipt:receiptValue,requester_authentication_id:requesterId,provider_authentication_id:providerId,transaction_id:plan.transaction.transaction_id,after_acceptance_state_id:plan.afterAcceptance.state_id,after_payment_state_id:plan.afterPayment.state_id,authority:appliedAuthority()}; }

function readJson(file:string):unknown { const resolved=path.resolve(file);const s=fs.lstatSync(resolved);assertCondition(s.isFile()&&!s.isSymbolicLink(),"regular non-symlink JSON required");assertCondition(s.size<=MAX_JSON_BYTES,"JSON too large");return JSON.parse(fs.readFileSync(resolved,"utf8")) as unknown; }
function usage():never{return fail(["usage:","  tsx scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.ts execute <input.json> <catalog.json>"].join("\n"));}
function main():void { const [mode,inputPath,catalogPath,...extra]=process.argv.slice(2);assertCondition(extra.length===0,"unexpected arguments");if(mode!=="execute"||!inputPath||!catalogPath)usage();const result=executeAuthenticatedPaidWorkActivationPersistenceV1(readJson(inputPath),readJson(catalogPath));process.stdout.write(`${JSON.stringify(result,null,2)}\n`); }
if(import.meta.url===pathToFileURL(process.argv[1]??"").href) main();
