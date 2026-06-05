const express = require('express');
const path = require('path');
const cors = require('cors');
const net = require('net');

const { initDB } = require('./db/database');
const reservationRouter = require('./routes/reservation');
const verifyRouter = require('./routes/verify');

const app = express();
const DEFAULT_PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

initDB();

app.use('/api/reservation', reservationRouter);
app.use('/api/verify', verifyRouter);

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/verify', function(req, res) {
  res.sendFile(path.join(__dirname, '../public/verify.html'));
});

const checkPort = function(port) {
  return new Promise(function(resolve, reject) {
    const server = net.createServer()
      .once('error', function(err) {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          reject(err);
        }
      })
      .once('listening', function() {
        server.close();
        resolve(true);
      })
      .listen(port);
  });
};

const findAvailablePort = async function(startPort) {
  let port = startPort;
  while (!(await checkPort(port))) {
    console.log('端口 ' + port + ' 已被占用，尝试 ' + (port + 1) + '...');
    port++;
  }
  return port;
};

const startServer = async function() {
  try {
    const port = await findAvailablePort(DEFAULT_PORT);
    app.listen(port, function() {
      console.log('\n=== 访客预约与核验系统 ===');
      console.log('服务器已启动: http://localhost:' + port);
      console.log('预约页面: http://localhost:' + port);
      console.log('核验页面: http://localhost:' + port + '/verify');
      console.log('==========================\n');
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

startServer();
