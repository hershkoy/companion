import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { pollGpuStatus } from '../store/slices/gpuSlice';
import usePolling from './usePolling';

const useGpuStatus = (enabled = true) => {
  const dispatch = useDispatch();

  const checkGpuStatus = useCallback(() => {
    dispatch(pollGpuStatus());
  }, [dispatch]);

  usePolling(checkGpuStatus, 10000, enabled); // Poll every 10 seconds
};

export default useGpuStatus;

 