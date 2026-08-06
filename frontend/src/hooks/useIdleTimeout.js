import { useState, useEffect, useRef, useCallback } from 'react';

const useIdleTimeout = (onTimeout, idleTimeInMinutes) => {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutIdRef = useRef(null);
  
  // Convert minutes to milliseconds
  const idleTimeMs = idleTimeInMinutes * 60 * 1000;

  const handleIdle = useCallback(() => {
    setIsIdle(true);
    if (onTimeout) {
      onTimeout();
    }
  }, [onTimeout]);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    
    // Only set timer if idleTimeMs is > 0
    if (idleTimeMs > 0) {
      timeoutIdRef.current = setTimeout(handleIdle, idleTimeMs);
    }
  }, [handleIdle, idleTimeMs]);

  useEffect(() => {
    if (idleTimeMs <= 0) return;

    // Events that denote activity
    const events = [
      'mousemove',
      'keydown',
      'wheel',
      'DOMMouseScroll',
      'mousewheel',
      'mousedown',
      'touchstart',
      'touchmove',
      'MSPointerDown',
      'MSPointerMove',
    ];

    const handleEvent = () => resetTimer();

    // Attach event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleEvent);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [resetTimer, idleTimeMs]);

  return { isIdle, resetTimer };
};

export default useIdleTimeout;
