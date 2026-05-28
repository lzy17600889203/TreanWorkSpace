const express = require('express');
const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'ledger.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

async function initDB() {
  const SQL = await initSqlJs();
  let data = null;
  if (fs.existsSync(DB_PATH)) {
    data = fs.readFileSync(DB_PATH);
  }
  db = new SQL.Database(data);
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      amount REAL NOT NULL,
      category_id INTEGER,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);
  const cats = db.exec("SELECT COUNT(*) FROM categories");
  if (cats[0] && cats[0].values[0][0] === 0) {
    const defaultCats = [
      ['工资', '#4CAF50'], ['奖金', '#8BC34A'], ['兼职', '#CDDC39'],
      ['餐饮', '#FF9800'], ['交通', '#FF5722'], ['购物', '#E91E63'],
      ['娱乐', '#9C27B0'], ['居住', '#673AB7'], ['医疗', '#F44336'],
      ['教育', '#2196F3'], ['通讯', '#00BCD4'], ['其他', '#9E9E9E']
    ];
    const stmt = db.prepare("INSERT INTO categories (name, color) VALUES (?, ?)");
    defaultCats.forEach(c => { stmt.run(c); });
    stmt.free();
  }
  saveDB();
  return db;
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

app.get('/api/records', (req, res) => {
  try {
    const { month } = req.query;
    let query = "SELECT r.*, c.name as category_name, c.color as category_color FROM records r LEFT JOIN categories c ON r.category_id = c.id";
    let params = [];
    if (month) {
      query += " WHERE strftime('%Y-%m', r.date) = ?";
      params = [month];
    }
    query += " ORDER BY r.created_at DESC";
    const result = db.exec(query, params);
    const cols = result[0] ? result[0].columns : [];
    const rows = result[0] ? result[0].values : [];
    const records = rows.map(row => {
      const obj = {};
      cols.forEach((c, i) => obj[c === 'category_id' ? 'categoryId' : c === 'category_name' ? 'categoryName' : c === 'category_color' ? 'categoryColor' : c] = row[i]);
      return obj;
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', (req, res) => {
  try {
    const { type, amount, category_id, note, date } = req.body;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ error: "金额必须是有效数字" });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: "类型必须是 income 或 expense" });
    }
    if (!date) {
      return res.status(400).json({ error: "日期不能为空" });
    }
    const stmt = db.prepare("INSERT INTO records (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)");
    stmt.run([type, parsedAmount, category_id || null, note || '', date]);
    const lastIdResult = db.exec("SELECT last_insert_rowid() as id");
    stmt.free();
    saveDB();
    if (!lastIdResult || !lastIdResult[0] || !lastIdResult[0].values || lastIdResult[0].values.length === 0) {
      return res.status(500).json({ error: "无法获取新记录ID" });
    }
    const newId = lastIdResult[0].values[0][0];
    const result = db.exec(`SELECT r.*, c.name as category_name, c.color as category_color FROM records r LEFT JOIN categories c ON r.category_id = c.id WHERE r.id = ${newId}`);
    if (!result || !result[0] || !result[0].columns || !result[0].values || result[0].values.length === 0) {
      return res.status(500).json({ error: "插入记录后无法查询" });
    }
    const cols = result[0].columns;
    const row = result[0].values[0];
    const obj = {};
    cols.forEach((c, i) => obj[c === 'category_id' ? 'categoryId' : c === 'category_name' ? 'categoryName' : c === 'category_color' ? 'categoryColor' : c] = row[i]);
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/records/:id', (req, res) => {
  try {
    db.run("DELETE FROM records WHERE id = ?", [req.params.id]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const { month } = req.query;
    let where = month ? `WHERE strftime('%Y-%m', date) = '${month}'` : '';
    const incomeResult = db.exec(`SELECT COALESCE(SUM(amount), 0) FROM records ${where ? where + " AND" : "WHERE"} type = 'income'`);
    const expenseResult = db.exec(`SELECT COALESCE(SUM(amount), 0) FROM records ${where ? where + " AND" : "WHERE"} type = 'expense'`);
    const totalIncome = incomeResult[0] ? incomeResult[0].values[0][0] : 0;
    const totalExpense = expenseResult[0] ? expenseResult[0].values[0][0] : 0;
    let pieQuery = `SELECT c.name, c.color, COALESCE(SUM(r.amount), 0) as total FROM categories c LEFT JOIN records r ON c.id = r.category_id AND r.type = 'expense' ${where} GROUP BY c.id HAVING total > 0`;
    const pieResult = db.exec(pieQuery);
    const pieData = pieResult[0] ? pieResult[0].values.map(row => ({ name: row[0], color: row[1], value: row[2] })) : [];
    let monthListResult = db.exec("SELECT DISTINCT strftime('%Y-%m', date) as month FROM records ORDER BY month DESC");
    const months = monthListResult[0] ? monthListResult[0].values.map(r => r[0]) : [];
    res.json({
      totalIncome: parseFloat(totalIncome),
      totalExpense: parseFloat(totalExpense),
      balance: parseFloat(totalIncome) - parseFloat(totalExpense),
      pieData,
      months
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const result = db.exec("SELECT id, name, color FROM categories ORDER BY id");
    const cats = result[0] ? result[0].values.map(row => ({ id: row[0], name: row[1], color: row[2] })) : [];
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/presets/:name', (req, res) => {
  try {
    db.run("DELETE FROM records");
    const now = new Date();
    const presets = {
      'normal-monthly': {
        records: [
          { type: 'income', amount: 8000, category: '工资', note: '月薪', daysAgo: 1 },
          { type: 'income', amount: 2000, category: '奖金', note: '季度奖', daysAgo: 15 },
          { type: 'expense', amount: 2000, category: '居住', note: '房租', daysAgo: 3 },
          { type: 'expense', amount: 1500, category: '餐饮', note: '外卖', daysAgo: 5 },
          { type: 'expense', amount: 300, category: '交通', note: '地铁', daysAgo: 7 },
          { type: 'expense', amount: 800, category: '购物', note: '衣服', daysAgo: 10 },
          { type: 'expense', amount: 200, category: '娱乐', note: '电影', daysAgo: 12 }
        ]
      },
      'large-expense': {
        records: [
          { type: 'income', amount: 8000, category: '工资', note: '月薪', daysAgo: 1 },
          { type: 'expense', amount: 50000, category: '居住', note: '购房首付', daysAgo: 2 },
          { type: 'expense', amount: 10000, category: '购物', note: '家具', daysAgo: 3 }
        ]
      },
      'zero-balance': {
        records: [
          { type: 'income', amount: 5000, category: '工资', note: '月薪', daysAgo: 1 },
          { type: 'income', amount: 3000, category: '兼职', note: '外包', daysAgo: 5 },
          { type: 'expense', amount: 3000, category: '餐饮', note: '聚餐', daysAgo: 3 },
          { type: 'expense', amount: 2000, category: '交通', note: '旅行', daysAgo: 6 },
          { type: 'expense', amount: 3000, category: '娱乐', note: '装备', daysAgo: 8 }
        ]
      },
      'special-symbols': {
        records: [
          { type: 'income', amount: 8000, category: '工资', note: '基础工资 <税前>', daysAgo: 1 },
          { type: 'expense', amount: 1500, category: '餐饮', note: '早餐:包子+豆浆', daysAgo: 2 },
          { type: 'expense', amount: 300, category: '交通', note: '打车~紧急情况', daysAgo: 3 },
          { type: 'expense', amount: 2000, category: '购物', note: '礼物[生日]', daysAgo: 4 },
          { type: 'expense', amount: 500, category: '娱乐', note: '游戏充值#648', daysAgo: 5 }
        ]
      }
    };
    const preset = presets[req.params.name];
    if (!preset) return res.status(404).json({ error: "预设不存在" });
    const catResult = db.exec("SELECT id, name FROM categories");
    const catMap = {};
    if (catResult[0]) {
      catResult[0].values.forEach(r => { catMap[r[1]] = r[0]; });
    }
    const stmt = db.prepare("INSERT INTO records (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)");
    preset.records.forEach(r => {
      const d = new Date(now);
      d.setDate(d.getDate() - r.daysAgo);
      const dateStr = d.toISOString().split('T')[0];
      stmt.run([r.type, r.amount, catMap[r.category] || null, r.note, dateStr]);
    });
    stmt.free();
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("数据库初始化失败:", err);
  process.exit(1);
});
