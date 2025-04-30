import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import ChatWindow from '../ChatWindow';

const mockStore = configureStore([thunk]);

describe('ChatWindow', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      chat: {
        messages: [
          { message_id: 1, role: 'user', content: 'Hello', created_at: new Date().toISOString() },
          {
            message_id: 2,
            role: 'assistant',
            content: 'Hi there!',
            created_at: new Date().toISOString(),
          },
        ],
        status: 'idle',
        error: null,
      },
    });
  });

  it('renders messages and input', () => {
    render(
      <Provider store={store}>
        <ChatWindow sessionId="test-session" />
      </Provider>
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    store = mockStore({
      chat: {
        messages: [],
        status: 'loading',
        error: null,
      },
    });

    render(
      <Provider store={store}>
        <ChatWindow sessionId="test-session" />
      </Provider>
    );

    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    store = mockStore({
      chat: {
        messages: [],
        status: 'error',
        error: 'Failed to load messages',
      },
    });

    render(
      <Provider store={store}>
        <ChatWindow sessionId="test-session" />
      </Provider>
    );

    expect(screen.getByText('Error: Failed to load messages')).toBeInTheDocument();
  });
});
