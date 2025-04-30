import React from 'react';
import { useAppSelector } from '../../hooks/redux';

const IndexingIndicator: React.FC = () => {
  const { isIndexing, gpuUtil } = useAppSelector(state => state.gpu);

  if (!isIndexing) {
    return null;
  }

  return (
    <div className="indexing-indicator">
      <div className="spinner" />
      <span>Indexing in progress... (GPU: {Math.round(gpuUtil)}%)</span>
    </div>
  );
};

export default IndexingIndicator;
