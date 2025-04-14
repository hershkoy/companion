from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
from kokoro import KPipeline
import tempfile
import os
import torch
import numpy as np
import soundfile as sf
from datetime import datetime
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import base64
from dotenv import load_dotenv, find_dotenv
from pathlib import Path

# Load environment variables
env_path = find_dotenv()
if not env_path:
    raise RuntimeError("Could not find .env file")

print(f"\nLoading environment from: {env_path}")
load_dotenv(env_path, override=True)

# Debug: Print environment variables at startup
print("\nEnvironment Variables:")
print(f"AI_SERVICE={os.getenv('AI_SERVICE')}")
print(f"N8N_WEBHOOK_URL={os.getenv('N8N_WEBHOOK_URL')}")
print(f"OLLAMA_URL={os.getenv('OLLAMA_URL')}")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize models
print("\nLoading models...")
whisper_model = WhisperModel("large-v3", device="cuda", compute_type="float16")
kokoro_pipeline = KPipeline(lang_code='a', device=torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
print("Models loaded successfully!")

def convert_webm_to_wav(input_path, output_path):
    """Convert webm file to wav using ffmpeg"""
    try:
        subprocess.run([
            'ffmpeg', '-i', input_path,
            '-acodec', 'pcm_s16le',
            '-ar', '16000',
            '-ac', '1',
            '-y',  # Overwrite output file if it exists
            output_path
        ], check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
        return False

def get_ollama_response(prompt):
    """Get response from Ollama model"""
    url = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')
    data = {
        "model": os.getenv('OLLAMA_MODEL', 'deepseek-r1'),
        "prompt": prompt,
        "stream": False
    }
    
    response = requests.post(url, json=data)
    if response.status_code == 200:
        response_text = response.json()['response']
        # Remove the thinking part enclosed in <think> tags
        response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
        # Clean up any extra newlines and spaces
        response_text = re.sub(r'\n+', ' ', response_text)
        response_text = re.sub(r'\s+', ' ', response_text)
        return response_text.strip()
    else:
        raise Exception(f"Ollama API error: {response.status_code}")

def get_n8n_response(prompt):
    """Get response from n8n webhook"""
    url = os.getenv('N8N_WEBHOOK_URL')
    headers = {}
    
    # Add authentication if configured
    auth_token = os.getenv('N8N_AUTH_TOKEN')
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    # Handle null input case
    if not prompt or prompt.strip() == '':
        return {
            "action": "Final Answer",
            "action_input": {
                "status": "null"
            }
        }
    
    data = {
        "prompt": prompt
    }
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        return response.json().get('response', '').strip()
    else:
        raise Exception(f"n8n webhook error: {response.status_code}")

def get_ai_response(prompt):
    """Get AI response based on configured service"""
    service = os.getenv('AI_SERVICE', 'ollama').lower()
    
    print(f"\nUsing AI service: {service}")
    
    if service == 'ollama':
        return get_ollama_response(prompt)
    elif service == 'n8n':
        return get_n8n_response(prompt)
    else:
        raise ValueError(f"Invalid AI_SERVICE configuration: {service}")

def process_sentence(sentence, pipeline):
    """Process a single sentence with Kokoro and return the audio data"""
    print(f"\nProcessing TTS: {sentence[:50]}...")
    
    # Add proper punctuation if needed
    if not sentence.strip().endswith(('.', '!', '?')):
        sentence = sentence + "."
    
    # Generate speech for this sentence
    audio_chunks = []
    audio_generator = pipeline(sentence, voice="af_heart", speed=1.5)
    
    for chunk in audio_generator:
        # Get the audio data from the Result object
        if hasattr(chunk, 'audio'):
            chunk_data = chunk.audio
        else:
            chunk_data = chunk

        # Convert to CUDA if available
        if isinstance(chunk_data, torch.Tensor):
            if torch.cuda.is_available() and not chunk_data.is_cuda:
                chunk_data = chunk_data.cuda()
            if chunk_data.is_cuda:
                chunk_data = chunk_data.cpu()
            chunk_data = chunk_data.detach().numpy()
        
        # Ensure correct data type
        chunk_data = np.asarray(chunk_data, dtype=np.float32)
        audio_chunks.append(chunk_data.flatten())

    if audio_chunks:
        return np.concatenate(audio_chunks)
    return None

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    temp_path = None
    
    try:
        # Create a temporary file that will be automatically cleaned up
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_audio:
            temp_path = temp_audio.name
            audio_file.save(temp_path)
        
            # Transcribe the audio using Whisper
        segments, info = whisper_model.transcribe(temp_path, beam_size=5)
        transcription = " ".join(segment.text for segment in segments)
        
        # Log the transcription
        print("\nWhisper Transcription:")
        print("-" * 40)
        print(transcription)
        print("-" * 40)
        
        # Get AI response based on configured service
        ai_response = get_ai_response(transcription.strip())
        
        # If response is a dict (null case), handle it differently
        if isinstance(ai_response, dict):
            print("\nNull input detected, returning status response")
            return jsonify({
                'success': True,
                'transcription': transcription.strip(),
                'response': {
                    'full_text': '',
                    'segments': []
                },
                'status': 'null',
                'language': {
                    'detected': info.language,
                    'probability': float(info.language_probability)
                }
            })
        
        print("\nAI Response (after filtering):")
        print("-" * 40)
        print(ai_response)
        print("-" * 40)
        
        # Split response into sentences
        sentences = [s.strip() for s in re.split(r'[.!?]+', ai_response) if s.strip()]
        
        # Process sentences in parallel with Kokoro
        MAX_WORKERS = 2 if torch.cuda.is_available() else 4
        audio_segments = []
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_sentence = {
                executor.submit(process_sentence, sentence, kokoro_pipeline): i 
                for i, sentence in enumerate(sentences)
            }
            
            # Create a list to store results in order
            results = [None] * len(sentences)
            
            # Process completed sentences as they finish
            for future in as_completed(future_to_sentence):
                sentence_idx = future_to_sentence[future]
                try:
                    audio_data = future.result()
                    if audio_data is not None:
                        # Convert audio data to base64
                        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
                            wav_path = temp_wav.name
                            sf.write(wav_path, audio_data, 22050)
                            with open(wav_path, 'rb') as audio_file:
                                audio_base64 = base64.b64encode(audio_file.read()).decode('utf-8')
                            try:
                                os.unlink(wav_path)
                            except Exception as e:
                                print(f"Warning: Could not delete temporary wav file: {e}")
                        
                        # Store result with index for ordering
                        results[sentence_idx] = {
                            'text': sentences[sentence_idx],
                            'audio': audio_base64
                        }
                except Exception as e:
                    print(f"Error processing sentence {sentence_idx + 1}: {str(e)}")
        
        # Filter out None results
        results = [r for r in results if r is not None]
        
        return jsonify({
            'success': True,
            'transcription': transcription.strip(),
            'response': {
                'full_text': ai_response,
                'segments': results
            },
                'language': {
                    'detected': info.language,
                    'probability': float(info.language_probability)
                }
            })
            
        except Exception as e:
        print(f"Error during processing: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    finally:
        # Clean up the temporary audio file after we're done with it
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                print(f"Warning: Could not delete temporary file {temp_path}: {e}")

if __name__ == '__main__':
    service = os.getenv('AI_SERVICE', 'ollama').lower()
    print("\nTranscription Service Started")
    print("-" * 80)
    print(f"AI Service Configuration:")
    print(f"Service Type: {service.upper()}")
    
    if service == 'ollama':
        print(f"Ollama URL: {os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')}")
        print(f"Model: {os.getenv('OLLAMA_MODEL', 'deepseek-r1')}")
    elif service == 'n8n':
        print(f"n8n Webhook URL: {os.getenv('N8N_WEBHOOK_URL', 'Not configured')}")
        print("Authentication: " + ("Enabled" if os.getenv('N8N_AUTH_TOKEN') else "Disabled"))
    else:
        print(f"Warning: Unknown service type '{service}'")
    
    print("-" * 80)
    print("Waiting for audio input...")
    print("-" * 80)
    app.run(debug=True, port=5000) 