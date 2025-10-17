import { useEffect, useRef, useState, useCallback } from 'react';

interface UseFakeLoadingOptions {
  minCycles?: number;
  maxCycles?: number;
  stepMs?: number;
}

interface UseFakeLoadingReturn {
  isLoading: boolean;
  dots: number;
  setIsLoading: (loading: boolean) => void;
  startLoading: () => void;
  finishLoading: (callback?: () => void) => void;
}

export function useFakeLoading(options: UseFakeLoadingOptions = {}): UseFakeLoadingReturn {
  const {
    minCycles = 1,
    maxCycles = 2,
    stepMs = 420
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [dots, setDots] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Dots animation effect
  useEffect(() => {
    if (!isLoading) return;
    let mounted = true;
    const id = setInterval(() => {
      if (!mounted) return;
      setDots((d) => (d % 3) + 1);
    }, stepMs);
    return () => { mounted = false; clearInterval(id); };
  }, [isLoading, stepMs]);

  const startLoading = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    startTimeRef.current = Date.now();
  }, []);

  const finishLoading = useCallback((callback?: () => void) => {
    // Calculate random visible time between min and max cycles
    const cycleMs = 3 * stepMs; // one cycle = '.', '..', '...'
    const minMs = cycleMs * minCycles;
    const maxMs = cycleMs * maxCycles;
    const targetVisibleMs = minMs + Math.random() * (maxMs - minMs);
    const elapsed = Date.now() - startTimeRef.current;
    const wait = Math.max(0, Math.round(targetVisibleMs) - elapsed);
    
    setTimeout(() => {
      setIsLoading(false);
      callback?.();
    }, wait);
  }, [minCycles, maxCycles, stepMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    isLoading,
    dots,
    setIsLoading,
    startLoading,
    finishLoading
  };
}
