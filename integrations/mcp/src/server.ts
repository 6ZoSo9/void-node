import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import {
  VoidMcpBridge,
  type BridgeJson,
  type PreparePaidWorkInput,
  type SubmitPaidWorkInput,
  type VoidMcpBridgeApi,
} from "./bridge.js";
import type { VoidMcpConfig } from "./config.js";
import { prettyJson, safeErrorMessage } from "./json.js";

const SERVICE_ID = "void.datanet.fetch-verify.v1" as const;
const ISO_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const AGENT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const OUTPUT_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const ASSET_PATTERN = /^[A-Z][A-Z0-9._:-]{0,31}$/;
const AMOUNT_PATTERN =
  /^(?:0|[1-9]\d{0,31})(?:\.\d{1,18})?$/;
const NONCE_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function trimmedString(
  minimum: number,
  maximum: number,
  label: string,
) {
  return z.string()
    .min(minimum)
    .max(maximum)
    .refine((value: string) => value === value.trim(), {
      message: `${label} must be trimmed`,
    });
}

const isoUtc = trimmedString(20, 20, "timestamp")
  .regex(ISO_UTC_PATTERN, "must use YYYY-MM-DDTHH:MM:SSZ")
  .refine((value: string) => Number.isFinite(Date.parse(value)), {
    message: "must be a real UTC timestamp",
  });

const callbackUri = trimmedString(12, 2048, "callback_uri")
  .refine((value: string) => {
    if (!value.startsWith("https://") || value.includes("#")) {
      return false;
    }
    try {
      const parsed = new URL(value);
      return (
        parsed.protocol === "https:"
        && !parsed.username
        && !parsed.password
        && !parsed.hash
      );
    } catch {
      return false;
    }
  }, {
    message:
      "must use lowercase HTTPS with no credentials or fragment",
  });

function uniqueStringArray(
  maximumItems: number,
  maximumLength: number,
  label: string,
) {
  return z.array(
    trimmedString(1, maximumLength, `${label} item`),
  )
    .min(1)
    .max(maximumItems)
    .refine((values: string[]) => new Set(values).size === values.length, {
      message: `${label} must contain unique values`,
    });
}

const prepareShape = {
  service_id: z.literal(SERVICE_ID),
  created_at_utc: isoUtc,
  expires_at_utc: isoUtc,
  requester_agent_id: trimmedString(
    3,
    128,
    "requester_agent_id",
  ).regex(
    AGENT_ID_PATTERN,
    "requester_agent_id contains unsupported characters",
  ),
  callback_uri: callbackUri,
  objective: trimmedString(1, 4000, "objective"),
  input_refs: uniqueStringArray(64, 2048, "input_refs"),
  expected_outputs: uniqueStringArray(
    64,
    256,
    "expected_outputs",
  ).refine(
    (values: string[]) =>
      values.every((value: string) => OUTPUT_PATTERN.test(value)),
    {
      message:
        "expected_outputs must contain machine-safe labels",
    },
  ),
  quote_asset: trimmedString(1, 32, "quote_asset")
    .regex(ASSET_PATTERN, "quote_asset is invalid"),
  max_total: trimmedString(1, 51, "max_total")
    .regex(
      AMOUNT_PATTERN,
      "max_total must be a canonical decimal amount",
    ),
  max_runtime_seconds: z.number().int().min(1).max(86_400),
  max_output_bytes: z.number().int().min(1).max(100_000_000),
  order_nonce: trimmedString(8, 128, "order_nonce")
    .regex(
      NONCE_PATTERN,
      "order_nonce contains unsupported characters",
    ),
  submission_nonce: trimmedString(8, 128, "submission_nonce")
    .regex(
      NONCE_PATTERN,
      "submission_nonce contains unsupported characters",
    ),
};

function enforceTimeOrder(
  value: {
    created_at_utc: string;
    expires_at_utc: string;
  },
  context: z.RefinementCtx,
): void {
  if (
    Date.parse(value.expires_at_utc)
    <= Date.parse(value.created_at_utc)
  ) {
    context.addIssue({
      code: "custom",
      path: ["expires_at_utc"],
      message: "expires_at_utc must be later than created_at_utc",
    });
  }
}

export const PreparePaidWorkSchema = z
  .object(prepareShape)
  .strict()
  .superRefine(enforceTimeOrder);

export const SubmitPaidWorkSchema = z
  .object({
    ...prepareShape,
    confirm: z.literal("submit-paid-work"),
    expect_new: z.boolean().default(false),
  })
  .strict()
  .superRefine(enforceTimeOrder);

function toolSuccess(value: BridgeJson) {
  return {
    content: [
      {
        type: "text" as const,
        text: prettyJson(value),
      },
    ],
    structuredContent: value,
  };
}

function toolFailure(
  error: unknown,
  config: VoidMcpConfig,
) {
  const secrets =
    config.tokenFile === null ? [] : [config.tokenFile];
  return {
    content: [
      {
        type: "text" as const,
        text: safeErrorMessage(error, secrets),
      },
    ],
    isError: true as const,
  };
}

async function guardedTool(
  config: VoidMcpConfig,
  callback: () => Promise<BridgeJson>,
) {
  try {
    return toolSuccess(await callback());
  } catch (error) {
    return toolFailure(error, config);
  }
}

function registerResources(
  server: McpServer,
  bridge: VoidMcpBridgeApi,
): void {
  server.registerResource(
    "void-mainnet0-discovery",
    "void://mainnet0/discovery",
    {
      title: "VOID Mainnet-0 Agent Discovery",
      description:
        "Live read-only VOID agent discovery through the repository's hardened bootstrap client.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: prettyJson(await bridge.bootstrapNetwork()),
        },
      ],
    }),
  );

  server.registerResource(
    "void-agent-service-catalog",
    "void://agent/service-catalog",
    {
      title: "VOID Public Agent Service Catalog",
      description:
        "The locally committed, fingerprint-verified descriptive VOID agent service catalog.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: prettyJson(await bridge.serviceCatalog()),
        },
      ],
    }),
  );

  server.registerResource(
    "void-agent-capability-status",
    "void://agent/capability-status",
    {
      title: "VOID MCP Capability Boundary",
      description:
        "An honest projection of active, guarded, and unavailable VOID agent capabilities.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: prettyJson(await bridge.capabilityStatus()),
        },
      ],
    }),
  );
}

function registerDefaultTools(
  server: McpServer,
  config: VoidMcpConfig,
  bridge: VoidMcpBridgeApi,
): void {
  server.registerTool(
    "void_bootstrap_network",
    {
      title: "Bootstrap VOID Network",
      description:
        "Read and verify VOID's public agent discovery surfaces. GET-only; no credentials or mutation.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => await guardedTool(
      config,
      async () => await bridge.bootstrapNetwork(),
    ),
  );

  server.registerTool(
    "void_probe_paid_work",
    {
      title: "Probe VOID Paid-Work Intake",
      description:
        "Read-only probe of the authenticated paid-work intake boundary. Sends no request body or credentials.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => await guardedTool(
      config,
      async () => await bridge.probePaidWork(),
    ),
  );

  server.registerTool(
    "void_prepare_paid_work_submission",
    {
      title: "Prepare VOID Paid-Work Submission",
      description:
        "Deterministically materialize a catalog-bound VOID paid-work submission without sending it.",
      inputSchema: PreparePaidWorkSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => await guardedTool(
      config,
      async () =>
        await bridge.preparePaidWorkSubmission(
          input as PreparePaidWorkInput,
        ),
    ),
  );
}

function registerSubmitTool(
  server: McpServer,
  config: VoidMcpConfig,
  bridge: VoidMcpBridgeApi,
): void {
  server.registerTool(
    "void_submit_paid_work",
    {
      title: "Submit VOID Paid-Work Request",
      description:
        "Send one authenticated catalog-bound request. Success means accepted for review only; it does not mean paid, executing, completed, credited, or settled.",
      inputSchema: SubmitPaidWorkSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => await guardedTool(
      config,
      async () =>
        await bridge.submitPaidWork(
          input as SubmitPaidWorkInput,
        ),
    ),
  );
}

export function buildVoidMcpServer(
  config: VoidMcpConfig,
  bridge: VoidMcpBridgeApi = new VoidMcpBridge(config),
): McpServer {
  const server = new McpServer({
    name: "void-agent-mcp-bridge-v1",
    version: "0.1.0",
  });
  registerResources(server, bridge);
  registerDefaultTools(server, config, bridge);
  if (config.allowSubmit) {
    registerSubmitTool(server, config, bridge);
  }
  return server;
}
