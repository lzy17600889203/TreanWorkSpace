const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

// 初始化数据库
const db = new Database(path.join(__dirname, 'mydb.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    author TEXT,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, author)
  )
`);

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 获取所有收藏
app.get('/api/items', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
    res.json(items);
  } catch (e) {
    console.error('Error fetching items:', e);
    res.status(500).json([]);
  }
});

// 添加收藏
app.post('/api/items', (req, res) => {
  const { name, author, price } = req.body;
  
  try {
    const stmt = db.prepare('INSERT INTO items (name, author, price) VALUES (?, ?, ?)');
    const result = stmt.run(name, author, price);
    res.json({ id: result.lastInsertRowid, name, author, price });
  } catch (e) {
    console.error('Error adding item:', e);
    if (e.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: '该收藏已存在！' });
    } else {
      res.status(500).json({ error: '添加失败，请稍后重试' });
    }
  }
});

// 删除收藏
app.delete('/api/items/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM items WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting item:', e);
    res.status(500).json({ success: false });
  }
});

// 获取总花费
app.get('/api/total', (req, res) => {
  try {
    const result = db.prepare('SELECT SUM(price) as total FROM items').get();
    res.json({ total: result.total || 0 });
  } catch (e) {
    console.error('Error fetching total:', e);
    res.json({ total: 0 });
  }
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log('  🎉 我的数字收藏目录已启动！');
  console.log('  📍 地址: http://localhost:' + PORT);
  console.log('  ✨ 按 Ctrl+C 停止服务');
  console.log('========================================');
});

// 防止服务器崩溃
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
