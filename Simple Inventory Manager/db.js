const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);
});

const addProduct = (name, sku, price) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO products (name, sku, price) VALUES (?, ?, ?)', [name, sku, price], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, name, sku, price, stock: 0 });
    });
  });
};

const getProducts = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getProductById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const updateProduct = (id, name, sku, price) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE products SET name = ?, sku = ?, price = ? WHERE id = ?', [name, sku, price, id], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
};

const deleteProduct = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
};

const addTransaction = (productId, type, quantity) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO transactions (product_id, type, quantity) VALUES (?, ?, ?)', [productId, type, quantity], function(err) {
      if (err) {
        console.error('INSERT transaction error:', err);
        reject(err);
      } else {
        const transactionId = this.lastID;
        const updateStock = type === 'in' ? '+' : '-';
        db.run(`UPDATE products SET stock = stock ${updateStock} ? WHERE id = ?`, [quantity, productId], function(err) {
          if (err) {
            console.error('UPDATE product stock error:', err);
            reject(err);
          } else {
            resolve({ id: transactionId, productId, type, quantity });
          }
        });
      }
    });
  });
};

const getTransactions = (productId = null) => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT t.*, p.name AS product_name FROM transactions t JOIN products p ON t.product_id = p.id';
    let params = [];
    if (productId) {
      query += ' WHERE t.product_id = ?';
      params.push(productId);
    }
    query += ' ORDER BY t.timestamp DESC';
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getMonthlyReport = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT strftime('%Y-%m', t.timestamp) as month,
             SUM(CASE WHEN t.type = 'in' THEN t.quantity ELSE 0 END) as total_in,
             SUM(CASE WHEN t.type = 'out' THEN t.quantity ELSE 0 END) as total_out
      FROM transactions t
      GROUP BY month
      ORDER BY month
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const clearAllData = () => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM transactions', (err) => {
      if (err) reject(err);
      else {
        db.run('DELETE FROM products', (err) => {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  });
};

module.exports = {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addTransaction,
  getTransactions,
  getMonthlyReport,
  clearAllData,
  db
};