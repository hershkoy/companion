from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from faster_whisper import WhisperModel
from kokoro import KPipeline
from conversation_store import conversation_store
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
import logging
import sys
import asyncio
from flask_sock import Sock
import json

# Configure logging
def setup_logger():
    logger = logging.getLogger('kokoro')
    logger.setLevel(logging.INFO)
    
    # Create console handler with a higher log level
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Create file handler which logs even debug messages
    file_handler = logging.FileHandler('kokoro.log', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    
    # Create formatters and add it to the handlers
    console_format = logging.Formatter('\n%(asctime)s [%(levelname)s] %(message)s')
    file_format = logging.Formatter('%(asctime)s [%(levelname)s] [%(name)s.%(funcName)s:%(lineno)d] %(message)s')
    
    console_handler.setFormatter(console_format)
    file_handler.setFormatter(file_format)
    
    # Add the handlers to the logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    # Set stdout encoding to utf-8
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
    
    return logger

logger = setup_logger()

# Load environment variables
env_path = find_dotenv()
if not env_path:
    raise RuntimeError("Could not find .env file")

logger.info(f"Loading environment from: {env_path}")
load_dotenv(env_path, override=True)

# Debug: Log environment variables at startup
logger.info("Environment Variables:")
logger.info(f"AI_SERVICE={os.getenv('AI_SERVICE')}")
logger.info(f"N8N_WEBHOOK_URL={os.getenv('N8N_WEBHOOK_URL')}")
logger.info(f"OLLAMA_URL={os.getenv('OLLAMA_URL')}")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
sock = Sock(app)

# Initialize models
logger.info("Loading models...")
whisper_model = WhisperModel("large-v3", device="cuda", compute_type="float16")
kokoro_pipeline = KPipeline(lang_code='a', device=torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
logger.info("Models loaded successfully!")

# Store WebSocket connections
ws_connections = set()

@sock.route('/backend/ws')
def ws_handler(ws):
    """Handle WebSocket connections"""
    logger.info("New WebSocket connection established")
    ws_connections.add(ws)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            message = ws.receive()
            if message is None:
                break
            # Echo back to confirm connection
            ws.send(json.dumps({"type": "ping", "status": "ok"}))
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        logger.info("WebSocket connection closed")
        ws_connections.remove(ws)

def broadcast_title_update(chat_id, title):
    """Broadcast title update to all connected clients"""
    if not ws_connections:
        logger.warning("No WebSocket connections available for broadcasting")
        return
        
    message = json.dumps({
        'type': 'session_title_update',  # Keep this for backward compatibility
        'session_id': chat_id,  # Keep this for backward compatibility
        'title': title
    })
    
    logger.info(f"Broadcasting title update: {message}")
    dead_connections = set()
    
    for ws in ws_connections:
        try:
            ws.send(message)
            logger.debug(f"Title update sent successfully to a client")
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {str(e)}")
            dead_connections.add(ws)
    
    # Clean up dead connections
    for ws in dead_connections:
        try:
            ws.close()
        except:
            pass
        ws_connections.remove(ws)
        logger.info("Removed dead WebSocket connection")

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
        logger.error(f"FFmpeg error: {e.stderr.decode()}")
        return False

def get_ollama_response(prompt, chat_id, max_tokens=None):
    """Get response from Ollama model with GPU acceleration"""
    url = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')

    system_prompt = (
        "You are a helpful and conversational assistant. "
        "Match the length of the user's message most of the time. "
        "Only elaborate if it is necessary to clarify or explain something important. "
        "Be friendly, direct, and natural."
    )

    # Get conversation history within token limit
    history = conversation_store.get_history(chat_id, max_tokens)
    history_text = ""
    if history:
        for msg in history:
            role = "User" if msg['type'] == 'user' else "Assistant"
            history_text += f"{role}: {msg['text']}\n"

    logger.info(f"[Ollama] Using history with {len(history) if history else 0} messages")
    logger.debug(f"[Ollama] History text:\n{history_text}")
    logger.info(f"[Ollama] Current prompt: {prompt}")

    full_prompt = f"{system_prompt}\n\n{history_text}User: {prompt}\nAssistant:"

    data = {
        "model": os.getenv('OLLAMA_MODEL', 'deepseek-r1'),
        "prompt": full_prompt,
        "stream": False,
        "options": {
            "num_gpu": 33,  # Use all GPU layers
            "num_thread": 20,  # More CPU threads
            "temperature": 0.7,  # Lower temperature for faster, more focused responses
            "top_p": 0.9,  # Nucleus sampling parameter
            "repeat_penalty": 1.1,  # Penalize repetition
            "num_ctx": max_tokens if max_tokens else 2048  # Use provided context window size
        }
    }
    
    try:
        # Set a reasonable timeout
        response = requests.post(url, json=data, timeout=30)
        response.raise_for_status()  # Raise exception for bad status codes
        
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
    except requests.exceptions.Timeout:
        raise Exception("Ollama request timed out after 30 seconds")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Ollama API request failed: {str(e)}")

def get_n8n_response(prompt, chat_id):
    """Get response from n8n webhook"""
    url = os.getenv('N8N_WEBHOOK_URL')
    headers = {
        'Content-Type': 'application/json'
    }
    
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
        "sessionId": chat_id,  # Keep this for backward compatibility with n8n
        "contactMessage": prompt
    }
    
    logger.info(f"Sending to n8n for chat {chat_id}: {data}")
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code == 200:
        response_data = response.json()
        logger.info(f"Received from n8n for chat {chat_id}: {response_data}")
        
        # Extract the agent message from the n8n response
        agent_message = response_data.get('agentMessage', '')
        if not agent_message:
            logger.error(f"No agent message in n8n response: {response_data}")
            raise Exception("No agent message in n8n response")
            
        return agent_message.strip()
    else:
        raise Exception(f"n8n webhook error: {response.status_code}, {response.text}")

def get_ai_response(prompt, chat_id):
    """Get AI response using configured service"""
    service = os.getenv('AI_SERVICE', 'ollama').lower()
    
    if service == 'n8n':
        return get_n8n_response(prompt, chat_id)
    elif service == 'ollama':
        return get_ollama_response(prompt, chat_id)
    else:
        raise ValueError(f"Unknown AI service: {service}")

def process_sentence(sentence, pipeline):
    """Process a single sentence with Kokoro and return the audio data"""
    logger.info(f"Processing TTS: {sentence[:50]}...")
    
    # Add proper punctuation if needed
    if not sentence.strip().endswith(('.', '!', '?')):
        sentence = sentence + "."
    
    try:
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
    except Exception as e:
        logger.error(f"Error processing TTS for sentence: {str(e)}")
        return None

@app.route('/backend/api/sessions', methods=['GET'])  # Keep endpoint for backward compatibility
def get_chats():
    """Get all chats"""
    try:
        chats = conversation_store.get_all_chats()
        return jsonify({"success": True, "sessions": chats})  # Keep response format for backward compatibility
    except Exception as e:
        logger.error(f"Error getting chats: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/backend/api/sessions', methods=['POST'])  # Keep endpoint for backward compatibility
def create_chat():
    """Create a new chat"""
    try:
        data = request.get_json()
        title = data.get('title', 'New Chat')
        
        # Generate unique chat ID
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        chat_id = f"chat-{timestamp}-{os.urandom(3).hex()}"
        
        conversation_store.create_chat(chat_id, title)
        
        chat_data = {
            "id": chat_id,
            "title": title,
            "created_at": datetime.now().isoformat()
        }
        
        return jsonify({"success": True, "session": chat_data})  # Keep response format for backward compatibility
    except Exception as e:
        logger.error(f"Error creating chat: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/backend/api/sessions/<chat_id>', methods=['PUT'])  # Keep endpoint for backward compatibility
def update_chat(chat_id):
    """Update chat title"""
    try:
        data = request.get_json()
        title = data.get('title')
        if not title:
            return jsonify({"success": False, "error": "Title is required"}), 400
            
        conversation_store.update_chat_title(chat_id, title)
        broadcast_title_update(chat_id, title)
        
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error updating chat: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/backend/api/sessions/<chat_id>', methods=['DELETE'])  # Keep endpoint for backward compatibility
def delete_chat(chat_id):
    """Delete a chat"""
    try:
        conversation_store.clear_chat(chat_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error deleting chat: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/backend/api/sessions/<chat_id>/messages', methods=['GET'])  # Keep endpoint for backward compatibility
def get_chat_messages(chat_id):
    """Get all messages for a chat"""
    try:
        messages = conversation_store.get_history(chat_id)
        return jsonify({"success": True, "messages": messages})
    except Exception as e:
        logger.error(f"Error getting chat messages: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

def estimate_token_count(text):
    """Estimate token count for a text string"""
    return len(text.split()) * 1.3  # Rough estimate: 1.3 tokens per word

def should_generate_title(messages):
    """Determine if we should generate a title based on conversation length"""
    total_tokens = sum(estimate_token_count(msg['text']) for msg in messages)
    return total_tokens >= 700

def generate_chat_title(messages):
    """Generate a title for the chat based on conversation history"""
    try:
        # Combine messages into a summary prompt
        conversation = "\n".join([f"{'User' if msg['type'] == 'user' else 'Assistant'}: {msg['text']}" for msg in messages])
        prompt = f"Based on this conversation, generate a brief, descriptive title (max 6 words):\n\n{conversation}"
        
        # Use Ollama for title generation
        url = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')
        response = requests.post(url, json={
            "model": os.getenv('OLLAMA_MODEL', 'deepseek-r1'),
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "num_ctx": 2048
            }
        })
        
        if response.status_code == 200:
            title = response.json()['response'].strip()
            # Remove quotes if present
            title = title.strip('"\'')
            return title
        else:
            logger.error(f"Error generating title: {response.status_code}")
            return "New Chat"
    except Exception as e:
        logger.error(f"Error generating title: {str(e)}")
        return "New Chat"

async def update_chat_title_background(chat_id, messages):
    """Update chat title in the background"""
    try:
        if should_generate_title(messages):
            title = generate_chat_title(messages)
            conversation_store.update_chat_title(chat_id, title)
            broadcast_title_update(chat_id, title)
    except Exception as e:
        logger.error(f"Error updating chat title: {str(e)}")

@app.route('/backend/api/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio and get AI response"""
    try:
        # Get chat ID from form data
        chat_id = request.form.get('sessionId')  # Keep form field name for backward compatibility
        if not chat_id:
            return jsonify({"success": False, "error": "Chat ID is required"}), 400
            
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if not audio_file:
            return jsonify({'error': 'No audio file provided'}), 400
        
        num_ctx = int(request.form.get('num_ctx', '2048'))
        temp_path = None
        wav_files = []  # Keep track of temporary wav files
        
        try:
            logger.info(f"Processing request for chat: {chat_id}")
            
            # Create a temporary file that will be automatically cleaned up
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_audio:
                temp_path = temp_audio.name
                audio_file.save(temp_path)
            
            # Transcribe the audio using Whisper
            segments, info = whisper_model.transcribe(temp_path, beam_size=5, language="en", task="transcribe")
            transcription = " ".join(segment.text for segment in segments)
            
            # Store user message in conversation history
            conversation_store.add_message(chat_id, {
                'type': 'user',
                'text': transcription.strip()
            })
            
            # Get AI response with conversation history
            max_history_tokens = int(num_ctx * 0.75)  # Use 75% of context window for history
            ai_response = get_ollama_response(transcription.strip(), chat_id, max_history_tokens)
            
            # Store AI response in conversation history
            conversation_store.add_message(chat_id, {
                'type': 'ai',
                'text': ai_response
            })
            
            # Log the transcription and language info
            logger.info("Whisper Transcription:")
            logger.info("-" * 40)
            logger.info(f"Chat ID: {chat_id}")
            logger.info(f"Language: {info.language} (probability: {info.language_probability:.2f})")
            logger.info(transcription)
            logger.info("-" * 40)
            
            logger.info("AI Response (after filtering):")
            logger.info("-" * 40)
            logger.info(f"Chat ID: {chat_id}")
            logger.info(ai_response)
            logger.info("-" * 40)
            
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
                            # Create unique temporary wav file
                            wav_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
                            wav_files.append(wav_file.name)
                            sf.write(wav_file.name, audio_data, 22050)
                            
                            # Read and encode the audio file
                            with open(wav_file.name, 'rb') as audio_file:
                                audio_base64 = base64.b64encode(audio_file.read()).decode('utf-8')
                            
                            # Store result with index for ordering
                            results[sentence_idx] = {
                                'text': sentences[sentence_idx],
                                'audio': audio_base64
                            }
                    except Exception as e:
                        logger.error(f"Error processing sentence {sentence_idx + 1}: {str(e)}")
            
            # Filter out None results
            results = [r for r in results if r is not None]
            
            # Start background title generation
            asyncio.run(update_chat_title_background(chat_id, conversation_store.get_history(chat_id)))
            
            return jsonify({
                'success': True,
                'transcription': transcription.strip(),
                'response': {
                    'agentMessage': ai_response,
                    'segments': results
                },
                'language': {
                    'detected': info.language,
                    'probability': float(info.language_probability)
                }
            })
        
        except Exception as e:
            logger.error(f"Error during processing: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        
        finally:
            # Clean up all temporary files
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception as e:
                    logger.warning(f"Could not delete temporary file {temp_path}: {e}")
            
            # Clean up wav files
            for wav_file in wav_files:
                try:
                    if os.path.exists(wav_file):
                        os.unlink(wav_file)
                except Exception as e:
                    logger.warning(f"Could not delete temporary wav file {wav_file}: {e}")

    except Exception as e:
        logger.error(f"Error during processing: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    service = os.getenv('AI_SERVICE', 'ollama').lower()
    logger.info("Transcription Service Started")
    logger.info("-" * 80)
    logger.info("AI Service Configuration:")
    logger.info(f"Service Type: {service.upper()}")
    
    if service == 'ollama':
        logger.info(f"Ollama URL: {os.getenv('OLLAMA_URL', 'http://localhost:11434/api')}")
        logger.info(f"Model: {os.getenv('OLLAMA_MODEL', 'deepseek-r1')}")
    elif service == 'n8n':
        logger.info(f"n8n Webhook URL: {os.getenv('N8N_WEBHOOK_URL', 'Not configured')}")
        logger.info("Authentication: " + ("Enabled" if os.getenv('N8N_AUTH_TOKEN') else "Disabled"))
    else:
        logger.warning(f"Unknown service type '{service}'")
    
    logger.info("-" * 80)
    logger.info("Waiting for audio input...")
    logger.info("-" * 80)
    app.run(debug=True, port=5000) 