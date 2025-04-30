### 
change to schema:
###

-- Sessions & Messages (existing tables, unchanged except add timestamps)
CREATE TABLE sessions (
  session_id   TEXT PRIMARY KEY,
  title        TEXT,
  created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE messages (
  message_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL REFERENCES sessions(session_id),
  role         TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content      TEXT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- RAG Documents & Chunks
CREATE TABLE documents (
  doc_id       TEXT PRIMARY KEY,
  source_type  TEXT NOT NULL,              -- e.g. 'transcript','pdf','markdown'
  source_path  TEXT,                       -- filesystem path or URL
  metadata     JSON,                       -- any extra tags/labels
  created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE document_chunks (
  chunk_id     TEXT PRIMARY KEY,           -- e.g. uuid or '{doc_id}:{index}'
  doc_id       TEXT NOT NULL REFERENCES documents(doc_id),
  chunk_index  INTEGER NOT NULL,           -- position within doc
  text         TEXT NOT NULL,
  chroma_id    TEXT UNIQUE NOT NULL,       -- the vector‐store ID
  created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- Per-Session Configuration
CREATE TABLE session_config (
  session_id        TEXT PRIMARY KEY REFERENCES sessions(session_id),
  model_name        TEXT NOT NULL,         -- e.g. 'llama-2-13b'
  thinking_mode     TEXT NOT NULL CHECK(thinking_mode IN ('cot','rag','hybrid')),
  top_k             INTEGER NOT NULL DEFAULT 5,
  embed_light       TEXT NOT NULL,         -- e.g. 'all-MiniLM-L6-v2'
  embed_deep        TEXT NOT NULL,         -- e.g. 'sentence-7b'
  idle_threshold_s  INTEGER NOT NULL DEFAULT 600
);


###
backend
###
backend/
├── app.py                     # Flask app factory & server entrypoint
├── config.py                  # central settings (env, paths, thresholds)
├── requirements.txt
│
├── db/
│   ├── init_db.py             # create_tables(), migrations helper
│   └── migrations/            # future Alembic scripts (optional)
│
├── models/                    # ORM or Pydantic models
│   ├── session.py
│   ├── message.py
│   ├── document.py
│   ├── chunk.py
│   └── session_config.py
│
├── routes/                    # Flask Blueprints
│   ├── sessions.py            # CRUD sessions
│   ├── messages.py            # post/get messages
│   ├── config.py              # get/update session_config
│   └── embeddings.py          # status, trigger swaps
│
├── services/                  # business logic
│   ├── rag_service.py         # retrieval + hybrid logic
│   ├── chroma_client.py       # Chroma wrapper (upsert, query)
│   ├── gpu_monitor.py         # watches nvidia-smi
│   ├── scheduler.py           # idle-trigger + job orchestration
│   └── model_manager.py       # load/unload chat & embed models
│
├── tasks/                     # background jobs
│   └── indexing_task.py       # loops: check idle, swap, ingest
│
├── utils/
│   ├── logger.py
│   ├── decorators.py
│   └── retries.py
│
└── tests/                     # pytest modules
    ├── test_sessions.py
    ├── test_rag_service.py
    └── …

###
frontend
###
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
│
├── src/
│   ├── index.js              # ReactDOM.render + <Provider store>
│   ├── App.js                # top-level routes/layout
│
│   ├── api/                  # HTTP calls to backend
│   │   ├── chatApi.js        # fetch/send messages
│   │   ├── configApi.js      # get/update config
│   │   └── ragApi.js         # status, trigger indexing
│
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatWindow.js
│   │   │   ├── MessageList.js
│   │   │   ├── MessageInput.js
│   │   │   ├── ModelSelector.js
│   │   │   ├── ThinkingModeSelector.js
│   │   │   └── IndexingIndicator.js
│   │   │
│   │   ├── Config/
│   │   │   └── ConfigPanel.js
│   │   │
│   │   └── Common/           # buttons, dropdowns, spinners…
│   │       ├── Button.js
│   │       ├── Dropdown.js
│   │       └── Spinner.js
│
│   ├── hooks/                # reusable logic
│   │   ├── useGpuStatus.js   # poll indexing status
│   │   └── usePolling.js     # generic polling hook
│
│   ├── store/                # Redux Toolkit setup
│   │   ├── store.js          # configureStore()
│   │   └── slices/
│   │       ├── chatSlice.js
│   │       ├── configSlice.js
│   │       └── gpuSlice.js
│
│   ├── pages/                # route components
│   │   ├── ChatPage.js
│   │   └── ConfigPage.js
│
│   ├── styles/               # global + module CSS
│   │   ├── globals.css
│   │   ├── Chat.css
│   │   └── Config.css
│
│   └── utils/                # helpers (tokenize, format dates…)
│       ├── dateUtils.js
│       └── tokenUtils.js
│
├── package.json
├── .eslintrc.js
└── .babelrc


## Design Specification for LLM Companion Enhancements

### 1. Overview
This document outlines the detailed design for implementing hybrid Chain-of-Thought (CoT) + Retrieval-Augmented Generation (RAG) thinking modes, dynamic model selection, and background indexing in both the backend (Flask) and frontend (React + Redux). It covers data models, API routes, service components, UI components, workflows, and configuration.

---

### 2. Goals & Features
1. **Dynamic Model Selection**
   - Fetch available LLMs from Ollama dynamically.
   - Allow users to select the model in a global config panel; persists until changed.
2. **Thinking Mode Selector**
   - Per-message selector with options: `cot`, `rag`, `hybrid`.
   - Selection persists across messages in the same session.
3. **Local RAG Pipeline**
   - Use Chroma vector store to index and retrieve document chunks.
   - Support configurable `top_k` retrieval.
4. **Dual Embedder Strategy**
   - **Light Embedder** (e.g. `all-MiniLM-L6-v2`): always available for live retrieval.
   - **Deep Embedder** (e.g. 7B transformer): loaded only during background indexing.
5. **Background Indexing Scheduler**
   - Monitors GPU utilization; after `idle_threshold_s` of low usage, swaps embedder, runs ingestion, then restores chat model.
   - Aborts indexing immediately on new user input.
   - Exposes `indexing` status to frontend.
6. **Configurable Parameters**
   - `top_k`, `embed_light`, `embed_deep`, `idle_threshold_s`, GPU utilization threshold, etc.

---

### 3. System Architecture

#### 3.1 Components
- **Flask Backend**
  - Routes (Blueprints) for sessions, messages, config, embeddings.
  - Services for RAG (`rag_service`), model management, GPU monitoring, scheduling, Chroma client.
  - Background task (`indexing_task`) for document ingestion/upsert.
- **React Frontend**
  - Redux store (`chatSlice`, `configSlice`, `gpuSlice`).
  - Components for chat UI, selectors, config panel, indexing indicator.
  - Hooks for polling GPU/indexing status.
  - API modules to interact with backend routes.

---

### 4. Data Model

#### 4.1 SQLite Schema
```sql
-- sessions, messages (existing)
CREATE TABLE sessions (
  session_id   TEXT PRIMARY KEY,
  title        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  message_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT REFERENCES sessions(session_id),
  role         TEXT CHECK(role IN ('user','assistant')),
  content      TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RAG docs & chunks
CREATE TABLE documents (
  doc_id       TEXT PRIMARY KEY,
  source_type  TEXT,
  source_path  TEXT,
  metadata     JSON,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_chunks (
  chunk_id     TEXT PRIMARY KEY,
  doc_id       TEXT REFERENCES documents(doc_id),
  chunk_index  INTEGER,
  text         TEXT,
  chroma_id    TEXT UNIQUE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- session configuration
CREATE TABLE session_config (
  session_id        TEXT PRIMARY KEY REFERENCES sessions(session_id),
  model_name        TEXT,
  thinking_mode     TEXT CHECK(thinking_mode IN ('cot','rag','hybrid')),
  top_k             INTEGER DEFAULT 5,
  embed_light       TEXT,
  embed_deep        TEXT,
  idle_threshold_s  INTEGER DEFAULT 600
);
```  

---

### 5. Backend Design

#### 5.1 Flask Blueprints (routes/)
- **sessions.py**: CRUD sessions
- **messages.py**: GET/POST messages, triggers RAG+CoT pipeline
- **config.py**: GET/PUT session_config
- **embeddings.py**: GET indexing status, POST to trigger manual indexing or model swap

#### 5.2 Services (services/)
- **model_manager.py**
  - `load_chat_model(name)`, `unload_chat_model()`, `load_embedder(name)`, `swap_to_embedder(name)`
  - Maintains current GPU-loaded model
- **gpu_monitor.py**
  - Polls NVIDIA GPUs via `pynvml`, reports utilization
- **chroma_client.py**
  - Connects to local Chroma instance
  - `upsert_chunks(chunks)`, `query(query_embedding, top_k)`
- **rag_service.py**
  - Implements hybrid logic: embed query (light embedder), retrieve top_k, optionally run CoT iterations
  - Exposes `generate_response(session_id, user_message)`
- **scheduler.py**
  - Watches GPU status & session activity
  - Triggers `indexing_task` when idle
- **indexing_task.py** (in tasks/)
  - Scans new documents, chunks, embeds with deep embedder, upserts into Chroma
  - Aborts early on new message event

---

### 6. Frontend Design

#### 6.1 State Management (Redux Toolkit)
- **chatSlice**
  - `messages`, `status` (loading/success/error)
  - Thunks: `sendMessage`, `fetchMessages`
- **configSlice**
  - `modelList`, `currentModel`, `thinkingMode`, `topK`, `embedLight`, `embedDeep`, `idleThreshold`
  - Thunks: `fetchConfig`, `updateConfig`, `fetchModels`
- **gpuSlice**
  - `isIndexing`, `gpuUtilization`
  - Thunks: `pollGpuStatus`

#### 6.2 Key Components
- **ChatWindow**: renders `MessageList`, `MessageInput`
- **MessageList**: displays messages with timestamps
- **MessageInput**: textarea + submit, thinking-mode selector
- **ModelSelector**: dropdown for model_name
- **ThinkingModeSelector**: per-message mode
- **IndexingIndicator**: shows spinner & "Indexing in progress..."
- **ConfigPanel**: fields for all session_config values

#### 6.3 Hooks & Utilities
- **usePolling**: generic polling logic
- **useGpuStatus**: polls `/api/embeddings/status` for `isIndexing` and `gpuUtilization`
- **tokenUtils**: client-side token estimation for CoT

---

### 7. Data & Workflow Flows

#### 7.1 Chat Flow
1. User sends message via `POST /api/sessions/{id}/messages` with `thinking_mode` header
2. Backend retrieves session_config; calls `rag_service.generate_response`
   - Embeds query (light)
   - Retrieves top_k from Chroma
   - If mode includes CoT: run n internal iterations
   - Generates final response via chat model
3. Response saved to `messages` table; streamed back to frontend
4. Update frontend store; TTS handled separately

#### 7.2 Indexing Flow
1. `scheduler` monitors GPU and session activity
2. After idle threshold, triggers `indexing_task`
3. `indexing_task`: unloads chat model, loads deep embedder
4. Scans `documents` for updates, chunks, deep-embeds & upserts to Chroma
5. On user activity or completion: abort or finish, unload deep embedder, reload chat model
6. Emit status updates via WebSocket or `/api/embeddings/status`

---

### 8. API Endpoints Reference

| Method | Path                             | Description                                   |
|--------|----------------------------------|-----------------------------------------------|
| GET    | `/api/sessions`                  | List sessions                                |
| POST   | `/api/sessions`                  | Create session                               |
| GET    | `/api/sessions/{id}`             | Get session details & config                 |
| GET    | `/api/sessions/{id}/messages`    | List messages                                |
| POST   | `/api/sessions/{id}/messages`    | Send user message                            |
| GET    | `/api/config/{session_id}`       | Get session_config                           |
| PUT    | `/api/config/{session_id}`       | Update session_config                        |
| GET    | `/api/models`                    | Fetch available models from Ollama           |
| GET    | `/api/embeddings/status`         | Get indexing/gpu status                      |
| POST   | `/api/embeddings/index`          | Trigger manual indexing                      |

---

### 9. Configuration & Defaults
- **Model Selector**: fetched live, default to first in list
- **Thinking Mode**: `hybrid`
- **top_k**: 5
- **embed_light**: `all-MiniLM-L6-v2`
- **embed_deep**: `sentence-transformers/7b`
- **idle_threshold_s**: 600 (10 min)
- **GPU idle threshold**: <10% utilization

---


# TASKS!!!

1. **Database Schema & Migrations**  
   - [x] Create `backend/db/init_db.py` with `create_tables()` that runs the following DDL against SQLite:  
     - Sessions table (fields: `session_id TEXT PK`, `title TEXT`, `created_at DATETIME`, `updated_at DATETIME`)  
     - Messages table (fields: `message_id INTEGER PK AUTOINCR`, `session_id TEXT FK`, `role TEXT CHECK('user','assistant')`, `content TEXT`, `created_at DATETIME`)  
     - Documents table (fields: `doc_id TEXT PK`, `source_type TEXT`, `source_path TEXT`, `metadata JSON`, `created_at DATETIME`, `updated_at DATETIME`)  
     - Document_chunks table (fields: `chunk_id TEXT PK`, `doc_id TEXT FK`, `chunk_index INTEGER`, `text TEXT`, `chroma_id TEXT UNIQUE`, `created_at DATETIME`)  
     - Session_config table (fields: `session_id TEXT PK`, `model_name TEXT`, `thinking_mode TEXT CHECK('cot','rag','hybrid')`, `top_k INTEGER`, `embed_light TEXT`, `embed_deep TEXT`, `idle_threshold_s INTEGER`)  
   - [x] Add migration stub folder `backend/db/migrations/` for future Alembic scripts.  

2. **Backend Folder & Module Scaffolding**  
   - [x] Under `backend/`, create directories: `models/`, `routes/`, `services/`, `tasks/`, `utils/`, `tests/`.  
   - [x] Add placeholder `__init__.py` in each folder.  
   - [x] Create `backend/app.py` that instantiates Flask app, registers blueprints, and reads `config.py`.  
   - [x] Create `backend/config.py` with environment-based settings (DB path, Chroma URL, GPU thresholds).  

3. **ORM / Data Models**  
   - [x] In `backend/models/session.py`, define Pydantic or SQLAlchemy model for `Session` mirroring `sessions` table.  
   - [x] In `backend/models/message.py`, define model for `Message` with `session_id`, `role`, `content`, `created_at`.  
   - [x] In `backend/models/document.py`, define model for `Document` with JSON metadata.  
   - [x] In `backend/models/chunk.py`, define model for `DocumentChunk` including `chroma_id`.  
   - [x] In `backend/models/session_config.py`, define model for `SessionConfig` with default values (`top_k=5`, `idle_threshold_s=600`, etc.).  

4. **Flask Blueprints / API Routes**  
   - [x] `backend/routes/sessions.py`:  
     - GET `/api/sessions` → list sessions  
     - POST `/api/sessions` → create session (generate `session_id`)  
     - GET `/api/sessions/<session_id>` → session detail + config  
   - [x] `backend/routes/messages.py`:  
     - GET `/api/sessions/<session_id>/messages` → fetch messages  
     - POST `/api/sessions/<session_id>/messages` → send user message, accept JSON `{ content, thinking_mode? }`, call RAG/CoT pipeline  
   - [x] `backend/routes/config.py`:  
     - GET `/api/config/<session_id>` → return `SessionConfig` JSON  
     - PUT `/api/config/<session_id>` → accept updated config fields (`model_name`, `thinking_mode`, `top_k`, `embed_light`, `embed_deep`, `idle_threshold_s`)  
   - [x] `backend/routes/embeddings.py`:  
     - GET `/api/embeddings/status` → return `{ is_indexing: bool, gpu_util: float }`  
     - POST `/api/embeddings/index` → trigger manual deep indexing job  

5. **Model Manager Service**  
   - [x] `backend/services/model_manager.py`:  
     - Implement `load_chat_model(name: str)` using Ollama Python client, caching loaded model handle.  
     - Implement `unload_chat_model()` to free GPU memory.  
     - Implement `load_embedder(name: str)` for light or deep embedder.  
     - Maintain internal state of `current_model` and `current_embedder`.  

6. **GPU Monitor Service**  
   - [x] `backend/services/gpu_monitor.py`:  
     - Use `pynvml` to poll GPU utilization every 10 s.  
     - Expose `get_utilization() -> float` (0–100).  

7. **Chroma Client Service**  
   - [x] `backend/services/chroma_client.py`:  
     - Initialize Chroma client pointing at local on-disk store.  
     - Implement `upsert_chunks(chunks: List[dict])` where each dict is `{ chroma_id, embedding, metadata }`.  
     - Implement `query(embedding: List[float], top_k: int) -> List[{ chroma_id, text, score }]`.  

8. **RAG Service & Hybrid Logic**  
   - [x] `backend/services/rag_service.py`:  
     - `generate_response(session_id: str, user_message: str, thinking_mode: str) -> str`  
       - Embed `user_message` with light embedder  
       - Retrieve `top_k` document chunks via Chroma  
       - If `cot` or `hybrid`: run 1–3 chain-of-thought iterations by prefixing "Let me think step by step" and feeding back to chat model  
       - Construct final prompt combining retrieved contexts and CoT reasoning, send to chat LLM  
       - Return assistant's text response  

9. **Background Indexing Scheduler**  
   - [x] `backend/services/scheduler.py`:  
     - Monitor both GPU utilization and last user activity timestamp (stored in-memory or in SQLite).  
     - When GPU util < configured threshold for ≥ `idle_threshold_s`, enqueue `indexing_task`.  
     - Listen for new user messages to cancel any running indexing job.  
   - [x] `backend/tasks/indexing_task.py`:  
     - On start: call `model_manager.unload_chat_model()`, `model_manager.load_embedder(embed_deep)`  
     - Query `documents` table for records where `updated_at` > last index time  
     - For each document, chunk text into ~500-token windows, embed with deep embedder, call `chroma_client.upsert_chunks()`  
     - Update `document_chunks` table with new `chunk_id` and timestamp  
     - On finish or cancellation: reload chat model, switch embedder back to light  

10. **Frontend Project & Redux Setup**  
    - [x] Create new React app under `frontend/` (or update existing)  
    - [x] Install Redux Toolkit and React-Redux  
    - [x] `frontend/src/store/store.js`: initialize with `configureStore({ reducer: { chat: chatReducer, config: configReducer, gpu: gpuReducer } })`  
    - [x] `frontend/src/store/slices/chatSlice.js`:  
      - State: `{ messages: [], status: 'idle', error: null }`  
      - Thunks: `fetchMessages(sessionId)`, `sendMessage({ sessionId, content, thinkingMode })`  
      - Reducers for pending/fulfilled/rejected  
    - [x] `frontend/src/store/slices/configSlice.js`:  
      - State: `{ modelList: [], currentModel: '', thinkingMode: 'hybrid', topK: 5, embedLight: '', embedDeep: '', idleThreshold: 600 }`  
      - Thunks: `fetchModels()`, `fetchConfig(sessionId)`, `updateConfig(sessionId, values)`  
    - [x] `frontend/src/store/slices/gpuSlice.js`:  
      - State: `{ isIndexing: false, gpuUtil: 0 }`  
      - Thunk: `pollGpuStatus()` calling `/api/embeddings/status`  

11. **Frontend API Modules**  
    - [x] `frontend/src/api/chatApi.js`: functions `getMessages(sessionId)`, `postMessage(sessionId, { content, thinking_mode })`  
    - [x] `frontend/src/api/configApi.js`: `getConfig(sessionId)`, `putConfig(sessionId, config)`  
    - [x] `frontend/src/api/ragApi.js`: `getModels()`, `getEmbeddingStatus()`, `triggerIndexing()`  

12. **Chat UI Components**  
    - [x] `frontend/src/components/Chat/ChatWindow.js`: render `MessageList` and `MessageInput`; connect to `chatSlice`  
    - [x] `frontend/src/components/Chat/MessageList.js`: map over `messages` state, display `role`, `content`, `created_at`  
    - [x] `frontend/src/components/Chat/MessageInput.js`: textarea, "Send" button, include `<ThinkingModeSelector>`; on submit dispatch `sendMessage`  
    - [x] `frontend/src/components/Chat/ModelSelector.js`: dropdown bound to `configSlice.currentModel`; on change dispatch `updateConfig`  
    - [x] `frontend/src/components/Chat/ThinkingModeSelector.js`: dropdown with `cot`, `rag`, `hybrid`; persists via `configSlice`  
    - [x] `frontend/src/components/Chat/IndexingIndicator.js`: show spinner and "Indexing in progress..."  

13. **Config Panel Components**  
    - [x] `frontend/src/components/Config/ConfigPanel.js`: fields for `topK`, `embedLight`, `embedDeep`, `idleThreshold` with inputs/sliders; save button calls `updateConfig`  

14. **Hooks & Polling Logic**  
    - [x] `frontend/src/hooks/usePolling.js`: generic hook accepting callback and interval  
    - [x] `frontend/src/hooks/useGpuStatus.js`: use `usePolling` to dispatch `pollGpuStatus()` every 10 s  

15. **Utilities & Tokenization**  
    - [x] `frontend/src/utils/dateUtils.js`: format ISO timestamps for display  
    - [x] `frontend/src/utils/tokenUtils.js`: estimate token count for CoT prefix  

16. **Integration & Wiring**  
    - [ ] In `App.js`, set up React Router for `ChatPage` and `ConfigPage`; wrap in Redux `<Provider>`  
    - [ ] On `ChatPage` load: dispatch `fetchModels()`, `fetchConfig(sessionId)`, `fetchMessages(sessionId)`, start `useGpuStatus` polling  
    - [ ] Pass `currentModel`, `thinkingMode`, `topK` from Redux into `MessageInput` and API calls  

17. **Testing**  
    - [ ] Write pytest tests in `backend/tests/` for each route: sessions, messages, config, embeddings  
    - [ ] Mock Chroma and model_manager for `rag_service` unit tests  
    - [ ] Add React Testing Library tests for critical components: `ChatWindow`, `MessageInput`, `ConfigPanel`  

18. **Linting & Formatting**  
    - [ ] Add `.eslintrc.js` and `.prettierrc` to `frontend/` following Airbnb or similar style  
    - [ ] Add `flake8` or `black` configs to `backend/`  

19. **Documentation & README**  
    - [ ] Update root `README.md` with setup instructions for both backend and frontend, environment variables, and how to start indexing  

20. **Deployment Scripts**  
    - [ ] Create `docker-compose.yml` (optional) to orchestrate Flask app and Chroma service  
    - [ ] Add `Makefile` or npm scripts for common tasks (`start`, `test`, `lint`, `migrate`)  

