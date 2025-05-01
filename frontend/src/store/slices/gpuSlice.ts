import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GPUState } from '../../types/store';
import { apiClient } from '../../api/config';
import wsManager from '../../utils/websocket';

interface GPUStatusResponse {
  is_indexing: boolean;
  gpu_utilization: number;
}

interface IndexingResponse {
  status: string;
  message: string;
}

// Define error handling type
type ApiError = {
  message: string;
  status?: number;
};

// Define axios error response type
interface ErrorResponse {
  data?: {
    message?: string;
  };
  status?: number;
}

// WebSocket message type for GPU status
interface GPUStatusMessage {
  type: 'gpu_status_update';
  payload: {
    is_indexing: boolean;
    gpu_utilization: number;
  };
}

// Async thunk for triggering indexing
export const triggerIndexing = createAsyncThunk<
  IndexingResponse,
  void,
  { rejectValue: ApiError }
>('gpu/triggerIndexing', async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.post<IndexingResponse>('/embeddings/index');
    return response.data;
  } catch (error) {
    const axiosError = error as { response?: ErrorResponse };
    return rejectWithValue({
      message: axiosError.response?.data?.message || 'Failed to trigger indexing',
      status: axiosError.response?.status
    });
  }
});

const initialState: GPUState = {
  isAvailable: false,
  isIndexing: false,
  gpuUtil: 0,
  lastIndexingStart: null,
  status: 'idle',
  error: null,
};

const gpuSlice = createSlice({
  name: 'gpu',
  initialState,
  reducers: {
    resetError: (state) => {
      state.error = null;
    },
    updateGpuStatus: (state, action: PayloadAction<GPUStatusResponse>) => {
      state.isIndexing = action.payload.is_indexing;
      state.gpuUtil = action.payload.gpu_utilization;
      state.error = null;
      if (action.payload.is_indexing && !state.lastIndexingStart) {
        state.lastIndexingStart = new Date().toISOString();
      } else if (!action.payload.is_indexing) {
        state.lastIndexingStart = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(triggerIndexing.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(triggerIndexing.fulfilled, (state) => {
        state.status = 'succeeded';
        state.isIndexing = true;
        state.lastIndexingStart = new Date().toISOString();
        state.error = null;
      })
      .addCase(triggerIndexing.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || action.error.message || 'Failed to trigger indexing';
      });
  },
});

// Setup WebSocket listener for GPU status updates
export function setupGpuStatusListener(dispatch: (action: any) => void): () => void {
  const handleWebSocketMessage = (_: any, data?: { type: string; payload: any }) => {
    if (data?.type === 'gpu_status_update') {
      const gpuStatus = data.payload as GPUStatusResponse;
      dispatch(updateGpuStatus(gpuStatus));
    }
  };

  wsManager.addListener(handleWebSocketMessage);
  return () => wsManager.removeListener(handleWebSocketMessage);
}

export const { resetError, updateGpuStatus } = gpuSlice.actions;
export default gpuSlice.reducer;
