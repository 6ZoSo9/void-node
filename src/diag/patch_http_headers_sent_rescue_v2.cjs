/* patch_http_headers_sent_rescue_v2.cjs
   Goal: keep the process alive when a handler double-sends.
   - No-op express res.send/res.json if headers already sent
   - Swallow ERR_HTTP_HEADERS_SENT from setHeader/writeHead
   - Swallow uncaught ERR_HTTP_HEADERS_SENT (last resort)
*/
'use strict';

const Module = require('module');
const origLoad = Module._load;

function isHeadersSentErr(e) {
  return !!e && (e.code === 'ERR_HTTP_HEADERS_SENT' || String(e.message || '').includes('Cannot set headers after they are sent'));
}

function nowMs() { return Date.now(); }

let lastLogMs = 0;
let swallowedTotal = 0;

function logOncePerSecond(msg, extra) {
  const n = nowMs();
  if (n - lastLogMs < 1000) return;
  lastLogMs = n;
  try {
    if (extra) console.error(msg, extra);
    else console.error(msg);
  } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_HTTP_HEADERS_SENT_RESCUE_V2_CJS_1_1_VISIBLE", __void_diag_pack4_err); }
}

function patchHttpOutgoing() {
  try {
    const http = require('node:http');
    const { ServerResponse } = http;

    if (!ServerResponse || !ServerResponse.prototype) return;
    const proto = ServerResponse.prototype;

    if (!proto.__void_headerssent_v2_patched__) {
      const origSetHeader = proto.setHeader;
      const origWriteHead = proto.writeHead;

      proto.setHeader = function setHeaderWrapped(k, v) {
        try {
          return origSetHeader.call(this, k, v);
        } catch (e) {
          if (isHeadersSentErr(e) || (this && this.headersSent)) {
            swallowedTotal++;
            logOncePerSecond('[headerssent.rescue.v2] swallow setHeader (already sent)', { k });
            return this;
          }
          throw e;
        }
      };

      proto.writeHead = function writeHeadWrapped() {
        try {
          return origWriteHead.apply(this, arguments);
        } catch (e) {
          if (isHeadersSentErr(e) || (this && this.headersSent)) {
            swallowedTotal++;
            logOncePerSecond('[headerssent.rescue.v2] swallow writeHead (already sent)');
            return this;
          }
          throw e;
        }
      };

      proto.__void_headerssent_v2_patched__ = true;
      logOncePerSecond('[headerssent.rescue.v2] patched http ServerResponse');
    }
  } catch (e) {
    logOncePerSecond('[headerssent.rescue.v2] http patch failed', String(e && e.message || e));
  }
}

function patchExpressResponseModule(resp) {
  try {
    if (!resp || typeof resp !== 'object') return resp;
    if (resp.__void_headerssent_v2_patched__) return resp;

    const wrapMethod = (name) => {
      const fn = resp[name];
      if (typeof fn !== 'function') return;
      resp[name] = function wrapped() {
        try {
          if (this && (this.headersSent || this.writableEnded)) {
            swallowedTotal++;
            logOncePerSecond(`[headerssent.rescue.v2] noop res.${name} (already sent)`);
            return this;
          }
          return fn.apply(this, arguments);
        } catch (e) {
          if (isHeadersSentErr(e) || (this && this.headersSent)) {
            swallowedTotal++;
            logOncePerSecond(`[headerssent.rescue.v2] swallow res.${name} throw (already sent)`);
            return this;
          }
          throw e;
        }
      };
    };

    wrapMethod('send');
    wrapMethod('json');
    wrapMethod('end');

    resp.__void_headerssent_v2_patched__ = true;
    logOncePerSecond('[headerssent.rescue.v2] patched express/lib/response');
    return resp;
  } catch (e) {
    logOncePerSecond('[headerssent.rescue.v2] express response patch failed', String(e && e.message || e));
    return resp;
  }
}

Module._load = function(request, parent, isMain) {
  const exp = origLoad.apply(this, arguments);
  if (request === 'express/lib/response') {
    return patchExpressResponseModule(exp);
  }
  return exp;
};

process.on('uncaughtException', (e) => {
  if (isHeadersSentErr(e)) {
    swallowedTotal++;
    logOncePerSecond('[headerssent.rescue.v2] swallow uncaughtException ERR_HTTP_HEADERS_SENT');
    return;
  }
  throw e;
});

process.on('unhandledRejection', (e) => {
  if (isHeadersSentErr(e)) {
    swallowedTotal++;
    logOncePerSecond('[headerssent.rescue.v2] swallow unhandledRejection ERR_HTTP_HEADERS_SENT');
    return;
  }
});

patchHttpOutgoing();
logOncePerSecond('[headerssent.rescue.v2] installed', { pid: process.pid });
