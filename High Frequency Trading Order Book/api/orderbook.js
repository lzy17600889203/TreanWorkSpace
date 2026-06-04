const crypto = require('crypto');

class OrderBook {
  constructor(symbol = 'BTC-USDT') {
    this.symbol = symbol;
    this.bids = new Map();
    this.asks = new Map();
    this.sequence = 0;
    this.lastPrice = 100000;
    this.bestBid = 99990;
    this.bestAsk = 100010;
  }

  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  getSnapshot() {
    const sortedBids = Array.from(this.bids.entries())
      .sort((a, b) => b[0] - a[0])
      .slice(0, 50)
      .map(([price, size]) => [parseFloat(price), size]);

    const sortedAsks = Array.from(this.asks.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, 50)
      .map(([price, size]) => [parseFloat(price), size]);

    return {
      bids: sortedBids,
      asks: sortedAsks,
      sequence: this.sequence++,
      timestamp: Date.now(),
      lastPrice: this.lastPrice,
      bestBid: this.bestBid,
      bestAsk: this.bestAsk
    };
  }

  updateBid(price, size) {
    if (size <= 0) {
      this.bids.delete(price);
    } else {
      this.bids.set(price, size);
    }
    this._updateBestBid();
  }

  updateAsk(price, size) {
    if (size <= 0) {
      this.asks.delete(price);
    } else {
      this.asks.set(price, size);
    }
    this._updateBestAsk();
  }

  _updateBestBid() {
    if (this.bids.size > 0) {
      this.bestBid = Math.max(...this.bids.keys());
    }
  }

  _updateBestAsk() {
    if (this.asks.size > 0) {
      this.bestAsk = Math.min(...this.asks.keys());
    }
  }

  setLastPrice(price) {
    this.lastPrice = price;
  }

  clear() {
    this.bids.clear();
    this.asks.clear();
  }
}

module.exports = OrderBook;
