import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { fetchModels, fetchConfig, resetInitialization } from '../store/slices/configSlice';
import { fetchMessages } from '../store/slices/chatSlice';
import { apiClient } from '../api/config';

interface InitializationState {
  isLoading: boolean;
  error: string | null;
}

export function useInitialization(sessionId: string | undefined): InitializationState {
  const dispatch = useDispatch<AppDispatch>();
  const { isInitialized, status, error: configError } = useSelector((state: RootState) => state.config);
  const [state, setState] = useState<InitializationState>({ isLoading: false, error: null });
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!sessionId || !mounted) {
        console.log('[Init] Skipping loadData - invalid state:', { sessionId, mounted });
        return;
      }

      if (isLoadingRef.current) {
        console.log('[Init] Already loading, skipping');
        return;
      }

      console.log('[Init] Starting initialization for session:', sessionId);

      try {
        isLoadingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        console.log('[Init] Set loading state to true');

        // Cancel any in-flight requests
        if (abortControllerRef.current) {
          console.log('[Init] Aborting previous requests');
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Fetch models first
        console.log('[Init] Fetching models...');
        const modelsResult = await dispatch(fetchModels()).unwrap();
        console.log('[Init] Models fetched:', modelsResult);
        if (!mounted) {
          console.log('[Init] Component unmounted during models fetch');
          return;
        }

        // Create or ensure session exists
        console.log('[Init] Ensuring session exists...');
        try {
          await apiClient.get(`/sessions/${sessionId}`);
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.log('[Init] Session not found, creating new session');
            await apiClient.post('/sessions', {
              title: 'New Chat',
              model_name: modelsResult.current_model
            });
          } else {
            throw error;
          }
        }

        // Then fetch config
        console.log('[Init] Fetching config...');
        const configResult = await dispatch(fetchConfig(sessionId)).unwrap();
        console.log('[Init] Config fetched:', configResult);
        if (!mounted) {
          console.log('[Init] Component unmounted during config fetch');
          return;
        }

        // Finally fetch messages
        console.log('[Init] Fetching messages...');
        const messagesResult = await dispatch(fetchMessages(sessionId)).unwrap();
        console.log('[Init] Messages fetched:', messagesResult);
        
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false, error: null }));
          console.log('[Init] Initialization completed successfully');
        }
      } catch (err: unknown) {
        if (mounted) {
          // If it's a canceled request, don't show an error
          if (err instanceof Error && err.name === 'CanceledError') {
            console.log('[Init] Request was canceled');
            setState(prev => ({ ...prev, isLoading: false, error: null }));
            return;
          }

          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          console.error('[Init] Error during initialization:', {
            error: err,
            message: errorMessage,
            sessionId
          });
          setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));

          // Reset initialization state to allow retrying
          dispatch(resetInitialization());
        }
      } finally {
        if (mounted) {
          isLoadingRef.current = false;
          console.log('[Init] Reset loading state');
        }
      }
    }

    // Clear any existing timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }

    // Only load data if not already initialized
    if (!isInitialized && sessionId) {
      // Add a small delay before starting initialization
      initTimeoutRef.current = setTimeout(() => {
        console.log('[Init] Starting initialization process');
        loadData();
      }, 100);
    } else {
      console.log('[Init] Already initialized or no sessionId, skipping');
      setState(prev => ({ ...prev, isLoading: false, error: null }));
    }

    // Cleanup function
    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        console.log('[Init] Cleanup: Aborting pending requests');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      isLoadingRef.current = false;
    };
  }, [dispatch, sessionId, isInitialized]);

  // Update local error state when Redux error state changes
  useEffect(() => {
    if (configError) {
      console.log('[Init] Config error state updated:', configError);
      setState(prev => ({ ...prev, error: configError }));
    }
  }, [configError]);

  return state;
} 