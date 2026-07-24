// VOID_BUY_VOID_REQUEST_TX_HASH_BINDING_V1

type LocalOnly = (req: any, res: any) => boolean;
type ReadRequests = () => Promise<any[]>;
type PersistRequest = (request: any) => Promise<any>;

export function installBuyVoidRequestTxHashBindingV1(input: {
  app: any;
  localOnly: LocalOnly;
  readRequests: ReadRequests;
  persistRequest: PersistRequest;
}): void {
  const {
    app,
    localOnly,
    readRequests,
    persistRequest,
  } = input;

  app.get(
    "/__void/buy-void/operator/request.json",
    async (req: any, res: any) => {
      if (!localOnly(req, res)) return;

      const id = String(
        (req.query || {}).id || "",
      ).trim();
      const requests = await readRequests();
      const found = requests.find(
        (request: any) =>
          String(request.request_id || "") === id,
      );

      if (!found) {
        return res.status(404).json({
          schema: "void_buy_void_operator_request_v1",
          ok: false,
          error: "buy_void_request_not_found",
          request_id: id,
        });
      }

      return res.json({
        schema: "void_buy_void_operator_request_v1",
        ok: true,
        local_only: true,
        request: found,
      });
    },
  );

  app.get(
    "/__void/buy-void/operator/request/tx-hash.json",
    async (req: any, res: any) => {
      if (!localOnly(req, res)) return;

      return res.status(405).json({
        schema:
          "void_buy_void_request_tx_hash_binding_v1",
        ok: false,
        error: "method_not_allowed",
        required_method: "POST",
        required_confirmation:
          "bindBuyVoidPaymentTxHash",
      });
    },
  );

  app.post(
    "/__void/buy-void/operator/request/tx-hash.json",
    async (req: any, res: any) => {
      if (!localOnly(req, res)) return;

      try {
        const body = (req.body || {}) as any;
        const id = String(
          body.id || body.request_id || "",
        ).trim();
        const tx_hash = String(
          body.tx_hash
            || body.payment_tx_hash
            || "",
        ).trim();
        const confirm = String(
          body.confirm
            || body.confirmation
            || "",
        ).trim();
        const required_confirmation =
          "bindBuyVoidPaymentTxHash";

        if (confirm !== required_confirmation) {
          return res.status(428).json({
            schema:
              "void_buy_void_request_tx_hash_binding_v1",
            ok: false,
            error: "confirmation_required",
            required_confirmation,
            request_id: id,
          });
        }

        if (
          !id
          || !/^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/.test(
            id,
          )
        ) {
          return res.status(400).json({
            schema:
              "void_buy_void_request_tx_hash_binding_v1",
            ok: false,
            error: "invalid_request_id",
            request_id: id,
          });
        }

        if (!/^0x[a-fA-F0-9]{64}$/.test(tx_hash)) {
          return res.status(400).json({
            schema:
              "void_buy_void_request_tx_hash_binding_v1",
            ok: false,
            error: "invalid_payment_tx_hash",
            request_id: id,
            tx_hash,
          });
        }

        const requests = await readRequests();
        const found = requests.find(
          (request: any) =>
            String(request.request_id || "") === id,
        );

        if (!found) {
          return res.status(404).json({
            schema:
              "void_buy_void_request_tx_hash_binding_v1",
            ok: false,
            error: "buy_void_request_not_found",
            request_id: id,
          });
        }

        const existing_tx_hash = String(
          found.tx_hash || "",
        ).trim();
        const existing_status = String(
          found.status || "",
        ).trim();

        if (existing_tx_hash) {
          if (
            existing_tx_hash.toLowerCase()
              === tx_hash.toLowerCase()
            && existing_status
              === "payment_submitted_pending_manual_review"
          ) {
            return res.json({
              schema:
                "void_buy_void_request_tx_hash_binding_v1",
              ok: true,
              local_only: true,
              idempotent: true,
              request: found,
            });
          }

          return res.status(409).json({
            schema:
              "void_buy_void_request_tx_hash_binding_v1",
            ok: false,
            error:
              "request_payment_tx_hash_conflict",
            request_id: id,
            existing_tx_hash,
            submitted_tx_hash: tx_hash,
          });
        }

        const duplicate = requests.find(
          (request: any) =>
            String(request.request_id || "") !== id
            && String(request.tx_hash || "")
              .trim()
              .toLowerCase()
              === tx_hash.toLowerCase(),
        );

        if (duplicate) {
          return res.status(409).json({
            schema:
              "void_buy_void_request_tx_hash_binding_v1",
            ok: false,
            error: "payment_tx_hash_already_bound",
            request_id: id,
            conflicting_request_id: String(
              duplicate.request_id || "",
            ),
            tx_hash,
          });
        }

        if (
          existing_status
          !== "awaiting_payment_tx_hash"
        ) {
          return res.status(409).json({
            schema:
              "void_buy_void_request_tx_hash_binding_v1",
            ok: false,
            error:
              "request_not_awaiting_payment_tx_hash",
            request_id: id,
            current_status: existing_status,
          });
        }

        const updated = {
          ...found,
          status:
            "payment_submitted_pending_manual_review",
          tx_hash,
          payment_submitted_at_ms: Date.now(),
        };

        const persisted = await persistRequest(
          updated,
        );

        return res.json({
          schema:
            "void_buy_void_request_tx_hash_binding_v1",
          ok: true,
          local_only: true,
          idempotent: false,
          prior_status: existing_status,
          request: updated,
          persisted,
        });
      } catch (error: any) {
        return res.status(500).json({
          schema:
            "void_buy_void_request_tx_hash_binding_v1",
          ok: false,
          error: String(
            error?.message || error,
          ),
        });
      }
    },
  );
}
