import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import store from './store/store';
import ChatPage from './pages/ChatPage';
import ConfigPage from './pages/ConfigPage';

const App = () => {
  return (
        <Provider store={store}>
            <Router>
                <div className="app">
                    <Routes>
                        <Route path="/sessions/:sessionId" element={<ChatPage />} />
                        <Route path="/sessions/:sessionId/config" element={<ConfigPage />} />
                        <Route path="/" element={<Navigate to={`/sessions/${generateSessionId()}`} replace />} />
                    </Routes>
                </div>
            </Router>
        </Provider>
    );
};

// Helper to generate a new session ID
const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 15);
};

export default App;
