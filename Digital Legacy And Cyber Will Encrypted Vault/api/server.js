const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const vault = require('./vault');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/status', (req, res) => {
  res.json(vault.getVaultStatus());
});

app.post('/api/set-login', (req, res) => {
  const { daysAgo } = req.body;
  res.json(vault.setLastLogin(daysAgo || 0));
});

app.post('/api/entries', (req, res) => {
  const { category, title, content, password } = req.body;
  if (!category || !title || !content || !password) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }
  res.json(vault.addEntry({ category, title, content, password }));
});

app.get('/api/entries', (req, res) => {
  res.json(vault.listEntries());
});

app.post('/api/entries/:id/decrypt', (req, res) => {
  const { password } = req.body;
  const r = vault.decryptEntry(Number(req.params.id), password);
  if (!r) return res.status(404).json({ error: 'NOT_FOUND' });
  if (r.error) return res.status(401).json(r);
  res.json(r);
});

app.post('/api/emergency-unlock', (req, res) => {
  const { key } = req.body;
  if (vault.verifyEmergencyKey(key)) {
    res.json({ ok: true, hint: 'dead_man_switch_triggered' });
  } else {
    res.status(401).json({ ok: false, error: 'WRONG_EMERGENCY_KEY' });
  }
});

app.post('/api/trigger-deadman', (req, res) => {
  res.json({ logs: vault.triggerDeadman() });
});

app.get('/api/queue', (req, res) => {
  res.json(vault.queue());
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║   赛博保险箱 · CYBER VAULT is running        ║`);
  console.log(`  ║   http://localhost:${PORT}                      ║`);
  console.log(`  ╚══════════════════════════════════════════════╝\n`);
  console.log(`  Demo 紧急联系人密钥:  EMERGENCY-KEY-2077-RELIC`);
  console.log(`  Demo 主密码:         demo-master-password\n`);
});
