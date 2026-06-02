const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const db = new Database('fridge.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

const initializeTestData = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM food_items').get().count;
  if (count === 0) {
    const today = new Date();
    const testItems = [
      { name: '临期牛奶', expiryDate: new Date(today.setDate(today.getDate() + 1)).toISOString().split('T')[0] },
      { name: '冷冻水饺', expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0] },
      { name: '已过期面包', expiryDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0] },
      { name: '新鲜苹果', expiryDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0] },
      { name: '紧急处理鸡蛋', expiryDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0] }
    ];
    
    const insert = db.prepare('INSERT INTO food_items (name, expiry_date) VALUES (?, ?)');
    testItems.forEach(item => {
      insert.run(item.name, item.expiryDate);
    });
  }
};

initializeTestData();

app.get('/api/food', (req, res) => {
  const items = db.prepare('SELECT * FROM food_items ORDER BY expiry_date').all();
  res.json(items);
});

app.post('/api/food', (req, res) => {
  const { name, expiryDate } = req.body;
  if (!name || !expiryDate) {
    return res.status(400).json({ error: '食品名称和过期时间不能为空' });
  }
  const insert = db.prepare('INSERT INTO food_items (name, expiry_date) VALUES (?, ?)');
  const result = insert.run(name, expiryDate);
  res.json({ id: result.lastInsertRowid, name, expiryDate });
});

app.delete('/api/food/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM food_items WHERE id = ?').run(id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
