import React from 'react';
import { useSelector } from 'react-redux';

const IndexingIndicator = () => {
  const { isIndexing, gpuUtil } = useSelector((state) => state.gpu);

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