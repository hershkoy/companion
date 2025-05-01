import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setupGpuStatusListener } from '../store/slices/gpuSlice';

export default function useGpuStatus(enabled = true): void {
  const dispatch = useDispatch();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Clean up previous listener if it exists
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Setup new listener
    const cleanup = setupGpuStatusListener(dispatch);
    cleanupRef.current = cleanup;

    // Cleanup when component unmounts or enabled changes
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [dispatch, enabled]);
} 