import React, { useState, useMemo } from 'react';
import './ChatList.css';

interface Session {
  id: string;
  title: string;
  created_at: string;
  latest_message?: string;
  isActive?: boolean;
}

interface ChatListProps {
  sessions: Session[];
  currentSession: Session | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onUpdateSessionTitle: (id: string, title: string) => Promise<void>;
}

const ChatList: React.FC<ChatListProps> = ({
  sessions: chats,
  currentSession: currentChat,
  onSelectSession: onSelectChat,
  onCreateSession: onCreateChat,
  onDeleteSession: onDeleteChat,
  onUpdateSessionTitle: onUpdateChatTitle,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    chats.forEach(chat => {
      const chatDate = new Date(chat.created_at);

      if (chatDate.toDateString() === now.toDateString()) {
        groups['Today'].push(chat);
      } else if (chatDate.toDateString() === yesterday.toDateString()) {
        groups['Yesterday'].push(chat);
      } else if (chatDate > weekAgo) {
        groups['Previous 7 Days'].push(chat);
      } else {
        groups['Older'].push(chat);
      }
    });

    return groups;
  }, [chats]);

  const handleCreateSession = () => {
    onCreateChat();
  };

  const startEditing = (chat: Session) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const handleUpdateTitle = async (chatId: string) => {
    if (editTitle.trim()) {
      await onUpdateChatTitle(chatId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, chatId: string) => {
    if (e.key === 'Enter') {
      handleUpdateTitle(chatId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const truncateText = (text: string, maxLength = 30) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Chat Sessions</h2>
        <button className="new-chat-button" onClick={handleCreateSession}>
          <svg
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
            height="1em"
            width="1em"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New chat
        </button>
      </div>
      <div className="sessions-list">
        {Object.entries(groupedSessions).map(
          ([dateGroup, groupSessions]) =>
            groupSessions.length > 0 && (
              <div key={dateGroup}>
                <div className="date-separator">{dateGroup}</div>
                {groupSessions.map(chat => (
                  <div
                    key={chat.id}
                    className={`session-item ${chat.id === currentChat?.id || chat.isActive ? 'active' : ''}`}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <div className="session-content">
                      {editingId === chat.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onBlur={() => handleUpdateTitle(chat.id)}
                          onKeyDown={e => handleKeyPress(e, chat.id)}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <div className="session-info">
                          <span className="session-title">
                            <svg
                              stroke="currentColor"
                              fill="none"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              height="1em"
                              width="1em"
                              style={{ marginRight: '0.5rem' }}
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            {chat.title || 'Untitled Chat'}
                          </span>
                          {chat.latest_message && (
                            <div className="session-preview">{chat.latest_message}</div>
                          )}
                        </div>
                      )}
                      <div className="session-actions">
                        <button
                          className="edit-button"
                          onClick={e => {
                            e.stopPropagation();
                            startEditing(chat);
                          }}
                        >
                          <svg
                            stroke="currentColor"
                            fill="none"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            height="1em"
                            width="1em"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="delete-button"
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                        >
                          <svg
                            stroke="currentColor"
                            fill="none"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            height="1em"
                            width="1em"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default ChatList; 