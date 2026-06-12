const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'vault.json');
const SERVER_SECRET = 'cyber-vault-relic-2077-secret-salt';

function aes256Encrypt(plaintext, password) {
  const key = crypto.scryptSync(password, SERVER_SECRET, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('base64'), ciphertext: Buffer.concat([enc, tag]).toString('base64') };
}

function buildDefaultState() {
  const demoPwd = 'demo-master-password';
  const now = Math.floor(Date.now() / 1000);
  const raw = [
    { category: 'social', title: 'GITHUB / cyber_relic_42', content: 'login: cyber_relic_42\nrecovery_email: relic@void.net\n2FA seed: JBSWY3DPEHPK3PXP', daysAgo: 1 },
    { category: 'diary',  title: '最后一条日记', content: '如果有人读到这一段 —— 那说明我已经去了别的地方。\n请帮我照顾窗台的那盆多肉,以及 GitHub 上那个还没写完的 side project。', daysAgo: 2 },
    { category: 'mail',   title: '给妈妈的定时邮件', content: '妈:\n别担心我,我一直过得很好。\n帮我把床底下的硬盘拆下来,里面有我从 16 岁开始写的所有代码。\n—— 你的重度网民儿子', daysAgo: 3 }
  ];
  const entries = raw.map((r, i) => {
    const t = aes256Encrypt(r.title, demoPwd);
    const c = aes256Encrypt(r.content, demoPwd);
    return {
      id: i + 1,
      category: r.category,
      title_enc: t.ciphertext,
      title_iv: t.iv,
      content_enc: c.ciphertext,
      content_iv: c.iv,
      encryptedWith: demoPwd,
      created_at: now - 86400 * r.daysAgo
    };
  });
  return {
    vault: {
      masterKey: demoPwd,
      emergencyKey: 'EMERGENCY-KEY-2077-RELIC',
      lastLoginAt: now,
      status: 'fresh',
      contacts: ['next-of-kin@cyber-relic.void']
    },
    entries,
    mailQueue: [],
    nextId: entries.length + 1
  };
}

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) { /* ignore */ }
  const clone = buildDefaultState();
  save(clone);
  return clone;
}

function save(state) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) { /* ignore */ }
}

let state = load();

module.exports = {
  get: () => state,
  save: () => save(state),
  reset: () => { state = buildDefaultState(); save(state); }
};
