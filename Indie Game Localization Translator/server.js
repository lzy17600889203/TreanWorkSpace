const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== In-memory "SQLite-like" store (无原生依赖,可直接启动)
// 保留与 SQLite 等价的字段语义: key 唯一、可 UPDATE、可按状态统计
let rows = [];

function makeSampleEntries(preset) {
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

  const list = pool.map((p) => {
    return {
      key: p.key,
      original: p.text,
      chapter: p.chapter,
      translated: '',
      status: 'pending',
      note: '',
      updated_at: Date.now()
    };
  });

  if (preset === 'sprint') {
    list.forEach((e, i) => {
      if (i === list.length - 1) {
        e.status = 'pending';
        e.translated = '';
      } else {
        e.status = 'proofread';
        e.translated = '【校对译文】' + e.original + ' 的本地化版本';
      }
    });
  } else if (preset === 'term-conflict') {
    list.forEach((e) => {
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
    list.forEach((e) => {
      e.status = 'mt';
      e.translated = '¡#$% 鏂版父娴锋磱闆烽洦 乱码般的机器翻译结果 乱码 乱码';
      e.note = '机翻质量差,需人工紧急介入';
    });
  } else if (preset === 'import') {
    list.forEach((e) => {
      e.status = 'pending';
      e.translated = '';
    });
  }
  return list;
}

function seed(preset) {
  rows = makeSampleEntries(preset || 'sprint');
}

function getStats() {
  const stats = { total: rows.length, proofread: 0, mt: 0, pending: 0 };
  rows.forEach((r) => { stats[r.status] = (stats[r.status] || 0) + 1; });
  return stats;
}

seed('sprint');

app.get('/api/translations', (_req, res) => {
  res.json({ total: rows.length, rows });
});

app.get('/api/translations/:key', (req, res) => {
  const row = rows.find((r) => r.key === req.params.key);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.post('/api/translations/:key', (req, res) => {
  const { translated, status, note } = req.body || {};
  const row = rows.find((r) => r.key === req.params.key);
  if (!row) return res.status(404).json({ error: 'not found' });
  row.translated = translated || '';
  row.status = status || 'pending';
  row.note = note || row.note || '';
  row.updated_at = Date.now();
  res.json({ ok: true, key: row.key });
});

app.post('/api/seed', (req, res) => {
  const { preset } = req.body || {};
  seed(preset);
  res.json({ ok: true, preset });
});

app.get('/api/stats', (_req, res) => {
  res.json(getStats());
});

app.listen(PORT, () => {
  console.log(`[Localization Translator] running at http://localhost:${PORT}`);
  console.log(`  演示状态: sprint / term-conflict / mt-disaster / import`);
});
