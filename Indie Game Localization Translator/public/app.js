(function () {
  const state = {
    rows: [],
    filtered: [],
    currentKey: null,
    currentIndex: -1,
    preset: 'sprint',
    stats: { total: 0, proofread: 0, mt: 0, pending: 0 },
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  async function api(url, opts) {
    const res = await fetch(url, opts);
    return res.json();
  }

  async function loadTranslations() {
    const data = await api('/api/translations');
    state.rows = data.rows || [];
    const stats = await api('/api/stats');
    state.stats = stats;
    render();
  }

  async function seedPreset(preset) {
    state.preset = preset;
    document.body.dataset.preset = preset;
    document.body.classList.toggle('disaster-mode', preset === 'mt-disaster');
    document.body.classList.toggle('import-mode', preset === 'import');
    await api('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset }),
    });
    await loadTranslations();
    if (state.filtered.length > 0) {
      selectIndex(0);
    }
  }

  function statusLabel(s) {
    return { proofread: '已校对', mt: '机翻', pending: '待翻译', disaster: '机翻灾难' }[s] || s;
  }

  function renderList() {
    const list = $('#entry-list');
    const q = $('#filter-input').value.trim().toLowerCase();
    const statusFilter = $('#status-filter').value;

    state.filtered = state.rows.filter((r) => {
      const matchText = !q || r.key.toLowerCase().includes(q) || r.original.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchText && matchStatus;
    });

    list.innerHTML = '';
    state.filtered.forEach((row, i) => {
      const li = document.createElement('li');
      li.className = 'entry-item' + (row.key === state.currentKey ? ' active' : '');
      if (state.preset === 'import') {
        li.style.animationDelay = (i * 20) + 'ms';
      }
      const st = state.preset === 'mt-disaster' && row.status === 'mt' ? 'disaster' : row.status;
      li.innerHTML = `
        <div class="entry-key">${row.key}</div>
        <div class="entry-text">${escapeHtml(row.original)}</div>
        <div class="entry-meta">
          <span>${row.chapter || '-'}</span>
          <span class="status-chip ${st}">${statusLabel(st)}</span>
        </div>
      `;
      li.addEventListener('click', () => {
        state.currentIndex = i;
        state.currentKey = row.key;
        render();
      });
      list.appendChild(li);
    });

    list.scrollTop = 0;
  }

  function renderProgress() {
    const total = state.stats.total || state.rows.length;
    const done = state.stats.proofread || 0;
    const mt = state.stats.mt || 0;
    const pending = state.stats.pending || 0;
    const pct = total ? Math.round(((done + mt * 0.5) / total) * 100) : 0;

    if (state.preset === 'sprint') {
      $('#progress-fill').style.width = '99%';
      $('#progress-text').textContent = `${done}/${total} · 99%`;
    } else {
      $('#progress-fill').style.width = pct + '%';
      $('#progress-text').textContent = `${done}校对 · ${mt}机翻 · ${pending}待翻译 · ${pct}%`;
    }
  }

  function renderEditor() {
    const empty = $('#empty-state');
    const editor = $('#editor');
    const row = state.rows.find((r) => r.key === state.currentKey);

    if (!row) {
      empty.style.display = 'flex';
      editor.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    editor.style.display = 'flex';

    $('#field-key').textContent = row.key;
    $('#field-chapter').textContent = row.chapter || '—';
    $('#original-box').textContent = row.original;
    $('#original-length').textContent = row.original.length + ' 字符';

    const input = $('#translated-input');
    input.value = row.translated || '';
    input.classList.remove('overflow-warning', 'disaster');

    const st = state.preset === 'mt-disaster' && row.status === 'mt' ? 'disaster' : row.status;
    $('#current-status').textContent = statusLabel(st);
    $('#current-status').className = 'status-chip ' + st;

    // term conflict bubble
    const bubble = $('#term-bubble');
    if (state.preset === 'term-conflict' && row.note) {
      bubble.style.display = 'flex';
      $('#bubble-text').textContent = row.note || '该词汇在第三章已有其他译法';
    } else {
      bubble.style.display = 'none';
    }

    if (state.preset === 'mt-disaster') {
      input.classList.add('disaster');
    }

    updateLengthWarning(row.original.length);
    renderPreview(row);
  }

  function updateLengthWarning(originalLen) {
    const input = $('#translated-input');
    const len = input.value.length;
    $('#translated-length').textContent = len + ' 字符';
    const warn = $('#length-warning');
    const ratio = originalLen > 0 ? len / originalLen : 0;
    // 中文通常更紧凑,但若译文字符数 > 原文 1.8 倍,视为可能溢出
    if (len > 0 && ratio > 1.8) {
      input.classList.add('overflow-warning');
      warn.style.display = 'inline';
    } else {
      input.classList.remove('overflow-warning');
      warn.style.display = 'none';
    }
  }

  function renderPreview(row) {
    $('#preview-title').textContent = row.chapter || '游戏画面预览';
    $('#preview-key').textContent = row.key;
    const st = state.preset === 'mt-disaster' && row.status === 'mt' ? 'disaster' : row.status;
    $('#preview-status').textContent = statusLabel(st);
    $('#preview-status').className = 'status-chip ' + st;

    $('#dialogue-speaker').textContent = row.chapter || 'NPC';
    const displayText = (row.translated && row.translated.trim()) ? row.translated : row.original;
    $('#dialogue-text').textContent = displayText;

    // overlays (green check marks for sprint mode)
    const overlays = $('#preview-overlays');
    overlays.innerHTML = '';
    if (state.preset === 'sprint') {
      const positions = [
        { top: '12%', left: '18%' },
        { top: '22%', left: '55%' },
        { top: '10%', left: '78%' },
        { top: '40%', left: '28%' },
        { top: '38%', left: '68%' },
        { top: '55%', left: '12%' },
      ];
      positions.forEach((p, i) => {
        const m = document.createElement('div');
        m.className = 'check-mark';
        m.textContent = '✓';
        m.style.top = p.top;
        m.style.left = p.left;
        m.style.animationDelay = (i * 0.15) + 's';
        overlays.appendChild(m);
      });
    }
  }

  function render() {
    renderList();
    renderProgress();
    renderEditor();
  }

  function selectIndex(i) {
    if (i < 0 || i >= state.filtered.length) return;
    const row = state.filtered[i];
    state.currentIndex = i;
    state.currentKey = row.key;
    render();
  }

  function moveToUntranslated(direction) {
    if (state.filtered.length === 0) return;
    let i = state.currentIndex < 0 ? (direction > 0 ? -1 : state.filtered.length) : state.currentIndex;
    for (let step = 1; step <= state.filtered.length; step++) {
      const idx = (i + direction * step + state.filtered.length) % state.filtered.length;
      const r = state.filtered[idx];
      if (!r.translated || r.status === 'pending') {
        selectIndex(idx);
        return;
      }
    }
  }

  async function saveCurrent(status) {
    const row = state.rows.find((r) => r.key === state.currentKey);
    if (!row) return;
    const text = $('#translated-input').value;
    row.translated = text;
    row.status = status || (text ? 'proofread' : 'pending');
    await api('/api/translations/' + encodeURIComponent(row.key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translated: text, status: row.status, note: row.note || '' }),
    });
    const stats = await api('/api/stats');
    state.stats = stats;
    render();
  }

  // 真正执行机翻：调用后端 /api/translate/:key
  async function translateCurrent() {
    const row = state.rows.find((r) => r.key === state.currentKey);
    if (!row) return;
    const btn = $('#btn-mt');
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = '翻译中...';
    try {
      const data = await api('/api/translate/' + encodeURIComponent(row.key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (data && data.ok) {
        // 同步到本地 state
        const fresh = state.rows.find((r) => r.key === data.key);
        if (fresh) {
          fresh.translated = data.translated || '';
          fresh.status = data.status || 'mt';
          fresh.note = data.note || '';
        }
        const stats = await api('/api/stats');
        state.stats = stats;
        render();
      }
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  // 一键机翻所有未翻译条目
  async function translateAll() {
    const btn = $('#btn-mt-all');
    if (!btn) return;
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = '批量翻译中...';
    try {
      await api('/api/translate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await loadTranslations();
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ===== Events =====
  function bindEvents() {
    $$('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.preset-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        seedPreset(btn.dataset.preset);
      });
    });

    $('#filter-input').addEventListener('input', renderList);
    $('#status-filter').addEventListener('change', renderList);

    const input = $('#translated-input');
    input.addEventListener('input', () => {
      const row = state.rows.find((r) => r.key === state.currentKey);
      updateLengthWarning(row ? row.original.length : 0);
    });

    $('#btn-save').addEventListener('click', () => saveCurrent('proofread'));
    $('#btn-mt').addEventListener('click', translateCurrent);
    const btnAll = $('#btn-mt-all');
    if (btnAll) btnAll.addEventListener('click', translateAll);

    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea';

      if (inField && e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrent('proofread');
        return;
      }

      if (!inField) {
        switch (e.key.toLowerCase()) {
          case 'j': selectIndex(state.currentIndex + 1); break;
          case 'k': selectIndex(Math.max(0, state.currentIndex - 1)); break;
          case 'n': moveToUntranslated(1); break;
          case 'p': moveToUntranslated(-1); break;
          case 'm': translateCurrent(); break;
          case 'escape':
            state.currentKey = null;
            state.currentIndex = -1;
            render();
            break;
        }
      } else if (e.key === 'Escape') {
        e.target.blur();
      }
    });
  }

  bindEvents();
  seedPreset('sprint');
})();
