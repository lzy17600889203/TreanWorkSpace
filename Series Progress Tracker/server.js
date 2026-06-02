const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(__dirname));

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = [
      { id: 1, name: '狂飙', totalEpisodes: 39, currentEpisode: 10, status: 'watching' },
      { id: 2, name: '海贼王', totalEpisodes: 0, currentEpisode: 1080, status: 'ongoing' },
      { id: 3, name: '三体', totalEpisodes: 30, currentEpisode: 30, status: 'completed' },
      { id: 4, name: '开端', totalEpisodes: 15, currentEpisode: 5, status: 'watching' }
    ];
    writeData(initialData);
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/series', (req, res) => {
  const data = readData();
  res.json(data);
});

app.post('/api/series', (req, res) => {
  const data = readData();
  const newSeries = {
    id: data.length > 0 ? Math.max(...data.map(s => s.id)) + 1 : 1,
    name: req.body.name,
    totalEpisodes: req.body.totalEpisodes || 0,
    currentEpisode: req.body.currentEpisode || 0,
    status: req.body.status || 'watching'
  };
  data.push(newSeries);
  writeData(data);
  res.json(newSeries);
});

app.put('/api/series/:id', (req, res) => {
  const data = readData();
  const index = data.findIndex(s => s.id === parseInt(req.params.id));
  if (index !== -1) {
    const original = data[index];
    let updated = { ...original, ...req.body };
    
    // 后端限制：确保已完结剧集的已看集数不超过总集数
    if (updated.totalEpisodes > 0 && updated.currentEpisode > updated.totalEpisodes) {
      updated.currentEpisode = updated.totalEpisodes;
      updated.status = 'completed';
    }
    
    // 确保集数不为负
    updated.currentEpisode = Math.max(0, updated.currentEpisode);
    
    data[index] = updated;
    writeData(data);
    res.json(data[index]);
  } else {
    res.status(404).json({ error: 'Series not found' });
  }
});

app.delete('/api/series/:id', (req, res) => {
  let data = readData();
  data = data.filter(s => s.id !== parseInt(req.params.id));
  writeData(data);
  res.json({ message: 'Series deleted' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
