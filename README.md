# Deep Memory Chat Application

A sophisticated chat application with hybrid Chain-of-Thought (CoT) and Retrieval-Augmented Generation (RAG) capabilities, built with Flask and React.

## Features

- Dynamic LLM model selection via Ollama integration
- Multiple thinking modes: Chain-of-Thought, RAG, and Hybrid
- Intelligent background document indexing
- Dual embedder strategy (light/deep) for optimal performance
- Real-time GPU utilization monitoring
- Configurable retrieval parameters
- Modern React frontend with Redux state management

## System Requirements

- Python 3.8+
- Node.js 16+
- NVIDIA GPU (recommended)
- SQLite 3
- Ollama

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd kokoro
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python db/init_db.py  # Initialize database
flask run
```

3. Set up the frontend:
```bash
cd frontend
npm install
npm start
```

4. Configure environment variables:
Create a `.env` file in the backend directory:
```env
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=sqlite:///kokoro.db
CHROMA_PERSIST_DIR=./chroma_db
GPU_IDLE_THRESHOLD=10
IDLE_THRESHOLD_SECONDS=600
OLLAMA_BASE_URL=http://localhost:11434
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| FLASK_APP | Flask application entry point | app.py |
| FLASK_ENV | Environment (development/production) | development |
| DATABASE_URL | SQLite database URL | sqlite:///kokoro.db |
| CHROMA_PERSIST_DIR | Chroma vector store directory | ./chroma_db |
| GPU_IDLE_THRESHOLD | GPU utilization threshold (%) | 10 |
| IDLE_THRESHOLD_SECONDS | Idle time before background indexing | 600 |
| OLLAMA_BASE_URL | Ollama API endpoint | http://localhost:11434 |

## Architecture

### Backend Components

- **Flask Application**: RESTful API with Blueprint organization
- **SQLite Database**: Stores sessions, messages, documents, and configuration
- **Chroma Vector Store**: Manages document embeddings for retrieval
- **Background Services**:
  - GPU Monitor: Tracks GPU utilization
  - Model Manager: Handles LLM loading/unloading
  - Indexing Scheduler: Manages background document processing

### Frontend Components

- **React + Redux**: State management and UI components
- **Real-time Updates**: GPU status and indexing progress
- **Configurable Interface**: Model selection and thinking mode controls

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sessions | List all sessions |
| POST | /api/sessions | Create new session |
| GET | /api/sessions/{id}/messages | Get session messages |
| POST | /api/sessions/{id}/messages | Send message |
| GET | /api/config/{session_id} | Get session config |
| PUT | /api/config/{session_id} | Update session config |
| GET | /api/embeddings/status | Check indexing status |

## Development

### Code Style

Backend:
- Black formatter (line length: 100)
- Flake8 linter
- isort for import sorting

Frontend:
- ESLint (Airbnb style)
- Prettier formatter

### Running Tests

Backend:
```bash
cd backend
pytest
```

Frontend:
```bash
cd frontend
npm test
```

### Background Indexing

The system automatically starts document indexing when:
1. GPU utilization is below threshold (default: 10%)
2. No user activity for configured duration (default: 10 minutes)

To manually trigger indexing:
```bash
curl -X POST http://localhost:5000/api/embeddings/index
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT License](LICENSE)
