import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatState } from '../../types/store';
import { Message } from '../../types/chat';
import { apiClient } from '../../api/config';
import axios from 'axios';

const initialState: ChatState = {
  messages: [],
  status: 'idle',
  error: null,
  currentSessionId: null,
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
  { rejectValue: ApiError }
>('chat/fetchMessages', async (sessionId: string, { rejectWithValue }) => {
  try {
    console.log('Fetching messages for session:', sessionId);
    const response = await apiClient.get<Message[]>(`/sessions/${sessionId}/messages`);
    console.log('Response:', response);
    return response.data;
  } catch (error) {
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
    console.log('Sending message:', { sessionId, content, thinkingMode });
    const response = await apiClient.post<Message>(`/sessions/${sessionId}/messages`, {
      content,
      thinking_mode: thinkingMode,
    });
    console.log('Response:', response);
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
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || action.error.message || 'Failed to fetch messages';
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
