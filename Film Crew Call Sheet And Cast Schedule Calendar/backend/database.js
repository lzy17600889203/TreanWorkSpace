const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'film_schedule.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS scenes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        location_id INTEGER,
        color TEXT NOT NULL
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS actors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contract_start TEXT NOT NULL,
        contract_end TEXT NOT NULL,
        is_lead INTEGER DEFAULT 0
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        lat REAL,
        lng REAL,
        rental_start TEXT,
        rental_end TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS scene_actors (
        scene_id INTEGER,
        actor_id INTEGER,
        PRIMARY KEY (scene_id, actor_id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS scene_equipment (
        scene_id INTEGER,
        equipment_id INTEGER,
        PRIMARY KEY (scene_id, equipment_id)
      )`, (err) => {
        if (err) {
          reject(err);
        } else {
          insertSampleData().then(resolve).catch(reject);
        }
      });
    });
  });
}

function insertSampleData() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM scenes', (err, row) => {
      if (err) return reject(err);
      if (row.count > 0) return resolve();

      db.serialize(() => {
        const stmtActors = db.prepare('INSERT INTO actors (name, contract_start, contract_end, is_lead) VALUES (?, ?, ?, ?)');
        stmtActors.run('陈道明', '2024-06-01', '2024-06-30', 1);
        stmtActors.run('周迅', '2024-06-01', '2024-06-30', 1);
        stmtActors.run('黄渤', '2024-06-05', '2024-06-25', 0);
        stmtActors.run('王宝强', '2024-06-10', '2024-06-20', 0);
        stmtActors.finalize();

        const stmtLocations = db.prepare('INSERT INTO locations (name, address, lat, lng, rental_start, rental_end) VALUES (?, ?, ?, ?, ?, ?)');
        stmtLocations.run('北京影视城', '北京市怀柔区', 40.3470, 116.6321, '2024-06-01', '2024-06-30');
        stmtLocations.run('上海车墩', '上海市松江区', 31.0567, 121.3245, '2024-06-01', '2024-06-30');
        stmtLocations.run('横店影视城', '浙江省东阳市', 29.1890, 120.2567, '2024-06-05', '2024-06-25');
        stmtLocations.finalize();

        const stmtEquipment = db.prepare('INSERT INTO equipment (name, type) VALUES (?, ?)');
        stmtEquipment.run('ARRI Alexa', 'camera');
        stmtEquipment.run('RED Epic', 'camera');
        stmtEquipment.run('Sound Device 688', 'audio');
        stmtEquipment.finalize();

        const stmtScenes = db.prepare('INSERT INTO scenes (name, start_date, end_date, location_id, color) VALUES (?, ?, ?, ?, ?)');
        stmtScenes.run('第一场：皇宫朝会', '2024-06-03', '2024-06-05', 1, '#3b82f6');
        stmtScenes.run('第二场：街市相遇', '2024-06-06', '2024-06-08', 2, '#10b981');
        stmtScenes.run('第三场：山林决战', '2024-06-09', '2024-06-11', 3, '#f59e0b');
        stmtScenes.run('第四场：宫廷夜宴', '2024-06-12', '2024-06-14', 1, '#ef4444');
        stmtScenes.finalize();

        const stmtSceneActors = db.prepare('INSERT INTO scene_actors (scene_id, actor_id) VALUES (?, ?)');
        stmtSceneActors.run(1, 1);
        stmtSceneActors.run(1, 2);
        stmtSceneActors.run(2, 2);
        stmtSceneActors.run(2, 3);
        stmtSceneActors.run(3, 1);
        stmtSceneActors.run(3, 3);
        stmtSceneActors.run(3, 4);
        stmtSceneActors.run(4, 1);
        stmtSceneActors.run(4, 2);
        stmtSceneActors.finalize();

        const stmtSceneEquip = db.prepare('INSERT INTO scene_equipment (scene_id, equipment_id) VALUES (?, ?)');
        stmtSceneEquip.run(1, 1);
        stmtSceneEquip.run(1, 3);
        stmtSceneEquip.run(2, 2);
        stmtSceneEquip.run(2, 3);
        stmtSceneEquip.run(3, 1);
        stmtSceneEquip.run(3, 2);
        stmtSceneEquip.run(4, 1);
        stmtSceneEquip.finalize();

        resolve();
      });
    });
  });
}

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

module.exports = { initDatabase, all, get, run };
