let habits = [];
let checkins = {};
let selectedColor = '#4CAF50';
let currentDate = new Date();
let lastStreak = {};

const API_BASE = 'http://localhost:3000/api';

async function fetchHabits() {
  try {
    const response = await fetch(`${API_BASE}/habits`);
    habits = await response.json();
    renderHabits();
    if (habits.length > 0) {
      await fetchCheckins(habits[0].id);
    }
    renderCalendar();
    updateEmptyState();
  } catch (error) {
    showErrorToast('获取习惯列表失败');
    console.error('Error fetching habits:', error);
  }
}

async function fetchCheckins(habitId) {
  try {
    const response = await fetch(`${API_BASE}/habits/${habitId}/checkins`);
    const data = await response.json();
    checkins[habitId] = {};
    data.forEach(c => {
      checkins[habitId][c.date] = c.checked === 1;
    });
    renderCalendar();
  } catch (error) {
    console.error('Error fetching checkins:', error);
  }
}

async function fetchStreak(habitId) {
  try {
    const response = await fetch(`${API_BASE}/habits/${habitId}/streak`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching streak:', error);
    return { streak: 0, longestStreak: 0 };
  }
}

function renderHabits() {
  const container = document.getElementById('habits-list');
  container.innerHTML = '';

  habits.forEach(async (habit) => {
    const streak = await fetchStreak(habit.id);
    lastStreak[habit.id] = streak.currentStreak;
    
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.dataset.habitId = habit.id;
    
    card.innerHTML = `
      <button class="delete-btn" onclick="deleteHabit(${habit.id})">×</button>
      <div class="habit-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="habit-color" style="background: ${habit.color}"></div>
          <span class="habit-name">${habit.name}</span>
        </div>
        <div class="habit-streak">
          <span class="flame-icon">🔥</span>
          <div>
            <div class="streak-count" id="streak-${habit.id}">${streak.currentStreak}</div>
            <div class="streak-label">连续天数</div>
          </div>
        </div>
      </div>
      <button 
        class="checkin-button" 
        id="checkin-btn-${habit.id}"
        onclick="toggleCheckin(${habit.id}, this)"
        style="--habit-color: ${habit.color}"
      >
        <span class="checkin-icon">✓</span>
      </button>
      <div class="habit-stats">
        <span>总打卡: ${habit.total_checkins || 0}次</span>
        <span>最长连续: ${streak.longestStreak}天</span>
      </div>
    `;
    
    container.appendChild(card);
    updateCheckinButton(habit.id);
  });
}

async function updateCheckinButton(habitId) {
  const today = new Date().toISOString().split('T')[0];
  const button = document.getElementById(`checkin-btn-${habitId}`);
  
  if (!button) return;
  
  const response = await fetch(`${API_BASE}/habits/${habitId}/checkins/date/${today}`);
  const data = await response.json();
  
  if (data.checked) {
    button.classList.add('checked');
  } else {
    button.classList.remove('checked');
  }
}

async function toggleCheckin(habitId, button) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const wasChecked = button.classList.contains('checked');
    
    if (!wasChecked) {
      const ripple = document.createElement('span');
      ripple.className = 'water-ripple';
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);
    }
    
    const response = await fetch(`${API_BASE}/habits/${habitId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today })
    });
    
    const data = await response.json();
    
    if (data.checked) {
      button.classList.add('checked');
      await updateStreak(habitId, true);
    } else {
      button.classList.remove('checked');
      await updateStreak(habitId, false);
    }
    
    await fetchCheckins(habitId);
    renderCalendar();
    showSuccessToast(data.checked ? '打卡成功！' : '已撤销打卡');
    
  } catch (error) {
    showErrorToast('打卡失败，请重试');
    console.error('Error toggling checkin:', error);
  }
}

async function updateStreak(habitId, wasChecked) {
  const streak = await fetchStreak(habitId);
  const streakElement = document.getElementById(`streak-${habitId}`);
  
  if (streakElement) {
    streakElement.textContent = streak.currentStreak;
  }
  
  if (wasChecked && streak.currentStreak > lastStreak[habitId]) {
    const milestones = [7, 14, 30, 60, 90, 100, 180, 365];
    if (milestones.includes(streak.currentStreak)) {
      showCelebrationModal(streak.currentStreak);
    }
  }
  
  lastStreak[habitId] = streak.currentStreak;
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  document.getElementById('current-month').textContent = `${year}年${month + 1}月`;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  
  for (let i = 0; i < startDay; i++) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'calendar-day other-month';
    grid.appendChild(emptyDiv);
  }
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day current-month';
    
    if (dateStr === todayStr) {
      dayDiv.classList.add('today');
    }
    
    let isChecked = false;
    Object.values(checkins).forEach(habitCheckins => {
      if (habitCheckins[dateStr]) {
        isChecked = true;
      }
    });
    
    if (isChecked) {
      dayDiv.classList.add('checked');
    }
    
    dayDiv.textContent = day;
    grid.appendChild(dayDiv);
  }
}

function prevMonth() {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  renderCalendar();
}

function nextMonth() {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  renderCalendar();
}

function showAddHabitModal() {
  document.getElementById('add-habit-modal').style.display = 'block';
  document.getElementById('habit-name').value = '';
  selectedColor = '#4CAF50';
  updateColorButtons();
}

function closeAddHabitModal() {
  document.getElementById('add-habit-modal').style.display = 'none';
}

function selectColor(color) {
  selectedColor = color;
  updateColorButtons();
}

function updateColorButtons() {
  const buttons = document.querySelectorAll('.color-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('selected', btn.style.background === selectedColor);
  });
}

async function addHabit() {
  const name = document.getElementById('habit-name').value.trim();
  if (!name) {
    showErrorToast('请输入习惯名称');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: selectedColor })
    });
    
    if (response.ok) {
      closeAddHabitModal();
      await fetchHabits();
      showSuccessToast('习惯添加成功！');
    } else {
      showErrorToast('添加失败，请重试');
    }
  } catch (error) {
    showErrorToast('添加失败，请重试');
    console.error('Error adding habit:', error);
  }
}

async function deleteHabit(habitId) {
  if (!confirm('确定要删除这个习惯吗？所有打卡记录也会被删除。')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/habits/${habitId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      await fetchHabits();
      showSuccessToast('习惯已删除');
    } else {
      showErrorToast('删除失败');
    }
  } catch (error) {
    showErrorToast('删除失败');
    console.error('Error deleting habit:', error);
  }
}

function showCelebrationModal(days) {
  const message = document.getElementById('milestone-message');
  const messages = {
    7: '太棒了！你已经坚持一周了！',
    14: '两周连续打卡！继续保持！',
    30: '一个月达成！习惯养成中！',
    60: '两个月了！你真的很棒！',
    90: '三个月！习惯已成自然！',
    100: '💯 百日达成！里程碑！',
    180: '半年达成！超级厉害！',
    365: '🎉 一年达成！完美坚持！'
  };
  
  message.textContent = messages[days] || `恭喜连续打卡 ${days} 天！`;
  document.getElementById('celebration-modal').style.display = 'block';
}

function closeCelebrationModal() {
  document.getElementById('celebration-modal').style.display = 'none';
}

function showErrorToast(message) {
  const toast = document.getElementById('error-toast');
  toast.querySelector('span').textContent = `❌ ${message}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showSuccessToast(message) {
  const toast = document.getElementById('success-toast');
  toast.querySelector('span').textContent = `✅ ${message}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function loadScenario(scenario) {
  try {
    const response = await fetch(`${API_BASE}/scenarios/${scenario}`, {
      method: 'POST'
    });
    
    if (response.ok) {
      await fetchHabits();
      showSuccessToast('场景加载成功！');
    } else {
      showErrorToast('场景加载失败');
    }
  } catch (error) {
    showErrorToast('场景加载失败');
    console.error('Error loading scenario:', error);
  }
}

function updateEmptyState() {
  const emptyState = document.getElementById('empty-state');
  const habitsList = document.getElementById('habits-list');
  
  if (habits.length === 0) {
    emptyState.style.display = 'block';
    habitsList.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    habitsList.style.display = 'flex';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchHabits();
  
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
});

window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.showAddHabitModal = showAddHabitModal;
window.closeAddHabitModal = closeAddHabitModal;
window.selectColor = selectColor;
window.addHabit = addHabit;
window.deleteHabit = deleteHabit;
window.toggleCheckin = toggleCheckin;
window.loadScenario = loadScenario;
window.closeCelebrationModal = closeCelebrationModal;