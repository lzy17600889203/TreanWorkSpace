const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const db = new sqlite3.Database('./game_of_life.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the game_of_life database.');
});

db.run(`CREATE TABLE IF NOT EXISTS patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_name TEXT,
  generation INTEGER,
  alive_count INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

function countAliveNeighbors(grid, x, y, width, height, wrapAround) {
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      let nx = x + dx;
      let ny = y + dy;
      
      if (wrapAround) {
        nx = (nx + width) % width;
        ny = (ny + height) % height;
      } else {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      }
      
      if (grid[ny] && grid[ny][nx]) {
        count++;
      }
    }
  }
  return count;
}

function nextGeneration(grid, width, height, wrapAround, rules) {
  const newGrid = Array(height).fill(null).map(() => Array(width).fill(false));
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const neighbors = countAliveNeighbors(grid, x, y, width, height, wrapAround);
      const isAlive = grid[y][x];
      
      if (isAlive) {
        if (rules.survive.includes(neighbors)) {
          newGrid[y][x] = true;
        }
      } else {
        if (rules.birth.includes(neighbors)) {
          newGrid[y][x] = true;
        }
      }
    }
  }
  
  return newGrid;
}

app.post('/api/next-gen', (req, res) => {
  const { grid, width, height, wrapAround, rules } = req.body;
  
  if (!grid || !Array.isArray(grid) || grid.length !== height) {
    return res.status(400).json({ error: 'Invalid grid data' });
  }
  
  const defaultRules = {
    survive: [2, 3],
    birth: [3]
  };
  
  const appliedRules = rules || defaultRules;
  
  try {
    const nextGrid = nextGeneration(grid, width, height, wrapAround, appliedRules);
    res.json({ grid: nextGrid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patterns', (req, res) => {
  db.all('SELECT id, name, width, height, created_at FROM patterns', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/patterns/:id', (req, res) => {
  db.get('SELECT * FROM patterns WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Pattern not found' });
      return;
    }
    row.data = JSON.parse(row.data);
    res.json(row);
  });
});

app.post('/api/patterns', (req, res) => {
  const { name, data, width, height } = req.body;
  const dataStr = JSON.stringify(data);
  
  db.run('INSERT INTO patterns (name, data, width, height) VALUES (?, ?, ?, ?)', 
    [name, dataStr, width, height], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, width, height });
    }
  );
});

app.delete('/api/patterns/:id', (req, res) => {
  db.run('DELETE FROM patterns WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Pattern deleted' });
  });
});

app.post('/api/history', (req, res) => {
  const { pattern_name, generation, alive_count } = req.body;
  db.run('INSERT INTO history (pattern_name, generation, alive_count) VALUES (?, ?, ?)', 
    [pattern_name, generation, alive_count], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/history', (req, res) => {
  db.all('SELECT * FROM history ORDER BY timestamp DESC LIMIT 100', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
