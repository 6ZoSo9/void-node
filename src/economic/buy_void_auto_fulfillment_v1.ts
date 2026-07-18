import crypto from "node:crypto";

export const VOID_BUY_VOID_AUTO_FULFILLMENT_V1 =
  "VOID_BUY_VOID_AUTO_FULFILLMENT_V1";

export const VOID_BUY_VOID_AUTO_FULFILLMENT_AUTHORITY_V1 = {
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  filesystem_write: false,
  money_movement: false,
} as const;

const HEX_32 = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const CHAIN = /^[a-z0-9][a-z0-9_-]{1,31}$/;

export type BuyVoidRequestV1 = {
  request_id: string;
  source_chain: string;
  tx_hash: string;
  delivery_address: string;
  receive_address: string;
  usdc_amount: string | number;
  quoted_void: string | number;
};

export type BuyVoidVerifiedPaymentEventV1 = {
  request_id: string;
  operator_status: string;
  payment_verified: boolean;
  tx_hash: string;
  payment_verifier?: {
    chain?: string;
    transaction_hash?: string;
    log_index?: string | number;
    block_number?: string | number;
    confirmations?: string | number;
    usdc_contract?: string;
    from_address?: string;
    receive_address?: string;
    delivery_address?: string;
    amount_units?: string | number;
    requested_units?: string | number;
  };
};

export type BuyVoidAutoFulfillmentPolicyV1 = {
  automatic_fulfillment_enabled: boolean;
  allowed_chains: string[];
  min_confirmations_by_chain: Record<string, number>;
  usdc_contract_by_chain: Record<string, string>;
  receive_address_by_chain: Record<string, string>;
  rate_void_units_numerator: string | number;
  rate_void_units_denominator: string | number;
  pool_remaining_void_units: string | number;
  exact_payment_required: true;
};

export type BuyVoidUnsignedFulfillmentInstructionV1 = {
  schema: "void_buy_void_unsigned_fulfillment_instruction_v1";
  marker: typeof VOID_BUY_VOID_AUTO_FULFILLMENT_V1;
  instruction_id: string;
  request_id: string;
  canonical_payment_identity: string;
  source_chain: string;
  payment_transaction_hash: string;
  payment_log_index: string;
  confirmed_block_number: string;
  confirmation_count: string;
  payment_usdc_units: string;
  delivery_address: string;
  void_amount_units: string;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  automatic_execution_authorized: false;
};

export type BuyVoidFulfillmentClaimV1 = {
  schema: "void_buy_void_fulfillment_claim_v1";
  marker: typeof VOID_BUY_VOID_AUTO_FULFILLMENT_V1;
  canonical_payment_identity: string;
  canonical_payment_identity_sha256: string;
  request_id: string;
  decision_fingerprint: string;
  instruction_id: string;
  unsigned_instruction: BuyVoidUnsignedFulfillmentInstructionV1;
  status: "claimed";
};

export type BuyVoidAutoFulfillmentDecisionV1 =
  | {
      ok: true;
      status: "approved";
      duplicate: false;
      new_claim: true;
      claim: BuyVoidFulfillmentClaimV1;
      instruction: BuyVoidUnsignedFulfillmentInstructionV1;
    }
  | {
      ok: true;
      status: "duplicate";
      duplicate: true;
      new_claim: false;
      claim: BuyVoidFulfillmentClaimV1;
      instruction: BuyVoidUnsignedFulfillmentInstructionV1;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      new_claim: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type BuyVoidAutoFulfillmentInputV1 = {
  request: BuyVoidRequestV1;
  verified_payment_event: BuyVoidVerifiedPaymentEventV1;
  policy: BuyVoidAutoFulfillmentPolicyV1;
  prior_claims?: BuyVoidFulfillmentClaimV1[];
};

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidAutoFulfillmentDecisionV1 {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    new_claim: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeChain(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  return CHAIN.test(chain) ? chain : "";
}

function normalizeHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  return HEX_32.test(hash) ? hash : "";
}

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }

  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;

  try {
    if (/^0x[0-9a-f]+$/.test(raw)) {
      const n = BigInt(raw);
      return n >= 0n ? n : null;
    }
    if (/^[0-9]+$/.test(raw)) {
      const n = BigInt(raw);
      return n >= 0n ? n : null;
    }
  } catch {
    return null;
  }

  return null;
}

function decimalToUnits(value: unknown, decimals = 6): bigint | null {
  const raw = String(value ?? "").trim();
  if (!raw || !/^[0-9]+(?:\.[0-9]+)?$/.test(raw)) return null;

  const [whole, fraction = ""] = raw.split(".");
  if (fraction.length > decimals) return null;

  try {
    const padded = fraction.padEnd(decimals, "0");
    return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
  } catch {
    return null;
  }
}

function stableFingerprint(parts: Record<string, string>): string {
  const ordered = Object.keys(parts)
    .sort()
    .map((key) => `${key}=${parts[key]}`)
    .join("\n");
  return sha256Hex(ordered);
}

export function canonicalBuyVoidPaymentIdentityV1(input: {
  source_chain: unknown;
  payment_transaction_hash: unknown;
  payment_log_index: unknown;
}): string {
  const chain = normalizeChain(input.source_chain);
  const txHash = normalizeHash(input.payment_transaction_hash);
  const logIndex = parseNonNegativeInteger(input.payment_log_index);

  if (!chain) throw new Error("invalid_source_chain");
  if (!txHash) throw new Error("invalid_payment_transaction_hash");
  if (logIndex === null) throw new Error("invalid_payment_log_index");

  return `voidpay1:${chain}:${txHash}:${logIndex.toString()}`;
}

export function decideBuyVoidAutoFulfillmentV1(
  input: BuyVoidAutoFulfillmentInputV1,
): BuyVoidAutoFulfillmentDecisionV1 {
  const request = input?.request;
  const event = input?.verified_payment_event;
  const policy = input?.policy;
  const priorClaims = Array.isArray(input?.prior_claims) ? input.prior_claims : [];

  if (!request || !event || !policy) return held("missing_input");
  if (policy.automatic_fulfillment_enabled !== true) {
    return held("automatic_fulfillment_disabled");
  }
  if (policy.exact_payment_required !== true) {
    return held("exact_payment_policy_required");
  }

  const requestId = String(request.request_id || "").trim();
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(requestId)) {
    return held("invalid_request_id");
  }
  if (String(event.request_id || "").trim() !== requestId) {
    return held("request_event_mismatch");
  }
  if (
    String(event.operator_status || "").trim().toLowerCase() !==
      "payment_verified" ||
    event.payment_verified !== true
  ) {
    return held("payment_not_verified");
  }

  const verifier = event.payment_verifier;
  if (!verifier || typeof verifier !== "object") {
    return held("missing_payment_verifier");
  }

  const requestChain = normalizeChain(request.source_chain);
  const eventChain = normalizeChain(verifier.chain);
  if (!requestChain || !eventChain || requestChain !== eventChain) {
    return held("source_chain_mismatch");
  }

  const allowedChains = new Set(
    (policy.allowed_chains || []).map(normalizeChain).filter(Boolean),
  );
  if (!allowedChains.has(eventChain)) return held("source_chain_not_allowlisted");

  const requestTxHash = normalizeHash(request.tx_hash);
  const eventTxHash = normalizeHash(
    verifier.transaction_hash || event.tx_hash,
  );
  const outerEventTxHash = normalizeHash(event.tx_hash);
  if (!requestTxHash || !eventTxHash || !outerEventTxHash) {
    return held("invalid_payment_transaction_hash");
  }
  if (requestTxHash !== eventTxHash || eventTxHash !== outerEventTxHash) {
    return held("payment_transaction_hash_mismatch");
  }

  const logIndex = parseNonNegativeInteger(verifier.log_index);
  if (logIndex === null) return held("missing_payment_log_index");

  const blockNumber = parseNonNegativeInteger(verifier.block_number);
  if (blockNumber === null || blockNumber <= 0n) {
    return held("missing_confirmed_block_number");
  }

  const confirmations = parseNonNegativeInteger(verifier.confirmations);
  if (confirmations === null) return held("missing_confirmation_count");

  const requiredConfirmations = Number(
    policy.min_confirmations_by_chain?.[eventChain],
  );
  if (
    !Number.isSafeInteger(requiredConfirmations) ||
    requiredConfirmations < 1
  ) {
    return held("invalid_confirmation_policy");
  }
  if (confirmations < BigInt(requiredConfirmations)) {
    return held("insufficient_confirmations", {
      confirmations: confirmations.toString(),
      required_confirmations: String(requiredConfirmations),
    });
  }

  const requestDeliveryAddress = normalizeAddress(request.delivery_address);
  const verifierDeliveryAddress = normalizeAddress(verifier.delivery_address);
  const payerAddress = normalizeAddress(verifier.from_address);
  if (
    !requestDeliveryAddress ||
    requestDeliveryAddress !== verifierDeliveryAddress ||
    requestDeliveryAddress !== payerAddress
  ) {
    return held("delivery_address_binding_mismatch");
  }

  const requestReceiveAddress = normalizeAddress(request.receive_address);
  const verifierReceiveAddress = normalizeAddress(verifier.receive_address);
  const policyReceiveAddress = normalizeAddress(
    policy.receive_address_by_chain?.[eventChain],
  );
  if (
    !requestReceiveAddress ||
    !verifierReceiveAddress ||
    !policyReceiveAddress ||
    requestReceiveAddress !== verifierReceiveAddress ||
    verifierReceiveAddress !== policyReceiveAddress
  ) {
    return held("receive_address_binding_mismatch");
  }

  const verifierUsdcContract = normalizeAddress(verifier.usdc_contract);
  const policyUsdcContract = normalizeAddress(
    policy.usdc_contract_by_chain?.[eventChain],
  );
  if (
    !verifierUsdcContract ||
    !policyUsdcContract ||
    verifierUsdcContract !== policyUsdcContract
  ) {
    return held("usdc_contract_mismatch");
  }

  const requestUsdcUnits = decimalToUnits(request.usdc_amount, 6);
  const requestVoidUnits = decimalToUnits(request.quoted_void, 6);
  const verifiedAmountUnits = parseNonNegativeInteger(verifier.amount_units);
  const verifierRequestedUnits = parseNonNegativeInteger(
    verifier.requested_units,
  );
  if (
    requestUsdcUnits === null ||
    requestUsdcUnits <= 0n ||
    requestVoidUnits === null ||
    requestVoidUnits <= 0n ||
    verifiedAmountUnits === null ||
    verifierRequestedUnits === null
  ) {
    return held("invalid_amount_shape");
  }
  if (verifierRequestedUnits !== requestUsdcUnits) {
    return held("requested_amount_binding_mismatch");
  }
  if (verifiedAmountUnits !== verifierRequestedUnits) {
    return held("exact_payment_required", {
      verified_amount_units: verifiedAmountUnits.toString(),
      requested_amount_units: verifierRequestedUnits.toString(),
    });
  }

  const rateNumerator = parseNonNegativeInteger(
    policy.rate_void_units_numerator,
  );
  const rateDenominator = parseNonNegativeInteger(
    policy.rate_void_units_denominator,
  );
  if (
    rateNumerator === null ||
    rateNumerator <= 0n ||
    rateDenominator === null ||
    rateDenominator <= 0n
  ) {
    return held("invalid_rate_policy");
  }

  const scaled = verifiedAmountUnits * rateNumerator;
  if (scaled % rateDenominator !== 0n) {
    return held("rate_produces_fractional_void_unit");
  }

  const expectedVoidUnits = scaled / rateDenominator;
  if (expectedVoidUnits !== requestVoidUnits) {
    return held("quoted_void_rate_mismatch", {
      quoted_void_units: requestVoidUnits.toString(),
      expected_void_units: expectedVoidUnits.toString(),
    });
  }

  const remainingVoidUnits = parseNonNegativeInteger(
    policy.pool_remaining_void_units,
  );
  if (remainingVoidUnits === null) return held("invalid_inventory_policy");
  if (expectedVoidUnits > remainingVoidUnits) {
    return held("insufficient_void_inventory", {
      required_void_units: expectedVoidUnits.toString(),
      remaining_void_units: remainingVoidUnits.toString(),
    });
  }

  let canonicalPaymentIdentity = "";
  try {
    canonicalPaymentIdentity = canonicalBuyVoidPaymentIdentityV1({
      source_chain: eventChain,
      payment_transaction_hash: eventTxHash,
      payment_log_index: logIndex,
    });
  } catch (error) {
    return held("invalid_canonical_payment_identity", {
      message: String((error as Error)?.message || error),
    });
  }

  const decisionFingerprint = stableFingerprint({
    request_id: requestId,
    canonical_payment_identity: canonicalPaymentIdentity,
    source_chain: eventChain,
    payment_transaction_hash: eventTxHash,
    payment_log_index: logIndex.toString(),
    confirmed_block_number: blockNumber.toString(),
    confirmation_count: confirmations.toString(),
    usdc_contract: verifierUsdcContract,
    payer_address: payerAddress,
    receive_address: verifierReceiveAddress,
    delivery_address: requestDeliveryAddress,
    payment_usdc_units: verifiedAmountUnits.toString(),
    void_amount_units: expectedVoidUnits.toString(),
  });

  const paymentClaim = priorClaims.find(
    (claim) =>
      String(claim?.canonical_payment_identity || "") ===
      canonicalPaymentIdentity,
  );
  if (paymentClaim) {
    const claimedRequestId = String(paymentClaim.request_id || "");
    const claimedFingerprint = String(paymentClaim.decision_fingerprint || "");

    if (
      claimedRequestId === requestId &&
      claimedFingerprint === decisionFingerprint &&
      paymentClaim.unsigned_instruction
    ) {
      return {
        ok: true,
        status: "duplicate",
        duplicate: true,
        new_claim: false,
        claim: paymentClaim,
        instruction: paymentClaim.unsigned_instruction,
      };
    }

    if (claimedRequestId === requestId) {
      return held("payment_identity_claim_conflict", {
        canonical_payment_identity: canonicalPaymentIdentity,
        request_id: requestId,
      });
    }

    return held("payment_identity_already_claimed", {
      canonical_payment_identity: canonicalPaymentIdentity,
      claimed_request_id: claimedRequestId,
      attempted_request_id: requestId,
    });
  }

  const requestClaim = priorClaims.find(
    (claim) => String(claim?.request_id || "") === requestId,
  );
  if (requestClaim) {
    return held("request_already_claimed", {
      request_id: requestId,
      claimed_payment_identity: String(
        requestClaim.canonical_payment_identity || "",
      ),
      attempted_payment_identity: canonicalPaymentIdentity,
    });
  }

  const instructionId = `voidfill1_${sha256Hex(
    `${canonicalPaymentIdentity}\n${requestId}\n${decisionFingerprint}`,
  ).slice(0, 32)}`;

  const instruction: BuyVoidUnsignedFulfillmentInstructionV1 = {
    schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
    marker: VOID_BUY_VOID_AUTO_FULFILLMENT_V1,
    instruction_id: instructionId,
    request_id: requestId,
    canonical_payment_identity: canonicalPaymentIdentity,
    source_chain: eventChain,
    payment_transaction_hash: eventTxHash,
    payment_log_index: logIndex.toString(),
    confirmed_block_number: blockNumber.toString(),
    confirmation_count: confirmations.toString(),
    payment_usdc_units: verifiedAmountUnits.toString(),
    delivery_address: requestDeliveryAddress,
    void_amount_units: expectedVoidUnits.toString(),
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    automatic_execution_authorized: false,
  };

  const claim: BuyVoidFulfillmentClaimV1 = {
    schema: "void_buy_void_fulfillment_claim_v1",
    marker: VOID_BUY_VOID_AUTO_FULFILLMENT_V1,
    canonical_payment_identity: canonicalPaymentIdentity,
    canonical_payment_identity_sha256: sha256Hex(canonicalPaymentIdentity),
    request_id: requestId,
    decision_fingerprint: decisionFingerprint,
    instruction_id: instructionId,
    unsigned_instruction: instruction,
    status: "claimed",
  };

  return {
    ok: true,
    status: "approved",
    duplicate: false,
    new_claim: true,
    claim,
    instruction,
  };
}
