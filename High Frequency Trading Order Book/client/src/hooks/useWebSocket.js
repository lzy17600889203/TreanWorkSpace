import { useEffect, useRef } from 'react';
import useStore from '../store';

const useWebSocket = () => {
  const wsRef = useRef(null);
  const { setOrderBook, setScene, addTrade, addTrades, setConnected } = useStore();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'snapshot' || message.type === 'update') {
          setOrderBook(message.data);
          
          if (message.trade) {
            addTrade(message.trade);
          }
          if (message.trades) {
            addTrades(message.trades);
          }
        }
        
        if (message.type === 'scene') {
          setScene(message.data);
        }
      } catch (err) {
        console.error('Parse error:', err);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [setOrderBook, setScene, addTrade, addTrades, setConnected]);

  const sendScene = (scene) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'scene', scene }));
    }
  };

  return { sendScene };
};

export default useWebSocket;
