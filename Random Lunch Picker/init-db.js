const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'restaurants.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cuisine TEXT,
    rating REAL,
    price_range TEXT
  )
`);

const restaurants = [
  { name: '川味居', cuisine: '川菜', rating: 4.5, price_range: '¥¥' },
  { name: '粤式茶餐厅', cuisine: '粤菜', rating: 4.3, price_range: '¥¥' },
  { name: '日式拉面屋', cuisine: '日料', rating: 4.6, price_range: '¥¥' },
  { name: '韩式烤肉', cuisine: '韩料', rating: 4.4, price_range: '¥¥¥' },
  { name: '意大利餐厅', cuisine: '西餐', rating: 4.7, price_range: '¥¥¥' },
  { name: '老北京烤鸭', cuisine: '京菜', rating: 4.8, price_range: '¥¥¥' },
  { name: '麻辣烫', cuisine: '小吃', rating: 4.2, price_range: '¥' },
  { name: '兰州拉面', cuisine: '面食', rating: 4.1, price_range: '¥' },
  { name: '泰国餐厅', cuisine: '泰餐', rating: 4.5, price_range: '¥¥' },
  { name: '越南河粉', cuisine: '越餐', rating: 4.3, price_range: '¥¥' },
  { name: '麦当劳', cuisine: '快餐', rating: 3.8, price_range: '¥' },
  { name: '肯德基', cuisine: '快餐', rating: 3.9, price_range: '¥' },
  { name: '汉堡王', cuisine: '快餐', rating: 4.0, price_range: '¥' },
  { name: '海底捞', cuisine: '火锅', rating: 4.6, price_range: '¥¥¥' },
  { name: '潮汕牛肉火锅', cuisine: '火锅', rating: 4.7, price_range: '¥¥¥' },
  { name: '云南过桥米线', cuisine: '滇菜', rating: 4.4, price_range: '¥¥' },
  { name: '新疆大盘鸡', cuisine: '新疆菜', rating: 4.5, price_range: '¥¥' },
  { name: '湘菜人家', cuisine: '湘菜', rating: 4.6, price_range: '¥¥' },
  { name: '素食餐厅', cuisine: '素食', rating: 4.3, price_range: '¥¥' },
  { name: '海鲜大排档', cuisine: '海鲜', rating: 4.5, price_range: '¥¥¥' }
];

const insert = db.prepare('INSERT INTO restaurants (name, cuisine, rating, price_range) VALUES (?, ?, ?, ?)');
const deleteAll = db.prepare('DELETE FROM restaurants');

deleteAll.run();

restaurants.forEach(restaurant => {
  insert.run(restaurant.name, restaurant.cuisine, restaurant.rating, restaurant.price_range);
});

console.log('数据库初始化成功！已插入20个餐厅数据。');
db.close();
