const express = require('express');
const path = require('path');
const {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addTransaction,
  getTransactions,
  getMonthlyReport,
  clearAllData
} = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (product) res.json(product);
    else res.status(404).json({ error: 'Product not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, sku, price } = req.body;
    const product = await addProduct(name, sku, price);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, sku, price } = req.body;
    const result = await updateProduct(req.params.id, name, sku, price);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await deleteProduct(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { productId, type, quantity } = req.body;
    console.log('Transaction request:', { productId, type, quantity, body: req.body });
    
    if (!productId || !type || !quantity) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const transaction = await addTransaction(parseInt(productId), type, parseInt(quantity));
    res.status(201).json(transaction);
  } catch (err) {
    console.error('Transaction error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const { productId } = req.query;
    const transactions = await getTransactions(productId ? parseInt(productId) : null);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/report/monthly', async (req, res) => {
  try {
    const report = await getMonthlyReport();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scenarios/convenience', async (req, res) => {
  try {
    await clearAllData();
    const products = [
      { name: '矿泉水', sku: 'SKU001', price: 2.00, stock: 50 },
      { name: '方便面', sku: 'SKU002', price: 4.50, stock: 30 },
      { name: '火腿肠', sku: 'SKU003', price: 3.00, stock: 45 },
      { name: '饼干', sku: 'SKU004', price: 8.00, stock: 25 },
      { name: '牛奶', sku: 'SKU005', price: 6.50, stock: 20 },
      { name: '面包', sku: 'SKU006', price: 5.00, stock: 35 },
      { name: '薯片', sku: 'SKU007', price: 7.00, stock: 18 },
      { name: '可乐', sku: 'SKU008', price: 3.50, stock: 40 }
    ];
    for (const p of products) {
      const product = await addProduct(p.name, p.sku, p.price);
      await addTransaction(product.id, 'in', p.stock);
    }
    res.json({ success: true, message: '便利店库存场景已加载' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scenarios/overstock', async (req, res) => {
  try {
    await clearAllData();
    const products = [
      { name: '老式收音机', sku: 'SKU101', price: 120.00, stock: 500 },
      { name: '黑白电视机', sku: 'SKU102', price: 350.00, stock: 200 },
      { name: 'VCD播放器', sku: 'SKU103', price: 280.00, stock: 350 },
      { name: '拨号电话机', sku: 'SKU104', price: 80.00, stock: 400 },
      { name: '磁带录音机', sku: 'SKU105', price: 150.00, stock: 280 },
      { name: 'CD随身听', sku: 'SKU106', price: 220.00, stock: 320 },
      { name: '软盘驱动器', sku: 'SKU107', price: 90.00, stock: 450 },
      { name: '大哥大手机', sku: 'SKU108', price: 800.00, stock: 150 }
    ];
    for (const p of products) {
      const product = await addProduct(p.name, p.sku, p.price);
      await addTransaction(product.id, 'in', p.stock);
    }
    res.json({ success: true, message: '滞销品仓库场景已加载' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scenarios/empty', async (req, res) => {
  try {
    await clearAllData();
    const products = [
      { name: '商品A', sku: 'SKU201', price: 10.00, stock: 0 },
      { name: '商品B', sku: 'SKU202', price: 20.00, stock: 0 },
      { name: '商品C', sku: 'SKU203', price: 30.00, stock: 0 },
      { name: '商品D', sku: 'SKU204', price: 40.00, stock: 0 },
      { name: '商品E', sku: 'SKU205', price: 50.00, stock: 0 }
    ];
    for (const p of products) {
      await addProduct(p.name, p.sku, p.price);
    }
    res.json({ success: true, message: '空仓场景已加载' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scenarios/negative', async (req, res) => {
  try {
    await clearAllData();
    const products = [
      { name: '限量版球鞋', sku: 'SKU301', price: 1299.00, stock: 5 },
      { name: '高端耳机', sku: 'SKU302', price: 899.00, stock: 3 },
      { name: '无线鼠标', sku: 'SKU303', price: 199.00, stock: 10 },
      { name: '机械键盘', sku: 'SKU304', price: 499.00, stock: 8 },
      { name: '游戏手柄', sku: 'SKU305', price: 299.00, stock: 15 }
    ];
    for (const p of products) {
      const product = await addProduct(p.name, p.sku, p.price);
      await addTransaction(product.id, 'in', p.stock);
      if (p.stock > 0) {
        await addTransaction(product.id, 'out', p.stock + 2);
      }
    }
    res.json({ success: true, message: '负数库存场景已加载' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});