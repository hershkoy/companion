import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateConfig } from '../../store/slices/configSlice';

const THINKING_MODES = [
  { value: 'cot', label: 'Chain of Thought' },
  { value: 'rag', label: 'Retrieval Augmented' },
  { value: 'hybrid', label: 'Hybrid' },
];

const ThinkingModeSelector = () => {
  const dispatch = useDispatch();
  const { thinkingMode } = useSelector(state => state.config);

  const handleModeChange = e => {
    dispatch(updateConfig({ thinking_mode: e.target.value }));
  };

  return (
    <div className="thinking-mode-selector">
      <label htmlFor="thinking-mode">Thinking Mode:</label>
      <select id="thinking-mode" value={thinkingMode} onChange={handleModeChange}>
        {THINKING_MODES.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThinkingModeSelector;
