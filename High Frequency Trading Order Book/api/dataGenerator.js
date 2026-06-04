const OrderBook = require('./orderbook');
const { insertTrade, insertOrder } = require('./database');

class DataGenerator {
  constructor(orderBook) {
    this.orderBook = orderBook;
    this.scene = 'normal';
    this.basePrice = 100000;
    this.volatility = 1;
  }

  setScene(scene) {
    // 保存原始基准价格（如果还没保存）
    if (!this.originalBasePrice) {
      this.originalBasePrice = this.basePrice;
    }
    
    // 切换场景时重置状态
    this.crashStarted = false;
    this.scene = scene;
    
    // 所有场景切换时都重置基准价格和订单簿
    this.basePrice = this.originalBasePrice;
    this.initializeOrderBook();
    
    console.log(`Scene changed to: ${scene}`);
  }

  generateId() {
    return require('crypto').randomBytes(16).toString('hex');
  }

  initializeOrderBook() {
    this.orderBook.clear();
    const midPrice = this.basePrice;
    
    for (let i = 0; i < 30; i++) {
      const bidPrice = midPrice - (i + 1) * 10 - Math.random() * 5;
      const bidSize = 5 + Math.random() * 20;
      this.orderBook.updateBid(bidPrice, bidSize);

      const askPrice = midPrice + (i + 1) * 10 + Math.random() * 5;
      const askSize = 5 + Math.random() * 20;
      this.orderBook.updateAsk(askPrice, askSize);
    }
  }

  generateNormalUpdate() {
    const snapshot = this.orderBook.getSnapshot();
    const midPrice = (snapshot.bestBid + snapshot.bestAsk) / 2;
    
    for (let i = 0; i < 3; i++) {
      const priceOffset = (Math.random() - 0.5) * 200;
      const price = midPrice + priceOffset;
      const size = Math.random() * 10;
      
      if (price < midPrice) {
        this.orderBook.updateBid(price, size);
      } else {
        this.orderBook.updateAsk(price, size);
      }
    }

    if (Math.random() < 0.3) {
      const tradeSide = Math.random() < 0.5 ? 'buy' : 'sell';
      const tradePrice = tradeSide === 'buy' ? snapshot.bestAsk : snapshot.bestBid;
      const tradeSize = 1 + Math.random() * 5;
      
      this.orderBook.setLastPrice(tradePrice);
      
      return {
        type: 'update',
        data: this.orderBook.getSnapshot(),
        trade: {
          id: this.generateId(),
          price: tradePrice,
          size: tradeSize,
          side: tradeSide,
          timestamp: Date.now()
        }
      };
    }

    return {
      type: 'update',
      data: this.orderBook.getSnapshot()
    };
  }

  generateBattleUpdate() {
    const snapshot = this.orderBook.getSnapshot();
    const midPrice = (snapshot.bestBid + snapshot.bestAsk) / 2;
    
    const dominantSide = Math.random() < 0.5 ? 'bid' : 'ask';
    
    for (let i = 0; i < 10; i++) {
      const priceOffset = (Math.random() - 0.5) * 100;
      const price = midPrice + priceOffset;
      const size = 10 + Math.random() * 30;
      
      if (dominantSide === 'bid' && price < midPrice + 20) {
        this.orderBook.updateBid(price, size);
      } else if (dominantSide === 'ask' && price > midPrice - 20) {
        this.orderBook.updateAsk(price, size);
      }
    }

    const trades = [];
    for (let i = 0; i < 3; i++) {
      const tradeSide = Math.random() < 0.5 ? 'buy' : 'sell';
      const tradePrice = tradeSide === 'buy' ? snapshot.bestAsk : snapshot.bestBid;
      const tradeSize = 2 + Math.random() * 8;
      trades.push({
        id: this.generateId(),
        price: tradePrice + (Math.random() - 0.5) * 2,
        size: tradeSize,
        side: tradeSide,
        timestamp: Date.now()
      });
      
      this.orderBook.setLastPrice(tradePrice);
    }

    return {
      type: 'update',
      data: this.orderBook.getSnapshot(),
      trades,
      vibration: true
    };
  }

  generateDroughtUpdate() {
    const snapshot = this.orderBook.getSnapshot();
    const midPrice = this.basePrice;
    
    this.orderBook.clear();
    
    for (let i = 0; i < 5; i++) {
      const bidPrice = midPrice - (i + 1) * 100 - Math.random() * 50;
      const bidSize = 0.5 + Math.random() * 2;
      this.orderBook.updateBid(bidPrice, bidSize);

      const askPrice = midPrice + (i + 1) * 100 + Math.random() * 50;
      const askSize = 0.5 + Math.random() * 2;
      this.orderBook.updateAsk(askPrice, askSize);
    }

    return {
      type: 'update',
      data: this.orderBook.getSnapshot(),
      drought: true
    };
  }

  generatePumpUpdate() {
    const snapshot = this.orderBook.getSnapshot();
    
    this.basePrice += 50 + Math.random() * 100;
    const newMidPrice = this.basePrice;
    
    for (let i = 0; i < 20; i++) {
      const bidPrice = newMidPrice - (i + 1) * 15 - Math.random() * 10;
      const bidSize = 20 + Math.random() * 50;
      this.orderBook.updateBid(bidPrice, bidSize);
    }

    for (let i = 0; i < 30; i++) {
      const askPrice = newMidPrice + (i + 1) * 20 + Math.random() * 30;
      const askSize = Math.random() * 3;
      this.orderBook.updateAsk(askPrice, askSize);
    }

    const trades = [];
    for (let i = 0; i < 5; i++) {
      const tradePrice = newMidPrice + i * 10;
      const tradeSize = 5 + Math.random() * 10;
      trades.push({
        id: this.generateId(),
        price: tradePrice,
        size: tradeSize,
        side: 'buy',
        timestamp: Date.now()
      });
    }
    
    this.orderBook.setLastPrice(newMidPrice + 50);

    return {
      type: 'update',
      data: this.orderBook.getSnapshot(),
      trades,
      pump: true
    };
  }

  generateFlashCrashUpdate() {
    const snapshot = this.orderBook.getSnapshot();
    const midPrice = this.basePrice;
    
    if (!this.crashStarted) {
      this.crashStarted = true;
      this.crashPhase = 0;
      this.recoveryPrice = midPrice;
    }

    if (this.crashPhase < 20) {
      this.basePrice -= 100 + Math.random() * 200;
      
      this.orderBook.clear();
      for (let i = 0; i < 10; i++) {
        const bidPrice = this.basePrice - (i + 1) * 50;
        const bidSize = 1 + Math.random() * 5;
        this.orderBook.updateBid(bidPrice, bidSize);
      }
      
      const tradePrice = this.basePrice + 50;
      this.orderBook.setLastPrice(tradePrice);
      this.crashPhase++;

      return {
        type: 'update',
        data: this.orderBook.getSnapshot(),
        trade: {
          id: this.generateId(),
          price: tradePrice,
          size: 20 + Math.random() * 30,
          side: 'sell',
          timestamp: Date.now()
        },
        flashcrash: { phase: 'falling' }
      };
    } else if (this.crashPhase < 60) {
      this.basePrice += 50 + Math.random() * 80;
      if (this.basePrice > this.recoveryPrice) {
        this.basePrice = this.recoveryPrice;
      }
      
      this.initializeOrderBook();
      this.orderBook.setLastPrice(this.basePrice);
      this.crashPhase++;

      return {
        type: 'update',
        data: this.orderBook.getSnapshot(),
        flashcrash: { phase: 'recovering' }
      };
    } else {
      this.crashStarted = false;
      this.initializeOrderBook();
      return this.generateNormalUpdate();
    }
  }

  generateUpdate() {
    switch (this.scene) {
      case 'battle':
        return this.generateBattleUpdate();
      case 'drought':
        return this.generateDroughtUpdate();
      case 'pump':
        return this.generatePumpUpdate();
      case 'flashcrash':
        return this.generateFlashCrashUpdate();
      default:
        return this.generateNormalUpdate();
    }
  }
}

module.exports = DataGenerator;
