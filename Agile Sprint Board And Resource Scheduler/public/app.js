const API_BASE = '/api';
const DAY_WIDTH = 80;
const TOTAL_DAYS = 14;

let members = [];
let tasks = [];
let originalTasks = [];
let draggingTask = null;
let dragOffset = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await fetchData();
    originalTasks = JSON.parse(JSON.stringify(tasks));
    renderGantt();
    setupControls();
});

async function fetchData() {
    const [membersRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/members`),
        fetch(`${API_BASE}/tasks`)
    ]);
    members = await membersRes.json();
    tasks = await tasksRes.json();
}

function renderGantt() {
    renderTimelineHeader();
    renderGanttBody();
}

function renderTimelineHeader() {
    const header = document.getElementById('timelineHeader');
    header.innerHTML = '';
    for (let i = 0; i < TOTAL_DAYS; i++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.textContent = `Day ${i + 1}`;
        header.appendChild(cell);
    }
}

function renderGanttBody() {
    const body = document.getElementById('ganttBody');
    body.innerHTML = '';

    members.forEach(member => {
        const row = document.createElement('div');
        row.className = 'member-row';

        const memberInfo = document.createElement('div');
        memberInfo.className = 'member-info';
        memberInfo.innerHTML = `
            <div class="member-name">${member.name}</div>
            <div class="member-skills">${member.skills}</div>
        `;
        row.appendChild(memberInfo);

        const timelineRow = document.createElement('div');
        timelineRow.className = 'timeline-row';
        timelineRow.dataset.memberId = member.id;

        for (let i = 0; i < TOTAL_DAYS; i++) {
            const cell = document.createElement('div');
            cell.className = 'timeline-cell';
            cell.dataset.day = i;
            timelineRow.appendChild(cell);
        }

        const memberTasks = tasks.filter(t => t.member_id === member.id);
        memberTasks.forEach(task => {
            const taskEl = createTaskElement(task, member.id);
            timelineRow.appendChild(taskEl);
        });

        row.appendChild(timelineRow);
        body.appendChild(row);
    });

    checkOverloads();
    checkIdle();
}

function createTaskElement(task, memberId) {
    const el = document.createElement('div');
    el.className = 'task';
    el.dataset.taskId = task.id;
    el.dataset.memberId = memberId;
    el.style.left = `${task.start_day * DAY_WIDTH}px`;
    el.style.width = `${task.duration * DAY_WIDTH}px`;
    el.style.backgroundColor = task.color;
    el.textContent = task.title;
    el.draggable = false;

    el.addEventListener('mousedown', startDrag);
    return el;
}

function startDrag(e) {
    draggingTask = e.target;
    draggingTask.classList.add('dragging');
    const rect = draggingTask.getBoundingClientRect();
    dragOffset = e.clientX - rect.left;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
    if (!draggingTask) return;
    
    const timelineRow = draggingTask.parentElement;
    const rowRect = timelineRow.getBoundingClientRect();
    let newLeft = e.clientX - rowRect.left - dragOffset;
    
    newLeft = Math.max(0, Math.min(newLeft, (TOTAL_DAYS - 1) * DAY_WIDTH));
    newLeft = Math.round(newLeft / DAY_WIDTH) * DAY_WIDTH;
    
    draggingTask.style.left = `${newLeft}px`;
    
    checkConflictDuringDrag();
}

function stopDrag(e) {
    if (!draggingTask) return;
    
    const taskId = parseInt(draggingTask.dataset.taskId);
    const newStartDay = Math.round(parseInt(draggingTask.style.left) / DAY_WIDTH);
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        task.start_day = newStartDay;
        saveTask(task);
    }
    
    draggingTask.classList.remove('dragging');
    draggingTask = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    
    checkOverloads();
    checkIdle();
}

function checkConflictDuringDrag() {
    const taskId = parseInt(draggingTask.dataset.taskId);
    const memberId = parseInt(draggingTask.dataset.memberId);
    const newStart = Math.round(parseInt(draggingTask.style.left) / DAY_WIDTH);
    const duration = tasks.find(t => t.id === taskId)?.duration || 0;
    const newEnd = newStart + duration;

    const memberTasks = tasks.filter(t => t.member_id === memberId && t.id !== taskId);
    let hasConflict = false;

    memberTasks.forEach(t => {
        const tEnd = t.start_day + t.duration;
        if (!(newEnd <= t.start_day || newStart >= tEnd)) {
            hasConflict = true;
        }
    });

    if (hasConflict) {
        draggingTask.classList.add('conflict');
    } else {
        draggingTask.classList.remove('conflict');
    }
}

async function saveTask(task) {
    await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
}

function checkOverloads() {
    document.querySelectorAll('.warning-icon').forEach(el => el.remove());
    document.querySelectorAll('.timeline-cell.overload').forEach(el => el.classList.remove('overload'));

    members.forEach(member => {
        const memberTasks = tasks.filter(t => t.member_id === member.id);
        const dailyHours = {};

        memberTasks.forEach(task => {
            const start = task.start_day;
            const end = task.start_day + task.duration;
            for (let d = start; d < end; d++) {
                dailyHours[d] = (dailyHours[d] || 0) + 8;
            }
        });

        const memberRow = document.querySelector(`.timeline-row[data-member-id="${member.id}"]`);
        if (!memberRow) return;

        Object.entries(dailyHours).forEach(([day, hours]) => {
            if (hours > 8) {
                const cell = memberRow.querySelector(`.timeline-cell[data-day="${day}"]`);
                if (cell) {
                    cell.classList.add('overload');
                    showToast(`${member.name} 在 Day ${parseInt(day) + 1} 工作过载！`, 'error');
                }

                const memberInfoEl = memberRow.previousElementSibling;
                if (memberInfoEl && !memberInfoEl.querySelector('.warning-icon')) {
                    const icon = document.createElement('div');
                    icon.className = 'warning-icon';
                    icon.textContent = '💥';
                    memberInfoEl.style.position = 'relative';
                    memberInfoEl.appendChild(icon);
                }
            }
        });
    });
}

function checkIdle() {
    document.querySelectorAll('.timeline-cell.idle').forEach(el => el.classList.remove('idle'));

    members.forEach(member => {
        const memberTasks = tasks.filter(t => t.member_id === member.id);
        const usedDays = new Set();
        
        memberTasks.forEach(task => {
            for (let d = task.start_day; d < task.start_day + task.duration; d++) {
                usedDays.add(d);
            }
        });

        const memberRow = document.querySelector(`.timeline-row[data-member-id="${member.id}"]`);
        if (!memberRow) return;

        for (let d = 0; d < TOTAL_DAYS; d++) {
            if (!usedDays.has(d)) {
                const cell = memberRow.querySelector(`.timeline-cell[data-day="${d}"]`);
                if (cell) cell.classList.add('idle');
            }
        }
    });
}

function showToast(message, type = 'warning') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function setupControls() {
    document.getElementById('btnPerfect').addEventListener('click', loadPerfectState);
    document.getElementById('btnOverload').addEventListener('click', loadOverloadState);
    document.getElementById('btnIdle').addEventListener('click', loadIdleState);
    document.getElementById('btnUrgent').addEventListener('click', loadUrgentState);
    document.getElementById('btnReset').addEventListener('click', resetState);
}

async function loadPerfectState() {
    tasks = [
        { id: 1, title: '登录页面', member_id: 1, start_day: 0, duration: 2, color: '#4CAF50' },
        { id: 2, title: '用户中心', member_id: 1, start_day: 2, duration: 2, color: '#66BB6A' },
        { id: 3, title: 'API 设计', member_id: 2, start_day: 0, duration: 2, color: '#2196F3' },
        { id: 4, title: '数据库', member_id: 2, start_day: 2, duration: 2, color: '#42A5F5' },
        { id: 5, title: '原型', member_id: 3, start_day: 0, duration: 2, color: '#FF9800' },
        { id: 6, title: 'UI 设计', member_id: 3, start_day: 2, duration: 2, color: '#FFB74D' },
        { id: 7, title: '测试用例', member_id: 4, start_day: 0, duration: 2, color: '#9C27B0' },
        { id: 8, title: '自动化', member_id: 4, start_day: 2, duration: 2, color: '#BA68C8' },
        { id: 9, title: '环境准备', member_id: 5, start_day: 0, duration: 2, color: '#00BCD4' },
        { id: 10, title: 'CI/CD', member_id: 5, start_day: 2, duration: 2, color: '#4DD0E1' }
    ];
    await saveBatchTasks();
    renderGantt();
    showToast('完美并行状态加载成功！', 'success');
}

async function loadOverloadState() {
    tasks = [
        { id: 1, title: '核心功能A', member_id: 1, start_day: 0, duration: 3, color: '#f44336' },
        { id: 2, title: '紧急修复', member_id: 1, start_day: 1, duration: 2, color: '#ef5350' },
        { id: 3, title: '代码审查', member_id: 1, start_day: 2, duration: 2, color: '#e57373' },
        { id: 4, title: 'API 开发', member_id: 2, start_day: 0, duration: 4, color: '#2196F3' },
        { id: 5, title: '测试工作', member_id: 4, start_day: 2, duration: 3, color: '#9C27B0' }
    ];
    await saveBatchTasks();
    renderGantt();
    showToast('严重过载状态加载成功！', 'error');
}

async function loadIdleState() {
    tasks = [
        { id: 1, title: '登录页面', member_id: 1, start_day: 0, duration: 1, color: '#4CAF50' },
        { id: 2, title: 'API 设计', member_id: 2, start_day: 0, duration: 1, color: '#2196F3' }
    ];
    await saveBatchTasks();
    renderGantt();
    showToast('资源闲置状态加载成功！', 'warning');
}

async function loadUrgentState() {
    const urgentTask = {
        title: '⚡ 紧急插队任务',
        member_id: 1,
        start_day: 1,
        duration: 1,
        color: '#9c27b0'
    };
    
    tasks.forEach(task => {
        if (task.member_id === 1 && task.start_day >= 1) {
            task.start_day += 1;
        }
    });
    
    const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urgentTask)
    });
    const newTask = await res.json();
    tasks.push(newTask);
    
    await saveBatchTasks();
    renderGantt();
    
    setTimeout(() => {
        const newEl = document.querySelector(`[data-task-id="${newTask.id}"]`);
        if (newEl) newEl.classList.add('urgent');
    }, 100);
    
    showToast('突发任务已插入！后续任务已自动平移', 'warning');
}

async function resetState() {
    tasks = JSON.parse(JSON.stringify(originalTasks));
    await saveBatchTasks();
    renderGantt();
    showToast('已重置为初始状态', 'success');
}

async function saveBatchTasks() {
    await fetch(`${API_BASE}/tasks/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks })
    });
}
