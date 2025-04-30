import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import ConfigPanel from '../ConfigPanel';

const mockStore = configureStore([thunk]);

describe('ConfigPanel', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      config: {
        topK: 5,
        embedLight: 'all-MiniLM-L6-v2',
        embedDeep: 'sentence-7b',
        idleThreshold: 600
      }
    });
    store.dispatch = jest.fn();
  });

  it('renders all configuration fields', () => {
    render(
      <Provider store={store}>
        <ConfigPanel sessionId="test-session" />
      </Provider>
    );

    expect(screen.getByLabelText(/Top K Results/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Light Embedder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Deep Embedder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Idle Threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/Save Configuration/i)).toBeInTheDocument();
  });

  it('initializes fields with store values', () => {
    render(
      <Provider store={store}>
        <ConfigPanel sessionId="test-session" />
      </Provider>
    );

    expect(screen.getByLabelText(/Top K Results/i)).toHaveValue(5);
    expect(screen.getByLabelText(/Light Embedder/i)).toHaveValue('all-MiniLM-L6-v2');
    expect(screen.getByLabelText(/Deep Embedder/i)).toHaveValue('sentence-7b');
    expect(screen.getByLabelText(/Idle Threshold/i)).toHaveValue(600);
  });

  it('updates form values on input change', () => {
    render(
      <Provider store={store}>
        <ConfigPanel sessionId="test-session" />
      </Provider>
    );

    const topKInput = screen.getByLabelText(/Top K Results/i);
    fireEvent.change(topKInput, { target: { value: '10' } });
    expect(topKInput).toHaveValue(10);
  });

  it('dispatches updateConfig on form submit', async () => {
    render(
      <Provider store={store}>
        <ConfigPanel sessionId="test-session" />
      </Provider>
    );

    const form = screen.getByRole('form');
    const topKInput = screen.getByLabelText(/Top K Results/i);

    fireEvent.change(topKInput, { target: { value: '10' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'config/updateConfig/pending'
        })
      );
    });
  });

  it('validates input ranges', () => {
    render(
      <Provider store={store}>
        <ConfigPanel sessionId="test-session" />
      </Provider>
    );

    const topKInput = screen.getByLabelText(/Top K Results/i);
    const idleThresholdInput = screen.getByLabelText(/Idle Threshold/i);

    expect(topKInput).toHaveAttribute('min', '1');
    expect(topKInput).toHaveAttribute('max', '20');
    expect(idleThresholdInput).toHaveAttribute('min', '60');
    expect(idleThresholdInput).toHaveAttribute('max', '3600');
  });
}); 