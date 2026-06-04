let habitData = [];
let currentMonthIndex = 0;
let animationId = null;
let targetData = [];
let currentData = [];

const heatmapCanvas = document.getElementById('heatmapCanvas');
const energyCanvas = document.getElementById('energyCanvas');
const heatmapCtx = heatmapCanvas.getContext('2d');
const energyCtx = energyCanvas.getContext('2d');
const monthSlider = document.getElementById('monthSlider');
const monthLabel = document.getElementById('monthLabel');
const scoreDisplay = document.getElementById('scoreDisplay');

function init() {
    resizeCanvases();
    loadData();
    window.addEventListener('resize', resizeCanvases);
    monthSlider.addEventListener('input', onSliderChange);
}

function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    
    heatmapCanvas.width = heatmapCanvas.clientWidth * dpr;
    heatmapCanvas.height = heatmapCanvas.clientHeight * dpr;
    heatmapCanvas.style.width = heatmapCanvas.clientWidth + 'px';
    heatmapCanvas.style.height = heatmapCanvas.clientHeight + 'px';
    heatmapCtx.scale(dpr, dpr);
    
    energyCanvas.width = energyCanvas.clientWidth * dpr;
    energyCanvas.height = energyCanvas.clientHeight * dpr;
    energyCanvas.style.width = energyCanvas.clientWidth + 'px';
    energyCanvas.style.height = energyCanvas.clientHeight + 'px';
    energyCtx.scale(dpr, dpr);
    
    drawCharts();
}

async function loadData() {
    try {
        const response = await fetch('/api/habits');
        habitData = await response.json();
        setupSlider();
        updateTargetData();
        
        const oldDataMap = new Map(currentData.map(item => [item.date, item]));
        
        currentData = targetData.map(targetItem => {
            const oldItem = oldDataMap.get(targetItem.date);
            if (oldItem) {
                return { ...oldItem };
            }
            return {
                date: targetItem.date,
                sleep: 0,
                exercise: 0,
                focus: 0,
                energy: 0,
                healthScore: 0
            };
        });
        
        animateCharts();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function setupSlider() {
    const today = new Date();
    const months = [];
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.unshift(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    monthSlider.min = 0;
    monthSlider.max = months.length - 1;
    monthSlider.value = months.length - 1;
    currentMonthIndex = months.length - 1;
    updateMonthLabel();
}

function onSliderChange() {
    currentMonthIndex = parseInt(monthSlider.value);
    updateMonthLabel();
    updateTargetData();
    animateCharts();
}

function updateMonthLabel() {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth() - (11 - currentMonthIndex), 1);
    monthLabel.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function updateTargetData() {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() - (11 - currentMonthIndex), 1);
    const startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    
    targetData = habitData.filter(item => {
        const date = new Date(item.date);
        return date >= startDate && date <= endDate;
    });
}

function animateCharts() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    let hasChanges = false;
    
    for (let i = 0; i < targetData.length; i++) {
        const targetItem = targetData[i];
        
        let currentItem = currentData.find(item => item.date === targetItem.date);
        if (!currentItem) {
            currentItem = { ...targetItem };
            hasChanges = true;
            currentData.splice(i, 0, currentItem);
        } else {
            for (const key of ['sleep', 'exercise', 'focus', 'energy', 'healthScore']) {
                if (currentItem[key] !== targetItem[key]) {
                    const diff = targetItem[key] - currentItem[key];
                    currentItem[key] += diff * 0.1;
                    if (Math.abs(diff) > 0.1) hasChanges = true;
                }
            }
        }
    }
    
    if (currentData.length > targetData.length) {
        currentData.splice(targetData.length);
        hasChanges = true;
    }
    
    drawCharts();
    
    if (hasChanges) {
        animationId = requestAnimationFrame(animateCharts);
    }
}

function drawCharts() {
    drawHeatmap();
    drawEnergyChart();
    updateHealthScore();
}

function drawHeatmap() {
    const width = heatmapCanvas.clientWidth;
    const height = heatmapCanvas.clientHeight;
    
    heatmapCtx.clearRect(0, 0, width, height);
    
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() - (11 - currentMonthIndex), 1);
    const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1).getDay();
    
    const cellSize = Math.min((width - 40) / 7, (height - 60) / 6);
    const startX = 20;
    const startY = 40;
    
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    heatmapCtx.fillStyle = '#888';
    heatmapCtx.font = '12px sans-serif';
    heatmapCtx.textAlign = 'center';
    for (let i = 0; i < 7; i++) {
        heatmapCtx.fillText(dayNames[i], startX + i * cellSize + cellSize / 2, startY - 10);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const data = currentData.find(d => d.date === dateStr);
        
        const col = (firstDayOfMonth + day - 1) % 7;
        const row = Math.floor((firstDayOfMonth + day - 1) / 7);
        
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;
        
        let color = 'rgba(255, 255, 255, 0.1)';
        if (data) {
            const score = data.healthScore || 0;
            const r = Math.max(0, 255 - score * 2.55);
            const g = Math.min(255, score * 2.55);
            color = `rgba(${Math.round(r)}, ${Math.round(g)}, 100, 0.8)`;
        }
        
        heatmapCtx.fillStyle = color;
        heatmapCtx.beginPath();
        heatmapCtx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
        heatmapCtx.fill();
        
        heatmapCtx.fillStyle = '#fff';
        heatmapCtx.font = '10px sans-serif';
        heatmapCtx.textAlign = 'center';
        heatmapCtx.textBaseline = 'middle';
        heatmapCtx.fillText(day, x + cellSize / 2, y + cellSize / 2);
    }
}

function drawEnergyChart() {
    const width = energyCanvas.clientWidth;
    const height = energyCanvas.clientHeight;
    
    energyCtx.clearRect(0, 0, width, height);
    
    if (currentData.length === 0) return;
    
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    energyCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    energyCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        energyCtx.beginPath();
        energyCtx.moveTo(padding, y);
        energyCtx.lineTo(width - padding, y);
        energyCtx.stroke();
    }
    
    const points = currentData.map((item, index) => {
        const x = padding + (index / (currentData.length - 1 || 1)) * chartWidth;
        const y = padding + chartHeight - ((item.energy / 100) * chartHeight);
        return { x, y, energy: item.energy };
    });
    
    energyCtx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
    energyCtx.lineWidth = 3;
    energyCtx.beginPath();
    energyCtx.moveTo(points[0].x, padding + chartHeight);
    points.forEach(p => {
        energyCtx.lineTo(p.x, padding + chartHeight);
    });
    energyCtx.lineTo(points[points.length - 1].x, padding + chartHeight);
    energyCtx.closePath();
    energyCtx.fillStyle = 'rgba(102, 126, 234, 0.2)';
    energyCtx.fill();
    
    energyCtx.beginPath();
    energyCtx.strokeStyle = 'rgba(102, 126, 234, 1)';
    energyCtx.lineWidth = 3;
    energyCtx.lineJoin = 'round';
    energyCtx.lineCap = 'round';
    
    for (let i = 0; i < points.length; i++) {
        if (i === 0) {
            energyCtx.moveTo(points[i].x, points[i].y);
        } else {
            const xc = (points[i].x + points[i-1].x) / 2;
            const yc = (points[i].y + points[i-1].y) / 2;
            energyCtx.quadraticCurveTo(points[i-1].x, points[i-1].y, xc, yc);
        }
    }
    if (points.length > 1) {
        energyCtx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
    energyCtx.stroke();
    
    points.forEach((p, i) => {
        energyCtx.beginPath();
        energyCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        energyCtx.fillStyle = '#667eea';
        energyCtx.fill();
        energyCtx.strokeStyle = '#fff';
        energyCtx.lineWidth = 2;
        energyCtx.stroke();
    });
    
    energyCtx.fillStyle = '#888';
    energyCtx.font = '12px sans-serif';
    energyCtx.textAlign = 'center';
    [0, 25, 50, 75, 100].forEach(level => {
        const y = padding + chartHeight - (level / 100) * chartHeight;
        energyCtx.textAlign = 'right';
        energyCtx.fillText(level, padding - 10, y + 4);
    });
}

function updateHealthScore() {
    const today = new Date().toISOString().split('T')[0];
    const todayData = habitData.find(d => d.date === today);
    if (todayData) {
        scoreDisplay.textContent = todayData.healthScore || '--';
    } else {
        scoreDisplay.textContent = '--';
    }
}

async function loadPreset(preset) {
    try {
        const tempCurrentData = [...currentData];
        
        const response = await fetch('/api/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preset })
        });
        await response.json();
        
        await loadData();
    } catch (error) {
        console.error('Error loading preset:', error);
    }
}

async function saveToday() {
    const today = new Date().toISOString().split('T')[0];
    const sleep = parseFloat(document.getElementById('sleepInput').value);
    const exercise = parseFloat(document.getElementById('exerciseInput').value);
    const focus = parseFloat(document.getElementById('focusInput').value);
    const energy = parseFloat(document.getElementById('energyInput').value);
    
    try {
        const response = await fetch('/api/habits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today, sleep, exercise, focus, energy })
        });
        await response.json();
        await loadData();
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

init();
