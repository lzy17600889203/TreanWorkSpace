const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { initDatabase } = require('./database');
const OrderBook = require('./orderbook');
const DataGenerator = require('./dataGenerator');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;

initDatabase();

const orderBook = new OrderBook();
const dataGenerator = new DataGenerator(orderBook);
dataGenerator.initializeOrderBook();

app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  ws.send(JSON.stringify({
    type: 'snapshot',
    data: orderBook.getSnapshot()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'scene') {
      dataGenerator.setScene(data.scene);
      if (data.scene === 'flashcrash') {
        dataGenerator.crashStarted = false;
      }
      if (data.scene === 'normal' || data.scene === 'battle' || data.scene === 'drought' || data.scene === 'pump') {
        dataGenerator.initializeOrderBook();
      }
      clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'scene', data: data.scene }));
          }
        });
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

const broadcast = (message) => {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

let updateInterval = 50;

setInterval(() => {
  const update = dataGenerator.generateUpdate();
  broadcast(update);
}, updateInterval);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server on ws://localhost:${PORT}/ws`);
});
