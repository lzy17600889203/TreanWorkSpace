
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let data = {
  members: [
    { id: 1, name: '张三', skills: '前端,Vue,React', available_hours_per_day: 8 },
    { id: 2, name: '李四', skills: '后端,Node.js,Go', available_hours_per_day: 8 },
    { id: 3, name: '王五', skills: '产品,UI,UX', available_hours_per_day: 8 },
    { id: 4, name: '赵六', skills: '测试,自动化', available_hours_per_day: 8 },
    { id: 5, name: '钱七', skills: '运维,DevOps', available_hours_per_day: 8 }
  ],
  tasks: [
    { id: 1, title: '登录页面开发', member_id: 1, start_day: 0, duration: 1, color: '#4CAF50' },
    { id: 2, title: 'API 接口设计', member_id: 2, start_day: 0, duration: 1, color: '#2196F3' },
    { id: 3, title: '原型设计', member_id: 3, start_day: 0, duration: 1, color: '#FF9800' },
    { id: 4, title: '测试用例编写', member_id: 4, start_day: 1, duration: 1, color: '#9C27B0' },
    { id: 5, title: '部署环境准备', member_id: 5, start_day: 1, duration: 1, color: '#00BCD4' }
  ],
  nextTaskId: 6
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error loading data file:', e);
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/members', (req, res) => {
  res.json(data.members);
});

app.get('/api/tasks', (req, res) => {
  res.json(data.tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, member_id, start_day, duration, color } = req.body;
  const newTask = {
    id: data.nextTaskId++,
    title, member_id, start_day, duration, color
  };
  data.tasks.push(newTask);
  saveData();
  res.json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, member_id, start_day, duration, color } = req.body;
  const taskIndex = data.tasks.findIndex(t => t.id === parseInt(id));
  if (taskIndex !== -1) {
    data.tasks[taskIndex] = { ...data.tasks[taskIndex], title, member_id, start_day, duration, color };
    saveData();
  }
  res.json(data.tasks[taskIndex]);
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  data.tasks = data.tasks.filter(t => t.id !== parseInt(id));
  saveData();
  res.json({ success: true });
});

app.put('/api/tasks/batch', (req, res) => {
  const { tasks } = req.body;
  tasks.forEach(task => {
    if (task.id) {
      const idx = data.tasks.findIndex(t => t.id === task.id);
      if (idx !== -1) {
        data.tasks[idx] = { ...data.tasks[idx], ...task };
      }
    } else {
      const newTask = { ...task, id: data.nextTaskId++ };
      data.tasks.push(newTask);
      task.id = newTask.id;
    }
  });
  data.tasks = data.tasks.filter(t => tasks.some(rt => rt.id === t.id));
  saveData();
  res.json(tasks);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
