/* =======================================================================
 * Indie Cafe Explorer - 前端主程序
 *   - Leaflet.js 暗色调本地地图
 *   - 发光咖啡杯图标（含宝藏街区 / 高分神店 / 黑名单四种状态）
 *   - 点击图标弹出风味雷达图（酸度 / 甜度 / 醇厚度）
 * ======================================================================= */

const API = '/api/cafes';

// 显示端口信息
document.getElementById('port-info').textContent =
  `服务运行于: ${window.location.origin} (端口 ${window.location.port || '80'})`;

/* ---------------- 地图初始化 ---------------- */
const map = L.map('map', {
  center: [39.9105, 116.4010],
  zoom: 14,
  zoomControl: true,
  attributionControl: true,
  preferCanvas: true,
});

// 使用 CartoDB 暗色免费瓦片（无需密钥）
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd',
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

// 在地图上叠加一层手绘网格（荒漠感）
const gridOverlay = document.createElement('div');
gridOverlay.className = 'grid-overlay';
document.getElementById('map').appendChild(gridOverlay);

/* ---------------- 标记构建函数 ---------------- */

function buildMarkerHTML(cafe) {
  const isBlack = !!cafe.blacklisted;
  const isGod = !!cafe.highlight || cafe.rating >= 4.9;
  // 宝藏街区：评分高 + 非神店 + 非黑名单
  const isTreasure = !isBlack && !isGod && cafe.rating >= 4.3;

  let icon;
  if (isBlack) {
    icon = '🗑️'; // 踩雷 → 垃圾桶
  } else {
    icon = '☕';
  }

  const klass = ['cafe-marker'];
  if (isBlack) klass.push('black');
  else if (isGod) klass.push('god');
  else if (isTreasure) klass.push('treasure');
  else klass.push('normal');

  let starHTML = '';
  if (isGod) {
    starHTML = '<div class="stars">' +
      Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = 32;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        const delay = (i * 0.15).toFixed(2);
        return `<i style="top:calc(50% + ${y}px);left:calc(50% + ${x}px);animation-delay:${delay}s">✦</i>`;
      }).join('') +
      '</div>';
  }

  const smokeHTML = isBlack
    ? `<div class="smoke">${Array.from({ length: 5 }, (_, i) =>
      `<i style="left:${8 + i * 6}px;animation-delay:${(i * 0.45).toFixed(2)}s"></i>`
    ).join('')}</div><div class="x-mark">✕</div>`
    : '';

  return `
    <div class="${klass.join(' ')}" data-id="${cafe.id}">
      <div class="halo"></div>
      <div class="cup">${icon}</div>
      ${starHTML}
      ${smokeHTML}
    </div>`;
}

function createCustomIcon(cafe) {
  const size = (cafe.highlight || cafe.rating >= 4.9) ? [80, 80] : [44, 44];
  return L.divIcon({
    className: 'cafe-icon',
    html: buildMarkerHTML(cafe),
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });
}

/* ---------------- 数据加载 & 渲染 ---------------- */
let cafeMarkers = [];

function clearMarkers() {
  cafeMarkers.forEach((m) => map.removeLayer(m));
  cafeMarkers = [];
}

function renderCafes(list) {
  clearMarkers();
  const bounds = [];

  list.forEach((cafe) => {
    const marker = L.marker([cafe.lat, cafe.lng], {
      icon: createCustomIcon(cafe),
      riseOnHover: true,
    });
    marker.bindTooltip(cafe.name, {
      direction: 'top',
      className: 'cafe-tooltip',
      offset: [0, -20],
    });
    marker.on('click', () => openDetail(cafe));
    marker.addTo(map);
    cafeMarkers.push(marker);
    bounds.push([cafe.lat, cafe.lng]);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [80, 80] });
  }

  // 更新统计
  const total = list.length;
  const treasure = list.filter((c) => !c.blacklisted && !c.highlight && c.rating >= 4.3).length;
  const god = list.filter((c) => c.highlight || c.rating >= 4.9).length;
  const black = list.filter((c) => c.blacklisted).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-treasure').textContent = treasure;
  document.getElementById('stat-god').textContent = god;
  document.getElementById('stat-black').textContent = black;
}

/* ---------------- 雷达图 ---------------- */
function renderRadar({ acidity, sweetness, body }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 110;

  // 三个主维度 + 派生三个（根据主三值平均/最小值）来做出六边形
  const balance = Math.round((acidity + sweetness + body) / 3);
  const after = Math.round((sweetness + body) / 2);
  const aroma = Math.round((acidity + sweetness) / 2);

  const axes = [
    { label: '酸度', value: acidity, color: '#ffd266' },
    { label: '香气', value: aroma, color: '#ffa3ff' },
    { label: '甜度', value: sweetness, color: '#ff9ac8' },
    { label: '平衡感', value: balance, color: '#6bffb8' },
    { label: '醇厚度', value: body, color: '#58d9ff' },
    { label: '余韵', value: after, color: '#b48863' },
  ];

  const gridLines = [];
  for (let i = 1; i <= 4; i++) {
    const pts = axes.map((_, idx) => {
      const a = (Math.PI * 2 * idx) / axes.length - Math.PI / 2;
      const r = (radius * i) / 4;
      return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
    });
    gridLines.push(`<polygon points="${pts.join(' ')}" fill="none" stroke="#2e3d55" stroke-width="0.8" opacity="0.8"/>`);
  }

  const axisLines = axes.map((_, idx) => {
    const a = (Math.PI * 2 * idx) / axes.length - Math.PI / 2;
    return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * radius}" y2="${cy + Math.sin(a) * radius}" stroke="#2e3d55" stroke-width="0.8"/>`;
  });

  const dataPts = axes.map((ax, idx) => {
    const a = (Math.PI * 2 * idx) / axes.length - Math.PI / 2;
    const r = (radius * Math.min(100, Math.max(0, ax.value))) / 100;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  });

  const labels = axes.map((ax, idx) => {
    const a = (Math.PI * 2 * idx) / axes.length - Math.PI / 2;
    const lx = cx + Math.cos(a) * (radius + 18);
    const ly = cy + Math.sin(a) * (radius + 18);
    return `<text x="${lx}" y="${ly}" fill="#a9b4c2" font-size="12" text-anchor="middle" dominant-baseline="middle">${ax.label}</text>`;
  });

  const valueLabels = axes.map((ax, idx) => {
    const a = (Math.PI * 2 * idx) / axes.length - Math.PI / 2;
    const r = (radius * Math.min(100, ax.value)) / 100;
    const lx = cx + Math.cos(a) * r;
    const ly = cy + Math.sin(a) * r;
    return `<circle cx="${lx}" cy="${ly}" r="3.5" fill="${ax.color}" stroke="#0a0d12" stroke-width="1.5"/>`;
  });

  return `
    <svg class="radar-svg" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#6bffb8" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#58d9ff" stop-opacity="0.15"/>
        </radialGradient>
      </defs>
      ${gridLines.join('')}
      ${axisLines.join('')}
      <polygon class="radar-polygon" points="${dataPts.join(' ')}" fill="url(#radarFill)" stroke="#6bffb8" stroke-width="2" opacity="0.85"/>
      ${labels.join('')}
      ${valueLabels.join('')}
    </svg>
  `;
}

/* ---------------- 详情面板 ---------------- */
const panel = document.getElementById('panel');
const panelInner = document.getElementById('panel-inner');
const panelClose = document.getElementById('panel-close');

panelClose.addEventListener('click', () => {
  panel.classList.add('panel-collapsed');
});

function openDetail(cafe) {
  const isBlack = !!cafe.blacklisted;
  const isGod = !!cafe.highlight || cafe.rating >= 4.9;

  let ratingStars = '';
  const starCount = Math.round(cafe.rating);
  for (let i = 0; i < 5; i++) {
    ratingStars += i < starCount ? '★' : '☆';
  }

  let statusHTML = '';
  if (isGod) statusHTML = '<span class="status-tag god">★ 高分神店</span>';
  if (isBlack) statusHTML = '<span class="status-tag black">⚠ 黑名单</span>';

  const tagsHTML = (cafe.flavor_tags || [])
    .map((t) => `<span class="tag">#${t}</span>`)
    .join('');

  panelInner.innerHTML = `
    <div class="cafe-detail">
      <div class="cafe-header">
        <h2 class="name">${cafe.name}${statusHTML}</h2>
        <p class="address">📍 ${cafe.address || '地址未标注'}</p>
        <div class="rating-row">
          <span class="rating-num">${cafe.rating.toFixed(1)}</span>
          <span class="rating-stars">${ratingStars}</span>
        </div>
        <div class="coord">坐标: ${cafe.lat.toFixed(4)}, ${cafe.lng.toFixed(4)}</div>
        <div class="tags">${tagsHTML || '<span class="tag" style="color:var(--fg-2)">暂无标签</span>'}</div>
      </div>

      <div class="radar-card">
        <h3>✦ 手冲豆风味雷达</h3>
        <div class="radar-wrap">${renderRadar({ acidity: cafe.acidity, sweetness: cafe.sweetness, body: cafe.body })}</div>
        <div class="flavors">
          <div class="flavor-item acidity">
          <span class="label">酸度</span><span class="value">${Math.round(cafe.acidity)}</div>
          <div class="flavor-item sweetness">
          <span class="label">甜度</span><span class="value">${Math.round(cafe.sweetness)}</div>
          <div class="flavor-item body">
          <span class="label">醇厚度</span><span class="value">${Math.round(cafe.body)}</div>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-danger" id="btn-toggle-black">${isBlack ? '移出黑名单' : '标记踩雷'}</button>
        <button class="btn" id="btn-toggle-god">${isGod ? '取消神店' : '设为神店'}</button>
      </div>
    </div>
  `;

  panel.classList.remove('panel-collapsed');

  document.getElementById('btn-toggle-black').addEventListener('click', async () => {
    await updateCafe(cafe.id, { blacklisted: !isBlack });
    refreshAll();
  });
  document.getElementById('btn-toggle-god').addEventListener('click', async () => {
    await updateCafe(cafe.id, { highlight: !isGod });
    refreshAll();
  });
}

async function updateCafe(id, payload) {
  try {
    await fetch(`/api/cafes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(err);
  }
}

async function refreshAll() {
  try {
    const res = await fetch(API);
    const data = await res.json();
    renderCafes(data.items);
  } catch (err) {
    console.error(err);
  }
}

/* ---------------- 启动 ---------------- */
refreshAll();
