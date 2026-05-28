const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const db = new sqlite3.Database('./notepad.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    db.run(`
      CREATE TABLE IF NOT EXISTS drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.get('SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 1', (err, row) => {
      if (!row) {
        db.run('INSERT INTO drafts (content) VALUES (?)', ['']);
      }
    });
  }
});

let simulateDelay = false;

app.get('/api/draft', (req, res) => {
  db.get('SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 1', (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ content: row?.content || '' });
    }
  });
});

app.post('/api/draft', (req, res) => {
  const { content } = req.body;
  
  if (simulateDelay) {
    setTimeout(() => {
      db.run('UPDATE drafts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM drafts ORDER BY updated_at DESC LIMIT 1)', [content], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          db.run('INSERT INTO history (content) VALUES (?)', [content]);
          res.json({ success: true, timestamp: Date.now() });
        }
      });
    }, 5000);
  } else {
    db.run('UPDATE drafts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM drafts ORDER BY updated_at DESC LIMIT 1)', [content], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        db.run('INSERT INTO history (content) VALUES (?)', [content]);
        res.json({ success: true, timestamp: Date.now() });
      }
    });
  }
});

app.get('/api/history', (req, res) => {
  db.all('SELECT * FROM history ORDER BY saved_at DESC LIMIT 20', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/restore/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM history WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'History not found' });
    } else {
      db.run('UPDATE drafts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM drafts ORDER BY updated_at DESC LIMIT 1)', [row.content]);
      db.run('INSERT INTO history (content) VALUES (?)', [row.content]);
      res.json({ success: true, content: row.content });
    }
  });
});

app.post('/api/toggle-delay', (req, res) => {
  simulateDelay = !simulateDelay;
  res.json({ success: true, delayEnabled: simulateDelay });
});

app.get('/api/delay-status', (req, res) => {
  res.json({ delayEnabled: simulateDelay });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});