const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'restaurants.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const defaultRestaurants = [
  { id: 1, name: '川味居', cuisine: '川菜', rating: 4.5, price_range: '¥¥' },
  { id: 2, name: '粤式茶餐厅', cuisine: '粤菜', rating: 4.3, price_range: '¥¥' },
  { id: 3, name: '日式拉面屋', cuisine: '日料', rating: 4.6, price_range: '¥¥' },
  { id: 4, name: '韩式烤肉', cuisine: '韩料', rating: 4.4, price_range: '¥¥¥' },
  { id: 5, name: '意大利餐厅', cuisine: '西餐', rating: 4.7, price_range: '¥¥¥' },
  { id: 6, name: '老北京烤鸭', cuisine: '京菜', rating: 4.8, price_range: '¥¥¥' },
  { id: 7, name: '麻辣烫', cuisine: '小吃', rating: 4.2, price_range: '¥' },
  { id: 8, name: '兰州拉面', cuisine: '面食', rating: 4.1, price_range: '¥' },
  { id: 9, name: '泰国餐厅', cuisine: '泰餐', rating: 4.5, price_range: '¥¥' },
  { id: 10, name: '越南河粉', cuisine: '越餐', rating: 4.3, price_range: '¥¥' },
  { id: 11, name: '麦当劳', cuisine: '快餐', rating: 3.8, price_range: '¥' },
  { id: 12, name: '肯德基', cuisine: '快餐', rating: 3.9, price_range: '¥' },
  { id: 13, name: '汉堡王', cuisine: '快餐', rating: 4.0, price_range: '¥' },
  { id: 14, name: '海底捞', cuisine: '火锅', rating: 4.6, price_range: '¥¥¥' },
  { id: 15, name: '潮汕牛肉火锅', cuisine: '火锅', rating: 4.7, price_range: '¥¥¥' },
  { id: 16, name: '云南过桥米线', cuisine: '滇菜', rating: 4.4, price_range: '¥¥' },
  { id: 17, name: '新疆大盘鸡', cuisine: '新疆菜', rating: 4.5, price_range: '¥¥' },
  { id: 18, name: '湘菜人家', cuisine: '湘菜', rating: 4.6, price_range: '¥¥' },
  { id: 19, name: '素食餐厅', cuisine: '素食', rating: 4.3, price_range: '¥¥' },
  { id: 20, name: '海鲜大排档', cuisine: '海鲜', rating: 4.5, price_range: '¥¥¥' }
];

function loadRestaurants() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('读取数据文件失败，使用默认数据:', error);
      return [...defaultRestaurants];
    }
  }
  return [...defaultRestaurants];
}

function saveRestaurants(restaurants) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(restaurants, null, 2), 'utf8');
}

let restaurants = loadRestaurants();

app.get('/api/restaurants', (req, res) => {
  res.json(restaurants);
});

app.get('/api/random', (req, res) => {
  const randomIndex = Math.floor(Math.random() * restaurants.length);
  res.json(restaurants[randomIndex]);
});

app.post('/api/restaurants', (req, res) => {
  const { name, cuisine, rating, price_range } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '餐厅名称不能为空' });
  }
  
  const newId = restaurants.length > 0 
    ? Math.max(...restaurants.map(r => r.id)) + 1 
    : 1;
  
  const newRestaurant = {
    id: newId,
    name: name.trim(),
    cuisine: cuisine || '其他',
    rating: parseFloat(rating) || 4.0,
    price_range: price_range || '¥¥'
  };
  
  restaurants.push(newRestaurant);
  saveRestaurants(restaurants);
  
  res.json({ success: true, restaurant: newRestaurant });
});

app.listen(PORT, () => {
  console.log(`服务器已启动: http://localhost:${PORT}`);
});
