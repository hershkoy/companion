import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import configReducer from './slices/configSlice';
import gpuReducer from './slices/gpuSlice';
import type { RootState } from '../types/store';

const IGNORED_ACTIONS = [
  'chat/sendAudioMessage/pending',
  'chat/sendAudioMessage/fulfilled',
  'chat/sendAudioMessage/rejected'
];

const IGNORED_PATHS = [
  'meta.arg',  // Ignore FormData in thunk actions
  'payload.formData'  // Ignore FormData in payload
];

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    config: configReducer,
    gpu: gpuReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: IGNORED_ACTIONS,
        ignoredPaths: IGNORED_PATHS,
        warnAfter: 128
      },
    }),
});

export type AppDispatch = typeof store.dispatch;
export type { RootState };
