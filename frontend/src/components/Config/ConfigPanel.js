import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateConfig } from '../../store/slices/configSlice';

const ConfigPanel = ({ sessionId }) => {
  const dispatch = useDispatch();
  const config = useSelector(state => state.config);

  const [formValues, setFormValues] = useState({
    topK: config.topK,
    embedLight: config.embedLight,
    embedDeep: config.embedDeep,
    idleThreshold: config.idleThreshold,
  });

  useEffect(() => {
    setFormValues({
      topK: config.topK,
      embedLight: config.embedLight,
      embedDeep: config.embedDeep,
      idleThreshold: config.idleThreshold,
    });
  }, [config]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: name === 'topK' || name === 'idleThreshold' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    dispatch(
      updateConfig({
        sessionId,
        ...formValues,
      })
    );
  };

  return (
    <form onSubmit={handleSubmit} className="config-panel">
      <div className="form-group">
        <label htmlFor="topK">Top K Results:</label>
        <input
          type="number"
          id="topK"
          name="topK"
          min="1"
          max="20"
          value={formValues.topK}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="embedLight">Light Embedder:</label>
        <input
          type="text"
          id="embedLight"
          name="embedLight"
          value={formValues.embedLight}
          onChange={handleChange}
          placeholder="e.g. all-MiniLM-L6-v2"
        />
      </div>

      <div className="form-group">
        <label htmlFor="embedDeep">Deep Embedder:</label>
        <input
          type="text"
          id="embedDeep"
          name="embedDeep"
          value={formValues.embedDeep}
          onChange={handleChange}
          placeholder="e.g. sentence-transformers/7b"
        />
      </div>

      <div className="form-group">
        <label htmlFor="idleThreshold">Idle Threshold (seconds):</label>
        <input
          type="number"
          id="idleThreshold"
          name="idleThreshold"
          min="60"
          max="3600"
          value={formValues.idleThreshold}
          onChange={handleChange}
        />
      </div>

      <button type="submit">Save Configuration</button>
    </form>
  );
};

export default ConfigPanel;
