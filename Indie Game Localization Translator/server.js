const express = require('express');
const cors = require('cors');
const path = require('path');

// ------- 简易翻译引擎：本地词库优先 + MyMemory 免费 API 兜底 -------
const LOCAL_DICT = {
  // UI / 菜单
  'start new game': '开始新游戏',
  'continue': '继续游戏',
  'options': '设置',
  'language': '语言',
  'volume': '音量',
  'graphics': '画质',
  'save slot': '存档位',
  'load game': '读取存档',
  'credits & thanks': '制作人员 / 鸣谢',
  'credits': '制作人员',
  // 战斗
  'hit': '命中',
  'miss': '未命中',
  'critical blow': '暴击',
  'critical': '暴击',
  'damage': '伤害',
  'enemy': '敌人',
  'battlefield': '战场',
  'first blood': '首次击杀',
  // 物品
  'crimson elixir of eternal night': '永夜赤红药剂',
  'crimson elixir': '赤红药剂',
  'elixir': '药剂',
  'potion': '药水',
  'hp': '生命值',
  'restores': '恢复',
  'curses': '诅咒',
  'drinker': '饮用者',
  'treasures': '宝藏',
  'kingdom': '王国',
  // 任务 / 叙事
  'the hollow crown — a kingdom in eclipse': '空洞王冠 — 被食之国',
  'the hollow crown': '空洞王冠',
  'main quest': '主线任务',
  'quest': '任务',
  'disappearance': '失踪事件',
  'royal family': '王室',
  'broken line': '断代之序',
  'kings': '诸王',
  'investigate': '调查',
  'restore': '恢复',
  // 叙事
  'hero': '主角',
  'hero wakes up': '主角醒来',
  'cold damp cell': '阴冷潮湿的牢房',
  'no memory': '记忆全无',
  'previous night': '前一晚',
  'magistrate': '治安官',
  'at dawn': '于黎明',
  'finally awake': '终于醒了',
  'traveler': '旅人',
  'merchant': '商人',
  'shelves': '货架',
  'laden with': '堆满了',
  'every corner': '每个角落',
  'villain monologue': '反派独白',
  'stand in my way': '挡我路',
  'eclipse': '日食',
  'a thousand years': '千年之久',
  'old friend': '老朋友',
  'the only path': '唯一之路',
  'pact': '契约',
  'cannot be undone': '已无法挽回',
  'seventh seal': '第七封印',
  'was broken': '被打破',
  'stars': '星辰',
  'wept blood': '泣血',
  'silent earth': '死寂的大地',
  'thunder': '雷鸣',
  'sky splits open': '天崩地裂',
  'terrible roar': '恐怖咆哮',
  'lightning': '闪电',
  'illuminates': '照亮',
  'dead city': '死城',
  'beneath': '下方',
  'riddle': '谜语',
  'speak without a mouth': '无口而言',
  'hear without ears': '无耳而听',
  'no body': '无形之体',
  'come alive with the wind': '随风而动',
  'what am i': '我是谁',
  'sun rises': '太阳升起',
  'at last': '终于',
  'remembers': '铭记',
  'songs of your deeds': '传唱你的事迹',
  'echo through': '回荡于',
  'every valley': '每一道山谷',
  'consumes': '吞噬',
  'erased': '抹去',
  'silence reigns forever': '寂静永驻',
  // 系统
  'quicksave': '快速保存',
  'quickload': '快速读取',
  'progress': '进度',
  'autosaved': '自动保存',
  'at checkpoints': '在检查点',
  'press': '按下',
  'to': '以',
  'pack rat': '收集狂',
  'collect every single item': '收集所有物品',
  'prologue area': '序章区域',
  'speedrunner': '速通玩家',
  'complete the game': '通关游戏',
  'in under four hours': '在四小时内',
  'connection': '连接',
  'server': '服务器',
  'has been lost': '已失去',
  'please check': '请检查',
  'internet connection': '网络连接',
  'try again': '重试',
  // 通用单词 (放在后面，避免被整句匹配时干扰)
  'the': '的', 'you': '你', 'i': '我', 'is': '是', 'are': '是', 'and': '与', 'or': '或',
  'of': '的', 'in': '在', 'on': '在', 'to': '向', 'for': '为了', 'with': '与',
  'a': '一', 'an': '一', 'your': '你的', 'my': '我的', 'this': '这个', 'that': '那个',
  'but': '但是', 'it': '它', 'no': '无', 'not': '不', 'has': '有', 'have': '有',
  'into': '进入', 'from': '来自', 'at': '在', 'by': '由', 'as': '作为',
  'if': '如果', 'so': '所以', 'than': '比', 'then': '那么', 'its': '它的',
  'their': '他们的', 'them': '他们', 'they': '他们', 'we': '我们', 'our': '我们的',
  'every': '每一个', 'single': '单一', 'all': '全部', 'one': '一', 'two': '二',
  'first': '第一', 'new': '新的', 'game': '游戏', 'old': '古老的', 'young': '年轻的',
  'good': '好的', 'bad': '坏的', 'final': '最终', 'end': '结束', 'world': '世界',
  'city': '城市', 'town': '城镇', 'land': '土地', 'earth': '大地', 'sea': '海洋',
  'sky': '天空', 'sun': '太阳', 'moon': '月亮', 'wind': '风', 'fire': '火焰',
  'water': '水', 'stone': '岩石', 'blood': '血', 'name': '名字', 'book': '书',
  'time': '时间', 'way': '路', 'thing': '事物', 'things': '事物', 'man': '男人',
  'woman': '女人', 'people': '人民', 'friend': '朋友', 'enemy': '敌人',
  'power': '力量', 'life': '生命', 'death': '死亡', 'war': '战争',
  'peace': '和平', 'hope': '希望', 'fear': '恐惧', 'love': '爱', 'hate': '恨',
  'dark': '黑暗', 'light': '光', 'shadow': '影子', 'mist': '迷雾',
  'strange': '奇怪', 'figure': '身影', 'vanishes': '消失', 'for a moment': '片刻',
  'strike': '打击', 'strikes': '打击', 'blow': '一击', 'rings': '回荡', 'across': '遍布',
  'attack': '攻击', 'misses': '未命中', 'attack misses': '攻击未命中',
  'think': '认为', 'can': '能', 'stop': '阻止', 'me': '我', 'waited': '等待',
  'nothing': '什么都没有', 'will': '会', 'stand': '站', 'way': '路', 'now': '现在',
  'sorry': '抱歉', 'left': '剩下', 'only': '只有', 'path': '道路', 'undone': '撤销',
  'seal': '封印', 'broken': '被打破', 'themselves': '它们自己', 'upon': '在...之上',
  'silent': '寂静', 'splits': '裂开', 'open': '打开', 'terrible': '恐怖', 'roar': '咆哮',
  'illuminated': '被照亮', 'beneath': '在下面', 'speak': '说话', 'without': '没有',
  'mouth': '口', 'hear': '听', 'ears': '耳朵', 'body': '身体', 'come': '来',
  'alive': '活着', 'rises': '升起', 'remembers': '记住', 'songs': '歌曲',
  'deeds': '事迹', 'echo': '回荡', 'through': '穿过', 'valley': '山谷', 'valleys': '山谷',
  'forever': '永远', 'reigns': '统治', 'silence': '寂静',
  'connection': '连接', 'lost': '失去', 'please': '请', 'check': '检查',
  'internet': '互联网', 'again': '再次',
};

// 大小写不敏感查找：先尝试整句匹配，再尝试按词/小短语组合
function dictLookup(text) {
  if (!text) return '';
  const t = text.trim();
  const lower = t.toLowerCase();
  if (LOCAL_DICT[lower]) return LOCAL_DICT[lower];

  // 去掉末尾标点再查
  const cleaned = lower.replace(/[.!?,;:]+$/g, '');
  if (LOCAL_DICT[cleaned]) return LOCAL_DICT[cleaned];

  // 按句子切分再拼
  const parts = t.split(/([.!?,;:]+|\s+—\s+)/g);
  if (parts.length > 2) {
    const translated = parts
      .map((seg) => {
        const key = seg.trim().toLowerCase();
        if (!key.trim()) return seg;
        if (/^[.!?,;:]+$/.test(seg.trim())) return seg.trim();
        if (/^—/.test(seg.trim())) return ' — ';
        return LOCAL_DICT[key] || null;
      });
    if (translated.every((x) => x !== null)) {
      return translated.map((x) => (typeof x === 'string' ? x : '')).join('').replace(/\s+/g, ' ').trim();
    }
  }

  // 最后按单词尝试组合（只对短文本）
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 10) {
    const out = words.map((w) => {
      const k = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      return LOCAL_DICT[k] || w;
    }).join('');
    // 简单去重标点
    return out.replace(/[，。]{2,}/g, '。');
  }
  return '';
}

async function callMyMemory(text) {
  try {
    const url = 'https://api.mymemory.translated.net/get?q='
      + encodeURIComponent(text) + '&langpair=en|zh-CN';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data && data.responseData && data.responseData.translatedText;
    if (translated && translated !== text) return String(translated).trim();
  } catch (_e) { /* 静默降级 */ }
  return null;
}

async function translate(text) {
  if (!text) return '';
  const local = dictLookup(text);
  if (local) return local;

  // 按句号/问号/感叹号分句，每句独立翻译后再拼起来
  const sentenceRe = /([.!?。！？]+|\s+—\s+)/;
  const segments = text.split(sentenceRe).filter((s) => s.length > 0);
  const outParts = [];
  let remoteNeeded = false;
  for (const seg of segments) {
    if (/^[.!?。！？—\s]+$/.test(seg)) {
      outParts.push(seg.trim());
      continue;
    }
    const partial = dictLookup(seg);
    if (partial) {
      outParts.push(partial);
    } else {
      // 这一句词库覆盖不了，尝试走在线
      remoteNeeded = true;
      outParts.push('__NEED_REMOTE__' + seg);
    }
  }

  if (remoteNeeded) {
    // 整句走一次在线 API（对整段质量更好）
    const remote = await callMyMemory(text);
    if (remote) return remote;
  }

  // 没有在线结果（或全是 local）→ 按现有 partial 输出
  const fallback = outParts.map((p) => {
    if (p.startsWith('__NEED_REMOTE__')) {
      const sub = p.slice('__NEED_REMOTE__'.length);
      // 再走一次按词兜底
      const words = sub.split(/\s+/).filter(Boolean);
      if (words.length > 20) return sub; // 太长就原文，让用户手翻
      return words.map((w) => {
        const k = w.toLowerCase().replace(/[^a-z0-9]/g, '');
        return LOCAL_DICT[k] || w;
      }).join('');
    }
    return p;
  }).join('');
  return fallback.replace(/\s+/g, ' ').trim();
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== In-memory "SQLite-like" store (无原生依赖,可直接启动)
// 保留与 SQLite 等价的字段语义: key 唯一、可 UPDATE、可按状态统计
let rows = [];

function makeSampleEntries(preset) {
  const pool = [
    { key: 'dialog.hero_wake', text: 'The hero wakes up in a cold, damp cell with no memory of the previous night.', chapter: '序章' },
    { key: 'dialog.guard_1', text: 'Hey, you! You are finally awake. The Magistrate wants to see you at dawn.', chapter: '序章' },
    { key: 'ui.start_game', text: 'Start New Game', chapter: '序章' },
    { key: 'ui.continue', text: 'Continue', chapter: '序章' },
    { key: 'ui.options', text: 'Options', chapter: '序章' },
    { key: 'item.potion_name', text: 'Crimson Elixir of Eternal Night', chapter: '第一章' },
    { key: 'item.potion_desc', text: 'A viscous red potion that restores 150 HP but curses the drinker for one hour.', chapter: '第一章' },
    { key: 'npc.merchant_hello', text: 'Welcome, traveler! My shelves are laden with treasures from every corner of the kingdom.', chapter: '第一章' },
    { key: 'quest.main_title', text: 'The Hollow Crown — A Kingdom in Eclipse', chapter: '第一章' },
    { key: 'quest.main_desc', text: 'Investigate the strange disappearance of the royal family and restore the broken line of kings.', chapter: '第一章' },
    { key: 'battle.hit', text: 'You strike the enemy for 34 damage! A critical blow rings across the battlefield.', chapter: '第二章' },
    { key: 'battle.miss', text: 'Your attack misses. The shadowy figure vanishes into the mist for a moment.', chapter: '第二章' },
    { key: 'dialog.villain_monologue', text: 'You think you can stop me? I have waited a thousand years for this eclipse — nothing will stand in my way now.', chapter: '第三章' },
    { key: 'dialog.ally_betray', text: 'I am sorry, old friend. This is the only path I have left. The pact cannot be undone.', chapter: '第三章' },
    { key: 'lore.ancient_text', text: 'And so the Seventh Seal was broken, and the stars themselves wept blood upon the silent earth.', chapter: '第三章' },
    { key: 'ui.save_slot', text: 'Save Slot', chapter: '第三章' },
    { key: 'ui.load_game', text: 'Load Game', chapter: '第三章' },
    { key: 'ui.credits', text: 'Credits & Thanks', chapter: '第三章' },
    { key: 'weather.thunder', text: 'The sky splits open with a terrible roar, and lightning illuminates the dead city beneath.', chapter: '第四章' },
    { key: 'puzzle.riddle', text: 'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?', chapter: '第四章' },
    { key: 'ending.good', text: 'The sun rises at last. The kingdom remembers your name, and songs of your deeds echo through every valley.', chapter: '终章' },
    { key: 'ending.bad', text: 'The eclipse consumes the world. Your name is erased from every book, and silence reigns forever.', chapter: '终章' },
    { key: 'menu.language', text: 'Language', chapter: '序章' },
    { key: 'menu.volume', text: 'Volume', chapter: '序章' },
    { key: 'menu.graphics', text: 'Graphics', chapter: '序章' },
    { key: 'tooltip.save_hint', text: 'Press F5 to quicksave. Press F9 to quickload. Your progress is autosaved at checkpoints.', chapter: '序章' },
    { key: 'achievement.first_blood', text: 'First Blood — Defeat an enemy in combat for the very first time.', chapter: '序章' },
    { key: 'achievement.pack_rat', text: 'Pack Rat — Collect every single item in the prologue area.', chapter: '序章' },
    { key: 'achievement.speedrunner', text: 'Speedrunner — Complete the game in under four hours.', chapter: '终章' },
    { key: 'error.network', text: 'Connection to the server has been lost. Please check your internet connection and try again.', chapter: '序章' },
  ];

  const list = pool.map((p) => {
    return {
      key: p.key,
      original: p.text,
      chapter: p.chapter,
      translated: '',
      status: 'pending',
      note: '',
      updated_at: Date.now()
    };
  });

  if (preset === 'sprint') {
    list.forEach((e, i) => {
      if (i === list.length - 1) {
        e.status = 'pending';
        e.translated = '';
      } else {
        e.status = 'proofread';
        e.translated = '【校对译文】' + e.original + ' 的本地化版本';
      }
    });
  } else if (preset === 'term-conflict') {
    list.forEach((e) => {
      if (e.chapter === '第三章') {
        e.status = 'proofread';
        e.translated = e.original + ' — 第三章统一译法';
      } else if (e.key === 'ui.start_game') {
        e.status = 'mt';
        e.translated = '开始新游戏';
        e.note = '该词汇在第三章已有其他译法';
      } else {
        e.status = 'pending';
      }
    });
  } else if (preset === 'mt-disaster') {
    list.forEach((e) => {
      e.status = 'mt';
      e.translated = '¡#$% 鏂版父娴锋磱闆烽洦 乱码般的机器翻译结果 乱码 乱码';
      e.note = '机翻质量差,需人工紧急介入';
    });
  } else if (preset === 'import') {
    list.forEach((e) => {
      e.status = 'pending';
      e.translated = '';
    });
  }
  return list;
}

function seed(preset) {
  rows = makeSampleEntries(preset || 'sprint');
}

function getStats() {
  const stats = { total: rows.length, proofread: 0, mt: 0, pending: 0 };
  rows.forEach((r) => { stats[r.status] = (stats[r.status] || 0) + 1; });
  return stats;
}

seed('sprint');

app.get('/api/translations', (_req, res) => {
  res.json({ total: rows.length, rows });
});

app.get('/api/translations/:key', (req, res) => {
  const row = rows.find((r) => r.key === req.params.key);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.post('/api/translations/:key', (req, res) => {
  const { translated, status, note } = req.body || {};
  const row = rows.find((r) => r.key === req.params.key);
  if (!row) return res.status(404).json({ error: 'not found' });
  row.translated = translated || '';
  row.status = status || 'pending';
  row.note = note || row.note || '';
  row.updated_at = Date.now();
  res.json({ ok: true, key: row.key });
});

// ---- 机翻接口：先本地词库、失败再走 MyMemory、再失败按词组合 ----
app.post('/api/translate/:key', async (req, res) => {
  const key = req.params.key;
  const row = rows.find((r) => r.key === key);
  if (!row) return res.status(404).json({ error: 'not found' });
  const translated = await translate(row.original);
  // 即使翻译失败也要回写，方便用户看到确实尝试过
  row.translated = translated || '';
  row.status = 'mt';
  row.note = translated ? '' : '（本地词库未覆盖，且在线翻译不可用，请人工翻译）';
  row.updated_at = Date.now();
  res.json({ ok: true, key: row.key, translated: row.translated, status: row.status, note: row.note });
});

// ---- 批量机翻：把当前状态为 pending 的条目全部翻译一遍 ----
app.post('/api/translate-all', async (_req, res) => {
  const targets = rows.filter((r) => r.status === 'pending' || !r.translated);
  let done = 0;
  for (const r of targets) {
    const t = await translate(r.original);
    if (t) {
      r.translated = t;
      r.status = 'mt';
      r.updated_at = Date.now();
      done += 1;
    }
  }
  res.json({ ok: true, total: targets.length, translated: done });
});

app.post('/api/seed', (req, res) => {
  const { preset } = req.body || {};
  seed(preset);
  res.json({ ok: true, preset });
});

app.get('/api/stats', (_req, res) => {
  res.json(getStats());
});

app.listen(PORT, () => {
  console.log(`[Localization Translator] running at http://localhost:${PORT}`);
  console.log(`  演示状态: sprint / term-conflict / mt-disaster / import`);
});
