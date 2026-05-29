const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./bmi_data.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
    db.run(`CREATE TABLE IF NOT EXISTS bmi_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      height REAL NOT NULL,
      weight REAL NOT NULL,
      bmi REAL NOT NULL,
      grade TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('创建表失败:', err.message);
      } else {
        console.log('表已创建或已存在');
      }
    });
  }
});

function calculateBMI(height, weight) {
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

function getBMIGrade(bmi) {
  if (bmi < 18.5) return '偏瘦';
  if (bmi < 24) return '正常';
  if (bmi < 28) return '超重';
  return '肥胖';
}

app.post('/api/bmi/calculate', (req, res) => {
  try {
    const { height, weight } = req.body;
    
    if (typeof height !== 'number' || typeof weight !== 'number') {
      return res.status(400).json({ error: '输入必须是数字' });
    }
    
    if (height <= 0) {
      return res.status(400).json({ error: '身高必须大于0' });
    }
    
    if (weight <= 0) {
      return res.status(400).json({ error: '体重必须大于0' });
    }
    
    const bmi = calculateBMI(height, weight);
    const grade = getBMIGrade(bmi);
    
    res.json({
      bmi: parseFloat(bmi.toFixed(2)),
      grade,
      height,
      weight
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bmi/save', (req, res) => {
  try {
    const { height, weight } = req.body;
    
    if (typeof height !== 'number' || typeof weight !== 'number') {
      return res.status(400).json({ error: '输入必须是数字' });
    }
    
    if (height <= 0) {
      return res.status(400).json({ error: '身高必须大于0' });
    }
    
    if (weight <= 0) {
      return res.status(400).json({ error: '体重必须大于0' });
    }
    
    const bmi = calculateBMI(height, weight);
    const grade = getBMIGrade(bmi);
    
    db.run('INSERT INTO bmi_records (height, weight, bmi, grade) VALUES (?, ?, ?, ?)',
      [height, weight, parseFloat(bmi.toFixed(2)), grade],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({
          id: this.lastID,
          bmi: parseFloat(bmi.toFixed(2)),
          grade,
          height,
          weight,
          message: '保存成功'
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bmi/records', (req, res) => {
  db.all('SELECT * FROM bmi_records ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.delete('/api/bmi/records/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.run('DELETE FROM bmi_records WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '删除成功', changes: this.changes });
  });
});

app.delete('/api/bmi/records', (req, res) => {
  db.run('DELETE FROM bmi_records', function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '清空成功', changes: this.changes });
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;