import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
function fail(message) {
    console.error(message);
    process.exit(1);
}
if (process.argv.length > 3 || process.argv[2] === '') {
    fail('usage: node scripts/keygen.js [OUTPUT]');
}
const out = process.argv[2] || '.nodekey';
const pem = crypto.generateKeyPairSync('ed25519').privateKey.export({
    type: 'pkcs8',
    format: 'pem',
});
let fd;
try {
    fd = fs.openSync(out, fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_NOFOLLOW, 0o600);
    const stat = fs.fstatSync(fd, { bigint: true });
    if (!stat.isFile() || stat.nlink !== 1n) {
        throw new Error('keygen_output_identity_invalid');
    }
    fs.fchmodSync(fd, 0o600);
    fs.writeFileSync(fd, pem);
    fs.fsyncSync(fd);
}
catch (error) {
    if (fd !== undefined) {
        try {
            fs.closeSync(fd);
        }
        catch {
            // Best-effort close before bounded cleanup below.
        }
        fd = undefined;
    }
    // Do not unlink by pathname after creation. An lstat -> unlink check cannot
    // atomically bind the directory entry against a same-directory replacement.
    // Leave the private 0600 generation in place fail-closed for explicit
    // operator disposition.
    const code = typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : 'UNKNOWN';
    fail(code === 'EEXIST' || code === 'ELOOP'
        ? 'keygen_refused_existing_target'
        : `keygen_failed:${code}`);
}
finally {
    if (fd !== undefined)
        fs.closeSync(fd);
}
console.log('wrote', out);
