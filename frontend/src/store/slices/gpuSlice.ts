import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GPUState } from '../../types/store';
import { apiClient } from '../../api/config';

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

// Async thunks
export const pollGpuStatus = createAsyncThunk<
  GPUStatusResponse,
  void,
  { rejectValue: ApiError }
>('gpu/pollStatus', async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.get<GPUStatusResponse>('/embeddings/status');
    return response.data;
  } catch (error) {
    const axiosError = error as { response?: ErrorResponse };
    return rejectWithValue({
      message: axiosError.response?.data?.message || 'Failed to fetch GPU status',
      status: axiosError.response?.status
    });
  }
});

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
  },
  extraReducers: (builder) => {
    builder
      // Poll status cases
      .addCase(pollGpuStatus.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(pollGpuStatus.fulfilled, (state, action: PayloadAction<GPUStatusResponse>) => {
        state.status = 'succeeded';
        state.isIndexing = action.payload.is_indexing;
        state.gpuUtil = action.payload.gpu_utilization;
        state.error = null;
      })
      .addCase(pollGpuStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || action.error.message || 'Failed to fetch GPU status';
      })
      // Trigger indexing cases
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

export const { resetError } = gpuSlice.actions;
export default gpuSlice.reducer;
