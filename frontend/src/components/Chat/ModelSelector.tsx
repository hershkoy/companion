import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchModels, updateConfig } from '../../store/slices/configSlice';
import { ModelConfig } from '../../types/chat';
import './ModelSelector.css';

const ModelSelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const { modelList, currentModel, status } = useAppSelector(state => state.config);

  useEffect(() => {
    dispatch(fetchModels());
  }, [dispatch]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(updateConfig({ model_name: e.target.value }));
  };

  const formatModelLabel = (model: ModelConfig): string => {
    const parts: string[] = [model.name];
    if (model.size) parts.push(model.size);
    if (model.quantization) parts.push(model.quantization);
    return parts.join(' - ');
  };

  const getModelDetails = (model: ModelConfig): string => {
    const details: string[] = [];
    if (model.family) details.push(`Family: ${model.family}`);
    if (model.parameters) details.push(`Parameters: ${model.parameters}`);
    if (model.context_length) details.push(`Context: ${model.context_length} tokens`);
    return details.join(' | ');
  };

  if (status === 'loading') {
    return <div className="model-selector loading">Loading models...</div>;
  }

  if (status === 'failed') {
    return <div className="model-selector error">Failed to load models</div>;
  }

  return (
    <div className="model-selector">
      <label htmlFor="model-select">Model:</label>
      <div className="select-container">
        <select 
          id="model-select" 
          value={currentModel} 
          onChange={handleModelChange}
          className={modelList.length === 0 ? 'no-models' : ''}
        >
          {modelList.length === 0 ? (
            <option value="">No models available</option>
          ) : (
            modelList.map((model: ModelConfig) => (
              <option key={model.id} value={model.id} title={getModelDetails(model)}>
                {formatModelLabel(model)}
              </option>
            ))
          )}
        </select>
        {modelList.find(m => m.id === currentModel) && (
          <div className="model-details">
            {getModelDetails(modelList.find(m => m.id === currentModel)!)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelSelector;
