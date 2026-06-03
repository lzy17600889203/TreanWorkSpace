const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, 'flights.db'));
db.pragma('journal_mode = WAL');

const initDB = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS flights (
      id TEXT PRIMARY KEY,
      flightNumber TEXT NOT NULL,
      airline TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      originLat REAL NOT NULL,
      originLon REAL NOT NULL,
      destLat REAL NOT NULL,
      destLon REAL NOT NULL,
      delayed INTEGER DEFAULT 0,
      progress REAL DEFAULT 0
    )
  `);

  const insertFlight = db.prepare(`
    INSERT OR REPLACE INTO flights (id, flightNumber, airline, origin, destination, originLat, originLon, destLat, destLon, delayed, progress)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const flights = [
    { id: 'CA1234', flightNumber: 'CA1234', airline: '中国国际航空', origin: '北京', destination: '纽约', originLat: 39.9042, originLon: 116.4074, destLat: 40.7128, destLon: -74.0060, delayed: 0, progress: 0.3 },
    { id: 'DL5678', flightNumber: 'DL5678', airline: '达美航空', origin: '洛杉矶', destination: '东京', originLat: 34.0522, originLon: -118.2437, destLat: 35.6762, destLon: 139.6503, delayed: 1, progress: 0.6 },
    { id: 'EK9012', flightNumber: 'EK9012', airline: '阿联酋航空', origin: '迪拜', destination: '伦敦', originLat: 25.2048, originLon: 55.2708, destLat: 51.5074, destLon: -0.1278, delayed: 0, progress: 0.8 },
    { id: 'QF3456', flightNumber: 'QF3456', airline: '澳洲航空', origin: '悉尼', destination: '新加坡', originLat: -33.8688, originLon: 151.2093, destLat: 1.3521, destLon: 103.8198, delayed: 0, progress: 0.15 },
    { id: 'LH7890', flightNumber: 'LH7890', airline: '汉莎航空', origin: '法兰克福', destination: '上海', originLat: 50.1109, originLon: 8.6821, destLat: 31.2304, destLon: 121.4737, delayed: 1, progress: 0.5 },
    { id: 'AA2345', flightNumber: 'AA2345', airline: '美国航空', origin: '芝加哥', destination: '巴黎', originLat: 41.8781, originLon: -87.6298, destLat: 48.8566, destLon: 2.3522, delayed: 0, progress: 0.7 },
    { id: 'MU6789', flightNumber: 'MU6789', airline: '东方航空', origin: '上海', destination: '深圳', originLat: 31.2304, originLon: 121.4737, destLat: 22.5431, destLon: 114.0579, delayed: 0, progress: 0.4 },
    { id: 'CZ1122', flightNumber: 'CZ1122', airline: '南方航空', origin: '广州', destination: '北京', originLat: 23.1291, originLon: 113.2644, destLat: 39.9042, destLon: 116.4074, delayed: 0, progress: 0.9 },
    { id: 'UA3344', flightNumber: 'UA3344', airline: '联合航空', origin: '旧金山', destination: '西雅图', originLat: 37.7749, originLon: -122.4194, destLat: 47.6062, destLon: -122.3321, delayed: 0, progress: 0.2 },
    { id: 'BA5566', flightNumber: 'BA5566', airline: '英国航空', origin: '伦敦', destination: '罗马', originLat: 51.5074, originLon: -0.1278, destLat: 41.9028, destLon: 12.4964, delayed: 0, progress: 0.85 },
    { id: 'JL7788', flightNumber: 'JL7788', airline: '日本航空', origin: '东京', destination: '大阪', originLat: 35.6762, originLon: 139.6503, destLat: 34.6937, destLon: 135.5023, delayed: 0, progress: 0.1 },
    { id: 'SQ9900', flightNumber: 'SQ9900', airline: '新加坡航空', origin: '新加坡', destination: '吉隆坡', originLat: 1.3521, originLon: 103.8198, destLat: 3.1390, destLon: 101.6869, delayed: 0, progress: 0.65 },
  ];

  flights.forEach(f => insertFlight.run(f.id, f.flightNumber, f.airline, f.origin, f.destination, f.originLat, f.originLon, f.destLat, f.destLon, f.delayed, f.progress));
};

initDB();

app.get('/api/flights', (req, res) => {
  const stmt = db.prepare('SELECT * FROM flights');
  const flights = stmt.all();
  res.json(flights);
});

app.get('/api/flights/:id', (req, res) => {
  const stmt = db.prepare('SELECT * FROM flights WHERE id = ?');
  const flight = stmt.get(req.params.id);
  if (flight) {
    res.json(flight);
  } else {
    res.status(404).json({ error: 'Flight not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
