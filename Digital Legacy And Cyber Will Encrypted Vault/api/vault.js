const db = require('./db');
const { encrypt, decrypt } = require('./crypto');

const DEADMAN_DAYS = 365;
const WARNING_DAYS = 300;

function daysSinceLogin() {
  const s = db.get();
  const diff = Math.floor(Date.now() / 1000) - s.vault.lastLoginAt;
  return Math.max(0, Math.floor(diff / 86400));
}

function getVaultStatus() {
  const s = db.get();
  const days = daysSinceLogin();
  let status = 'secure';
  if (days >= DEADMAN_DAYS) status = 'deadman';
  else if (days >= WARNING_DAYS) status = 'warning';
  else if (days === 0 && s.vault.status === 'fresh') status = 'fresh';
  return {
    status,
    daysSinceLogin: days,
    emergencyKey: s.vault.emergencyKey,
    deadmanTriggeredAt: s.vault.deadmanTriggeredAt || null,
    contacts: s.vault.contacts
  };
}

function setLastLogin(daysAgo) {
  const s = db.get();
  s.vault.lastLoginAt = Math.floor(Date.now() / 1000) - daysAgo * 86400;
  if (daysAgo === 0) s.vault.status = 'fresh';
  else s.vault.status = 'secure';
  db.save();
  return getVaultStatus();
}

function addEntry({ category, title, content, password }) {
  const s = db.get();
  const titleEnc = encrypt(title, password);
  const contentEnc = encrypt(content, password);
  const id = s.nextId++;
  s.entries.push({
    id,
    category,
    title_enc: titleEnc.ciphertext,
    title_iv: titleEnc.iv,
    content_enc: contentEnc.ciphertext,
    content_iv: contentEnc.iv,
    encryptedWith: password,
    created_at: Math.floor(Date.now() / 1000)
  });
  db.save();
  return { id };
}

function listEntries() {
  const s = db.get();
  return s.entries
    .map(e => ({ id: e.id, category: e.category, title_enc: e.title_enc, content_iv: e.content_iv, created_at: e.created_at }))
    .sort((a, b) => b.created_at - a.created_at);
}

function decryptEntry(id, password) {
  const s = db.get();
  const e = s.entries.find(x => x.id === id);
  if (!e) return null;
  try {
    return {
      id: e.id,
      category: e.category,
      title: decrypt({ iv: e.title_iv || e.iv, ciphertext: e.title_enc }, password),
      content: decrypt({ iv: e.content_iv || e.iv, ciphertext: e.content_enc }, password),
      created_at: e.created_at
    };
  } catch (err) {
    return { error: 'PASSWORD_WRONG' };
  }
}

function verifyEmergencyKey(key) {
  return db.get().vault.emergencyKey === key;
}

function triggerDeadman() {
  const s = db.get();
  const now = Math.floor(Date.now() / 1000);
  const contacts = s.vault.contacts;
  const logs = [];

  const body = [
    '=== CYBER WILL / 数字遗嘱 ===',
    `触发时间: ${new Date().toISOString()}`,
    '系统检测到用户已连续 365 天未登录,死人开关已触发。',
    '以下是该用户在数字世界留下的遗物,请妥善保管。',
    '',
    '---',
    ''
  ];

  for (const e of s.entries) {
    const dec = decryptEntry(e.id, e.encryptedWith || 'demo-master-password');
    if (dec && !dec.error) {
      body.push(`[${dec.category.toUpperCase()}] ${dec.title}`);
      body.push(dec.content);
      body.push('---');
    }
  }

  for (const c of contacts) {
    s.mailQueue.push({
      id: s.mailQueue.length + 1,
      recipient: c,
      subject: '[CYBER-VAULT] 数字遗嘱通知',
      body: body.join('\n'),
      scheduled_at: now,
      sent_at: now
    });
    logs.push(`> [MAIL SENT] -> ${c}`);
  }

  s.vault.deadmanTriggeredAt = now;
  s.vault.status = 'deadman';
  db.save();
  return logs;
}

function queue() {
  return db.get().mailQueue.slice().sort((a, b) => b.id - a.id);
}

module.exports = {
  getVaultStatus,
  setLastLogin,
  addEntry,
  listEntries,
  decryptEntry,
  verifyEmergencyKey,
  triggerDeadman,
  queue
};
