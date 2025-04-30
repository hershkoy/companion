import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import ConfigPage from './pages/ConfigPage';

// Helper to generate a new session ID
const generateSessionId = () => {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-spinner">Loading...</div>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/sessions/:sessionId" element={<ChatPage />} />
          <Route path="/sessions/:sessionId/config" element={<ConfigPage />} />
          <Route path="/" element={<Navigate to={`/sessions/${generateSessionId()}`} replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
