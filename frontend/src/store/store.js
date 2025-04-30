import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import configReducer from './slices/configSlice';
import gpuReducer from './slices/gpuSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    config: configReducer,
    gpu: gpuReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['chat/setMessages/fulfilled'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.created_at', 'payload.updated_at'],
        // Ignore these paths in the state
        ignoredPaths: ['chat.messages.created_at'],
      },
    }),
});

export default store;
