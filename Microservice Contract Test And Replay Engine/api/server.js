const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const SCENES = [
  { id: 'double-11', name: '双十一大促', description: '满载高压状态', requestRate: 200, errorRate: 0.02, timeoutRate: 0.05, color: '#ff3366' },
  { id: 'db-down', name: '数据库宕机', description: '全线超时拥堵', requestRate: 50, errorRate: 0.8, timeoutRate: 0.9, color: '#ffcc00' },
  { id: 'incompatible', name: '接口不兼容', description: '连环断裂', requestRate: 100, errorRate: 0.4, timeoutRate: 0.1, color: '#ff6600' },
  { id: 'normal', name: '日常平稳', description: '丝滑绿色流光', requestRate: 30, errorRate: 0, timeoutRate: 0, color: '#00ff88' }
];

let currentScene = SCENES[3];
let snapshots = [];
let nextId = 1;

app.get('/api/scenes', (req, res) => {
  res.json(SCENES);
});

app.post('/api/scene/:id', (req, res) => {
  const scene = SCENES.find(s => s.id === req.params.id);
  if (scene) {
    currentScene = scene;
    res.json({ success: true, scene });
  } else {
    res.status(404).json({ success: false, error: 'Scene not found' });
  }
});

app.get('/api/current-scene', (req, res) => {
  res.json(currentScene);
});

app.get('/api/history', (req, res) => {
  res.json([...snapshots].reverse().slice(0, 100));
});

app.post('/api/clear-history', (req, res) => {
  snapshots = [];
  nextId = 1;
  res.json({ success: true });
});

app.post('/api/replay', (req, res) => {
  res.json({ success: true, count: 100 });
});

app.get('/api/mock-data', (req, res) => {
  const random = Math.random();
  const isTimeout = random < currentScene.timeoutRate;
  const isError = !isTimeout && random < currentScene.timeoutRate + currentScene.errorRate;
  
  const startTime = Date.now();
  
  const respond = () => {
    const duration = Date.now() - startTime;
    const statusCode = isTimeout ? 504 : (isError ? 500 : 200);
    const success = statusCode < 400;
    
    snapshots.push({
      id: nextId++,
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: '/api/mock-data',
      requestBody: null,
      responseBody: success ? JSON.stringify({ success: true, data: 'Mock response', timestamp: Date.now() }) : JSON.stringify({ error: isTimeout ? 'Request timeout' : 'Internal server error' }),
      statusCode: statusCode,
      duration: duration,
      success: success
    });
    
    if (isTimeout) {
      res.status(504).json({ error: 'Request timeout' });
    } else if (isError) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ success: true, data: 'Mock response', timestamp: Date.now() });
    }
  };
  
  if (isTimeout) {
    setTimeout(respond, 2000);
  } else {
    respond();
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
