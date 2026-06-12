(() => {
  'use strict';

  const body = document.body;
  const $ = (sel) => document.querySelector(sel);

  const stateMap = {
    secure:   { cls: 'state-secure',   tag: '状态: SECURE · 极度安全',  daysAgo: 1,   shieldColor: 'var(--green)' },
    warning:  { cls: 'state-warning',  tag: '状态: WARNING · 触发预警',  daysAgo: 300, shieldColor: 'var(--warn)'  },
    deadman:  { cls: 'state-deadman',  tag: '状态: DEAD-MAN · 紧急解锁', daysAgo: 366, shieldColor: 'var(--danger)'},
    fresh:    { cls: 'state-fresh',    tag: '状态: FRESH · 全新封存',    daysAgo: 0,   shieldColor: '#aaa'        }
  };

  async function api(path, opts) {
    const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    return r.json();
  }

  function applyState(stateName, daysSinceLogin) {
    body.classList.remove('state-fresh', 'state-secure', 'state-warning', 'state-deadman');
    body.classList.add(stateMap[stateName].cls);
    $('#vaultStatusTag').textContent = stateMap[stateName].tag;

    $('#daysSinceLogin').textContent = daysSinceLogin === 0
      ? '从未登录'
      : `${daysSinceLogin} 天前`;

    const shield = $('#shield');
    const label = shield.querySelector('.shield-label');
    const value = shield.querySelector('.shield-value');
    shield.style.borderColor = stateMap[stateName].shieldColor;
    shield.style.background = 'rgba(20, 40, 50, 0.35)';
    label.style.color = stateMap[stateName].shieldColor;
    value.style.color = stateMap[stateName].shieldColor;

    // 倒计时
    const remaining = Math.max(0, 365 - daysSinceLogin);
    $('#countdownDigits').textContent = String(remaining).padStart(3, '0');
    $('#countdownFill').style.width = `${(remaining / 365) * 100}%`;

    // 内部数据流
    if (stateName === 'deadman') {
      startInsideStream();
    }
  }

  function startInsideStream() {
    const stream = $('#insideStream');
    const samples = [
      '0xDEADBEEF :: 账号凭证已提取',
      '0xCAFEBABE :: 日记条目解密中',
      '[GMAIL] user@void.net :: 已释放',
      '[GITHUB] cyber_relic_42 :: SSH key 导出',
      '[DISCORD] #will_channel :: 遗嘱消息发布',
      '0x4D4C574 :: 邮件队列: next-of-kin@cyber-relic.void',
      '[CRYPTO WALLET] mnemonic 已归档',
      '>>> 死人开关已触发 · 数字遗物正在发送 <<<',
      '0xRELIC :: 数据永远存在, 就像你从未离开'
    ];
    let i = 0;
    stream.innerHTML = '';
    const tick = () => {
      if (!body.classList.contains('state-deadman')) return;
      const line = document.createElement('div');
      line.textContent = samples[i % samples.length];
      stream.insertBefore(line, stream.firstChild);
      while (stream.children.length > 8) stream.removeChild(stream.lastChild);
      i++;
      setTimeout(tick, 650);
    };
    tick();
  }

  function toast(msg, color) {
    const el = $('#toast');
    el.textContent = msg;
    el.style.borderLeftColor = color || 'var(--ice)';
    el.style.color = color || 'var(--ice)';
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2800);
  }

  // =================== 状态按钮 ===================
  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const state = btn.dataset.state;
      const s = stateMap[state];
      const data = await api('/api/set-login', {
        method: 'POST',
        body: JSON.stringify({ daysAgo: s.daysAgo })
      });
      applyState(state, data.daysSinceLogin);
      toast(`▶ 已切换至 ${state.toUpperCase()} 状态`, s.shieldColor);
    });
  });

  // =================== 主密码解锁 ===================
  $('#unlockBtn').addEventListener('click', async () => {
    const pwd = $('#masterPass').value;
    if (!pwd) { toast('⚠ 请输入主密码', 'var(--warn)'); return; }

    try {
      // 用 Web Crypto 模拟客户端密码校验哈希
      const buf = new TextEncoder().encode(pwd);
      const hashBuf = await crypto.subtle.digest('SHA-256', buf);
      const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

      $('#lockDial').style.animation = 'spin 0.3s linear 3';
      toast(`🔐 密码锁校验中... SHA-256: ${hash.slice(0, 16)}...`);

      // 实际演示: 密码只是 "demo-master-password"
      if (pwd !== 'demo-master-password') {
        setTimeout(() => toast('✗ 密码错误 · 拒绝访问', 'var(--danger)'), 500);
        return;
      }
      setTimeout(() => {
        toast('✓ 保险箱解锁成功 · 数据库已开放', 'var(--green)');
        $('#dataSection').hidden = false;
        loadEntries();
      }, 600);
    } catch (e) {
      toast('WebCrypto 错误: ' + e.message, 'var(--danger)');
    }
  });

  // =================== 紧急联系人密钥 ===================
  $('#emergencyBtn').addEventListener('click', async () => {
    const key = $('#emergencyKey').value.trim();
    if (!key) { toast('⚠ 请输入紧急联系人密钥', 'var(--warn)'); return; }
    const r = await api('/api/emergency-unlock', {
      method: 'POST', body: JSON.stringify({ key })
    });
    if (r.ok) {
      // 触发死人开关
      await api('/api/trigger-deadman', { method: 'POST' });
      applyState('deadman', 366);
      toast('⚰ 死人开关已触发 · 遗嘱邮件正在发送', 'var(--danger)');
      $('#dataSection').hidden = false;
      loadEntries();
    } else {
      toast('✗ 紧急密钥错误', 'var(--danger)');
    }
  });

  // =================== 加密封存 ===================
  $('#encryptSaveBtn').addEventListener('click', async () => {
    const category = $('#entryCat').value;
    const title = $('#entryTitle').value.trim();
    const content = $('#entryContent').value.trim();
    const password = $('#masterPass').value || 'demo-master-password';

    if (!title || !content) {
      toast('⚠ 标题与内容不能为空', 'var(--warn)');
      return;
    }

    // 演示: 使用 Web Crypto 做一次客户端加密再发送
    try {
      const key = await deriveClientKey(password);
      const { ciphertext, iv } = await clientEncrypt(content, key);
      console.log('[CLIENT WebCrypto] IV:', iv, 'CT:', ciphertext.slice(0, 40) + '...');
    } catch (e) { console.warn('client crypto skipped:', e.message); }

    const r = await api('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ category, title, content, password })
    });
    if (r.id) {
      $('#entryTitle').value = '';
      $('#entryContent').value = '';
      toast(`☠ 已加密封存 · AES-256-GCM · ID ${r.id}`, 'var(--green)');
      loadEntries();
    } else {
      toast('封存失败', 'var(--danger)');
    }
  });

  async function deriveClientKey(password) {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey(
      'raw', enc.encode(password),
      { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('cyber-vault-salt'), iterations: 100000, hash: 'SHA-256' },
      keyMat, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
  }
  async function clientEncrypt(text, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
    return { ciphertext: btoa(String.fromCharCode(...new Uint8Array(ct))), iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('') };
  }

  // =================== 条目列表 ===================
  let allEntries = [];
  let currentCat = 'all';

  async function loadEntries() {
    allEntries = await api('/api/entries');
    renderEntries();
  }

  function renderEntries() {
    const list = $('#entriesList');
    const filtered = currentCat === 'all' ? allEntries : allEntries.filter(e => e.category === currentCat);
    if (filtered.length === 0) {
      list.innerHTML = '<div class="entries-hint">⚠ 暂无封存数据 · 请在上方添加</div>';
      return;
    }
    list.innerHTML = '';
    for (const e of filtered) {
      const row = document.createElement('div');
      row.className = 'entry-row';
      row.dataset.cat = e.category;
      row.innerHTML = `
        <span class="entry-cat">${e.category}</span>
        <span class="entry-title">▣ 标题已加密 · 点击以主密码解密查看</span>
        <span class="entry-date">${new Date(e.created_at * 1000).toLocaleString()}</span>
      `;
      row.addEventListener('click', () => openEntry(e.id));
      list.appendChild(row);
    }
  }

  async function openEntry(id) {
    const pwd = $('#masterPass').value || 'demo-master-password';
    const r = await api(`/api/entries/${id}/decrypt`, {
      method: 'POST', body: JSON.stringify({ password: pwd })
    });
    if (r.error) { toast('✗ 密码不匹配 · 无法解密', 'var(--danger)'); return; }
    $('#modalTitle').textContent = `[${r.category}] ${r.title}`;
    $('#modalContent').textContent = r.content;
    $('#modal').hidden = false;
  }

  $('#modalClose').addEventListener('click', () => { $('#modal').hidden = true; });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderEntries();
    });
  });

  // =================== 初始化 ===================
  (async () => {
    const st = await api('/api/status');
    // 首次进入, 强制展示 FRESH 状态
    applyState('fresh', 0);
    toast('◆ 欢迎来到赛博保险箱 · 点击下方按钮切换演示状态');
  })();
})();
