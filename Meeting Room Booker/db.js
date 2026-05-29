const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'meeting_room.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS meeting_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    location TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    applicant TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES meeting_rooms(id)
  );
`);

const insertRoom = db.prepare('INSERT INTO meeting_rooms (name, capacity, location) VALUES (?, ?, ?)');
const existingRooms = db.prepare('SELECT COUNT(*) as count FROM meeting_rooms').get();

if (existingRooms.count === 0) {
  insertRoom.run('会议室A', 10, '1楼A区');
  insertRoom.run('会议室B', 8, '1楼B区');
  insertRoom.run('会议室C', 15, '2楼A区');
  insertRoom.run('会议室D', 6, '2楼B区');
}

module.exports = db;