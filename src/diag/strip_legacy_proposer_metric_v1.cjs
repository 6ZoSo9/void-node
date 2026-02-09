/* Strip legacy void_proposer_auto_enabled (and HELP/TYPE) from any text/plain metrics responses.
   Keeps void_proposer_auto_enabled_v2 intact.
*/
(function(){
  const http = require("http");
  const origWrite = http.ServerResponse.prototype.write;
  const origEnd = http.ServerResponse.prototype.end;

  function scrub(buf) {
    try {
      const s = Buffer.isBuffer(buf) ? buf.toString("utf8") : String(buf);
      // Remove HELP/TYPE + sample lines for the legacy name ONLY (not _v2)
      return s
        .replace(/^#\s*HELP\s+void_proposer_auto_enabled\b.*\n/mg, "")
        .replace(/^#\s*TYPE\s+void_proposer_auto_enabled\b.*\n/mg, "")
        .replace(/^void_proposer_auto_enabled\s+.*\n/mg, "");
    } catch {
      return buf;
    }
  }

  http.ServerResponse.prototype.write = function(chunk, encoding, cb){
    const ct = (this.getHeader("content-type") || "").toString();
    if (ct.includes("text/plain") && chunk) chunk = scrub(chunk);
    return origWrite.call(this, chunk, encoding, cb);
  };

  http.ServerResponse.prototype.end = function(chunk, encoding, cb){
    const ct = (this.getHeader("content-type") || "").toString();
    if (ct.includes("text/plain") && chunk) chunk = scrub(chunk);
    return origEnd.call(this, chunk, encoding, cb);
  };

  console.log("[strip_legacy_proposer_metric_v1] installed");
})();
