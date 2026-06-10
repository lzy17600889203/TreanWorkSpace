const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'localization.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    original TEXT NOT NULL,
    translated TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    chapter TEXT DEFAULT '',
    note TEXT DEFAULT '',
    context TEXT DEFAULT '',
    updated_at INTEGER
  );
`);

const stmtInsert = db.prepare(
  'INSERT OR REPLACE INTO translations (key, original, translated, status, chapter, note, context, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
const stmtUpdate = db.prepare(
  'UPDATE translations SET translated = ?, status = ?, note = ?, updated_at = ? WHERE key = ?'
);
const stmtAll = db.prepare('SELECT * FROM translations ORDER BY id ASC');
const stmtOne = db.prepare('SELECT * FROM translations WHERE key = ?');
const stmtDeleteAll = db.prepare('DELETE FROM translations');
const stmtCount = db.prepare('SELECT status, COUNT(*) AS n FROM translations GROUP BY status');

function makeSampleEntries(preset) {
  const chapters = ['序章', '第一章', '第二章', '第三章', '第四章', '终章'];
  const pool = [
    { key: 'dialog.hero_wake', text: 'The hero wakes up in a cold, damp cell with no memory of the previous night.', chapter: '序章' },
    { key: 'dialog.guard_1', text: 'Hey, you! You are finally awake. The Magistrate wants to see you at dawn.', chapter: '序章' },
    { key: 'ui.start_game', text: 'Start New Game', chapter: '序章' },
    { key: 'ui.continue', text: 'Continue', chapter: '序章' },
    { key: 'ui.options', text: 'Options', chapter: '序章' },
    { key: 'item.potion_name', text: 'Crimson Elixir of Eternal Night', chapter: '第一章' },
    { key: 'item.potion_desc', text: 'A viscous red potion that restores 150 HP but curses the drinker for one hour.', chapter: '第一章' },
    { key: 'npc.merchant_hello', text: 'Welcome, traveler! My shelves are laden with treasures from every corner of the kingdom.', chapter: '第一章' },
    { key: 'quest.main_title', text: 'The Hollow Crown — A Kingdom in Eclipse', chapter: '第一章' },
    { key: 'quest.main_desc', text: 'Investigate the strange disappearance of the royal family and restore the broken line of kings.', chapter: '第一章' },
    { key: 'battle.hit', text: 'You strike the enemy for 34 damage! A critical blow rings across the battlefield.', chapter: '第二章' },
    { key: 'battle.miss', text: 'Your attack misses. The shadowy figure vanishes into the mist for a moment.', chapter: '第二章' },
    { key: 'dialog.villain_monologue', text: 'You think you can stop me? I have waited a thousand years for this eclipse — nothing will stand in my way now.', chapter: '第三章' },
    { key: 'dialog.ally_betray', text: 'I am sorry, old friend. This is the only path I have left. The pact cannot be undone.', chapter: '第三章' },
    { key: 'lore.ancient_text', text: 'And so the Seventh Seal was broken, and the stars themselves wept blood upon the silent earth.', chapter: '第三章' },
    { key: 'ui.save_slot', text: 'Save Slot', chapter: '第三章' },
    { key: 'ui.load_game', text: 'Load Game', chapter: '第三章' },
    { key: 'ui.credits', text: 'Credits & Thanks', chapter: '第三章' },
    { key: 'weather.thunder', text: 'The sky splits open with a terrible roar, and lightning illuminates the dead city beneath.', chapter: '第四章' },
    { key: 'puzzle.riddle', text: 'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?', chapter: '第四章' },
    { key: 'ending.good', text: 'The sun rises at last. The kingdom remembers your name, and songs of your deeds echo through every valley.', chapter: '终章' },
    { key: 'ending.bad', text: 'The eclipse consumes the world. Your name is erased from every book, and silence reigns forever.', chapter: '终章' },
    { key: 'menu.language', text: 'Language', chapter: '序章' },
    { key: 'menu.volume', text: 'Volume', chapter: '序章' },
    { key: 'menu.graphics', text: 'Graphics', chapter: '序章' },
    { key: 'tooltip.save_hint', text: 'Press F5 to quicksave. Press F9 to quickload. Your progress is autosaved at checkpoints.', chapter: '序章' },
    { key: 'achievement.first_blood', text: 'First Blood — Defeat an enemy in combat for the very first time.', chapter: '序章' },
    { key: 'achievement.pack_rat', text: 'Pack Rat — Collect every single item in the prologue area.', chapter: '序章' },
    { key: 'achievement.speedrunner', text: 'Speedrunner — Complete the game in under four hours.', chapter: '终章' },
    { key: 'error.network', text: 'Connection to the server has been lost. Please check your internet connection and try again.', chapter: '序章' },
  ];

  const entries = [];
  pool.forEach((p) => {
    entries.push({ key: p.key, original: p.text, chapter: p.chapter, translated: '', status: 'pending', note: '' });
  });

  if (preset === 'sprint') {
    entries.forEach((e, i) => {
      e.status = 'proofread';
      e.translated = '【校对译文】' + e.original + ' 的本地化版本。';
      if (i === entries.length - 1) {
        e.status = 'pending';
        e.translated = '';
      }
    });
  } else if (preset === 'term-conflict') {
    entries.forEach((e) => {
      if (e.chapter === '第三章') {
        e.status = 'proofread';
        e.translated = e.original + ' — 第三章统一译法';
      } else if (e.key === 'ui.start_game') {
        e.status = 'mt';
        e.translated = '开始新游戏';
        e.note = '该词汇在第三章已有其他译法';
      } else {
        e.status = 'pending';
      }
    });
  } else if (preset === 'mt-disaster') {
    entries.forEach((e) => {
      e.status = 'mt';
      e.translated = '¡#$% 鏂版父娴锋磱闆烽洦 乱码般的机器翻译结果 乱码 乱码';
      e.note = '机翻质量差，需人工紧急介入';
    });
  } else if (preset === 'import') {
    entries.forEach((e) => {
      e.status = 'pending';
      e.translated = '';
    });
  }

  return entries;
}

function ensureSeeded(preset) {
  stmtDeleteAll.run();
  const entries = makeSampleEntries(preset);
  const tx = db.transaction((list) => {
    for (const e of list) {
      stmtInsert.run(
        e.key, e.original, e.translated, e.status, e.chapter, e.note, '',
        Date.now()
      );
    }
  });
  tx(entries);
}

ensureSeeded('sprint');

app.get('/api/translations', (req, res) => {
  const rows = stmtAll.all();
  res.json({ total: rows.length, rows });
});

app.get('/api/translations/:key', (req, res) => {
  const row = stmtOne.get(req.params.key);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.post('/api/translations/:key', (req, res) => {
  const { translated, status, note } = req.body || {};
  const k = req.params.key;
  stmtUpdate.run(translated || '', status || 'pending', note || '', Date.now(), k);
  res.json({ ok: true, key: k });
});

app.post('/api/seed', (req, res) => {
  const { preset } = req.body || {};
  ensureSeeded(preset || 'sprint');
  res.json({ ok: true, preset });
});

app.get('/api/stats', (req, res) => {
  const rows = stmtCount.all();
  const stats = { total: 0, proofread: 0, mt: 0, pending: 0 };
  rows.forEach((r) => {
    stats[r.status] = r.n;
    stats.total += r.n;
  });
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`[Localization Translator] running at http://localhost:${PORT}`);
});
