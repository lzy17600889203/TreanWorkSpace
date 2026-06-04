let animation;
let isRunning = false;
let intervalId = null;
let currentScene = null;

const stats = {
  total: 0,
  success: 0,
  timeout: 0,
  error: 0
};

const SCENES = [
  { id: 'double-11', name: '双十一大促', description: '满载高压状态', requestRate: 200, errorRate: 0.02, timeoutRate: 0.05, color: '#ff3366' },
  { id: 'db-down', name: '数据库宕机', description: '全线超时拥堵', requestRate: 50, errorRate: 0.8, timeoutRate: 0.9, color: '#ffcc00' },
  { id: 'incompatible', name: '接口不兼容', description: '连环断裂', requestRate: 100, errorRate: 0.4, timeoutRate: 0.1, color: '#ff6600' },
  { id: 'normal', name: '日常平稳', description: '丝滑绿色流光', requestRate: 30, errorRate: 0, timeoutRate: 0, color: '#00ff88' }
];

document.addEventListener('DOMContentLoaded', () => {
  animation = new PipelineAnimation('animation-canvas');
  animation.start();
  initScenes();
  setScene(SCENES[3]);
});

function initScenes() {
  const grid = document.getElementById('scenes-grid');
  
  SCENES.forEach(scene => {
    const card = document.createElement('div');
    card.className = 'scene-card';
    card.dataset.id = scene.id;
    card.style.setProperty('--scene-color', scene.color);
    card.style.setProperty('--scene-color-shadow', scene.color + '40');
    card.innerHTML = `
      <div class="scene-name" style="color: ${scene.color}">${scene.name}</div>
      <div class="scene-desc">${scene.description}</div>
    `;
    card.addEventListener('click', () => setScene(scene));
    grid.appendChild(card);
  });
}

function setScene(scene) {
  currentScene = scene;
  
  document.querySelectorAll('.scene-card').forEach(card => {
    card.classList.toggle('active', card.dataset.id === scene.id);
  });
  
  animation.setSceneColor(scene.color);
  
  fetch(`/api/scene/${scene.id}`, { method: 'POST' });
}

function updateStats() {
  document.getElementById('total-requests').textContent = stats.total;
  document.getElementById('success-requests').textContent = stats.success;
  document.getElementById('timeout-requests').textContent = stats.timeout;
  document.getElementById('error-requests').textContent = stats.error;
}

function setStatus(status, color) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  
  dot.style.background = color;
  dot.style.boxShadow = `0 0 10px ${color}`;
  text.textContent = status;
}

function simulateRequest() {
  if (!currentScene) return;
  
  const random = Math.random();
  let type = 'success';
  
  if (random < currentScene.timeoutRate) {
    type = 'timeout';
    stats.timeout++;
    animation.setState('timeout');
  } else if (random < currentScene.timeoutRate + currentScene.errorRate) {
    type = 'error';
    stats.error++;
    animation.setState('error');
  } else {
    stats.success++;
    animation.setState('normal');
  }
  
  stats.total++;
  animation.addParticle(type);
  updateStats();
  
  fetch('/api/mock-data').catch(() => {});
}

document.getElementById('btn-start').addEventListener('click', () => {
  if (isRunning) return;
  
  isRunning = true;
  setStatus('运行中', '#00ff88');
  
  const interval = 1000 / (currentScene.requestRate / 10);
  intervalId = setInterval(simulateRequest, interval);
});

document.getElementById('btn-stop').addEventListener('click', () => {
  isRunning = false;
  setStatus('已停止', '#ffcc00');
  
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  animation.setState('normal');
});

document.getElementById('btn-replay').addEventListener('click', () => {
  setStatus('回放中', '#00d4ff');
  
  fetch('/api/replay', { method: 'POST' });
  
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const types = ['success', 'success', 'success', 'timeout', 'error'];
      const type = types[Math.floor(Math.random() * types.length)];
      animation.addParticle(type);
    }, i * 30);
  }
  
  setTimeout(() => {
    if (!isRunning) {
      setStatus('就绪', '#00ff88');
    }
  }, 2000);
});

document.getElementById('btn-clear').addEventListener('click', () => {
  stats.total = 0;
  stats.success = 0;
  stats.timeout = 0;
  stats.error = 0;
  updateStats();
  animation.clear();
  
  fetch('/api/clear-history', { method: 'POST' });
  
  setStatus('已清除', '#00d4ff');
  setTimeout(() => {
    if (!isRunning) {
      setStatus('就绪', '#00ff88');
    }
  }, 1000);
});
