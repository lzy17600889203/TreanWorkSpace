/**
 * Indie Cafe Explorer - Express 后端
 *
 * 数据持久化：
 *   - 使用 JSON 文件 (cafes.json) 作为轻量级本地存储，
 *     避免需要本机编译的 SQLite 依赖，以便在 Windows/Node v24 上快速启动。
 *   - 运行期间数据保存在内存，写操作会同步回文件。
 *
 * 功能：
 *   1. 启动时检测端口是否被占用，若占用则自动向后递增（最多 +20）。
 *   2. 提供咖啡馆数据的 CRUD 接口（坐标、评分、风味标签、踩雷标记）。
 *   3. 首次运行使用内置演示数据（宝藏街区 / 荒漠 / 高分神店 / 黑名单）。
 *   4. 静态资源服务 /public 目录。
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const net = require('net');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------- JSON 文件持久化层 ----------
const DATA_FILE = path.join(__dirname, 'cafes.json');

function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.items)) return null;
    return obj;
  } catch (e) {
    console.error('[DB] 读取 cafes.json 失败：', e.message);
    return null;
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('[DB] 写入 cafes.json 失败：', e.message);
  }
}

function seedIfEmpty() {
  const existing = readStore();
  if (existing && existing.items && existing.items.length > 0) {
    return existing;
  }

  const now = Date.now();
  const demo = [
    // —— 宝藏街区（密集分布，绿色发光） ——
    { id: 1,  name: '不眠夜精品咖啡', address: '宝藏街 12 号', lat: 39.9085, lng: 116.3974, rating: 4.7, acidity: 78, sweetness: 82, body: 75, flavor_tags: ['柑橘', '焦糖', '坚果'], blacklisted: false, highlight: false, created_at: now },
    { id: 2,  name: '浅烘研究所', address: '宝藏街 18 号', lat: 39.9090, lng: 116.3980, rating: 4.6, acidity: 85, sweetness: 70, body: 68, flavor_tags: ['茉莉花', '柠檬'], blacklisted: false, highlight: false, created_at: now },
    { id: 3,  name: '巷子里的手冲', address: '宝藏巷 3 号', lat: 39.9082, lng: 116.3969, rating: 4.5, acidity: 72, sweetness: 80, body: 78, flavor_tags: ['可可', '红糖'], blacklisted: false, highlight: false, created_at: now },
    { id: 4,  name: '午夜豆仓', address: '宝藏街 22 号', lat: 39.9088, lng: 116.3977, rating: 4.4, acidity: 76, sweetness: 74, body: 80, flavor_tags: ['黑巧克力'], blacklisted: false, highlight: false, created_at: now },
    { id: 5,  name: '晨雾咖啡馆', address: '宝藏巷 7 号', lat: 39.9093, lng: 116.3970, rating: 4.3, acidity: 70, sweetness: 75, body: 72, flavor_tags: ['蜂蜜', '花香'], blacklisted: false, highlight: false, created_at: now },

    // —— 荒漠状态（孤立点 + 大片空白） ——
    { id: 6,  name: '荒漠边的一杯', address: '北区荒漠路 1 号', lat: 39.9220, lng: 116.4120, rating: 3.8, acidity: 60, sweetness: 55, body: 62, flavor_tags: ['谷物'], blacklisted: false, highlight: false, created_at: now },

    // —— 高分神店（放大 + 金色星星粒子 + 完美六边形雷达） ——
    { id: 7,  name: '传奇豆坊 · 旗舰店', address: '中央大道 88 号', lat: 39.9150, lng: 116.4050, rating: 5.0, acidity: 98, sweetness: 98, body: 98, flavor_tags: ['浆果', '玫瑰', '焦糖', '巧克力', '蜂蜜', '柑橘'], blacklisted: false, highlight: true, created_at: now },

    // —— 黑名单（红色刺眼 X + 黑烟垃圾桶） ——
    { id: 8,  name: '踩雷警告 · 兑水咖啡', address: '骗子胡同 66 号', lat: 39.9120, lng: 116.4020, rating: 1.2, acidity: 20, sweetness: 15, body: 18, flavor_tags: ['糊味', '焦苦'], blacklisted: true, highlight: false, created_at: now },
    { id: 9,  name: '速溶冒充精品', address: '劣质巷 9 号', lat: 39.9135, lng: 116.4085, rating: 1.8, acidity: 25, sweetness: 22, body: 20, flavor_tags: ['化工味'], blacklisted: true, highlight: false, created_at: now },
  ];

  const store = { nextId: 10, items: demo };
  writeStore(store);
  console.log(`[DB] 已写入 ${demo.length} 条演示数据到 cafes.json`);
  return store;
}

let store = seedIfEmpty();

// ---------- API ----------
app.get('/api/cafes', (req, res) => {
  res.json({ total: store.items.length, items: store.items });
});

app.get('/api/cafes/:id', (req, res) => {
  const item = store.items.find((x) => x.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: '未找到咖啡馆' });
  res.json(item);
});

app.post('/api/cafes', (req, res) => {
  const body = req.body || {};
  if (!body.name || typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return res.status(400).json({ error: '缺少必填字段 (name, lat, lng)' });
  }
  const newItem = {
    id: store.nextId++,
    name: body.name,
    address: body.address || '',
    lat: body.lat,
    lng: body.lng,
    rating: Number(body.rating) || 0,
    acidity: Number(body.acidity) || 0,
    sweetness: Number(body.sweetness) || 0,
    body: Number(body.body) || 0,
    flavor_tags: Array.isArray(body.flavor_tags) ? body.flavor_tags : [],
    blacklisted: !!body.blacklisted,
    highlight: !!body.highlight,
    created_at: Date.now(),
  };
  store.items.push(newItem);
  writeStore(store);
  res.json({ id: newItem.id, ok: true });
});

app.put('/api/cafes/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = store.items.findIndex((x) => x.id === id);
  if (idx < 0) return res.status(404).json({ error: '未找到咖啡馆' });
  const body = req.body || {};
  const existing = store.items[idx];
  store.items[idx] = {
    ...existing,
    ...body,
    id,
    flavor_tags: Array.isArray(body.flavor_tags) ? body.flavor_tags : existing.flavor_tags,
    blacklisted: body.blacklisted !== undefined ? !!body.blacklisted : existing.blacklisted,
    highlight: body.highlight !== undefined ? !!body.highlight : existing.highlight,
  };
  writeStore(store);
  res.json({ ok: true });
});

app.delete('/api/cafes/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = store.items.length;
  store.items = store.items.filter((x) => x.id !== id);
  if (store.items.length === before) {
    return res.status(404).json({ error: '未找到咖啡馆' });
  }
  writeStore(store);
  res.json({ ok: true });
});

// ---------- 静态资源 ----------
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now(), count: store.items.length });
});

// ---------- 端口检测 ----------
function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') resolve(true);
      else resolve(false);
    });
    tester.once('listening', () => {
      tester.close();
      resolve(false);
    });
    tester.listen(port, () => {});
  });
}

async function findFreePort(startPort, maxTry = 20) {
  for (let i = 0; i < maxTry; i++) {
    const p = startPort + i;
    // eslint-disable-next-line no-await-in-loop
    const inUse = await isPortInUse(p);
    if (!inUse) return p;
    console.log(`[端口检测] ${p} 已占用，尝试下一个...`);
  }
  return startPort + maxTry;
}

// ---------- 启动 ----------
const DEFAULT_PORT = 3000;

(async () => {
  const port = await findFreePort(DEFAULT_PORT);
  app.listen(port, () => {
    console.log('\n☕ Indie Cafe Explorer 已启动');
    console.log(`   前端地址: http://localhost:${port}/`);
    console.log(`   API 端口: ${port}`);
    console.log(`   数据文件: ${DATA_FILE}`);
  });
})();
