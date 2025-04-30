import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchModels } from '../../store/slices/configSlice';

const ModelSelector = () => {
  const dispatch = useDispatch();
  const { modelList, currentModel } = useSelector((state) => state.config);

  useEffect(() => {
    dispatch(fetchModels());
  }, [dispatch]);

  const handleModelChange = (e) => {
    dispatch(updateConfig({ model_name: e.target.value }));
  };

  return (
    <div className="model-selector">
      <label htmlFor="model-select">Model:</label>
      <select
        id="model-select"
        value={currentModel}
        onChange={handleModelChange}
      >
        {modelList.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector; 