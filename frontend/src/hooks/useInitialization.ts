import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { fetchModels, fetchConfig } from '../store/slices/configSlice';
import { fetchMessages } from '../store/slices/chatSlice';

interface InitializationState {
  isLoading: boolean;
  error: string | null;
}

export function useInitialization(sessionId: string | undefined): InitializationState {
  const dispatch = useDispatch<AppDispatch>();
  const { isInitialized, modelList } = useSelector((state: RootState) => state.config);
  const [state, setState] = useState<InitializationState>({ isLoading: false, error: null });
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!sessionId || !mounted || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Cancel any in-flight requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Fetch config first
        await dispatch(fetchConfig(sessionId)).unwrap();
        if (!mounted) return;

        // Only fetch models if we don't have any
        if (modelList.length === 0) {
          await dispatch(fetchModels()).unwrap();
          if (!mounted) return;
        }

        // Fetch messages
        await dispatch(fetchMessages(sessionId)).unwrap();
        
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false, error: null }));
        }
      } catch (err: unknown) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
          console.error('Error loading data:', err);
        }
      } finally {
        if (mounted) {
          isLoadingRef.current = false;
        }
      }
    }

    // Only load data if not already initialized
    if (!isInitialized) {
      loadData();
    } else {
      setState(prev => ({ ...prev, isLoading: false, error: null }));
    }

    // Cleanup function
    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [dispatch, sessionId, isInitialized, modelList.length]);

  return state;
} 