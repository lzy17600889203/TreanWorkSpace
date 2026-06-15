const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'ledger.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { transactions: [], nextId: 1 };
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { transactions: [], nextId: 1 };
  }
}

function saveDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function isUnnecessary(category, note) {
  const keywords = ['奶茶', '咖啡', '游戏', '充值', '娱乐', '玩具', '彩票', '零食', '直播', '打赏', '潮玩', '订阅'];
  const str = (category + ' ' + (note || '')).toLowerCase();
  return keywords.some(k => str.includes(k.toLowerCase())) ? 1 : 0;
}

app.get('/api/transactions', (req, res) => {
  const db = loadDB();
  res.json(db.transactions.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id));
});

app.post('/api/transactions', (req, res) => {
  const { date, amount, category, note, is_unnecessary } = req.body;
  if (!date || !amount || !category) {
    return res.status(400).json({ error: 'date, amount, category 必填' });
  }
  const db = loadDB();
  const unnec = is_unnecessary !== undefined ? (is_unnecessary ? 1 : 0) : isUnnecessary(category, note);
  const tx = {
    id: db.nextId++,
    date,
    amount: parseFloat(amount),
    category,
    note: note || '',
    is_unnecessary: unnec
  };
  db.transactions.push(tx);
  saveDB(db);
  res.json(tx);
});

app.delete('/api/transactions/:id', (req, res) => {
  const db = loadDB();
  db.transactions = db.transactions.filter(t => t.id !== parseInt(req.params.id));
  saveDB(db);
  res.json({ ok: true });
});

app.get('/api/waterfall/:yearMonth', (req, res) => {
  const ym = req.params.yearMonth;
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return res.status(400).json({ error: '格式应为 YYYY-MM' });
  }
  const db = loadDB();
  const rows = db.transactions
    .filter(t => t.date.startsWith(ym))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  const totalIncome = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const unnecessarySpent = rows.filter(r => r.amount < 0 && r.is_unnecessary).reduce((s, r) => s + Math.abs(r.amount), 0);
  const necessarySpent = rows.filter(r => r.amount < 0 && !r.is_unnecessary).reduce((s, r) => s + Math.abs(r.amount), 0);
  const balance = totalIncome - unnecessarySpent - necessarySpent;
  const unnecessaryRatio = totalIncome > 0 ? unnecessarySpent / totalIncome : 0;

  const steps = [];
  let running = 0;

  const incomeRows = rows.filter(r => r.amount > 0);
  incomeRows.forEach(r => {
    steps.push({
      label: r.category + '：+' + r.amount,
      value: r.amount,
      start: running,
      type: 'income',
      is_unnecessary: 0,
      note: r.note,
      date: r.date
    });
    running += r.amount;
  });
  const expenseRows = rows.filter(r => r.amount < 0);
  expenseRows.forEach(r => {
    const absVal = Math.abs(r.amount);
    steps.push({
      label: r.category + '：-' + absVal,
      value: -absVal,
      start: running,
      type: 'expense',
      is_unnecessary: r.is_unnecessary,
      note: r.note,
      date: r.date
    });
    running -= absVal;
  });

  // 状态判定：
  // 1. 非必要支出占比 > 30% → 冲动消费（无论结余正负）
  // 2. 结余 < 0 → 入不敷出
  // 3. 单笔大额收入（>=15000）且有多笔收入 → 发薪日狂欢
  // 4. 其他 → 健康
  const bigIncome = incomeRows.some(r => r.amount >= 15000);
  let state;
  if (balance < 0) state = 'overspend';
  else if (unnecessaryRatio > 0.3) state = 'impulsive';
  else if (bigIncome && incomeRows.length >= 2) state = 'payday';
  else state = 'healthy';

  let finalState;
  if (balance < 0) finalState = 'negative';
  else if (unnecessaryRatio > 0.3) finalState = 'dry';
  else finalState = 'healthy';

  res.json({
    month: ym,
    totalIncome,
    totalExpense: unnecessarySpent + necessarySpent,
    unnecessarySpent,
    necessarySpent,
    balance,
    unnecessaryRatio,
    state,
    steps,
    finalBalance: {
      value: balance,
      start: 0,
      state: finalState
    }
  });
});

app.get('/api/months', (req, res) => {
  const db = loadDB();
  const set = new Set();
  db.transactions.forEach(t => set.add(t.date.slice(0, 7)));
  const arr = Array.from(set).sort((a, b) => b.localeCompare(a));
  if (arr.length === 0) {
    const now = new Date();
    arr.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }
  res.json(arr);
});

app.post('/api/seed-demo', (req, res) => {
  const demo = [
    // 2026-06 健康状态：阶梯式下降，结余高耸（单月仅一笔收入
    { date: '2026-06-01', amount: 12000, category: '工资', note: '六月工资', is_unnecessary: 0 },
    { date: '2026-06-05', amount: -3500, category: '房租', note: '必要', is_unnecessary: 0 },
    { date: '2026-06-08', amount: -1500, category: '餐饮', note: '正餐', is_unnecessary: 0 },
    { date: '2026-06-10', amount: -800, category: '交通', note: '通勤', is_unnecessary: 0 },
    { date: '2026-06-12', amount: -700, category: '水电网', note: '必要', is_unnecessary: 0 },
    { date: '2026-06-15', amount: -500, category: '奶茶', note: '每周一次', is_unnecessary: 1 },

    // 2026-05 冲动消费：非必要支出断层（结余仍为正，但非必要占比 > 30%）
    { date: '2026-05-01', amount: 15000, category: '工资', note: '五月工资', is_unnecessary: 0 },
    { date: '2026-05-05', amount: -3500, category: '房租', note: '', is_unnecessary: 0 },
    { date: '2026-05-08', amount: -1500, category: '餐饮', note: '', is_unnecessary: 0 },
    { date: '2026-05-10', amount: -4500, category: '游戏充值', note: '冲动氪金', is_unnecessary: 1 },
    { date: '2026-05-12', amount: -1200, category: '奶茶零食', note: '每天一杯', is_unnecessary: 1 },
    { date: '2026-05-15', amount: -800, category: '娱乐', note: 'KTV聚餐', is_unnecessary: 1 },

    // 2026-04 入不敷出：结余负数
    { date: '2026-04-01', amount: 10000, category: '工资', note: '四月工资', is_unnecessary: 0 },
    { date: '2026-04-03', amount: -3200, category: '房租', note: '', is_unnecessary: 0 },
    { date: '2026-04-05', amount: -1500, category: '餐饮', note: '', is_unnecessary: 0 },
    { date: '2026-04-08', amount: -2000, category: '购物', note: '名牌包', is_unnecessary: 1 },
    { date: '2026-04-10', amount: -3000, category: '游戏充值', note: '大保底', is_unnecessary: 1 },
    { date: '2026-04-15', amount: -1500, category: '娱乐', note: '', is_unnecessary: 1 },
    { date: '2026-04-18', amount: -2500, category: '奶茶零食', note: '', is_unnecessary: 1 },
    { date: '2026-04-20', amount: -1800, category: '直播打赏', note: '', is_unnecessary: 1 },

    // 2026-03 发薪日狂欢：大收入 + 奖金 + 金币
    { date: '2026-03-01', amount: 18000, category: '工资', note: '三月工资', is_unnecessary: 0 },
    { date: '2026-03-01', amount: 5000, category: '季度奖金', note: '老板发的！', is_unnecessary: 0 },
    { date: '2026-03-05', amount: -3500, category: '房租', note: '', is_unnecessary: 0 },
    { date: '2026-03-08', amount: -1500, category: '餐饮', note: '', is_unnecessary: 0 },
    { date: '2026-03-10', amount: -500, category: '交通', note: '', is_unnecessary: 0 },
    { date: '2026-03-15', amount: -1200, category: '水电网', note: '', is_unnecessary: 0 }
  ];
  let nextId = 1;
  const txs = demo.map(d => ({ id: nextId++, ...d }));
  saveDB({ transactions: txs, nextId });
  res.json({ ok: true, count: demo.length });
});

app.listen(PORT, () => {
  console.log(`财务清醒器已启动: http://localhost:${PORT}`);
});
