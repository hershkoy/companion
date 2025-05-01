import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setupGpuStatusListener } from '../store/slices/gpuSlice';

const useGpuStatus = (enabled = true) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!enabled) return;

    // Setup WebSocket listener and get cleanup function
    const cleanup = setupGpuStatusListener(dispatch);

    // Cleanup when component unmounts or enabled changes
    return cleanup;
  }, [dispatch, enabled]);
};

export default useGpuStatus;
