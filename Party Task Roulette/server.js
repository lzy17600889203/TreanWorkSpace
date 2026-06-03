const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let tasks = [
  { id: 1, content: '真心话：你最害怕的三件事是什么？', type: 'truth', status: 'active' },
  { id: 2, content: '大冒险：模仿一位在场的朋友，让大家猜是谁', type: 'dare', status: 'active' },
  { id: 3, content: '真心话：你做过的最疯狂的事是什么？', type: 'truth', status: 'active' },
  { id: 4, content: '大冒险：给你最亲密的异性朋友打电话说"我喜欢你"', type: 'dare', status: 'active' },
  { id: 5, content: '真心话：你最欣赏在场哪位异性？为什么？', type: 'truth', status: 'active' },
  { id: 6, content: '大冒险：跳一段最丑的舞蹈', type: 'dare', status: 'active' },
  { id: 7, content: '真心话：你暗恋过几个人？', type: 'truth', status: 'active' },
  { id: 8, content: '大冒险：用屁股写字，让大家猜', type: 'dare', status: 'active' },
  { id: 9, content: '真心话：你的初恋是谁？现在还想他/她吗？', type: 'truth', status: 'active' },
  { id: 10, content: '大冒险：喝一口混合饮料（可乐+醋+酱油）', type: 'dare', status: 'active' }
];

let nextId = 11;

app.get('/api/tasks', (req, res) => {
  const activeTasks = tasks.filter(t => t.status === 'active');
  res.json(activeTasks);
});

app.get('/api/tasks/all', (req, res) => {
  res.json(tasks);
});

app.get('/api/tasks/random', (req, res) => {
  const activeTasks = tasks.filter(t => t.status === 'active');
  if (activeTasks.length === 0) {
    return res.status(404).json({ error: '没有可用的任务' });
  }
  const randomIndex = Math.floor(Math.random() * activeTasks.length);
  res.json(activeTasks[randomIndex]);
});

app.post('/api/tasks', (req, res) => {
  const { content, type } = req.body;
  if (!content || !type) {
    return res.status(400).json({ error: '内容和类型是必填项' });
  }
  
  // 检查任务是否已存在（不区分大小写）
  const existingTask = tasks.find(task => 
    task.content.trim().toLowerCase() === content.trim().toLowerCase()
  );
  
  if (existingTask) {
    return res.status(409).json({ error: '该任务已存在！' });
  }
  
  const newTask = {
    id: nextId++,
    content,
    type,
    status: 'active'
  };
  tasks.push(newTask);
  res.json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const task = tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  if (status) {
    task.status = status;
  }
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }
  tasks.splice(index, 1);
  res.json({ message: '任务已删除' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
