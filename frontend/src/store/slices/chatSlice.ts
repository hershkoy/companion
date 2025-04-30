import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatState } from '../../types/store';
import { Message } from '../../types/chat';

const initialState: ChatState = {
  messages: [],
  status: 'idle',
  error: null,
  currentSessionId: null,
};

export const fetchMessages = createAsyncThunk<Message[], string>(
  'chat/fetchMessages',
  async (sessionId: string) => {
    const response = await fetch(`/api/sessions/${sessionId}/messages`);
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    return response.json();
  }
);

interface SendMessagePayload {
  sessionId: string;
  content: string;
  thinkingMode: string;
}

export const sendMessage = createAsyncThunk<Message, SendMessagePayload>(
  'chat/sendMessage',
  async ({ sessionId, content, thinkingMode }) => {
    const response = await fetch(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, thinking_mode: thinkingMode }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }
);

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
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch messages';
      })
      .addCase(sendMessage.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages.push(action.payload);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to send message';
      });
  },
});

export const { clearMessages, setCurrentSession } = chatSlice.actions;
export default chatSlice.reducer; 