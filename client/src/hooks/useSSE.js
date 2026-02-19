import { useState, useCallback, useRef } from 'react';
import { connectSSE } from '../lib/api';

export function useSSE() {
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const cancelRef = useRef(null);

  const startStream = useCallback((url, body) => {
    return new Promise((resolve, reject) => {
      setStreaming(true);
      setStreamText('');

      cancelRef.current = connectSSE(url, body, {
        onChunk(text) {
          setStreamText(prev => prev + text);
        },
        onResult(data) {
          setStreaming(false);
          resolve(data);
        },
        onError(error) {
          setStreaming(false);
          reject(new Error(error));
        },
      });
    });
  }, []);

  const cancelStream = useCallback(() => {
    cancelRef.current?.();
    setStreaming(false);
  }, []);

  return { streaming, streamText, startStream, cancelStream };
}
