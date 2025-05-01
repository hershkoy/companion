import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchModels, updateConfig } from '../../store/slices/configSlice';
import { ModelConfig } from '../../types/chat';
import './ModelSelector.css';

function ModelSelector(): React.ReactElement {
  const dispatch = useAppDispatch();
  const { modelList, currentModel, status } = useAppSelector(state => state.config);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  useEffect(() => {
    // Only fetch models once if we don't have any
    if (modelList.length === 0 && !hasAttemptedFetch) {
      setHasAttemptedFetch(true);
      dispatch(fetchModels()).catch(err => {
        console.error('Error fetching models:', err);
      });
    }
  }, [dispatch, modelList.length, hasAttemptedFetch]);

  function handleModelChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    dispatch(updateConfig({ model_name: e.target.value }));
  }

  function formatModelLabel(model: ModelConfig): string {
    const parts: Array<string> = [model.name];
    if (model.parameters) parts.push(model.parameters);
    if (model.quantization) parts.push(model.quantization);
    return parts.join(' - ');
  }

  function getModelDetails(model: ModelConfig): string {
    const details: Array<string> = [];
    if (model.family) details.push(`Family: ${model.family}`);
    if (model.size) details.push(`Size: ${model.size}`);
    if (model.format) details.push(`Format: ${model.format}`);
    return details.join(' | ');
  }

  if (status === 'loading') {
    return <div className="model-selector loading">Loading models...</div>;
  }

  if (status === 'failed') {
    return (
      <div className="model-selector error">
        Failed to load models
        <button 
          type="button" 
          onClick={() => {
            setHasAttemptedFetch(false);
          }}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentModelData = modelList.find(m => m.id === currentModel);

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
        {currentModelData && (
          <div className="model-details">
            {getModelDetails(currentModelData)}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModelSelector;
