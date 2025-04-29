# Backend Service

This directory contains the backend service for the audio chat application.

## Setup

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Service

Start the Flask application:
```bash
python app.py
```

The service will be available at:
- HTTP: `http://localhost:5000/backend/`
- WebSocket: `ws://localhost:5000/backend/ws`

## API Endpoints

All endpoints are prefixed with `/backend/api/`:

- `GET /sessions` - List all chat sessions
- `POST /sessions` - Create a new chat session
- `PUT /sessions/<id>` - Update a chat session
- `DELETE /sessions/<id>` - Delete a chat session
- `GET /sessions/<id>/messages` - Get messages for a session
- `POST /transcribe` - Transcribe audio to text
- `POST /tts` - Convert text to speech

## WebSocket

The WebSocket endpoint at `/backend/ws` is used for real-time updates, primarily for chat session title updates. 