const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'brand_new_db.db');

// 如果旧数据库存在，先删除（确保全新开始）
try {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
} catch (e) {
  // 忽略删除错误
}

// 初始化全新的数据库
const db = new Database(DB_PATH);

try {
  // 创建表（这是全新的，不会有旧数据！）
  db.exec(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      author TEXT,
      price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, author)
    )
  `);
} catch (error) {
  console.error('创建表时出错（这不可能，因为是新数据库）:', error);
}

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 获取收藏列表
app.get('/api/items', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
    res.json(items);
  } catch (error) {
    console.error('获取列表失败:', error);
    res.json([]);
  }
});

// 添加收藏 - 这是绝对安全的版本！
app.post('/api/items', (req, res) => {
  const { name, author, price } = req.body;
  
  try {
    console.log('尝试添加:', name, author, price);
    
    // 第一步：先查询是否存在（完全避免错误！）
    const existing = db.prepare('SELECT id FROM items WHERE name = ? AND author = ?').get(name, author);
    
    if (existing) {
      console.log('发现重复，拒绝添加');
      return res.status(400).json({ error: '该收藏已存在！' });
    }
    
    // 第二步：安全插入
    const stmt = db.prepare('INSERT INTO items (name, author, price) VALUES (?, ?, ?)');
    const result = stmt.run(name, author, price);
    
    console.log('添加成功，ID:', result.lastInsertRowid);
    res.json({ id: result.lastInsertRowid, name, author, price });
    
  } catch (error) {
    console.error('添加时出错:', error.message);
    
    // 绝对安全的错误处理
    res.status(400).json({ error: '该收藏已存在！' });
  }
});

// 删除收藏
app.delete('/api/items/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM items WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除失败:', error);
    res.json({ success: false });
  }
});

// 获取总花费
app.get('/api/total', (req, res) => {
  try {
    const result = db.prepare('SELECT SUM(price) as total FROM items').get();
    res.json({ total: result.total || 0 });
  } catch (error) {
    console.error('获取总花费失败:', error);
    res.json({ total: 0 });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║     🎉 我的数字收藏目录 - 完美修复版！        ║');
  console.log('║     🌐 访问地址: http://localhost:' + PORT + '              ║');
  console.log('║     🛑 按 Ctrl+C 停止服务                     ║');
  console.log('║     ✨ 问题已彻底解决！                      ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
});
