import { useEffect, useRef } from 'react';

export default function useTimeout() {
  const timeoutRef = useRef();
  const callbackRef = useRef();
  const delayRef = useRef();

  const setHookTimeout = (callback, delay) => {
    delayRef.current = delay;
    callbackRef.current = callback;
  };

  useEffect(() => {
    if (typeof delayRef.current === 'number' && callbackRef.current) {
      timeoutRef.current = setTimeout(() => callbackRef.current(), delayRef.current);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [callbackRef.current]);
  return { timeoutRef, setHookTimeout };
}
