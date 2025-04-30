import { useEffect, useRef } from 'react';

const usePolling = (callback, interval = 1000, enabled = true) => {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      savedCallback.current();
    };

    const id = setInterval(tick, interval);

    return () => clearInterval(id);
  }, [interval, enabled]);
};

export default usePolling;
