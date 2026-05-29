const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./habits.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#4CAF50',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER,
    date TEXT NOT NULL,
    checked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES habits(id)
  )`);
}

app.get('/api/habits', (req, res) => {
  db.all(`SELECT h.*, 
    COALESCE(SUM(c.checked), 0) as total_checkins,
    COALESCE(MAX(c.date), '') as last_checkin
    FROM habits h
    LEFT JOIN checkins c ON h.id = c.habit_id AND c.checked = 1
    GROUP BY h.id`, (err, habits) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(habits);
  });
});

app.get('/api/habits/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM habits WHERE id = ?', [id], (err, habit) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!habit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    res.json(habit);
  });
});

app.post('/api/habits', (req, res) => {
  const { name, color } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  db.run('INSERT INTO habits (name, color) VALUES (?, ?)', [name, color || '#4CAF50'], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.get('SELECT * FROM habits WHERE id = ?', [this.lastID], (err, habit) => {
      res.status(201).json(habit);
    });
  });
});

app.delete('/api/habits/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM checkins WHERE habit_id = ?', [id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.run('DELETE FROM habits WHERE id = ?', [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Habit deleted', changes: this.changes });
    });
  });
});

app.get('/api/habits/:id/checkins', (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM checkins WHERE habit_id = ? ORDER BY date DESC', [id], (err, checkins) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(checkins);
  });
});

app.get('/api/habits/:id/streak', (req, res) => {
  const { id } = req.params;
  db.all('SELECT date FROM checkins WHERE habit_id = ? AND checked = 1 ORDER BY date DESC', [id], (err, checkins) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (checkins.length === 0) {
      res.json({ streak: 0, longestStreak: 0, currentStreak: 0 });
      return;
    }

    const dates = checkins.map(c => c.date).sort().reverse();
    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i]);
      const next = new Date(dates[i + 1]);
      const diffDays = Math.floor((current - next) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
        if (i === 0) currentStreak++;
      } else {
        tempStreak = 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    res.json({ streak: currentStreak, longestStreak, currentStreak });
  });
});

app.post('/api/habits/:id/checkin', (req, res) => {
  const { id } = req.params;
  const { date } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  db.get('SELECT * FROM checkins WHERE habit_id = ? AND date = ?', [id, targetDate], (err, existing) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (existing) {
      const newValue = existing.checked === 1 ? 0 : 1;
      db.run('UPDATE checkins SET checked = ? WHERE id = ?', [newValue, existing.id], (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ success: true, checked: newValue === 1, date: targetDate });
      });
    } else {
      db.run('INSERT INTO checkins (habit_id, date, checked) VALUES (?, ?, 1)', [id, targetDate], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ success: true, checked: true, date: targetDate });
      });
    }
  });
});

app.get('/api/habits/:id/checkins/date/:date', (req, res) => {
  const { id, date } = req.params;
  db.get('SELECT * FROM checkins WHERE habit_id = ? AND date = ?', [id, date], (err, checkin) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ checked: checkin ? checkin.checked === 1 : false });
  });
});

app.post('/api/scenarios/perfect-year', (req, res) => {
  db.run('DELETE FROM checkins');
  db.run('DELETE FROM habits');
  
  db.run('INSERT INTO habits (name, color) VALUES (?, ?)', ['坚持一年的完美记录', '#FFD700'], function(err) {
    const habitId = this.lastID;
    const startDate = new Date('2025-01-01');
    for (let i = 0; i < 365; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      db.run('INSERT INTO checkins (habit_id, date, checked) VALUES (?, ?, 1)', [habitId, dateStr]);
    }
    res.json({ success: true, message: '完美一年记录已加载' });
  });
});

app.post('/api/scenarios/intermittent', (req, res) => {
  db.run('DELETE FROM checkins');
  db.run('DELETE FROM habits');
  
  db.run('INSERT INTO habits (name, color) VALUES (?, ?)', ['经常中断的断断续续记录', '#FF6B6B'], function(err) {
    const habitId = this.lastID;
    const startDate = new Date('2025-01-01');
    for (let i = 0; i < 180; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const shouldCheck = Math.random() > 0.4;
      if (shouldCheck) {
        db.run('INSERT INTO checkins (habit_id, date, checked) VALUES (?, ?, 1)', [habitId, dateStr]);
      }
    }
    res.json({ success: true, message: '断断续续记录已加载' });
  });
});

app.post('/api/scenarios/first-day', (req, res) => {
  db.run('DELETE FROM checkins');
  db.run('DELETE FROM habits');
  
  db.run('INSERT INTO habits (name, color) VALUES (?, ?)', ['刚开始第一天的新项目', '#4ECDC4'], function(err) {
    const habitId = this.lastID;
    const today = new Date().toISOString().split('T')[0];
    db.run('INSERT INTO checkins (habit_id, date, checked) VALUES (?, ?, 1)', [habitId, today]);
    res.json({ success: true, message: '第一天记录已加载' });
  });
});

app.post('/api/scenarios/leap-year', (req, res) => {
  db.run('DELETE FROM checkins');
  db.run('DELETE FROM habits');
  
  db.run('INSERT INTO habits (name, color) VALUES (?, ?)', ['跨越闰年的长期记录', '#9B59B6'], function(err) {
    const habitId = this.lastID;
    const startDate = new Date('2023-06-01');
    for (let i = 0; i < 730; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      db.run('INSERT INTO checkins (habit_id, date, checked) VALUES (?, ?, 1)', [habitId, dateStr]);
    }
    res.json({ success: true, message: '跨越闰年记录已加载' });
  });
});

app.post('/api/scenarios/empty', (req, res) => {
  db.run('DELETE FROM checkins');
  db.run('DELETE FROM habits');
  res.json({ success: true, message: '数据已清空' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;