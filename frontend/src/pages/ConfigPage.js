import React from 'react';
import { useParams } from 'react-router-dom';
import ConfigPanel from '../components/Config/ConfigPanel';

const ConfigPage = () => {
  const { sessionId } = useParams();

  return (
    <div className="config-page">
      <h1>Session Configuration</h1>
      <ConfigPanel sessionId={sessionId} />
    </div>
  );
};

export default ConfigPage; 