// 简化版本 - 不使用 SQLite，使用内存存储来演示
const trades = [];
const orders = [];

const initDatabase = () => {
  console.log('Database initialized (in-memory)');
};

const insertTrade = (trade) => {
  trades.unshift(trade);
  if (trades.length > 100) trades.pop();
};

const insertOrder = (order) => {
  orders.unshift(order);
  if (orders.length > 100) orders.pop();
};

const getRecentTrades = () => trades;

module.exports = {
  initDatabase,
  insertTrade,
  insertOrder,
  getRecentTrades
};
