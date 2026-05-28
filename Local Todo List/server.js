const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

function initDbSync() {
  const dbPath = path.join(__dirname, 'tasks.db');
  
  try {
    const sqlite3 = require('sqlite3').verbose();
    const database = new sqlite3.Database(dbPath);
    
    database.serialize(() => {
      database.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          priority INTEGER DEFAULT 1,
          dueDate TEXT,
          completed INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        )
      `);
      
      database.get('SELECT COUNT(*) as count FROM tasks', (err, row) => {
        if (!err && row && row.count === 0) {
          database.run(`
            INSERT INTO tasks (title, priority, dueDate, completed, created_at) VALUES 
            ('欢迎使用任务管理工具', 2, NULL, 0, '${new Date().toISOString()}'),
            ('尝试添加新任务', 1, NULL, 0, '${new Date().toISOString()}')
          `);
        }
      });
    });
    
    return database;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY priority DESC, created_at DESC', (err, rows) => {
    if (err) {
      console.error('GET /api/tasks error:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/tasks', (req, res) => {
  const { title, priority = 1, dueDate } = req.body;
  console.log('Received task:', { title, priority, dueDate });
  
  db.run(
    'INSERT INTO tasks (title, priority, dueDate, completed, created_at) VALUES (?, ?, ?, ?, ?)',
    [title, priority, dueDate || null, 0, new Date().toISOString()],
    function(err) {
      if (err) {
        console.error('POST /api/tasks error:', err);
        res.status(500).json({ error: err.message });
      } else {
        db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            console.error('POST /api/tasks select error:', err);
            res.status(500).json({ error: err.message });
          } else {
            console.log('Created task:', row);
            res.json(row);
          }
        });
      }
    }
  );
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, priority, completed, dueDate } = req.body;
  
  db.run(
    'UPDATE tasks SET title = ?, priority = ?, completed = ?, dueDate = ? WHERE id = ?',
    [title, priority, completed ? 1 : 0, dueDate || null, id],
    function(err) {
      if (err) {
        console.error('PUT /api/tasks error:', err);
        res.status(500).json({ error: err.message });
      } else {
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
          if (err) {
            console.error('PUT /api/tasks select error:', err);
            res.status(500).json({ error: err.message });
          } else {
            res.json(row);
          }
        });
      }
    }
  );
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM tasks WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('DELETE /api/tasks error:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true });
    }
  });
});

app.delete('/api/tasks/completed', (req, res) => {
  db.run('DELETE FROM tasks WHERE completed = 1', (err) => {
    if (err) {
      console.error('DELETE /api/tasks/completed error:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true });
    }
  });
});

app.post('/api/scenario/:name', (req, res) => {
  const { name } = req.params;
  
  db.serialize(() => {
    db.run('DELETE FROM tasks');
    
    let tasks = [];
    
    switch (name) {
      case 'standard':
        tasks = [
          { title: '完成项目报告', priority: 3, dueDate: null },
          { title: '回复客户邮件', priority: 2, dueDate: null },
          { title: '团队周会', priority: 1, dueDate: null },
          { title: '代码审查', priority: 2, dueDate: null },
          { title: '更新文档', priority: 1, dueDate: null },
        ];
        break;
        
      case 'overdue':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        
        tasks = [
          { title: '紧急修复 - 生产环境bug', priority: 3, dueDate: twoDaysAgo.toISOString().split('T')[0] },
          { title: '客户演示准备', priority: 3, dueDate: yesterday.toISOString().split('T')[0] },
          { title: '季度总结报告', priority: 2, dueDate: yesterday.toISOString().split('T')[0] },
          { title: '团队培训材料', priority: 2, dueDate: twoDaysAgo.toISOString().split('T')[0] },
          { title: '代码重构', priority: 1, dueDate: yesterday.toISOString().split('T')[0] },
          { title: '性能优化', priority: 1, dueDate: twoDaysAgo.toISOString().split('T')[0] },
          { title: '文档更新', priority: 1, dueDate: twoDaysAgo.toISOString().split('T')[0] },
        ];
        break;
        
      case 'empty':
        tasks = [];
        break;
        
      case 'longtext':
        const longTitle = '这是一个超长标题文本测试，用于验证页面在处理极端长度文本时的表现，确保不会出现横向滚动条异常或者布局错乱的情况。这个标题会非常长，超过正常显示范围，测试CSS的text-overflow和white-space属性是否能够正确处理这种边界情况。';
        tasks = [
          { title: longTitle, priority: 2, dueDate: null },
          { title: '普通任务', priority: 1, dueDate: null },
        ];
        break;
        
      default:
        return res.status(404).json({ error: 'Unknown scenario' });
    }
    
    tasks.forEach(task => {
      db.run(
        'INSERT INTO tasks (title, priority, dueDate, completed, created_at) VALUES (?, ?, ?, ?, ?)',
        [task.title, task.priority, task.dueDate, 0, new Date().toISOString()]
      );
    });
    
    db.all('SELECT * FROM tasks ORDER BY priority DESC, created_at DESC', (err, rows) => {
      if (err) {
        console.error('POST /api/scenario select error:', err);
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
  });
});

try {
  db = initDbSync();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}