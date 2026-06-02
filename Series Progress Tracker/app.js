let seriesData = [];

async function fetchSeries() {
  const response = await fetch('/api/series');
  seriesData = await response.json();
  renderSeries();
}

function renderSeries() {
  const container = document.getElementById('seriesList');
  container.innerHTML = '';

  seriesData.forEach(series => {
    const card = createSeriesCard(series);
    container.appendChild(card);
  });
}

function createSeriesCard(series) {
  const card = document.createElement('div');
  card.className = 'series-card';

  const isCompleted = series.totalEpisodes > 0 && series.currentEpisode >= series.totalEpisodes;
  const isOngoing = series.totalEpisodes === 0;
  const progress = series.totalEpisodes > 0 ? (series.currentEpisode / series.totalEpisodes) * 100 : 0;
  const status = isCompleted ? 'completed' : (isOngoing ? 'ongoing' : 'watching');

  const statusText = {
    completed: '已完结',
    ongoing: '连载中',
    watching: '追剧中'
  };

  card.innerHTML = `
    <div class="series-header">
      <div>
        <span class="series-name">${escapeHtml(series.name)}</span>
        <span class="status-badge status-${status}">${statusText[status]}</span>
      </div>
      <div class="series-actions">
        <button class="delete-btn" onclick="deleteSeries(${series.id})">删除</button>
      </div>
    </div>
    <div class="progress-container">
      <div class="progress-info">
        <div class="progress-text">
          ${isOngoing ? `已看: ${series.currentEpisode} 集` : `${series.currentEpisode}/${series.totalEpisodes} 集`}
        </div>
        <div class="progress-controls">
          <button onclick="updateProgress(${series.id}, -1)" ${isCompleted ? 'disabled' : ''}>-</button>
          <input type="number" value="${series.currentEpisode}" min="0" 
                 ${isCompleted ? 'disabled' : ''}
                 ${!isOngoing ? `max="${series.totalEpisodes}"` : ''}
                 onchange="setProgress(${series.id}, this.value)">
          <button onclick="updateProgress(${series.id}, 1)" ${isCompleted ? 'disabled' : ''}>+</button>
        </div>
      </div>
      ${!isOngoing ? `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
        </div>
      ` : ''}
    </div>
  `;

  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function addSeries() {
  const nameInput = document.getElementById('seriesName');
  const totalInput = document.getElementById('totalEpisodes');

  const name = nameInput.value.trim();
  const total = parseInt(totalInput.value) || 0;

  if (!name) {
    alert('请输入剧名');
    return;
  }

  await fetch('/api/series', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      name, 
      totalEpisodes: total,
      currentEpisode: 0,
      status: total === 0 ? 'ongoing' : 'watching'
    })
  });

  nameInput.value = '';
  totalInput.value = '';
  fetchSeries();
}

async function updateProgress(id, delta) {
  const series = seriesData.find(s => s.id === id);
  if (!series) return;

  const newCurrent = Math.max(0, series.currentEpisode + delta);
  await setProgress(id, newCurrent);
}

async function setProgress(id, value) {
  const series = seriesData.find(s => s.id === id);
  if (!series) return;

  let newCurrent = parseInt(value) || 0;
  
  // 前端限制：已完结的剧集不能超过总集数
  if (series.totalEpisodes > 0) {
    newCurrent = Math.min(newCurrent, series.totalEpisodes);
  }
  newCurrent = Math.max(0, newCurrent);

  const isCompleted = series.totalEpisodes > 0 && newCurrent >= series.totalEpisodes;

  await fetch(`/api/series/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      currentEpisode: newCurrent,
      status: isCompleted ? 'completed' : (series.totalEpisodes === 0 ? 'ongoing' : 'watching')
    })
  });

  fetchSeries();
}

async function deleteSeries(id) {
  if (!confirm('确定要删除这部剧吗？')) return;

  await fetch(`/api/series/${id}`, {
    method: 'DELETE'
  });

  fetchSeries();
}

document.getElementById('addBtn').addEventListener('click', addSeries);
document.getElementById('seriesName').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addSeries();
});
document.getElementById('totalEpisodes').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addSeries();
});

fetchSeries();
