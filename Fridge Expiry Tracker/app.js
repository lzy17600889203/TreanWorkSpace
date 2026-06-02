function calculateDaysLeft(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getStatus(daysLeft) {
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 3) return 'warning';
    return 'normal';
}

function getStatusText(daysLeft) {
    if (daysLeft < 0) return `已过期 ${Math.abs(daysLeft)} 天`;
    if (daysLeft === 0) return '今天过期';
    if (daysLeft === 1) return '还剩 1 天';
    return `还剩 ${daysLeft} 天`;
}

function getBadgeClass(status) {
    if (status === 'normal') return 'badge-normal';
    if (status === 'warning') return 'badge-warning';
    return 'badge-expired';
}

function getBadgeText(status) {
    if (status === 'normal') return '正常';
    if (status === 'warning') return '临期';
    return '已过期';
}

async function loadFoodItems() {
    try {
        const response = await fetch('/api/food');
        const items = await response.json();
        renderFoodList(items);
    } catch (error) {
        console.error('加载食品列表失败:', error);
    }
}

function renderFoodList(items) {
    const foodList = document.getElementById('foodList');
    foodList.innerHTML = '';

    items.forEach(item => {
        const daysLeft = calculateDaysLeft(item.expiry_date);
        const status = getStatus(daysLeft);
        
        const li = document.createElement('li');
        li.className = `food-item ${status}`;
        li.dataset.id = item.id;
        
        li.innerHTML = `
            <div class="food-info">
                <div class="food-name">
                    ${item.name}
                    <span class="status-badge ${getBadgeClass(status)}">${getBadgeText(status)}</span>
                </div>
                <div class="food-expiry">
                    过期时间: ${item.expiry_date} (${getStatusText(daysLeft)})
                </div>
            </div>
            <button class="delete-btn" data-id="${item.id}">删除</button>
        `;
        
        foodList.appendChild(li);
    });
}

async function addFood() {
    const nameInput = document.getElementById('foodName');
    const dateInput = document.getElementById('expiryDate');
    
    const name = nameInput.value.trim();
    const expiryDate = dateInput.value;
    
    if (!name || !expiryDate) {
        alert('请输入食品名称和过期时间');
        return;
    }
    
    try {
        const response = await fetch('/api/food', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, expiryDate })
        });
        
        if (response.ok) {
            nameInput.value = '';
            dateInput.value = '';
            loadFoodItems();
        } else {
            alert('添加失败');
        }
    } catch (error) {
        console.error('添加食品失败:', error);
        alert('添加失败');
    }
}

async function deleteFood(id) {
    // 确保 id 是数字类型
    const foodId = parseInt(id, 10);
    
    if (!confirm('确定要删除这个食品吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/food/${foodId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadFoodItems();
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('删除食品失败:', error);
        alert('删除失败');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('expiryDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
    
    const foodList = document.getElementById('foodList');
    
    // 事件委托处理删除按钮点击
    foodList.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            deleteFood(id);
        }
    });
    
    loadFoodItems();
});
