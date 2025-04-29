import React, { useState } from 'react';
import './ChatList.css';

const ChatList = ({
  sessions,
  currentSession,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onUpdateSessionTitle
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleCreateSession = () => {
    onCreateSession();
  };

  const startEditing = (session) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleUpdateTitle = (sessionId) => {
    if (editTitle.trim()) {
      onUpdateSessionTitle(sessionId, editTitle.trim());
      setEditingId(null);
    }
  };

  const handleKeyPress = (e, sessionId) => {
    if (e.key === 'Enter') {
      handleUpdateTitle(sessionId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const truncateText = (text, maxLength = 30) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Chat Sessions</h2>
        <button className="new-chat-button" onClick={handleCreateSession}>
          New Chat
        </button>
      </div>
      <div className="sessions-list">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`session-item ${session.id === currentSession?.id || session.isActive ? 'active' : ''}`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className="session-content">
              {editingId === session.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleUpdateTitle(session.id)}
                  onKeyDown={(e) => handleKeyPress(e, session.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="session-info">
                  <span className="session-title">{session.title || 'Untitled Chat'}</span>
                  {session.latest_message && (
                    <div className="session-preview">{session.latest_message}</div>
                  )}
                </div>
              )}
              <div className="session-actions">
                <button
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(session);
                  }}
                >
                  Edit
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList; 