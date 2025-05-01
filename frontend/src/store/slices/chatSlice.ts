import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatState } from '../../types/store';
import { Message } from '../../types/chat';
import { apiClient } from '../../api/config';
import type { AxiosRequestConfig } from 'axios';

const initialState: ChatState = {
  messages: [],
  status: 'idle',
  error: null,
  currentSessionId: null,
  currentRequest: null
};

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

export const fetchMessages = createAsyncThunk<
  Message[],
  string,
  { rejectValue: ApiError; state: { chat: ChatState } }
>('chat/fetchMessages', async (sessionId: string, { rejectWithValue, signal, getState }) => {
  try {
    // Cancel previous request if it exists
    const state = getState();
    if (state.chat.currentRequest) {
      state.chat.currentRequest.abort();
    }

    // Create new AbortController
    const controller = new AbortController();
    state.chat.currentRequest = controller;

    const config = { signal: controller.signal } as unknown as AxiosRequestConfig;
    const response = await apiClient.get<Message[]>(`/sessions/${sessionId}/messages`, config);

    return response.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'CanceledError') {
      throw error;
    }
    const axiosError = error as { response?: ErrorResponse };
    return rejectWithValue({
      message: axiosError.response?.data?.message || 'Failed to fetch messages',
      status: axiosError.response?.status
    });
  }
});

interface SendMessagePayload {
  sessionId: string;
  content: string;
  thinkingMode: string;
}

export const sendMessage = createAsyncThunk<
  Message,
  SendMessagePayload,
  { rejectValue: ApiError }
>('chat/sendMessage', async ({ sessionId, content, thinkingMode }, { rejectWithValue }) => {
  try {
    const response = await apiClient.post<Message>(`/sessions/${sessionId}/messages`, {
      content,
      thinking_mode: thinkingMode,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as { response?: ErrorResponse };
    return rejectWithValue({
      message: axiosError.response?.data?.message || 'Failed to send message',
      status: axiosError.response?.status
    });
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearMessages: (state) => {
      state.messages = [];
      state.status = 'idle';
      state.error = null;
      if (state.currentRequest) {
        state.currentRequest.abort();
        state.currentRequest = null;
      }
    },
    setCurrentSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages = action.payload;
        state.error = null;
        state.currentRequest = null;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        if (action.error.name === 'CanceledError') {
          return;
        }
        state.status = 'failed';
        state.error = action.payload?.message || action.error.message || 'Failed to fetch messages';
        state.currentRequest = null;
      })
      .addCase(sendMessage.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages.push(action.payload);
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || action.error.message || 'Failed to send message';
      });
  },
});

export const { clearMessages, setCurrentSession } = chatSlice.actions;
export default chatSlice.reducer;
