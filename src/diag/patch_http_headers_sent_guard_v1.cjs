(function voidHttpHeadersSentGuardV1(){
  try{
    const G = globalThis;
    if (G.__void_http_headers_sent_guard_v1) return;
    G.__void_http_headers_sent_guard_v1 = 1;

    const http = require("node:http");
    const msgProto = (http && http.OutgoingMessage && http.OutgoingMessage.prototype) || null;
    if (!msgProto) return;

    const origSetHeader = msgProto.setHeader;
    const origWriteHead = msgProto.writeHead;

    function onceLog(self, msg){
      try{
        if (!self || typeof self !== "object") return;
        if (self.__void_hsg_v1_logged) return;
        self.__void_hsg_v1_logged = 1;
        console.error(msg);
      }catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_HTTP_HEADERS_SENT_GUARD_V1_CJS_1_1_VISIBLE", __void_diag_pack4_err); }
    }

    if (typeof origSetHeader === "function") {
      msgProto.setHeader = function(name, value){
        try{
          // If headers already sent, do nothing (prevents fatal throw)
          if (this && this.headersSent) {
            onceLog(this, `[headerssent-guard.v1] setHeader(${String(name)}) after headersSent -> ignored`);
            return this;
          }
          return origSetHeader.call(this, name, value);
        }catch(e){
          const code = e && (e.code || e.name);
          if (code === "ERR_HTTP_HEADERS_SENT") {
            onceLog(this, `[headerssent-guard.v1] ERR_HTTP_HEADERS_SENT in setHeader(${String(name)}) -> swallowed`);
            return this;
          }
          throw e;
        }
      };
    }

    if (typeof origWriteHead === "function") {
      msgProto.writeHead = function(statusCode, reasonPhrase, headers){
        try{
          if (this && this.headersSent) {
            onceLog(this, `[headerssent-guard.v1] writeHead(${String(statusCode)}) after headersSent -> ignored`);
            return this;
          }
          return origWriteHead.apply(this, arguments);
        }catch(e){
          const code = e && (e.code || e.name);
          if (code === "ERR_HTTP_HEADERS_SENT") {
            onceLog(this, `[headerssent-guard.v1] ERR_HTTP_HEADERS_SENT in writeHead -> swallowed`);
            return this;
          }
          throw e;
        }
      };
    }

    try{ console.error("[headerssent-guard.v1] installed"); }catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_HTTP_HEADERS_SENT_GUARD_V1_CJS_1_2_VISIBLE", __void_diag_pack4_err); }
  }catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_HTTP_HEADERS_SENT_GUARD_V1_CJS_1_3_VISIBLE", __void_diag_pack4_err); }
})();
