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
let createdIdentity;
try {
    fd = fs.openSync(out, fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_NOFOLLOW, 0o600);
    const stat = fs.fstatSync(fd, { bigint: true });
    if (!stat.isFile() || stat.nlink !== 1n) {
        throw new Error('keygen_output_identity_invalid');
    }
    createdIdentity = { dev: stat.dev, ino: stat.ino };
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
    if (createdIdentity) {
        try {
            const visible = fs.lstatSync(out, { bigint: true });
            if (visible.dev === createdIdentity.dev &&
                visible.ino === createdIdentity.ino &&
                visible.nlink === 1n) {
                fs.unlinkSync(out);
            }
        }
        catch {
            // Never remove an unverified replacement generation.
        }
    }
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
