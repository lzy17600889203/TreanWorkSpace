const express = require('express');
const cors = require('cors');
const path = require('path');
const net = require('net');
const { initDatabase } = require('./database');
const scheduleRoutes = require('./routes/schedule');

const app = express();
const DEFAULT_PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api', scheduleRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      server.close();
      resolve(startPort);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    
    const port = await findAvailablePort(DEFAULT_PORT);
    if (port !== DEFAULT_PORT) {
      console.log(`Port ${DEFAULT_PORT} is in use, using port ${port} instead`);
    }
    
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();
