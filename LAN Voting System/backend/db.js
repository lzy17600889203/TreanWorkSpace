const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../database/votes.json');

const defaultData = {
  topic: '你最喜欢的编程语言是？',
  options: [
    { id: 1, name: 'JavaScript', votes: 0 },
    { id: 2, name: 'Python', votes: 0 },
    { id: 3, name: 'Java', votes: 0 },
    { id: 4, name: 'Go', votes: 0 }
  ],
  totalVotes: 0,
  createdAt: Date.now()
};

function initDB() {
  if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
  }
}

function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return defaultData;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getVotes() {
  return readDB();
}

function addVote(optionId) {
  const data = readDB();
  const optionIdNum = parseInt(optionId, 10);
  const option = data.options.find(opt => opt.id === optionIdNum);
  if (option) {
    option.votes++;
    data.totalVotes++;
    writeDB(data);
  }
  return data;
}

function resetVotes() {
  writeDB(defaultData);
  return defaultData;
}

function setScenario(scenario) {
  let data;
  switch (scenario) {
    case 'balanced':
      data = {
        topic: '势均力敌的双选对决 - 咖啡 vs 茶',
        options: [
          { id: 1, name: '咖啡', votes: 50 },
          { id: 2, name: '茶', votes: 50 }
        ],
        totalVotes: 100,
        createdAt: Date.now()
      };
      break;
    case 'landslide':
      data = {
        topic: '一边倒的碾压局 - 猫 vs 狗',
        options: [
          { id: 1, name: '猫', votes: 999 },
          { id: 2, name: '狗', votes: 1 }
        ],
        totalVotes: 1000,
        createdAt: Date.now()
      };
      break;
    case 'cold':
      data = {
        topic: '无人参与的冷场开局',
        options: [
          { id: 1, name: '选项A', votes: 0 },
          { id: 2, name: '选项B', votes: 0 },
          { id: 3, name: '选项C', votes: 0 }
        ],
        totalVotes: 0,
        createdAt: Date.now()
      };
      break;
    case 'tie':
      data = {
        topic: '平票僵局状态',
        options: [
          { id: 1, name: '红方', votes: 33 },
          { id: 2, name: '蓝方', votes: 33 },
          { id: 3, name: '绿方', votes: 33 }
        ],
        totalVotes: 99,
        createdAt: Date.now()
      };
      break;
    default:
      data = defaultData;
  }
  writeDB(data);
  return data;
}

function setOverflowTest() {
  const data = {
    topic: '恶意刷票数值溢出测试',
    options: [
      { id: 1, name: '疯狂刷票', votes: Number.MAX_SAFE_INTEGER + 1 },
      { id: 2, name: '正常投票', votes: 100 }
    ],
    totalVotes: Number.MAX_SAFE_INTEGER + 101,
    createdAt: Date.now()
  };
  writeDB(data);
  return data;
}

function setConcurrencyTest() {
  const data = {
    topic: '并发计算错误测试',
    options: [
      { id: 1, name: '选项1', votes: 100 },
      { id: 2, name: '选项2', votes: 200 },
      { id: 3, name: '选项3', votes: 300 }
    ],
    totalVotes: 599,
    createdAt: Date.now()
  };
  writeDB(data);
  return data;
}

initDB();

module.exports = {
  getVotes,
  addVote,
  resetVotes,
  setScenario,
  setOverflowTest,
  setConcurrencyTest
};