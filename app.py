from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
import tempfile
import os
import torch

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Whisper model
print("Loading Whisper model...")
model = WhisperModel("large-v3", device="cuda", compute_type="float16")
print("Whisper model loaded successfully!")

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    temp_path = None
    
    try:
        # Save the audio file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            temp_path = temp_audio.name
            audio_file.save(temp_path)
        
        # Transcribe the audio using Whisper
        segments, info = model.transcribe(temp_path, beam_size=5)
        
        # Collect all segments
        transcription = ""
        for segment in segments:
            transcription += f" {segment.text}"
        
        return jsonify({
            'success': True,
            'transcription': transcription.strip(),
            'language': {
                'detected': info.language,
                'probability': float(info.language_probability)
            }
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    
    finally:
        # Clean up the temporary file in a finally block
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                print(f"Warning: Could not delete temporary file {temp_path}: {e}")

if __name__ == '__main__':
    app.run(debug=True, port=5000) 