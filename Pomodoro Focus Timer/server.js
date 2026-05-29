const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

let db;
try {
  db = new Database('pomodoro.db');
  db.exec(`
    CREATE TABLE IF NOT EXISTS focus_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER,
      interrupted BOOLEAN DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS user_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    INSERT OR IGNORE INTO user_config (key, value) VALUES ('default_duration', '1500');
    INSERT OR IGNORE INTO user_config (key, value) VALUES ('break_duration', '300');
  `);
  console.log('数据库初始化成功');
} catch (error) {
  console.error('数据库初始化失败:', error);
  process.exit(1);
}

app.get('/api/records', (req, res) => {
  const { date } = req.query;
  try {
    let records;
    if (date) {
      const startOfDay = new Date(date).setHours(0, 0, 0, 0) / 1000;
      const endOfDay = new Date(date).setHours(23, 59, 59, 999) / 1000;
      records = db.prepare(`
        SELECT * FROM focus_records 
        WHERE start_time >= ? AND start_time <= ? 
        ORDER BY start_time DESC
      `).all(startOfDay, endOfDay);
    } else {
      records = db.prepare('SELECT * FROM focus_records ORDER BY start_time DESC').all();
    }
    res.json(records);
  } catch (error) {
    console.error('查询记录失败:', error);
    res.status(500).json({ error: '查询记录失败' });
  }
});

app.get('/api/records/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today).setHours(0, 0, 0, 0) / 1000;
    const endOfDay = new Date(today).setHours(23, 59, 59, 999) / 1000;
    
    const records = db.prepare(`
      SELECT * FROM focus_records 
      WHERE start_time >= ? AND start_time <= ? 
      ORDER BY start_time DESC
    `).all(startOfDay, endOfDay);
    
    res.json(records);
  } catch (error) {
    console.error('查询今日记录失败:', error);
    res.status(500).json({ error: '查询今日记录失败' });
  }
});

app.post('/api/records', (req, res) => {
  const { start_time, end_time, duration, interrupted } = req.body;
  
  try {
    const stmt = db.prepare(`
      INSERT INTO focus_records (start_time, end_time, duration, interrupted)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(start_time, end_time, duration, interrupted ? 1 : 0);
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('保存记录失败:', error);
    res.status(500).json({ error: '保存记录失败' });
  }
});

app.get('/api/statistics', (req, res) => {
  const { period } = req.query;
  
  try {
    let stats;
    
    if (period === 'today') {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = new Date(today).setHours(0, 0, 0, 0) / 1000;
      const endOfDay = new Date(today).setHours(23, 59, 59, 999) / 1000;
      
      stats = db.prepare(`
        SELECT 
          COALESCE(SUM(duration), 0) as total_duration,
          COALESCE(COUNT(*), 0) as total_sessions,
          COALESCE(SUM(CASE WHEN interrupted = 1 THEN 1 ELSE 0 END), 0) as interrupted_sessions
        FROM focus_records
        WHERE start_time >= ? AND start_time <= ?
      `).get(startOfDay, endOfDay);
    } else {
      stats = db.prepare(`
        SELECT 
          COALESCE(SUM(duration), 0) as total_duration,
          COALESCE(COUNT(*), 0) as total_sessions,
          COALESCE(SUM(CASE WHEN interrupted = 1 THEN 1 ELSE 0 END), 0) as interrupted_sessions
        FROM focus_records
      `).get();
    }
    
    res.json(stats);
  } catch (error) {
    console.error('查询统计失败:', error);
    res.status(500).json({ error: '查询统计失败' });
  }
});

app.get('/api/config', (req, res) => {
  try {
    const configs = db.prepare('SELECT key, value FROM user_config').all();
    const result = {};
    configs.forEach(c => {
      result[c.key] = c.value;
    });
    res.json(result);
  } catch (error) {
    console.error('查询配置失败:', error);
    res.status(500).json({ error: '查询配置失败' });
  }
});

app.use(express.static('public'));

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('服务器错误:', error);
});