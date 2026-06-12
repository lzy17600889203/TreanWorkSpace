(() => {
  'use strict';

  const body = document.body;
  const $ = (sel) => document.querySelector(sel);

  const stateMap = {
    secure:  { cls: 'state-secure',  tag: '状态: SECURE · 极度安全', daysAgo: 1 },
    warning: { cls: 'state-warning', tag: '状态: WARNING · 触发预警', daysAgo: 300 },
    deadman: { cls: 'state-deadman', tag: '状态: DEAD-MAN · 紧急解锁', daysAgo: 366 },
    fresh:   { cls: 'state-fresh',   tag: '状态: FRESH · 全新封存', daysAgo: 0 }
  };

  const DEFAULTS = {
    masterPassword: 'demo-master-password',
    emergencyKey: 'EMERGENCY-KEY-2077-RELIC'
  };

  async function api(path, opts) {
    const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    return r.json();
  }

  function applyState(stateName, daysSinceLogin) {
    body.classList.remove('state-fresh', 'state-secure', 'state-warning', 'state-deadman');
    body.classList.add(stateMap[stateName].cls);
    $('#vaultStatusTag').textContent = stateMap[stateName].tag;

    $('#daysSinceLogin').textContent = daysSinceLogin === 0 ? '从未登录' : `${daysSinceLogin} 天前`;

    const remaining = Math.max(0, 365 - daysSinceLogin);
    $('#countdownDigits').textContent = String(remaining).padStart(3, '0');
    $('#countdownFill').style.width = `${(remaining / 365) * 100}%`;

    if (stateName === 'deadman') startInsideStream();
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

  // ================= 状态按钮 =================
  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const state = btn.dataset.state;
      const s = stateMap[state];
      const data = await api('/api/set-login', {
        method: 'POST',
        body: JSON.stringify({ daysAgo: s.daysAgo })
      });
      applyState(state, data.daysSinceLogin);
      toast(`▶ 已切换至 ${state.toUpperCase()} 状态`, state === 'deadman' ? 'var(--danger)' : (state === 'warning' ? 'var(--warn)' : 'var(--green)'));
    });
  });

  // ================= 主密码 UNLOCK =================
  function tryUnlock(pwd) {
    if (!pwd) { toast('⚠ 请输入主密码', 'var(--warn)'); return false; }
    if (pwd !== DEFAULTS.masterPassword) {
      toast('✗ 密码错误 · 拒绝访问', 'var(--danger)');
      return false;
    }
    toast('✓ 保险箱解锁成功 · 数据库已开放', 'var(--green)');
    loadEntries();
    return true;
  }

  $('#unlockBtn').addEventListener('click', () => tryUnlock($('#masterPass').value.trim()));
  $('#masterPass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock(e.target.value.trim());
  });

  // 紧急密钥
  $('#emergencyBtn').addEventListener('click', async () => {
    const key = $('#emergencyKey').value.trim();
    if (!key) { toast('⚠ 请输入紧急联系人密钥', 'var(--warn)'); return; }
    const r = await api('/api/emergency-unlock', {
      method: 'POST', body: JSON.stringify({ key })
    });
    if (r.ok) {
      await api('/api/trigger-deadman', { method: 'POST' });
      applyState('deadman', 366);
      loadEntries();
      toast('⚰ 死人开关已触发 · 遗嘱邮件正在发送', 'var(--danger)');
    } else {
      toast('✗ 紧急密钥错误', 'var(--danger)');
    }
  });
  $('#emergencyKey').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#emergencyBtn').click();
  });

  // ================= 加密封存新条目 =================
  $('#encryptSaveBtn').addEventListener('click', async () => {
    const category = $('#entryCat').value;
    const title = $('#entryTitle').value.trim();
    const content = $('#entryContent').value.trim();
    const password = $('#masterPass').value.trim() || DEFAULTS.masterPassword;

    if (!title || !content) {
      toast('⚠ 标题与内容不能为空', 'var(--warn)');
      return;
    }

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
      toast('封存失败: ' + (r.error || '未知错误'), 'var(--danger)');
    }
  });

  // ================= 条目列表 + 解密模态框 =================
  let allEntries = [];
  let currentCat = 'all';
  let currentEntryId = null;

  async function loadEntries() {
    allEntries = await api('/api/entries');
    renderEntries();
  }

  function renderEntries() {
    const list = $('#entriesList');
    const filtered = currentCat === 'all' ? allEntries : allEntries.filter(e => e.category === currentCat);
    if (!filtered || filtered.length === 0) {
      list.innerHTML = '<div class="entries-hint">⚠ 暂无封存数据 · 请在上方添加新条目</div>';
      return;
    }
    list.innerHTML = '';
    for (const e of filtered) {
      const row = document.createElement('div');
      row.className = 'entry-row';
      row.dataset.cat = e.category;
      row.innerHTML = `
        <span class="entry-cat">${e.category}</span>
        <span class="entry-title">▣ 点击以主密码解密查看 · 记录 ID ${e.id}</span>
        <span class="entry-date">${new Date(e.created_at * 1000).toLocaleString()}</span>
      `;
      row.addEventListener('click', () => openModal(e.id));
      list.appendChild(row);
    }
  }

  // 打开模态框 - 带密码输入交互
  function openModal(id) {
    currentEntryId = id;
    $('#modalTitle').textContent = `▣ 解密条目 · ID ${id}`;
    $('#modalPass').value = $('#masterPass').value || '';
    $('#modalContent').textContent = '';
    $('#decryptResult').hidden = true;
    $('#modal').hidden = false;
    setTimeout(() => $('#modalPass').focus(), 50);
  }

  async function modalDecrypt() {
    if (currentEntryId == null) return;
    const pwd = $('#modalPass').value.trim() || DEFAULTS.masterPassword;
    const r = await api(`/api/entries/${currentEntryId}/decrypt`, {
      method: 'POST', body: JSON.stringify({ password: pwd })
    });
    if (r.error) {
      toast('✗ 密码不匹配 · 无法解密', 'var(--danger)');
      return;
    }
    $('#modalTitle').textContent = `[${r.category}] ${r.title}`;
    $('#modalContent').textContent = r.content;
    $('#decryptResult').hidden = false;
    toast('✓ 解密成功', 'var(--green)');
  }

  $('#modalDecryptBtn').addEventListener('click', modalDecrypt);
  $('#modalPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') modalDecrypt(); });

  $('#modalClose').addEventListener('click', () => { $('#modal').hidden = true; currentEntryId = null; });

  // 点击模态框外部遮罩关闭
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') { $('#modal').hidden = true; currentEntryId = null; }
  });

  // Esc 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) { $('#modal').hidden = true; currentEntryId = null; }
  });

  // 分类 tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderEntries();
    });
  });

  // ================= 初始化 =================
  (async () => {
    try {
      const st = await api('/api/status');
      applyState('secure', st.daysSinceLogin || 1);
    } catch (e) {
      applyState('secure', 1);
    }
    loadEntries();
    toast('◆ 欢迎来到赛博保险箱 · 数据库已加载');
    // 默认填充主密码, 方便直接回车解密
    $('#masterPass').value = DEFAULTS.masterPassword;
  })();
})();
