#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EARN_MAX_RESPONSE_BYTES,
  EARN_REQUEST_TIMEOUT_MS,
  clearEarnViewV1,
} from "../public/void-app-wave1-v1/assets/js/earn-live.js";

assert.equal(EARN_MAX_RESPONSE_BYTES,128*1024);
assert.equal(EARN_REQUEST_TIMEOUT_MS,7_000);

let generation=7;
const pendingGeneration=generation;
let clearReason="";
const removed=[];
let resetCount=0;
let focusCount=0;
const input={
  value:"account-A",
  focus:()=>{focusCount+=1;},
};
const button={disabled:true};

clearEarnViewV1({
  invalidate:(reason)=>{
    clearReason=reason;
    generation+=1;
  },
  storage:{
    removeItem:(key)=>removed.push(key),
  },
  input,
  button,
  reset:()=>{resetCount+=1;},
});

assert.equal(generation,pendingGeneration+1);
assert.equal(clearReason,"earn cleared");
assert.deepEqual(removed,["void.ui.wave4.earn.account.v1"]);
assert.equal(input.value,"");
assert.equal(resetCount,1);
assert.equal(button.disabled,false);
assert.equal(focusCount,1);

const client=fs.readFileSync(
  "public/void-app-wave1-v1/assets/js/earn-live.js",
  "utf8",
);

assert.equal(client.split("fetch(").length-1,0);
assert.equal(client.split("earnRequestOwner.run(").length-1,1);

for(const marker of [
  "MAX_NETWORK_RESPONSE_BYTES",
  "createNetworkRequestOwnerV1",
  "readBoundedNetworkJsonV1",
  "const earnRequestOwner = createNetworkRequestOwnerV1()",
  "let requestSerial = 0",
  "let earnViewPresent = false",
  "const serial = ++requestSerial",
  "earnRequestOwner.cancel('earn request replaced')",
  "const route = \`${EARN_ENDPOINT}?account=${encodeURIComponent(value)}\`",
  "const expectedUrl = new URL(route, window.location.origin).href",
  "redirect: 'error'",
  "mode: 'same-origin'",
  "referrerPolicy: 'no-referrer'",
  "credentials: 'same-origin'",
  "AbortSignal.timeout(EARN_REQUEST_TIMEOUT_MS)",
  "response.url !== expectedUrl",
  "Earn adapter final URL mismatch",
  "Earn adapter content type mismatch",
  "readBoundedNetworkJsonV1(",
  "serial !== requestSerial || currentRoute() !== 'earn'",
  "serial === requestSerial && currentRoute() === 'earn'",
  "invalidateEarnRequest('earn route left')",
  "invalidateEarnRequest('earn view removed')",
  "export const clearEarnViewV1 =",
  "clearEarnViewV1({ input, button });",
]){
  assert.ok(client.includes(marker),`missing Earn transport boundary: ${marker}`);
}

for(const forbidden of [
  "await response.json()",
  "redirect: 'follow'",
  "credentials: 'include'",
]){
  assert.equal(
    client.includes(forbidden),
    false,
    `legacy or widened Earn transport seam remains: ${forbidden}`,
  );
}

const staleSuccessGate=client.indexOf(
  "if (serial !== requestSerial || currentRoute() !== 'earn') return;",
);
const renderIndex=client.indexOf(
  "renderEarn(checked, value, requestStartedAtMs);",
);
const storageIndex=client.indexOf(
  "sessionStorage.setItem(EARN_ACCOUNT_STORAGE_KEY, value);",
);
assert.ok(staleSuccessGate>=0);
assert.ok(renderIndex>staleSuccessGate);
assert.ok(storageIndex>renderIndex);

const catchIndex=client.indexOf("} catch (error) {",renderIndex);
const staleFailureGate=client.indexOf(
  "if (serial !== requestSerial || currentRoute() !== 'earn') return;",
  catchIndex,
);
const errorRenderIndex=client.indexOf("renderError(",staleFailureGate);
assert.ok(catchIndex>renderIndex);
assert.ok(staleFailureGate>catchIndex);
assert.ok(errorRenderIndex>staleFailureGate);

console.log("VOID_UI_WAVE4_EARN_TRANSPORT_BOUNDARY_V1_GREEN");
console.log("shared_request_owner=true");
console.log("response_body_max_bytes=131072");
console.log("request_timeout_ms=7000");
console.log("redirects_rejected=true");
console.log("final_url_exact=true");
console.log("content_type_json_required=true");
console.log("bounded_response_reader=true");
console.log("replacement_invalidates_prior_generation=true");
console.log("clear_invalidates_prior_generation=true");
console.log("route_departure_invalidates_prior_generation=true");
console.log("stale_success_dom_session_mutation=false");
console.log("stale_failure_dom_mutation=false");
console.log("underlying_source_direct_fetch=false");
console.log("authority_added=false");
