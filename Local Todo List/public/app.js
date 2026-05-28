let tasks = [];
let draggedElement = null;
let editingTaskId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
});

async function loadTasks() {
  try {
    const response = await fetch('/api/tasks');
    tasks = await response.json();
    renderTasks();
  } catch (error) {
    console.error('Failed to load tasks:', error);
  }
}

function renderTasks() {
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  
  if (tasks.length === 0) {
    taskList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  taskList.style.display = 'block';
  emptyState.style.display = 'none';
  
  taskList.innerHTML = '';
  
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}${isOverdue(task.dueDate) && !task.completed ? ' overdue' : ''}`;
    li.dataset.id = task.id;
    li.draggable = true;
    
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);
    
    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onclick="toggleComplete(${task.id})">
      <span class="task-title">${task.title}</span>
      <span class="task-priority priority-${task.priority}">${getPriorityLabel(task.priority)}</span>
      ${task.dueDate ? `<span class="task-due-date">${formatDate(task.dueDate)}</span>` : ''}
      <div class="task-actions">
        <span class="action-icon edit-icon" onclick="startEdit(${task.id}, this)">✏️</span>
        <span class="action-icon delete-icon" onclick="deleteTask(${task.id})">🗑️</span>
      </div>
    `;
    
    taskList.appendChild(li);
  });
}

function getPriorityLabel(priority) {
  switch (priority) {
    case 1: return '普通';
    case 2: return '重要';
    case 3: return '紧急';
    default: return '普通';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return due < today;
}

async function addTask() {
  const title = document.getElementById('taskInput').value;
  const priority = parseInt(document.getElementById('prioritySelect').value);
  const dueDate = document.getElementById('dueDateInput').value;
  
  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, dueDate })
    });
    
    const newTask = await response.json();
    tasks.push(newTask);
    renderTasks();
    
    document.getElementById('taskInput').value = '';
    document.getElementById('prioritySelect').value = '1';
    document.getElementById('dueDateInput').value = '';
    
    setTimeout(() => {
      document.querySelector('.task-item:last-child')?.classList.add('new');
    }, 10);
  } catch (error) {
    console.error('Failed to add task:', error);
  }
}

function handleKeyDown(event) {
  if (event.key === 'Enter') {
    addTask();
  }
}

async function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  
  task.completed = !task.completed;
  
  try {
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    
    renderTasks();
  } catch (error) {
    console.error('Failed to update task:', error);
  }
}

function startEdit(id, element) {
  editingTaskId = id;
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  
  const li = element.closest('.task-item');
  const titleSpan = li.querySelector('.task-title');
  const prioritySpan = li.querySelector('.task-priority');
  
  const editContainer = document.createElement('div');
  editContainer.className = 'edit-container';
  
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'task-edit-input';
  titleInput.value = task.title;
  
  const prioritySelect = document.createElement('select');
  prioritySelect.className = 'task-edit-priority';
  prioritySelect.innerHTML = `
    <option value="1" ${task.priority === 1 ? 'selected' : ''}>普通</option>
    <option value="2" ${task.priority === 2 ? 'selected' : ''}>重要</option>
    <option value="3" ${task.priority === 3 ? 'selected' : ''}>紧急</option>
  `;
  
  editContainer.appendChild(titleInput);
  editContainer.appendChild(prioritySelect);
  
  titleInput.focus();
  
  const handleSave = () => {
    saveEdit(id, titleInput.value, parseInt(prioritySelect.value));
  };
  
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      cancelEdit(titleSpan, prioritySpan, editContainer, li);
    }
  });
  
  titleInput.addEventListener('blur', () => {
    handleSave();
  });
  
  li.replaceChild(editContainer, titleSpan);
  prioritySpan.style.display = 'none';
}

function cancelEdit(titleSpan, prioritySpan, editContainer, li) {
  li.replaceChild(titleSpan, editContainer);
  prioritySpan.style.display = 'inline-block';
  editingTaskId = null;
}

async function saveEdit(id, newTitle, newPriority) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  
  task.title = newTitle || task.title;
  task.priority = newPriority;
  
  try {
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    
    renderTasks();
    editingTaskId = null;
  } catch (error) {
    console.error('Failed to update task:', error);
  }
}

async function deleteTask(id) {
  const li = document.querySelector(`[data-id="${id}"]`);
  if (li) {
    li.classList.add('deleting');
  }
  
  setTimeout(async () => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      
      tasks = tasks.filter(t => t.id !== id);
      renderTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, 400);
}

async function clearCompleted() {
  const completedItems = document.querySelectorAll('.task-item.completed');
  
  completedItems.forEach(item => {
    item.classList.add('deleting');
  });
  
  setTimeout(async () => {
    try {
      await fetch('/api/tasks/completed', {
        method: 'DELETE'
      });
      
      tasks = tasks.filter(t => !t.completed);
      renderTasks();
    } catch (error) {
      console.error('Failed to clear completed tasks:', error);
    }
  }, 400);
}

async function loadScenario(name) {
  try {
    const response = await fetch(`/api/scenario/${name}`, {
      method: 'POST'
    });
    tasks = await response.json();
    renderTasks();
  } catch (error) {
    console.error('Failed to load scenario:', error);
  }
}

function handleDragStart(e) {
  draggedElement = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const dragging = document.querySelector('.dragging');
  const items = Array.from(document.querySelectorAll('.task-item:not(.dragging)'));
  
  const closest = items.find(item => {
    const rect = item.getBoundingClientRect();
    const y = e.clientY - rect.top;
    return y < rect.height / 2;
  });
  
  if (closest) {
    closest.parentNode.insertBefore(dragging, closest);
  }
}

function handleDrop(e) {
  e.preventDefault();
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  
  const taskItems = document.querySelectorAll('.task-item');
  const newOrder = Array.from(taskItems).map(item => parseInt(item.dataset.id));
  
  tasks = newOrder.map(id => tasks.find(t => t.id === id));
  
  draggedElement = null;
}