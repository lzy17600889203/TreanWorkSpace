const API_BASE = '/api';
let currentPage = 1;
let totalPages = 1;
let totalMessages = 0;
const pageSize = 10;

async function fetchMessages(page = 1) {
  try {
    const response = await fetch(`${API_BASE}/messages?page=${page}&limit=${pageSize}`);
    const data = await response.json();
    
    if (data.success) {
      currentPage = data.page;
      totalPages = data.totalPages;
      totalMessages = data.total;
      updateStats();
      renderMessages(data.messages);
      renderPagination();
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('网络请求失败: ' + error.message);
  }
}

function updateStats() {
  document.getElementById('totalCount').textContent = `共 ${totalMessages} 条留言`;
}

function renderMessages(messages) {
  const messageList = document.getElementById('messageList');
  messageList.innerHTML = '';
  
  if (messages.length === 0) {
    messageList.innerHTML = '<div style="text-align: center; color: white; padding: 30px; background: rgba(255,255,255,0.1); border-radius: 15px;">暂无留言，快来发布第一条吧！</div>';
    return;
  }
  
  messages.forEach((message, index) => {
    const card = createMessageCard(message, index);
    messageList.appendChild(card);
  });
}

function createMessageCard(message, index) {
  const card = document.createElement('div');
  card.className = 'message-card';
  card.dataset.id = message.id;
  
  const floorNumber = totalMessages - ((currentPage - 1) * pageSize) - index;
  
  card.innerHTML = `
    <div class="floor-number">${floorNumber}</div>
    <div class="message-header">
      <span class="nickname">${escapeHtml(message.nickname)}</span>
      <div class="timestamp-container">
        <span class="timestamp">${formatTime(message.createdAt)}</span>
        <span class="timestamp-tooltip">${formatFullTime(message.createdAt)}</span>
      </div>
    </div>
    <div class="message-content">${escapeHtml(message.content)}</div>
    <div class="message-footer">
      <button class="like-btn" onclick="handleLike(${message.id}, this)">
        <i>❤️</i>
        <span>${message.likes}</span>
      </button>
    </div>
  `;
  
  return card;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN');
}

function formatFullTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

async function handleLike(messageId, btn) {
  btn.classList.add('pulse');
  
  try {
    const response = await fetch(`${API_BASE}/messages/${messageId}/like`, {
      method: 'PUT'
    });
    const data = await response.json();
    
    if (data.success) {
      btn.querySelector('span').textContent = data.likes;
      btn.classList.add('liked');
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('点赞失败: ' + error.message);
  }
  
  setTimeout(() => {
    btn.classList.remove('pulse');
  }, 600);
}

function renderPagination() {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '上一页';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      pagination.style.opacity = '0.5';
      setTimeout(() => {
        fetchMessages(currentPage - 1);
        pagination.style.opacity = '1';
      }, 200);
    }
  });
  pagination.appendChild(prevBtn);
  
  const pageInfo = document.createElement('span');
  pageInfo.className = 'page-info';
  pageInfo.textContent = `${currentPage} / ${totalPages}`;
  pagination.appendChild(pageInfo);
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = '下一页';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      pagination.style.opacity = '0.5';
      setTimeout(() => {
        fetchMessages(currentPage + 1);
        pagination.style.opacity = '1';
      }, 200);
    }
  });
  pagination.appendChild(nextBtn);
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
  
  setTimeout(() => {
    errorDiv.classList.remove('show');
  }, 5000);
}

async function submitMessage(e) {
  e.preventDefault();
  
  const nickname = document.getElementById('nickname').value.trim();
  const content = document.getElementById('content').value;
  
  if (!nickname) {
    showError('请输入昵称');
    return;
  }
  
  if (!content.trim()) {
    showError('留言内容不能仅包含空格');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nickname, content })
    });
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('messageForm').reset();
      fetchMessages(1);
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('发布失败: ' + error.message);
  }
}

async function loadScenario(scenarioName) {
  try {
    const response = await fetch(`${API_BASE}/scenarios/${scenarioName}`, {
      method: 'POST'
    });
    const data = await response.json();
    
    if (data.success) {
      fetchMessages(1);
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('加载场景失败: ' + error.message);
  }
}

async function clearMessages() {
  if (!confirm('确定要清空所有留言吗？')) return;
  
  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'DELETE'
    });
    const data = await response.json();
    
    if (data.success) {
      fetchMessages(1);
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('清空失败: ' + error.message);
  }
}

document.getElementById('messageForm').addEventListener('submit', submitMessage);

document.querySelectorAll('.scenario-btn[data-scenario]').forEach(btn => {
  btn.addEventListener('click', () => {
    const scenario = btn.dataset.scenario;
    loadScenario(scenario);
  });
});

document.getElementById('clearBtn').addEventListener('click', clearMessages);

document.addEventListener('DOMContentLoaded', () => {
  fetchMessages(1);
});