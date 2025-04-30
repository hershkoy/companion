import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchModels, updateConfig } from '../../store/slices/configSlice';
import { ModelConfig } from '../../types/chat';

const ModelSelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const { modelList, currentModel } = useAppSelector(state => state.config);

  useEffect(() => {
    dispatch(fetchModels());
  }, [dispatch]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(updateConfig({ model_name: e.target.value }));
  };

  return (
    <div className="model-selector">
      <label htmlFor="model-select">Model:</label>
      <select id="model-select" value={currentModel} onChange={handleModelChange}>
        {modelList.map((model: ModelConfig) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector; 