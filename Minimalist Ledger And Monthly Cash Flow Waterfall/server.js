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

  // 每类别聚合为一笔总额：收入从零轴向上生长，支出从零轴向下生长
  // 前端每列独立从 0 基准线延伸，视觉上分成「正数钱区」和「负数钱区」
  const steps = [];

  // 收入类别（按总额从大到小）
  const incomeByCat = {};
  rows.filter(r => r.amount > 0).forEach(r => {
    if (!incomeByCat[r.category]) incomeByCat[r.category] = { category: r.category, value: 0, note: r.note };
    incomeByCat[r.category].value += r.amount;
  });
  Object.values(incomeByCat).sort((a, b) => b.value - a.value).forEach(c => {
    steps.push({
      label: c.category,
      value: c.value,
      start: 0,               // 从零轴向上生长
      type: 'income',
      is_unnecessary: 0,
      note: '合计 +' + c.value.toFixed(0)
    });
  });

  // 必要支出（从零轴向下生长）
  const necExpByCat = {};
  rows.filter(r => r.amount < 0 && !r.is_unnecessary).forEach(r => {
    if (!necExpByCat[r.category]) necExpByCat[r.category] = { category: r.category, value: 0, note: r.note };
    necExpByCat[r.category].value += Math.abs(r.amount);
  });
  Object.values(necExpByCat).sort((a, b) => b.value - a.value).forEach(c => {
    steps.push({
      label: c.category,
      value: -c.value,
      start: 0,               // 从零轴向下生长
      type: 'expense',
      is_unnecessary: 0,
      note: '合计 -' + c.value.toFixed(0)
    });
  });

  // 非必要支出（从零轴向下生长，独立列）
  const unnExpByCat = {};
  rows.filter(r => r.amount < 0 && r.is_unnecessary).forEach(r => {
    if (!unnExpByCat[r.category]) unnExpByCat[r.category] = { category: r.category, value: 0, note: r.note };
    unnExpByCat[r.category].value += Math.abs(r.amount);
  });
  Object.values(unnExpByCat).sort((a, b) => b.value - a.value).forEach(c => {
    steps.push({
      label: c.category,
      value: -c.value,
      start: 0,               // 从零轴向下生长
      type: 'expense',
      is_unnecessary: 1,
      note: '合计 -' + c.value.toFixed(0)
    });
  });

  // 状态判定
  const bigIncome = Object.values(incomeByCat).some(c => c.value >= 15000);
  const incomeCount = Object.keys(incomeByCat).length;
  let state;
  if (balance < 0) state = 'overspend';
  else if (unnecessaryRatio > 0.3) state = 'impulsive';
  else if (bigIncome && incomeCount >= 2) state = 'payday';
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
