# Audio Transcription App

A real-time audio transcription application built with React and Python, using OpenAI's Whisper model for speech-to-text conversion.

## Features

- Real-time audio recording from microphone
- Server-side transcription using Whisper
- Modern React frontend interface
- Flask backend API
- GPU acceleration support

## Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- CUDA-compatible GPU (recommended)

## Installation

### Backend Setup

1. Create and activate a Python virtual environment:
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Unix or MacOS
source venv/bin/activate
```

2. Install Python dependencies:
```bash
pip install flask flask-cors faster-whisper torch
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

## Running the Application

### Start the Backend Server

1. Make sure your virtual environment is activated
2. From the root directory, run:
```bash
python app.py
```
The Flask server will start on `http://localhost:5000`

### Start the Frontend Development Server

1. In a new terminal, navigate to the frontend directory:
```bash
cd frontend
```

2. Start the React development server:
```bash
npm start
```
The frontend will be available at `http://localhost:3000`

## Usage

1. Open `http://localhost:3000` in your web browser
2. Click the "Start Recording" button to begin recording audio
3. Speak into your microphone
4. Click "Stop Recording" when finished
5. The transcribed text will appear on the screen

## Troubleshooting

### Common Issues

1. **Backend Connection Error**
   - Ensure the Flask server is running on port 5000
   - Check if CORS is properly configured
   - Verify network connectivity

2. **Audio Recording Issues**
   - Grant microphone permissions in your browser
   - Check if your microphone is properly connected
   - Verify browser compatibility (Chrome recommended)

3. **Transcription Issues**
   - Ensure Whisper model is properly loaded
   - Check GPU availability and CUDA setup
   - Verify audio file format and quality

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
