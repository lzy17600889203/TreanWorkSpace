const express = require('express');
const cors = require('cors');
const net = require('net');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let surveys = [];
let responses = [];
let surveyIdCounter = 1;
let responseIdCounter = 1;

if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    surveys = data.surveys || [];
    responses = data.responses || [];
    surveyIdCounter = data.surveyIdCounter || 1;
    responseIdCounter = data.responseIdCounter || 1;
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        surveys,
        responses,
        surveyIdCounter,
        responseIdCounter
    }, null, 2));
}

app.get('/api/surveys', (req, res) => {
    res.json(surveys);
});

app.post('/api/surveys', (req, res) => {
    const { title, structure } = req.body;
    const survey = {
        id: surveyIdCounter++,
        title,
        structure,
        created_at: new Date().toISOString()
    };
    surveys.push(survey);
    saveData();
    res.json(survey);
});

app.get('/api/surveys/:id', (req, res) => {
    const survey = surveys.find(s => s.id == req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.json(survey);
});

app.post('/api/surveys/:id/responses', (req, res) => {
    const { answers } = req.body;
    const response = {
        id: responseIdCounter++,
        survey_id: parseInt(req.params.id),
        answers,
        submitted_at: new Date().toISOString()
    };
    responses.push(response);
    saveData();
    res.json(response);
});

app.get('/api/surveys/:id/responses', (req, res) => {
    const surveyResponses = responses.filter(r => r.survey_id == req.params.id);
    res.json(surveyResponses);
});

function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
}

async function startServer() {
    try {
        const availablePort = await findAvailablePort(PORT);
        if (availablePort !== PORT) {
            console.log(`端口 ${PORT} 被占用，改用端口 ${availablePort}`);
        }
        app.listen(availablePort, () => {
            console.log(`服务器运行在 http://localhost:${availablePort}`);
        });
    } catch (err) {
        console.error('启动服务器失败:', err);
    }
}

startServer();
