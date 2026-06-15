/* 主应用逻辑 */
(function () {
  const API = '/api';
  const state = {
    months: [],
    currentMonth: '',
    waterfall: null,
    chart: null,
    transactions: []
  };

  const $ = id => document.getElementById(id);

  async function loadMonths() {
    try {
      const res = await fetch(`${API}/months`);
      const data = await res.json();
      state.months = data;
      const sel = $('monthSelect');
      sel.innerHTML = '';
      if (state.months.length === 0) {
        // 默认当前月
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        state.months.push(ym);
      }
      state.months.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `${m} 年 ${m.slice(5, 7)} 月`;
        sel.appendChild(opt);
      });
      if (!state.currentMonth || !state.months.includes(state.currentMonth)) {
        state.currentMonth = state.months[0];
      }
      sel.value = state.currentMonth;
    } catch (e) {
      console.error('加载月份失败', e);
    }
  }

  async function loadWaterfall() {
    try {
      const ym = state.currentMonth;
      const res = await fetch(`${API}/waterfall/${ym}`);
      const data = await res.json();
      state.waterfall = data;
      renderSummary(data);
      renderBadge(data.state);
      if (!state.chart) {
        state.chart = new window.WaterfallChart($('waterfall'), data);
        state.chart.animate();
      } else {
        state.chart.setData(data);
      }
      await loadTransactions();
    } catch (e) {
      console.error('加载瀑布数据失败', e);
    }
  }

  async function loadTransactions() {
    try {
      const res = await fetch(`${API}/transactions`);
      const all = await res.json();
      state.transactions = all.filter(t => t.date.startsWith(state.currentMonth));
      renderTable();
    } catch (e) {
      console.error(e);
    }
  }

  function renderSummary(data) {
    const cards = $('summaryCards');
    const cardsData = [
      { label: '总收入', value: data.totalIncome.toFixed(0), cls: 'pos' },
      { label: '必要支出', value: data.necessarySpent.toFixed(0), cls: 'neg' },
      { label: '非必要支出', value: data.unnecessarySpent.toFixed(0), cls: 'warn' },
      { label: '占总收入比例', value: (data.unnecessaryRatio * 100).toFixed(1) + '%', cls: data.unnecessaryRatio > 0.3 ? 'neg' : 'neutral' },
      { label: '结余', value: (data.balance >= 0 ? '+' : '') + data.balance.toFixed(0), cls: data.balance >= 0 ? 'pos' : 'neg' }
    ];
    cards.innerHTML = cardsData.map(c =>
      `<div class="card">
         <div class="card-label">${c.label}</div>
         <div class="card-value ${c.cls}">${c.value}</div>
       </div>`
    ).join('');
  }

  function renderBadge(st) {
    const b = $('stateBadge');
    b.className = 'badge ' + st;
    const map = {
      healthy: '✦ 财务健康',
      impulsive: '⚠ 冲动消费中',
      overspend: '☠ 入不敷出',
      payday: '💰 发薪日狂欢'
    };
    b.textContent = map[st] || '暂无数据';
  }

  function renderTable() {
    const tbody = $('txTable').querySelector('tbody');
    if (state.transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#78849e;padding:16px;">本月还没有记账记录～</td></tr>';
      return;
    }
    tbody.innerHTML = state.transactions
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(t => {
        const sign = t.amount > 0 ? '+' : '';
        const cls = t.amount > 0 ? 'pos-val' : 'neg-val';
        const unnec = t.is_unnecessary ? '<span class="unnecessary-mark">非必要</span>' : '';
        return `<tr>
          <td>${t.date}</td>
          <td>${t.category}${unnec}</td>
          <td>${t.note || ''}</td>
          <td class="right ${cls}">${sign}${t.amount.toFixed(2)}</td>
          <td><button class="btn btn-danger" data-id="${t.id}">删除</button></td>
        </tr>`;
      }).join('');
    tbody.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => deleteTx(btn.dataset.id));
    });
  }

  async function deleteTx(id) {
    if (!confirm('确定删除这条记录？')) return;
    await fetch(`${API}/transactions/${id}`, { method: 'DELETE' });
    await loadWaterfall();
  }

  function bindEvents() {
    $('monthSelect').addEventListener('change', e => {
      state.currentMonth = e.target.value;
      loadWaterfall();
    });
    $('refreshBtn').addEventListener('click', loadWaterfall);
    $('seedDemoBtn').addEventListener('click', async () => {
      if (!confirm('将载入四组演示数据（覆盖现有数据），是否继续？')) return;
      await fetch(`${API}/seed-demo`, { method: 'POST' });
      await loadMonths();
      state.currentMonth = state.months[0];
      $('monthSelect').value = state.currentMonth;
      await loadWaterfall();
    });

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    $('txForm').querySelector('[name="date"]').value = todayStr;

    $('txForm').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        date: fd.get('date'),
        amount: parseFloat(fd.get('amount')),
        category: fd.get('category').trim(),
        note: fd.get('note').trim(),
        is_unnecessary: e.target.querySelector('[name="is_unnecessary"]').checked ? 1 : 0
      };
      if (!payload.date || !payload.amount || !payload.category) return;
      await fetch(`${API}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      e.target.reset();
      e.target.querySelector('[name="date"]').value = todayStr;
      await loadMonths();
      state.currentMonth = payload.date.slice(0, 7);
      $('monthSelect').value = state.currentMonth;
      await loadWaterfall();
    });
  }

  async function init() {
    bindEvents();
    await loadMonths();
    // 如果数据库为空，尝试触发一次种子数据检测
    try {
      const res = await fetch(`${API}/transactions`);
      const rows = await res.json();
      if (rows.length === 0) {
        console.log('暂无数据，稍后可点击「加载演示数据」');
      }
    } catch (e) {}
    await loadWaterfall();
  }

  init();
})();
