const crypto = require('crypto');

const SERVER_SECRET = 'cyber-vault-relic-2077-secret-salt';

function deriveKey(password) {
  return crypto.scryptSync(password, SERVER_SECRET, 32);
}

function encrypt(plaintext, password) {
  const key = deriveKey(password);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    ciphertext: Buffer.concat([enc, tag]).toString('base64')
  };
}

function decrypt(payload, password) {
  const key = deriveKey(password);
  const iv = Buffer.from(payload.iv, 'base64');
  const raw = Buffer.from(payload.ciphertext, 'base64');
  const ciphertext = raw.slice(0, raw.length - 16);
  const tag = raw.slice(raw.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt, deriveKey };
