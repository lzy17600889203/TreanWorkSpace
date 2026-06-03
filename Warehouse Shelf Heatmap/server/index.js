const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

const categories = [
  { id: 1, name: '电子产品', description: '手机、电脑等' },
  { id: 2, name: '服装鞋帽', description: '服饰类商品' },
  { id: 3, name: '食品饮料', description: '食品和饮品' },
  { id: 4, name: '家居用品', description: '家具和日用品' },
  { id: 5, name: '美妆个护', description: '化妆品和个人护理' },
  { id: 6, name: '母婴用品', description: '婴儿和母亲用品' },
  { id: 7, name: '图书文具', description: '书籍和文具' },
  { id: 8, name: '运动户外', description: '运动器材和户外装备' }
];

let shelves = [];

const initShelves = () => {
  shelves = [];
  let id = 1;
  let categoryId = 1;
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 3; z++) {
        shelves.push({
          id: id++,
          x,
          y,
          z,
          category_id: categoryId,
          category_name: categories[categoryId - 1].name,
          stock: 50 + Math.floor(Math.random() * 50),
          max_stock: 100
        });
        categoryId = (categoryId % 8) + 1;
      }
    }
  }
};

initShelves();

app.get('/api/categories', (req, res) => {
  res.json(categories);
});

app.get('/api/shelves', (req, res) => {
  const { categoryId } = req.query;
  if (categoryId) {
    res.json(shelves.filter(s => s.category_id === parseInt(categoryId)));
  } else {
    res.json(shelves);
  }
});

app.get('/api/shelves/all', (req, res) => {
  res.json(shelves);
});

const setScenario = (scenarioName) => {
  // 为冷区分布场景生成随机的热门分类
  const hotCategories = new Set();
  if (scenarioName === 'cold') {
    // 随机选择 2-3 个分类作为热门（高库存）
    const numHotCategories = 2 + Math.floor(Math.random() * 2);
    while (hotCategories.size < numHotCategories) {
      hotCategories.add(Math.floor(Math.random() * 8) + 1);
    }
  }

  shelves.forEach(shelf => {
    switch (scenarioName) {
      case 'double11':
        shelf.stock = Math.floor(Math.random() * 30);
        shelf.max_stock = 100;
        break;
      case 'normal':
        shelf.stock = 40 + Math.floor(Math.random() * 40);
        shelf.max_stock = 100;
        break;
      case 'cold':
        if (hotCategories.has(shelf.category_id)) {
          // 热门分类 - 高库存
          shelf.stock = 90 + Math.floor(Math.random() * 10);
        } else {
          // 冷门分类 - 低库存
          shelf.stock = 5 + Math.floor(Math.random() * 20);
        }
        shelf.max_stock = 100;
        break;
      case 'restock':
        shelf.stock = Math.floor(Math.random() * 100);
        shelf.max_stock = 100;
        break;
      default:
        shelf.stock = 50 + Math.floor(Math.random() * 50);
        shelf.max_stock = 100;
    }
  });
};

app.post('/api/scenario/:name', (req, res) => {
  const { name } = req.params;
  setScenario(name);
  res.json(shelves);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
