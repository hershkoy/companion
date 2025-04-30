import React from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateConfig } from '../../store/slices/configSlice';

interface ThinkingMode {
  value: string;
  label: string;
}

const THINKING_MODES: ThinkingMode[] = [
  { value: 'cot', label: 'Chain of Thought' },
  { value: 'rag', label: 'Retrieval Augmented' },
  { value: 'hybrid', label: 'Hybrid' },
];

const ThinkingModeSelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const { thinkingMode } = useAppSelector(state => state.config);

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
