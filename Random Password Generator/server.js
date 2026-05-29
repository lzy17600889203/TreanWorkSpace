const express = require('express');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new Low(new JSONFile('db.json'), {
  history: [],
  preferences: {
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  }
});

let requestCount = 0;
const MAX_REQUESTS_PER_SECOND = 5;
const requestTimestamps = [];

async function initDb() {
  await db.read();
  if (!db.data.history) db.data.history = [];
  if (!db.data.preferences) {
    db.data.preferences = {
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true
    };
  }
  await db.write();
}

function rateLimitCheck() {
  const now = Date.now();
  requestTimestamps.push(now);
  const recentRequests = requestTimestamps.filter(t => now - t < 1000);
  requestTimestamps.length = recentRequests.length;
  
  if (recentRequests.length > MAX_REQUESTS_PER_SECOND) {
    return false;
  }
  return true;
}

function generateSecureRandom() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}

function generatePassword(options) {
  const { length, uppercase, lowercase, numbers, symbols } = options;
  
  let charset = '';
  if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) charset += '0123456789';
  if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (!charset) {
    return { success: false, error: '未选择任何字符集' };
  }
  
  const requiredTypes = [uppercase, lowercase, numbers, symbols].filter(Boolean).length;
  if (length < requiredTypes && requiredTypes > 0) {
    return { success: false, error: `长度小于所需字符种类（需要至少${requiredTypes}位）` };
  }
  
  let password = '';
  const remainingChars = [];
  
  if (uppercase) {
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    password += upperChars[Math.floor(generateSecureRandom() * upperChars.length)];
  }
  if (lowercase) {
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    password += lowerChars[Math.floor(generateSecureRandom() * lowerChars.length)];
  }
  if (numbers) {
    const numChars = '0123456789';
    password += numChars[Math.floor(generateSecureRandom() * numChars.length)];
  }
  if (symbols) {
    const symChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    password += symChars[Math.floor(generateSecureRandom() * symChars.length)];
  }
  
  for (let i = password.length; i < length; i++) {
    remainingChars.push(charset[Math.floor(generateSecureRandom() * charset.length)]);
  }
  
  for (let i = remainingChars.length - 1; i > 0; i--) {
    const j = Math.floor(generateSecureRandom() * (i + 1));
    [remainingChars[i], remainingChars[j]] = [remainingChars[j], remainingChars[i]];
  }
  
  password += remainingChars.join('');
  
  const shuffled = password.split('');
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(generateSecureRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return { success: true, password: shuffled.join('') };
}

function calculateStrength(password, options) {
  let score = 0;
  const { uppercase, lowercase, numbers, symbols } = options;
  
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 15;
  
  const typesUsed = [uppercase, lowercase, numbers, symbols].filter(Boolean).length;
  score += typesUsed * 10;
  
  if (/[A-Z]/.test(password) && uppercase) score += 10;
  if (/[a-z]/.test(password) && lowercase) score += 10;
  if (/[0-9]/.test(password) && numbers) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) && symbols) score += 10;
  
  return Math.min(score, 100);
}

app.get('/api/generate', async (req, res) => {
  requestCount++;
  
  if (!rateLimitCheck()) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const { 
    length = db.data.preferences.length, 
    uppercase = db.data.preferences.uppercase, 
    lowercase = db.data.preferences.lowercase, 
    numbers = db.data.preferences.numbers, 
    symbols = db.data.preferences.symbols 
  } = req.query;
  
  const options = {
    length: parseInt(length),
    uppercase: uppercase === 'true',
    lowercase: lowercase === 'true',
    numbers: numbers === 'true',
    symbols: symbols === 'true'
  };
  
  const result = generatePassword(options);
  
  if (!result.success) {
    return res.json({ success: false, error: result.error });
  }
  
  const strength = calculateStrength(result.password, options);
  
  const historyItem = {
    id: Date.now(),
    password: result.password,
    timestamp: new Date().toISOString(),
    length: options.length,
    uppercase: options.uppercase,
    lowercase: options.lowercase,
    numbers: options.numbers,
    symbols: options.symbols,
    strength
  };
  
  db.data.history.unshift(historyItem);
  if (db.data.history.length > 50) {
    db.data.history = db.data.history.slice(0, 50);
  }
  await db.write();
  
  res.json({ 
    success: true, 
    password: result.password, 
    strength,
    timestamp: historyItem.timestamp 
  });
});

app.get('/api/history', async (req, res) => {
  await db.read();
  res.json(db.data.history || []);
});

app.delete('/api/history/:id', async (req, res) => {
  await db.read();
  db.data.history = db.data.history.filter(item => item.id !== parseInt(req.params.id));
  await db.write();
  res.json({ success: true });
});

app.get('/api/preferences', async (req, res) => {
  await db.read();
  res.json(db.data.preferences || {});
});

app.post('/api/preferences', async (req, res) => {
  const { length, uppercase, lowercase, numbers, symbols } = req.body;
  
  db.data.preferences = {
    length: parseInt(length) || 16,
    uppercase: uppercase === true || uppercase === 'true',
    lowercase: lowercase === true || lowercase === 'true',
    numbers: numbers === true || numbers === 'true',
    symbols: symbols === true || symbols === 'true'
  };
  
  await db.write();
  res.json({ success: true, preferences: db.data.preferences });
});

app.get('/api/presets', (req, res) => {
  const presets = [
    {
      id: 'strong',
      name: '高强度密码',
      description: '包含所有字符',
      config: { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true }
    },
    {
      id: 'weak',
      name: '弱密码',
      description: '仅包含数字',
      config: { length: 8, uppercase: false, lowercase: false, numbers: true, symbols: false }
    },
    {
      id: 'invalid',
      name: '无效密码',
      description: '长度极短',
      config: { length: 2, uppercase: true, lowercase: true, numbers: true, symbols: true }
    },
    {
      id: 'confusing',
      name: '易混淆字符',
      description: '包含易混淆字符的组合',
      config: { length: 10, uppercase: true, lowercase: true, numbers: true, symbols: true }
    }
  ];
  res.json(presets);
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});