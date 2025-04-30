from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from faster_whisper import WhisperModel
from kokoro import KPipeline
from backend.conversation_store import conversation_store
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
from backend.config import Config
from backend.services.websocket_service import WebSocketService
from backend.services.audio_service import AudioService
from backend.services.ai_service import AIService
from backend.db.init_db import create_tables

# Import route blueprints
from backend.routes.config import bp as config_bp
from backend.routes.messages import bp as messages_bp
from backend.routes.sessions import bp as sessions_bp

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

def create_app(config_class=Config):
    """Application factory pattern for Flask app."""
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    
    # Load config
    app.config.from_object(config_class)
    
    # Add request logging middleware
    @app.before_request
    def log_request():
        logger.info(f"Incoming {request.method} request to {request.path}")
        logger.debug(f"Request headers: {dict(request.headers)}")
        if request.is_json:
            logger.debug(f"Request JSON: {request.get_json()}")
    
    @app.after_request
    def log_response(response):
        logger.info(f"Response status: {response.status}")
        logger.debug(f"Response headers: {dict(response.headers)}")
        return response
    
    # Initialize extensions
    create_tables(app.config['DATABASE_PATH'])
    
    # Initialize models
    logger.info("Loading models...")
    whisper_model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    kokoro_pipeline = KPipeline(lang_code='a', device=torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
    logger.info("Models loaded successfully!")

    # Initialize services
    websocket_service = WebSocketService(app)  # This will set up the WebSocket routes
    ai_service = AIService(conversation_store)
    audio_service = AudioService(whisper_model, kokoro_pipeline)

    # Register blueprints
    logger.info("Registering blueprints...")
    app.register_blueprint(config_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(sessions_bp)
    logger.info("Blueprints registered successfully!")
    
    # Log registered routes
    logger.info("Registered routes:")
    for rule in app.url_map.iter_rules():
        logger.info(f"{rule.methods} {rule.rule}")

    def broadcast_title_update(chat_id, title):
        """Broadcast title update to all connected clients"""
        websocket_service.broadcast_title_update(chat_id, title)

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

    @app.route('/api/sessions', methods=['GET'])
    def get_chats():
        """Get all chats"""
        try:
            chats = conversation_store.get_all_chats()
            return jsonify({"success": True, "sessions": chats})
        except Exception as e:
            logger.error(f"Error getting chats: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/api/sessions', methods=['POST'])
    def create_chat():
        try:
            data = request.get_json()
            title = data.get("title", "New Chat")
            chat_id = f"chat-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{os.urandom(3).hex()}"
            conversation_store.create_chat(chat_id, title)
            return jsonify({"success": True, "chat": {"id": chat_id, "title": title}})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/api/sessions/<chat_id>', methods=['PUT'])
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

    @app.route('/api/sessions/<chat_id>', methods=['DELETE'])
    def delete_chat(chat_id):
        """Delete a chat"""
        try:
            conversation_store.clear_chat(chat_id)
            return jsonify({"success": True})
        except Exception as e:
            logger.error(f"Error deleting chat: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/api/sessions/<chat_id>/messages', methods=['GET'])
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
                title = ai_service.generate_title(messages, chat_id)
                conversation_store.update_chat_title(chat_id, title)
                websocket_service.broadcast_title_update(chat_id, title)
        except Exception as e:
            logger.error(f"Error updating chat title: {str(e)}")

    @app.route('/api/transcribe', methods=['POST'])
    def transcribe_audio():
        """Transcribe audio file."""
        try:
            # Get chat ID from form data
            chat_id = request.form.get('sessionId')
            if not chat_id:
                return jsonify({"success": False, "error": "Chat ID is required"}), 400
                
            if 'audio' not in request.files:
                return jsonify({'error': 'No audio file provided'}), 400
            
            audio_file = request.files['audio']
            if not audio_file:
                return jsonify({'error': 'No audio file provided'}), 400
            
            num_ctx = int(request.form.get('num_ctx', '2048'))
            temp_path = None
            
            try:
                logger.info(f"Processing request for chat: {chat_id}")
                
                # Create a temporary file that will be automatically cleaned up
                with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_audio:
                    temp_path = temp_audio.name
                    audio_file.save(temp_path)
                
                # Transcribe the audio
                transcription, info = audio_service.transcribe_audio(temp_path)
                
                # Store user message in conversation history
                conversation_store.add_message(chat_id, {
                    'type': 'user',
                    'text': transcription
                })
                
                # Get AI response with conversation history
                max_history_tokens = int(num_ctx * 0.75)  # Use 75% of context window for history
                ai_response = ai_service.get_response(transcription, chat_id, max_history_tokens)
                
                # Store AI response in conversation history
                conversation_store.add_message(chat_id, {
                    'type': 'ai',
                    'text': ai_response
                })
                
                # Process text to speech
                audio_segments = audio_service.process_text_to_speech(ai_response)
                
                # Start background title generation
                asyncio.run(update_chat_title_background(chat_id, conversation_store.get_history(chat_id)))
                
                return jsonify({
                    'success': True,
                    'transcription': transcription,
                    'response': {
                        'agentMessage': ai_response,
                        'segments': audio_segments
                    },
                    'language': {
                        'detected': info.language,
                        'probability': float(info.language_probability)
                    }
                })
            
            finally:
                # Clean up temporary file
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                    except Exception as e:
                        logger.warning(f"Could not delete temporary file {temp_path}: {e}")

        except Exception as e:
            logger.error(f"Error during processing: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    @app.route('/api/generate_title', methods=['POST'])
    def generate_title():
        """Generate title for a chat."""
        try:
            data = request.json
            messages = data.get('messages', [])
            chat_id = data.get('session_id')
            
            title = ai_service.generate_title(messages, chat_id)
            websocket_service.broadcast_title_update(chat_id, title)
            
            return jsonify({
                'success': True,
                'title': title
            })
            
        except Exception as e:
            logger.error(f"Error generating title: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
        
    logger.info("Flask application created successfully")
    return app

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create and run app
    app = create_app()
    app.run(debug=True) 