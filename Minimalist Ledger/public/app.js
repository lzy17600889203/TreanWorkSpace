(function() {
  const API = {
    async get(endpoint) {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    async post(endpoint, body) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    async delete(endpoint) {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  };

  let currentType = 'expense';
  let categories = [];
  let currentMonth = '';
  let pieChartInstance = null;
  let pieSegments = [];

  const monthSelect = document.getElementById('monthSelect');
  const recordForm = document.getElementById('recordForm');
  const amountInput = document.getElementById('amountInput');
  const amountError = document.getElementById('amountError');
  const categorySelect = document.getElementById('categorySelect');
  const noteInput = document.getElementById('noteInput');
  const dateInput = document.getElementById('dateInput');
  const recordsList = document.getElementById('recordsList');
  const emptyState = document.getElementById('emptyState');
  const chartEmpty = document.getElementById('chartEmpty');
  const totalIncomeEl = document.getElementById('totalIncome');
  const totalExpenseEl = document.getElementById('totalExpense');
  const totalBalanceEl = document.getElementById('totalBalance');
  const pieCanvas = document.getElementById('pieChart');
  const ctx = pieCanvas.getContext('2d');

  function init() {
    dateInput.value = new Date().toISOString().split('T')[0];
    bindEvents();
    loadData();
  }

  function bindEvents() {
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;
        updateCategoryOptions();
      });
    });

    recordForm.addEventListener('submit', async e => {
      e.preventDefault();
      await handleSubmit();
    });

    monthSelect.addEventListener('change', () => {
      currentMonth = monthSelect.value;
      loadData();
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`确定要加载「${btn.textContent}」预设吗？这将清空现有数据！`)) return;
        try {
          await API.post(`/api/presets/${btn.dataset.preset}`, {});
          loadData();
        } catch (err) {
          alert('加载预设失败: ' + err.message);
        }
      });
    });
  }

  async function loadData() {
    try {
      const [cats, stats, records] = await Promise.all([
        API.get('/api/categories'),
        API.get(`/api/stats${currentMonth ? '?month=' + currentMonth : ''}`),
        API.get(`/api/records${currentMonth ? '?month=' + currentMonth : ''}`)
      ]);
      categories = cats;
      updateMonthOptions(stats.months || []);
      updateStats(stats);
      renderPieChart(stats.pieData || []);
      renderRecords(records);
      updateCategoryOptions();
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  }

  function updateMonthOptions(months) {
    const existing = monthSelect.querySelectorAll('option:not(:first-child)');
    existing.forEach(o => o.remove());
    months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === currentMonth) opt.selected = true;
      monthSelect.appendChild(opt);
    });
  }

  function updateStats(stats) {
    animateNumber(totalIncomeEl, stats.totalIncome);
    animateNumber(totalExpenseEl, stats.totalExpense);
    animateNumber(totalBalanceEl, stats.balance);
  }

  function animateNumber(el, target) {
    el.classList.remove('roll-up');
    void el.offsetWidth;
    const val = typeof target === 'number' ? target.toFixed(2) : '0.00';
    el.textContent = val;
    el.classList.add('roll-up');
  }

  function updateCategoryOptions() {
    categorySelect.innerHTML = '';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      opt.dataset.color = c.color;
      categorySelect.appendChild(opt);
    });
  }

  async function handleSubmit() {
    const rawAmount = amountInput.value.trim();
    const numAmount = parseFloat(rawAmount);

    if (rawAmount === '' || isNaN(numAmount)) {
      showError('请输入有效的数字金额');
      return;
    }

    if (numAmount <= 0) {
      showError('金额必须大于0');
      return;
    }

    if (String(numAmount).length > 15) {
      showError('金额数值过大，请分拆记录');
      return;
    }

    hideError();

    const selectedCat = categories.find(c => String(c.id) === categorySelect.value);
    const payload = {
      type: currentType,
      amount: numAmount,
      category_id: parseInt(categorySelect.value) || null,
      note: noteInput.value.trim(),
      date: dateInput.value
    };

    try {
      const newRecord = await API.post('/api/records', payload);
      showCheckmark();
      amountInput.value = '';
      noteInput.value = '';
      dateInput.value = new Date().toISOString().split('T')[0];
      await loadData();
    } catch (err) {
      showError('添加失败: ' + err.message);
    }
  }

  function showError(msg) {
    amountError.textContent = msg;
    amountError.classList.add('visible');
  }

  function hideError() {
    amountError.classList.remove('visible');
    amountError.textContent = '';
  }

  function showCheckmark() {
    const btn = recordForm.querySelector('.submit-btn');
    const check = btn.querySelector('.checkmark');
    const text = btn.querySelector('.btn-text');
    text.style.opacity = '0';
    check.classList.add('show');
    setTimeout(() => {
      check.classList.remove('show');
      text.style.opacity = '1';
    }, 800);
  }

  function renderRecords(records) {
    if (!records || records.length === 0) {
      recordsList.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    recordsList.innerHTML = '';

    records.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = 'record-item';
      li.style.animationDelay = `${i * 0.05}s`;
      const amountPrefix = r.type === 'income' ? '+' : '-';
      const catColor = r.categoryColor || '#9E9E9E';
      li.innerHTML = `
        <div class="record-dot" style="background:${catColor}"></div>
        <div class="record-info">
          <div class="record-category">${escapeHtml(r.categoryName || '未分类')}</div>
          <div class="record-note">${escapeHtml(r.note || '')}</div>
        </div>
        <div class="record-date">${r.date}</div>
        <div class="record-amount ${r.type}">${amountPrefix}${Number(r.amount).toFixed(2)}</div>
        <button class="delete-btn" data-id="${r.id}" title="删除">×</button>
      `;
      recordsList.appendChild(li);
    });

    recordsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const li = btn.closest('.record-item');
        li.classList.add('deleting');
        setTimeout(async () => {
          try {
            await API.delete(`/api/records/${btn.dataset.id}`);
            await loadData();
          } catch (err) {
            li.classList.remove('deleting');
            alert('删除失败: ' + err.message);
          }
        }, 350);
      });
    });
  }

  function renderPieChart(pieData) {
    ctx.clearRect(0, 0, pieCanvas.width, pieCanvas.height);

    if (!pieData || pieData.length === 0) {
      chartEmpty.classList.remove('hidden');
      return;
    }
    chartEmpty.classList.add('hidden');

    const total = pieData.reduce((s, d) => s + d.value, 0);
    if (total === 0) {
      chartEmpty.classList.remove('hidden');
      return;
    }

    const cx = pieCanvas.width / 2;
    const cy = pieCanvas.height / 2;
    const radius = Math.min(cx, cy) - 10;
    let startAngle = -Math.PI / 2;

    pieSegments = [];

    pieData.forEach((segment, i) => {
      const sliceAngle = (segment.value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      const growDelay = i * 120;
      setTimeout(() => {
        drawPieSegment(cx, cy, radius, startAngle, endAngle, segment.color, 0);
        animateGrowth(cx, cy, radius, startAngle, endAngle, segment.color, 600);
      }, growDelay);

      pieSegments.push({ ...segment, startAngle, endAngle });
      startAngle = endAngle;
    });
  }

  function drawPieSegment(cx, cy, radius, startAngle, endAngle, color, alpha) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle, false);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha || 1;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (alpha === 1) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function animateGrowth(cx, cy, radius, startAngle, endAngle, color, duration) {
    const startTime = performance.now();
    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      ctx.clearRect(cx - radius - 2, cy - radius - 2, (radius + 2) * 2, (radius + 2) * 2);

      pieSegments.forEach((s, i) => {
        const segStart = s.startAngle;
        const segEnd = s.startAngle + (s.endAngle - s.startAngle) * eased;
        drawPieSegment(cx, cy, radius, segStart, segEnd, s.color, 1);
      });

      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  init();
})();
