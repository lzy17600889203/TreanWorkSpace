import { create } from 'zustand';

const useStore = create((set) => ({
  orderBook: { bids: [], asks: [] },
  lastPrice: 100000,
  bestBid: 99990,
  bestAsk: 100010,
  scene: 'normal',
  trades: [],
  isConnected: false,
  
  setOrderBook: (data) => set({ 
    orderBook: { bids: data.bids, asks: data.asks },
    lastPrice: data.lastPrice,
    bestBid: data.bestBid,
    bestAsk: data.bestAsk
  }),
  
  setScene: (scene) => set({ scene }),
  
  addTrade: (trade) => set((state) => ({
    trades: [trade, ...state.trades.slice(0, 49)]
  })),
  
  addTrades: (newTrades) => set((state) => ({
    trades: [...newTrades, ...state.trades.slice(0, 50 - newTrades.length)]
  })),
  
  setConnected: (connected) => set({ isConnected: connected })
}));

export default useStore;
