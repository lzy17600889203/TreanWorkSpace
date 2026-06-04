const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./habits.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the habits database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS habits (
    date TEXT PRIMARY KEY,
    sleep REAL,
    exercise REAL,
    focus REAL,
    energy REAL
  )`);
});

function calculateHealthScore(sleep, exercise, focus) {
  let score = 0;
  if (sleep >= 7 && sleep <= 9) score += 40;
  else if (sleep >= 6 && sleep <= 10) score += 30;
  else if (sleep >= 5 && sleep <= 11) score += 20;
  else score += 10;

  score += Math.min(exercise, 60) / 60 * 30;

  score += Math.min(focus, 8) / 8 * 30;

  return Math.round(score);
}

app.get('/api/habits', (req, res) => {
  db.all('SELECT * FROM habits ORDER BY date', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const data = rows.map(row => ({
      ...row,
      healthScore: calculateHealthScore(row.sleep, row.exercise, row.focus)
    }));
    res.json(data);
  });
});

app.post('/api/habits', (req, res) => {
  const { date, sleep, exercise, focus, energy } = req.body;
  const stmt = db.prepare('REPLACE INTO habits (date, sleep, exercise, focus, energy) VALUES (?, ?, ?, ?, ?)');
  stmt.run(date, sleep, exercise, focus, energy, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Habit saved successfully' });
  });
  stmt.finalize();
});

app.post('/api/presets', (req, res) => {
  const { preset } = req.body;
  const today = new Date();
  
  const presets = {
    'overworked': generateOverworkedData(today),
    'perfect': generatePerfectData(today),
    'weekend': generateWeekendData(today),
    'empty': []
  };

  db.serialize(() => {
    db.run('DELETE FROM habits', (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const data = presets[preset] || [];
      let completed = 0;
      
      if (data.length === 0) {
        res.json({ message: 'Data cleared successfully' });
        return;
      }
      
      data.forEach(item => {
        const stmt = db.prepare('INSERT INTO habits (date, sleep, exercise, focus, energy) VALUES (?, ?, ?, ?, ?)');
        stmt.run(item.date, item.sleep, item.exercise, item.focus, item.energy, (err) => {
          completed++;
          if (err) {
            console.error(err);
          }
          if (completed === data.length) {
            res.json({ message: 'Preset loaded successfully' });
          }
        });
        stmt.finalize();
      });
    });
  });
});

function generateOverworkedData(today) {
  const data = [];
  for (let i = 60; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const isOverworkPeriod = i <= 21;
    const sleep = isOverworkPeriod ? 3 + Math.random() * 2 : 7 + Math.random() * 2;
    const exercise = isOverworkPeriod ? 0 : 30 + Math.random() * 30;
    const focus = isOverworkPeriod ? 10 + Math.random() * 4 : 6 + Math.random() * 2;
    const energy = isOverworkPeriod ? 20 + Math.random() * 20 : 70 + Math.random() * 20;
    
    data.push({
      date: dateStr,
      sleep,
      exercise,
      focus,
      energy
    });
  }
  return data;
}

function generatePerfectData(today) {
  const data = [];
  for (let i = 60; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    data.push({
      date: dateStr,
      sleep: 7.5 + Math.random() * 1.5,
      exercise: 45 + Math.random() * 30,
      focus: 6 + Math.random() * 2,
      energy: 75 + Math.random() * 20
    });
  }
  return data;
}

function generateWeekendData(today) {
  const data = [];
  for (let i = 60; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const isRecentWeekend = i <= 7 && isWeekend;
    
    if (isRecentWeekend) {
      data.push({
        date: dateStr,
        sleep: 10 + Math.random() * 2,
        exercise: 0,
        focus: 0,
        energy: 50 + Math.random() * 30
      });
    } else {
      data.push({
        date: dateStr,
        sleep: 7 + Math.random() * 1.5,
        exercise: 30 + Math.random() * 30,
        focus: 5 + Math.random() * 3,
        energy: 70 + Math.random() * 20
      });
    }
  }
  return data;
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
