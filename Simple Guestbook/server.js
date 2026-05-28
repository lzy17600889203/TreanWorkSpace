const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

const db = new sqlite3.Database(path.join(__dirname, 'guestbook.db'), (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      ip TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      likes INTEGER DEFAULT 0
    )`);
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sensitiveWords = ['傻逼', '操', '垃圾', '废物', '妈蛋', 'Fuck', 'Bitch', 'Shit'];

function containsSensitiveWords(content) {
  return sensitiveWords.some(word => content.includes(word));
}

function sanitizeInput(input) {
  if (!input) return '';
  return input.replace(/[<>]/g, '');
}

let lastMessageCache = { content: '', timestamp: 0 };

app.post('/api/messages', (req, res) => {
  const { nickname, content } = req.body;
  
  if (!nickname || !content) {
    return res.status(400).json({ success: false, message: '昵称和留言内容不能为空' });
  }
  
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    return res.status(400).json({ success: false, message: '留言内容不能仅包含空格' });
  }
  
  const now = Date.now();
  if (trimmedContent === lastMessageCache.content && now - lastMessageCache.timestamp < 3000) {
    return res.status(400).json({ success: false, message: '请勿在短时间内发送相同内容' });
  }
  
  if (containsSensitiveWords(content)) {
    return res.status(400).json({ success: false, message: '留言内容包含敏感词' });
  }
  
  const sanitizedNickname = sanitizeInput(nickname);
  const sanitizedContent = sanitizeInput(content);
  const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  
  db.run(`INSERT INTO messages (nickname, content, ip, createdAt) VALUES (?, ?, ?, ?)`,
    [sanitizedNickname, sanitizedContent, ip, new Date().toISOString()],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库写入失败: ' + err.message });
      }
      lastMessageCache = { content: trimmedContent, timestamp: now };
      res.status(201).json({
        success: true,
        id: this.lastID,
        nickname: sanitizedNickname,
        content: sanitizedContent,
        ip,
        createdAt: new Date().toISOString(),
        likes: 0
      });
    }
  );
});

app.get('/api/messages', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  db.all(`SELECT * FROM messages ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [limit, offset], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败: ' + err.message });
    }
    
    db.get(`SELECT COUNT(*) as total FROM messages`, (err, count) => {
      if (err) {
        return res.status(500).json({ success: false, message: '计数失败: ' + err.message });
      }
      res.json({
        success: true,
        messages: rows,
        total: count.total,
        page,
        totalPages: Math.ceil(count.total / limit)
      });
    });
  });
});

app.put('/api/messages/:id/like', (req, res) => {
  const id = req.params.id;
  
  db.run(`UPDATE messages SET likes = likes + 1 WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '点赞失败: ' + err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '留言不存在' });
    }
    db.get(`SELECT likes FROM messages WHERE id = ?`, [id], (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: '查询失败: ' + err.message });
      }
      res.json({ success: true, likes: row.likes });
    });
  });
});

app.post('/api/scenarios/:name', (req, res) => {
  const scenarioName = req.params.name;
  
  db.run(`DELETE FROM messages`, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: '清空数据失败: ' + err.message });
    }
    
    let messages = [];
    
    switch(scenarioName) {
    case 'normal':
      messages = [
        { nickname: '阳光少年', content: '今天天气真好，大家心情都不错！', ip: '192.168.1.101', createdAt: new Date(Date.now() - 3600000).toISOString(), likes: 15 },
        { nickname: '快乐小猫', content: '分享一下我家猫咪的可爱照片~', ip: '192.168.1.102', createdAt: new Date(Date.now() - 7200000).toISOString(), likes: 23 },
        { nickname: '程序员小王', content: '今天代码写得很顺利，开心！', ip: '192.168.1.103', createdAt: new Date(Date.now() - 10800000).toISOString(), likes: 8 },
        { nickname: '美食达人', content: '推荐一家超好吃的餐厅，大家有空可以去试试', ip: '192.168.1.104', createdAt: new Date(Date.now() - 14400000).toISOString(), likes: 42 },
        { nickname: '旅行爱好者', content: '刚从云南回来，风景真的太美了', ip: '192.168.1.105', createdAt: new Date(Date.now() - 18000000).toISOString(), likes: 31 }
      ];
      break;
    case 'sensitive':
      messages = [
        { nickname: '不文明用户', content: '这是什么傻逼东西？垃圾！', ip: '192.168.1.201', createdAt: new Date(Date.now() - 1000).toISOString(), likes: 0 },
        { nickname: '愤怒的人', content: '操！太过分了', ip: '192.168.1.202', createdAt: new Date(Date.now() - 2000).toISOString(), likes: 0 },
        { nickname: '恶意攻击者', content: '废物东西，去死吧', ip: '192.168.1.203', createdAt: new Date(Date.now() - 3000).toISOString(), likes: 0 }
      ];
      break;
    case 'spam':
      messages = [];
      for (let i = 0; i < 20; i++) {
        messages.push({
          nickname: `刷屏机器人${i+1}`,
          content: `灌水内容${i+1} 重复重复重复重复重复`,
          ip: `192.168.1.${300 + i}`,
          createdAt: new Date(Date.now() - i * 500).toISOString(),
          likes: 0
        });
      }
      break;
    case 'welcome':
      messages = [
        { nickname: '系统管理员', content: '欢迎来到留言墙！请文明发言，友好交流~', ip: '192.168.1.1', createdAt: new Date().toISOString(), likes: 100 }
      ];
      break;
    default:
      res.status(404).json({ success: false, message: '场景不存在' });
      return;
  }
  
  messages.forEach(msg => {
    db.run(`INSERT INTO messages (nickname, content, ip, createdAt, likes) VALUES (?, ?, ?, ?, ?)`,
      [msg.nickname, msg.content, msg.ip, msg.createdAt, msg.likes],
      (err) => {
        if (err) console.error('场景数据插入失败:', err);
      }
    );
  });
  
  setTimeout(() => {
    res.json({ success: true, message: `已加载${scenarioName}场景，共${messages.length}条留言` });
  }, 500);
  });
});

app.delete('/api/messages', (req, res) => {
  db.run(`DELETE FROM messages`, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: '清空失败: ' + err.message });
    }
    res.json({ success: true, message: '已清空所有留言' });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});