"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("node:crypto");
var fs = require("node:fs");
function fail(message) {
    console.error(message);
    process.exit(1);
}
if (process.argv.length > 3 || process.argv[2] === '') {
    fail('usage: node scripts/keygen.js [OUTPUT]');
}
var out = process.argv[2] || '.nodekey';
var pem = crypto.generateKeyPairSync('ed25519').privateKey.export({
    type: 'pkcs8',
    format: 'pem',
});
var fd;
var createdIdentity;
try {
    fd = fs.openSync(out, fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_NOFOLLOW, 384);
    var stat = fs.fstatSync(fd, { bigint: true });
    if (!stat.isFile() || stat.nlink !== 1n) {
        throw new Error('keygen_output_identity_invalid');
    }
    createdIdentity = { dev: stat.dev, ino: stat.ino };
    fs.fchmodSync(fd, 384);
    fs.writeFileSync(fd, pem);
    fs.fsyncSync(fd);
}
catch (error) {
    if (fd !== undefined) {
        try {
            fs.closeSync(fd);
        }
        catch (_a) {
            // Best-effort close before bounded cleanup below.
        }
        fd = undefined;
    }
    if (createdIdentity) {
        try {
            var visible = fs.lstatSync(out, { bigint: true });
            if (visible.dev === createdIdentity.dev &&
                visible.ino === createdIdentity.ino &&
                visible.nlink === 1n) {
                fs.unlinkSync(out);
            }
        }
        catch (_b) {
            // Never remove an unverified replacement generation.
        }
    }
    var code = typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : 'UNKNOWN';
    fail(code === 'EEXIST' || code === 'ELOOP'
        ? 'keygen_refused_existing_target'
        : "keygen_failed:".concat(code));
}
finally {
    if (fd !== undefined)
        fs.closeSync(fd);
}
console.log('wrote', out);
