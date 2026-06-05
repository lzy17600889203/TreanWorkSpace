const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data', 'reservations.db');

const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const initDB = function() {
  db.serialize(function() {
    db.run('CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, company TEXT NOT NULL, visitTime TEXT NOT NULL, createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL, isBlacklist INTEGER DEFAULT 0)');

    const testData = [
      { id: 'test1', name: '张三', phone: '13800138000', company: '科技公司', isBlacklist: 0 },
      { id: 'test2', name: '李四', phone: '13900139000', company: '贸易公司', isBlacklist: 0 },
      { id: 'test3', name: '王五', phone: '13700137000', company: '推销公司', isBlacklist: 1 }
    ];

    testData.forEach(function(data, index) {
      const now = new Date();
      let expiresAt;
      
      if (index === 1) {
        expiresAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      } else {
        expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
      }

      db.get('SELECT id FROM reservations WHERE id = ?', [data.id], function(err, row) {
        if (!row) {
          db.run('INSERT INTO reservations (id, name, phone, company, visitTime, createdAt, expiresAt, isBlacklist) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [data.id, data.name, data.phone, data.company, now.toISOString(), now.toISOString(), expiresAt, data.isBlacklist]);
        }
      });
    });
  });
};

const generateUUID = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

module.exports = {
  db: db,
  initDB: initDB,
  generateUUID: generateUUID
};
