const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./workflow.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER,
    applicant TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    current_node TEXT,
    history TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
  )`);
});

const users = {
  'employee1': { role: 'employee', name: '张三', avatar: '👨‍💼' },
  'manager1': { role: 'manager', name: '李经理', avatar: '👔' },
  'finance1': { role: 'finance', name: '王财务', avatar: '💰' },
  'finance2': { role: 'finance', name: '赵财务', avatar: '💰' },
  'finance3': { role: 'finance', name: '钱财务', avatar: '💰' },
  'ceo': { role: 'ceo', name: '孙总', avatar: '👑' }
};

app.post('/api/workflows', (req, res) => {
  const { name, config } = req.body;
  db.run('INSERT INTO workflows (name, config) VALUES (?, ?)', [name, JSON.stringify(config)], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name, config });
  });
});

app.get('/api/workflows', (req, res) => {
  db.all('SELECT * FROM workflows ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => ({ ...row, config: JSON.parse(row.config) })));
  });
});

app.get('/api/workflows/:id', (req, res) => {
  db.get('SELECT * FROM workflows WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }
    res.json({ ...row, config: JSON.parse(row.config) });
  });
});

app.post('/api/applications', (req, res) => {
  const { workflowId, applicant, type, data } = req.body;
  db.get('SELECT * FROM workflows WHERE id = ?', [workflowId], (err, workflow) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const config = JSON.parse(workflow.config);
    const firstNode = config.nodes.find(n => n.type === 'start');
    const history = [{
      node: firstNode.id,
      action: '发起',
      user: applicant,
      timestamp: new Date().toISOString()
    }];
    
    db.run('INSERT INTO applications (workflow_id, applicant, type, data, current_node, history) VALUES (?, ?, ?, ?, ?, ?)', 
      [workflowId, applicant, type, JSON.stringify(data), firstNode.id, JSON.stringify(history)], 
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID, message: '申请提交成功' });
      }
    );
  });
});

app.get('/api/applications', (req, res) => {
  db.all('SELECT * FROM applications ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => ({ 
      ...row, 
      data: JSON.parse(row.data),
      history: JSON.parse(row.history || '[]')
    })));
  });
});

app.post('/api/applications/:id/approve', (req, res) => {
  const { userId } = req.body;
  db.get('SELECT * FROM applications WHERE id = ?', [req.params.id], (err, application) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.get('SELECT * FROM workflows WHERE id = ?', [application.workflow_id], (err, workflow) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const config = JSON.parse(workflow.config);
      const currentNode = config.nodes.find(n => n.id === application.current_node);
      const nextConnections = config.connections.filter(c => c.from === currentNode.id);
      
      let history = JSON.parse(application.history || '[]');
      history.push({
        node: currentNode.id,
        action: '审批通过',
        user: userId,
        timestamp: new Date().toISOString()
      });
      
      let nextNode = null;
      let status = 'approved';
      
      if (nextConnections.length > 0) {
        nextNode = config.nodes.find(n => n.id === nextConnections[0].to);
        status = 'pending';
      }
      
      db.run('UPDATE applications SET current_node = ?, history = ?, status = ? WHERE id = ?', 
        [nextNode ? nextNode.id : null, JSON.stringify(history), status, req.params.id], 
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ message: '审批成功', nextApprover: nextNode ? getApproverForNode(nextNode) : null });
        }
      );
    });
  });
});

app.post('/api/applications/:id/reject', (req, res) => {
  const { userId, reason } = req.body;
  db.get('SELECT * FROM applications WHERE id = ?', [req.params.id], (err, application) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.get('SELECT * FROM workflows WHERE id = ?', [application.workflow_id], (err, workflow) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const config = JSON.parse(workflow.config);
      const currentNode = config.nodes.find(n => n.id === application.current_node);
      const prevConnections = config.connections.filter(c => c.to === currentNode.id);
      
      let history = JSON.parse(application.history || '[]');
      history.push({
        node: currentNode.id,
        action: '驳回',
        user: userId,
        reason: reason,
        timestamp: new Date().toISOString()
      });
      
      let prevNode = null;
      if (prevConnections.length > 0) {
        prevNode = config.nodes.find(n => n.id === prevConnections[0].from);
      }
      
      db.run('UPDATE applications SET current_node = ?, history = ?, status = ? WHERE id = ?', 
        [prevNode ? prevNode.id : null, JSON.stringify(history), 'rejected', req.params.id], 
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ message: '驳回成功', prevApprover: prevNode ? getApproverForNode(prevNode) : null });
        }
      );
    });
  });
});

app.post('/api/applications/:id/withdraw', (req, res) => {
  const { userId } = req.body;
  db.get('SELECT * FROM applications WHERE id = ?', [req.params.id], (err, application) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    let history = JSON.parse(application.history || '[]');
    history.push({
      node: application.current_node,
      action: '撤回',
      user: userId,
      timestamp: new Date().toISOString()
    });
    db.run('UPDATE applications SET status = ?, history = ? WHERE id = ?', 
      ['withdrawn', JSON.stringify(history), req.params.id], 
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ message: '撤回成功' });
      }
    );
  });
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

function getApproverForNode(node) {
  switch(node.role) {
    case 'manager':
      return 'manager1';
    case 'finance':
      return 'finance1';
    case 'ceo':
      return 'ceo';
    default:
      return 'employee1';
  }
}

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
