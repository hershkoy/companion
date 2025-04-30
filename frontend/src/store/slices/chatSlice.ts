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
    console.log('Fetching messages for session:', sessionId);
    const response = await fetch(`/backend/api/sessions/${sessionId}/messages`);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    const text = await response.text();
    console.log('Response text:', text);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status} ${text}`);
    }
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error(`Invalid JSON response: ${text}`);
    }
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
    console.log('Sending message:', { sessionId, content, thinkingMode });
    const response = await fetch(`/backend/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, thinking_mode: thinkingMode }),
    });
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    const text = await response.text();
    console.log('Response text:', text);

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${text}`);
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error(`Invalid JSON response: ${text}`);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearMessages: state => {
      state.messages = [];
      state.status = 'idle';
      state.error = null;
    },
    setCurrentSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchMessages.pending, state => {
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
      .addCase(sendMessage.pending, state => {
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
