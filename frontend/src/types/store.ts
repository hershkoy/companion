import { ThunkAction, Action, ThunkDispatch } from '@reduxjs/toolkit';
import { Message, ModelConfig, ThinkingMode } from './chat';

export interface ChatState {
  messages: Message[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  currentSessionId: string | null;
}

export interface ConfigState {
  modelList: ModelConfig[];
  currentModel: string;
  thinkingMode: string;
  topK: number;
  embedLight: string;
  embedDeep: string;
  idleThreshold: number;
  status: string;
  error: string | null;
}

export interface GPUState {
  isAvailable: boolean;
  isIndexing: boolean;
  gpuUtil: number;
  lastIndexingStart: string | null;
  status: string;
  error: string | null;
}

export interface RootState {
  chat: ChatState;
  config: ConfigState;
  gpu: GPUState;
}

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export type AppDispatch = ThunkDispatch<RootState, unknown, Action<string>>; 