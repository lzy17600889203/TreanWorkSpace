const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'tasks.db');

async function initDb() {
  const initSqlJs = require('sql.js');
  
  try {
    const SQL = await initSqlJs({
      locateFile: file => `node_modules/sql.js/dist/${file}`
    });
    
    let db;
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
      db.exec(`
        CREATE TABLE tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          priority INTEGER DEFAULT 1,
          dueDate TEXT,
          completed INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        )
      `);
      db.exec(`
        INSERT INTO tasks (title, priority, dueDate, completed, created_at) VALUES 
        ('欢迎使用任务管理工具', 2, NULL, 0, '${new Date().toISOString()}'),
        ('尝试添加新任务', 1, NULL, 0, '${new Date().toISOString()}')
      `);
      saveDb(db);
    }
    
    db.save = function() {
      saveDb(this);
    };
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

function saveDb(db) {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

module.exports = initDb;