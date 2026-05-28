const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

app.get('/api/votes', (req, res) => {
  const data = db.getVotes();
  res.json(data);
});

app.post('/api/vote', (req, res) => {
  const { optionId } = req.body;
  const data = db.addVote(optionId);
  res.json(data);
});

app.post('/api/reset', (req, res) => {
  const data = db.resetVotes();
  res.json(data);
});

app.post('/api/scenario/:name', (req, res) => {
  const { name } = req.params;
  const data = db.setScenario(name);
  res.json(data);
});

app.post('/api/test/overflow', (req, res) => {
  const data = db.setOverflowTest();
  res.json(data);
});

app.post('/api/test/concurrency', (req, res) => {
  const data = db.setConcurrencyTest();
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});