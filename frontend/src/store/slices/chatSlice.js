import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchMessages = createAsyncThunk('chat/fetchMessages', async sessionId => {
  const response = await fetch(`/api/sessions/${sessionId}/messages`);
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  return response.json();
});

export const sendMessage = createAsyncThunk(
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

const initialState = {
  messages: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  currentSessionId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentSession: (state, action) => {
      state.currentSessionId = action.payload;
      state.messages = [];
      state.status = 'idle';
      state.error = null;
    },
    clearMessages: state => {
      state.messages = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Fetch messages cases
      .addCase(fetchMessages.pending, state => {
        state.status = 'loading';
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages = action.payload;
        state.error = null;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Send message cases
      .addCase(sendMessage.pending, state => {
        state.status = 'loading';
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages.push(action.payload.user_message);
        state.messages.push(action.payload.assistant_message);
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const { setCurrentSession, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;
