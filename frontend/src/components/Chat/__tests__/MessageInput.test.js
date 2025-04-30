import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import MessageInput from '../MessageInput';

const mockStore = configureStore([thunk]);

describe('MessageInput', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      chat: {
        status: 'idle'
      },
      config: {
        thinkingMode: 'hybrid'
      }
    });
    store.dispatch = jest.fn();
  });

  it('renders input and send button', () => {
    render(
      <Provider store={store}>
        <MessageInput sessionId="test-session" />
      </Provider>
    );

    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('disables input and button while loading', () => {
    store = mockStore({
      chat: {
        status: 'loading'
      },
      config: {
        thinkingMode: 'hybrid'
      }
    });

    render(
      <Provider store={store}>
        <MessageInput sessionId="test-session" />
      </Provider>
    );

    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
    expect(screen.getByText('Send')).toBeDisabled();
  });

  it('dispatches sendMessage on form submit', async () => {
    render(
      <Provider store={store}>
        <MessageInput sessionId="test-session" />
      </Provider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    const form = screen.getByRole('form');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chat/sendMessage/pending'
        })
      );
    });
  });

  it('clears input after successful submission', async () => {
    render(
      <Provider store={store}>
        <MessageInput sessionId="test-session" />
      </Provider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    const form = screen.getByRole('form');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
}); 