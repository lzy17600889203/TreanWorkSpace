let products = [];
let transactions = [];

const API_BASE = '';

async function fetchProducts() {
  try {
    const response = await fetch(`${API_BASE}/api/products`);
    products = await response.json();
    renderProducts();
    updateProductSelect();
  } catch (error) {
    showError('获取商品列表失败: ' + error.message);
  }
}

async function fetchTransactions() {
  try {
    const response = await fetch(`${API_BASE}/api/transactions`);
    transactions = await response.json();
    renderTransactions();
  } catch (error) {
    showError('获取流水记录失败: ' + error.message);
  }
}

async function fetchMonthlyReport() {
  try {
    const response = await fetch(`${API_BASE}/api/report/monthly`);
    const report = await response.json();
    renderChart(report);
  } catch (error) {
    showError('获取月度报表失败: ' + error.message);
  }
}

function renderProducts(filter = '') {
  const tbody = document.getElementById('productTableBody');
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase()) || 
    p.sku.toLowerCase().includes(filter.toLowerCase())
  );
  
  tbody.innerHTML = '';
  
  if (filteredProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><h3>暂无商品</h3><p>点击"添加商品"按钮添加新商品</p></td></tr>';
    return;
  }
  
  filteredProducts.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="word-break: break-all;">${product.name}</td>
      <td>${product.sku}</td>
      <td>¥${product.price.toFixed(2)}</td>
      <td>
        <span class="stock-cell ${getStockClass(product.stock)}" id="stock-${product.id}">${product.stock}</span>
        ${product.stock < 10 && product.stock > 0 ? '<span style="color: #dc3545; font-size: 12px;"> (低库存预警)</span>' : ''}
        ${product.stock < 0 ? '<span style="color: #dc3545; font-size: 12px;"> (库存异常)</span>' : ''}
      </td>
      <td>
        <button class="btn btn-danger" onclick="deleteProduct(${product.id})">删除</button>
      </td>
      <td>
        <button class="btn btn-success" onclick="quickStockIn(${product.id})">入库</button>
        <button class="btn btn-warning" onclick="quickStockOut(${product.id})">出库</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function getStockClass(stock) {
  if (stock < 0) return 'stock-negative';
  if (stock < 10) return 'stock-low';
  return 'stock-normal';
}

function updateProductSelect() {
  const select = document.getElementById('selectProduct');
  select.innerHTML = '<option value="">选择商品</option>';
  products.forEach(product => {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = `${product.name} (SKU: ${product.sku})`;
    select.appendChild(option);
  });
}

function renderTransactions() {
  const list = document.getElementById('transactionList');
  list.innerHTML = '';
  
  if (transactions.length === 0) {
    list.innerHTML = '<li class="empty-state"><h3>暂无出入库记录</h3></li>';
    return;
  }
  
  transactions.forEach(transaction => {
    const li = document.createElement('li');
    li.className = `transaction-item transaction-${transaction.type}`;
    li.innerHTML = `
      <div class="transaction-info">
        <h4>${transaction.product_name}</h4>
        <p>${transaction.timestamp}</p>
      </div>
      <div class="transaction-quantity">
        ${transaction.type === 'in' ? '+' : '-'}${transaction.quantity}
      </div>
    `;
    list.appendChild(li);
  });
}

function renderChart(report) {
  const container = document.getElementById('monthlyChart');
  
  if (report.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>暂无月度数据</h3></div>';
    return;
  }
  
  const maxValue = Math.max(...report.map(r => Math.max(r.total_in, r.total_out)));
  
  let chartHTML = '<div class="chart-bar">';
  report.forEach(data => {
    const inHeight = maxValue > 0 ? (data.total_in / maxValue) * 200 : 0;
    const outHeight = maxValue > 0 ? (data.total_out / maxValue) * 200 : 0;
    
    chartHTML += `
      <div class="bar-group">
        <div class="bar-wrapper">
          <div class="bar bar-in" style="height: 0px;" data-target="${inHeight}">
            <span class="bar-value">${data.total_in}</span>
          </div>
          <div class="bar bar-out" style="height: 0px;" data-target="${outHeight}">
            <span class="bar-value">${data.total_out}</span>
          </div>
        </div>
        <div class="bar-label">${data.month}</div>
      </div>
    `;
  });
  chartHTML += '</div>';
  
  container.innerHTML = chartHTML;
  
  setTimeout(() => {
    document.querySelectorAll('.bar').forEach(bar => {
      const targetHeight = bar.dataset.target;
      bar.style.height = `${targetHeight}px`;
    });
  }, 100);
}

async function addProduct(event) {
  event.preventDefault();
  
  const name = document.getElementById('productName').value;
  const sku = document.getElementById('productSku').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  
  try {
    const response = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sku, price })
    });
    
    if (!response.ok) throw new Error('添加商品失败');
    
    document.getElementById('addProductForm').reset();
    closeModal('addProductModal');
    await fetchProducts();
    fetchMonthlyReport();
  } catch (error) {
    showError(error.message);
  }
}

async function deleteProduct(id) {
  if (!confirm('确定要删除这个商品吗？')) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/products/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '删除失败');
    }
    
    await fetchProducts();
    await fetchTransactions();
    fetchMonthlyReport();
  } catch (error) {
    showError(error.message);
  }
}

async function addTransaction(productId, type, quantity) {
  if (!productId || isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    showError('请选择商品并输入有效数量');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, type, quantity })
    });
    
    if (!response.ok) throw new Error('操作失败');
    
    animateStockChange(productId, type, quantity);
    await fetchProducts();
    await fetchTransactions();
    fetchMonthlyReport();
  } catch (error) {
    showError(error.message);
  }
}

function animateStockChange(productId, type, quantity) {
  const stockElement = document.getElementById(`stock-${productId}`);
  if (stockElement) {
    stockElement.classList.add('stock-change');
    setTimeout(() => {
      stockElement.classList.remove('stock-change');
    }, 500);
  }
}

function quickStockIn(productId) {
  const quantity = prompt('请输入入库数量:', '10');
  if (quantity && parseInt(quantity) > 0) {
    addTransaction(productId, 'in', parseInt(quantity));
  }
}

function quickStockOut(productId) {
  const quantity = prompt('请输入出库数量:', '5');
  if (quantity && parseInt(quantity) > 0) {
    addTransaction(productId, 'out', parseInt(quantity));
  }
}

async function loadScenario(scenario) {
  try {
    const response = await fetch(`${API_BASE}/api/scenarios/${scenario}`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('加载场景失败');
    
    await fetchProducts();
    await fetchTransactions();
    fetchMonthlyReport();
    
    const messages = {
      convenience: '便利店库存场景已加载',
      overstock: '滞销品仓库场景已加载',
      empty: '空仓场景已加载',
      negative: '负数库存场景已加载'
    };
    alert(messages[scenario]);
  } catch (error) {
    showError(error.message);
  }
}

function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorModal').style.display = 'block';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  fetchTransactions();
  fetchMonthlyReport();
  
  document.getElementById('searchInput').addEventListener('input', (e) => {
    renderProducts(e.target.value);
  });
  
  document.getElementById('addProductForm').addEventListener('submit', addProduct);
  
  document.getElementById('btnStockIn').addEventListener('click', () => {
    const productId = parseInt(document.getElementById('selectProduct').value);
    const quantity = parseInt(document.getElementById('newStockIn').value);
    addTransaction(productId, 'in', quantity);
    document.getElementById('newStockIn').value = '';
  });
  
  document.getElementById('btnStockOut').addEventListener('click', () => {
    const productId = parseInt(document.getElementById('selectProduct').value);
    const quantity = parseInt(document.getElementById('newStockOut').value);
    addTransaction(productId, 'out', quantity);
    document.getElementById('newStockOut').value = '';
  });
  
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      loadScenario(btn.dataset.scenario);
    });
  });
  
  document.querySelectorAll('.close').forEach(close => {
    close.addEventListener('click', () => {
      close.parentElement.parentElement.style.display = 'none';
    });
  });
  
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
  
  const productSection = document.querySelector('.product-section');
  const addBtn = document.createElement('button');
  addBtn.className = 'add-product-btn';
  addBtn.textContent = '添加商品';
  addBtn.addEventListener('click', () => {
    document.getElementById('addProductModal').style.display = 'block';
  });
  productSection.insertBefore(addBtn, productSection.querySelector('h2').nextSibling);
});